import { describe, expect, test } from 'bun:test';
import {
  MeetingCountdownStateError,
  meetingCountdownView,
  type MeetingCountdownClockInput,
} from './meeting-countdown';

const STARTS_AT = '2026-07-19T15:00:00.000Z';

function inputAt(signedSeconds: number): MeetingCountdownClockInput {
  return {
    serverNow: new Date(
      Date.parse(STARTS_AT) - signedSeconds * 1_000,
    ).toISOString(),
    receivedAtMs: 100,
    currentClientMs: 100,
    startsAt: STARTS_AT,
  };
}

describe('meeting countdown view', () => {
  test('uses compact rounded time above five minutes and precise time at the threshold', () => {
    expect(meetingCountdownView(inputAt(3_961))).toEqual({
      signedSeconds: 3_961,
      label: 'Starts in 1 hr 7 min',
      accessibleLabel: '1 hour 6 minutes 1 second until start',
      precise: false,
    });
    expect(meetingCountdownView(inputAt(301))).toEqual({
      signedSeconds: 301,
      label: 'Starts in 6 min',
      accessibleLabel: '5 minutes 1 second until start',
      precise: false,
    });
    expect(meetingCountdownView(inputAt(300))).toEqual({
      signedSeconds: 300,
      label: '05:00',
      accessibleLabel: '5 minutes until start',
      precise: true,
    });
    expect(meetingCountdownView(inputAt(1))).toEqual({
      signedSeconds: 1,
      label: '00:01',
      accessibleLabel: '1 second until start',
      precise: true,
    });
    expect(meetingCountdownView(inputAt(0))).toEqual({
      signedSeconds: 0,
      label: '00:00',
      accessibleLabel: 'Scheduled start is now',
      precise: true,
    });
  });

  test('advances from server time with non-negative monotonic elapsed time', () => {
    expect(meetingCountdownView({
      ...inputAt(305),
      currentClientMs: 4_100,
    })).toMatchObject({
      signedSeconds: 301,
      label: 'Starts in 6 min',
    });
    expect(meetingCountdownView({
      ...inputAt(305),
      currentClientMs: 50,
    })).toMatchObject({
      signedSeconds: 305,
      label: 'Starts in 6 min',
    });
  });

  test('continues through zero as unbounded signed elapsed time', () => {
    expect(meetingCountdownView(inputAt(-1))).toEqual({
      signedSeconds: -1,
      label: '-00:01',
      accessibleLabel: '1 second since scheduled start',
      precise: true,
    });
    expect(meetingCountdownView(inputAt(-300))).toMatchObject({
      signedSeconds: -300,
      label: '-05:00',
      accessibleLabel: '5 minutes since scheduled start',
    });
    expect(
      meetingCountdownView(inputAt(-(27 * 3_600 + 14 * 60 + 9))),
    ).toEqual({
      signedSeconds: -(27 * 3_600 + 14 * 60 + 9),
      label: '-27:14:09',
      accessibleLabel: '27 hours 14 minutes 9 seconds since scheduled start',
      precise: true,
    });
  });

  test('formats exact units and pluralization without a 24-hour rollover', () => {
    expect(meetingCountdownView(inputAt(3_600))).toEqual({
      signedSeconds: 3_600,
      label: 'Starts in 1 hr',
      accessibleLabel: '1 hour until start',
      precise: false,
    });
    expect(meetingCountdownView(inputAt(61)).accessibleLabel).toBe(
      '1 minute 1 second until start',
    );
    expect(meetingCountdownView(inputAt(-3_661)).label).toBe('-01:01:01');
  });

  test('rejects noncanonical timestamps and non-finite monotonic state', () => {
    for (const input of [
      { ...inputAt(60), serverNow: '2026-07-19T14:59:00Z' },
      { ...inputAt(60), startsAt: 'invalid' },
      { ...inputAt(60), receivedAtMs: Number.NaN },
      { ...inputAt(60), currentClientMs: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => meetingCountdownView(input)).toThrow(
        MeetingCountdownStateError,
      );
    }
  });
});
