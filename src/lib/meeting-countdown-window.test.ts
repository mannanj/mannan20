import { describe, expect, mock, test } from 'bun:test';
import {
  MEETING_COUNTDOWN_AUTO_FOCUS_KEY,
  MeetingCountdownFocusAttempt,
  openMeetingCountdownPopout,
  readMeetingCountdownAutoFocus,
  writeMeetingCountdownAutoFocus,
} from './meeting-countdown-window';
import {
  countdownFocusAck,
  countdownFocusRequest,
} from './meeting-countdown-channel';

const meetingId = '0123456789abcdef0123456789abcdef';

describe('meeting countdown popup', () => {
  test('opens and focuses one literal named resizable meeting window', () => {
    const focus = mock(() => undefined);
    const open = mock(() => ({ focus }) as unknown as Window);
    expect(openMeetingCountdownPopout({
      meetingId,
      window: { open } as unknown as Pick<Window, 'open'>,
    })).toBe(true);
    expect(open).toHaveBeenCalledWith(
      `/meet/${meetingId}/countdown`,
      `meeting-countdown-${meetingId}`,
      'popup=yes,width=460,height=360,resizable=yes,scrollbars=no',
    );
    expect(focus).toHaveBeenCalledTimes(1);
  });

  test('returns false for a blocked popup and rejects an unsafe meeting ID', () => {
    const open = mock(() => null);
    expect(openMeetingCountdownPopout({
      meetingId,
      window: { open } as unknown as Pick<Window, 'open'>,
    })).toBe(false);
    expect(() => openMeetingCountdownPopout({
      meetingId: '../private',
      window: { open } as unknown as Pick<Window, 'open'>,
    })).toThrow('Invalid meeting identifier.');
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('meeting countdown auto-focus preference', () => {
  test('defaults on and recognizes only the exact namespaced boolean values', () => {
    for (const [stored, expected] of [
      [null, true],
      ['1', true],
      ['0', false],
      ['true', true],
      ['private-value', true],
    ] as const) {
      expect(readMeetingCountdownAutoFocus({
        getItem: mock(() => stored),
      })).toBe(expected);
    }
    expect(readMeetingCountdownAutoFocus({
      getItem: () => {
        throw new Error('private storage detail');
      },
    })).toBe(true);
  });

  test('persists only one non-sensitive 1-or-0 preference and ignores storage failure', () => {
    const setItem = mock((_key: string, _value: string) => undefined);
    writeMeetingCountdownAutoFocus({ setItem }, true);
    writeMeetingCountdownAutoFocus({ setItem }, false);
    expect(setItem.mock.calls).toEqual([
      [MEETING_COUNTDOWN_AUTO_FOCUS_KEY, '1'],
      [MEETING_COUNTDOWN_AUTO_FOCUS_KEY, '0'],
    ]);
    expect(() => writeMeetingCountdownAutoFocus({
      setItem: () => {
        throw new Error('private storage detail');
      },
    }, true)).not.toThrow();
  });
});

describe('meeting countdown focus attempt', () => {
  test('navigates without an opener and freezes one manual request until matching ack', () => {
    const attempt = new MeetingCountdownFocusAttempt(() => 'a'.repeat(32));
    expect(attempt.beginManual(false, meetingId)).toEqual({
      kind: 'navigate',
      href: `/meet/${meetingId}`,
    });
    const expected = countdownFocusRequest(
      meetingId,
      'a'.repeat(32),
      'manual',
    );
    expect(attempt.beginManual(true, meetingId)).toEqual({
      kind: 'request',
      message: expected,
    });
    expect(attempt.beginManual(true, meetingId)).toEqual({
      kind: 'request',
      message: expected,
    });
    expect(attempt.pendingRequestId()).toBe('a'.repeat(32));
    expect(attempt.ack(countdownFocusAck(meetingId, 'b'.repeat(32)))).toBe(false);
    expect(attempt.ack(countdownFocusAck(
      'fedcba9876543210fedcba9876543210',
      'a'.repeat(32),
    ))).toBe(false);
    expect(attempt.ack(countdownFocusAck(meetingId, 'a'.repeat(32)))).toBe(true);
    expect(attempt.pendingRequestId()).toBeNull();
    expect(attempt.ack(countdownFocusAck(meetingId, 'a'.repeat(32)))).toBe(false);
  });

  test('requests auto-focus once per observed live start without replacing manual work', () => {
    const ids = ['a'.repeat(32), 'b'.repeat(32), 'c'.repeat(32)];
    const attempt = new MeetingCountdownFocusAttempt(() => ids.shift()!);
    const firstStart = '2026-07-19T14:30:00.000Z';
    const secondStart = '2026-07-20T14:30:00.000Z';

    expect(attempt.observeLiveStart(meetingId, firstStart, false)).toBeNull();
    expect(attempt.observeLiveStart(meetingId, firstStart, true)).toBeNull();

    const manual = attempt.beginManual(true, meetingId);
    expect(manual).toEqual({
      kind: 'request',
      message: countdownFocusRequest(meetingId, 'a'.repeat(32), 'manual'),
    });
    expect(attempt.observeLiveStart(meetingId, secondStart, true)).toBeNull();
    expect(attempt.ack(countdownFocusAck(meetingId, 'a'.repeat(32)))).toBe(true);
    expect(attempt.observeLiveStart(meetingId, secondStart, true)).toBeNull();

    const thirdStart = '2026-07-21T14:30:00.000Z';
    expect(attempt.observeLiveStart(meetingId, thirdStart, true)).toEqual(
      countdownFocusRequest(meetingId, 'b'.repeat(32), 'auto'),
    );
    expect(attempt.observeLiveStart(meetingId, thirdStart, true)).toBeNull();
  });

  test('rejects unsafe meeting, request, and live-start inputs before retention', () => {
    expect(() => new MeetingCountdownFocusAttempt(() => 'PRIVATE').beginManual(
      true,
      meetingId,
    )).toThrow('Invalid countdown request identifier.');
    const attempt = new MeetingCountdownFocusAttempt(() => 'a'.repeat(32));
    expect(() => attempt.beginManual(true, '../private')).toThrow(
      'Invalid meeting identifier.',
    );
    expect(() => attempt.observeLiveStart(
      meetingId,
      '2026-07-19T14:30:00Z',
      true,
    )).toThrow('Invalid live start.');
    expect(attempt.pendingRequestId()).toBeNull();
  });
});
