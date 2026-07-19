import { describe, expect, test } from 'bun:test';
import {
  MeetingCountdownMainCoordinator,
  type MeetingCountdownMainState,
} from './use-meeting-countdown-main-channel';
import {
  countdownFocusAck,
  countdownFocusRequest,
  countdownStateRequest,
  countdownStateSnapshot,
} from '@/lib/meeting-countdown-channel';
import {
  advanceMeetingCountdownSnapshot,
  type MeetingCountdownSnapshot,
} from '@/lib/meeting-countdown-workspace';

const meetingId = '0123456789abcdef0123456789abcdef';
const snapshot: MeetingCountdownSnapshot = {
  meetingId,
  title: 'Project review',
  status: 'scheduled',
  version: 4,
  serverNow: '2026-07-19T14:00:00.000Z',
  startsAt: '2026-07-19T15:00:00.000Z',
  endsAt: '2026-07-19T16:00:00.000Z',
  liveStartedAt: null,
};

function state(
  overrides: Partial<MeetingCountdownMainState> = {},
): MeetingCountdownMainState {
  return {
    snapshot,
    receivedAtMs: 100,
    currentClientMs: 5_100,
    focused: false,
    visible: true,
    ...overrides,
  };
}

describe('meeting countdown main coordinator', () => {
  test('answers state requests with a monotonic advanced authoritative snapshot', () => {
    const coordinator = new MeetingCountdownMainCoordinator(meetingId);
    expect(coordinator.receive(countdownStateRequest(meetingId), state())).toEqual([
      {
        type: 'post',
        message: countdownStateSnapshot(
          meetingId,
          advanceMeetingCountdownSnapshot(snapshot, 100, 5_100),
        ),
      },
    ]);
    expect(coordinator.receive(countdownStateRequest(meetingId), state({
      snapshot: null,
      receivedAtMs: null,
    }))).toEqual([]);
  });

  test('focuses best-effort and acknowledges only after focused-visible proof', () => {
    const coordinator = new MeetingCountdownMainCoordinator(meetingId);
    const request = countdownFocusRequest(
      meetingId,
      'a'.repeat(32),
      'manual',
    );
    expect(coordinator.receive(request, state())).toEqual([
      { type: 'focus-main-window' },
    ]);
    expect(coordinator.observeFocus({ focused: true, visible: false })).toEqual([]);
    expect(coordinator.observeFocus({ focused: false, visible: true })).toEqual([]);
    expect(coordinator.observeFocus({ focused: true, visible: true })).toEqual([
      {
        type: 'post',
        message: countdownFocusAck(meetingId, 'a'.repeat(32)),
      },
    ]);
    expect(coordinator.observeFocus({ focused: true, visible: true })).toEqual([]);
  });

  test('acknowledges immediately only when the receive observation is focused and visible', () => {
    const coordinator = new MeetingCountdownMainCoordinator(meetingId);
    const request = countdownFocusRequest(meetingId, 'a'.repeat(32), 'auto');
    expect(coordinator.receive(request, state({ focused: true }))).toEqual([
      { type: 'focus-main-window' },
      {
        type: 'post',
        message: countdownFocusAck(meetingId, 'a'.repeat(32)),
      },
    ]);
  });

  test('retries the same pending focus but ignores a different request until ack', () => {
    const coordinator = new MeetingCountdownMainCoordinator(meetingId);
    const first = countdownFocusRequest(meetingId, 'a'.repeat(32), 'manual');
    const second = countdownFocusRequest(meetingId, 'b'.repeat(32), 'manual');
    expect(coordinator.receive(first, state())).toEqual([
      { type: 'focus-main-window' },
    ]);
    expect(coordinator.receive(first, state())).toEqual([
      { type: 'focus-main-window' },
    ]);
    expect(coordinator.receive(second, state())).toEqual([]);
    expect(coordinator.observeFocus({ focused: true, visible: true })).toEqual([
      { type: 'post', message: countdownFocusAck(meetingId, 'a'.repeat(32)) },
    ]);
    expect(coordinator.receive(second, state())).toEqual([
      { type: 'focus-main-window' },
    ]);
  });

  test('ignores malformed, cross-meeting, and non-request protocol input', () => {
    const coordinator = new MeetingCountdownMainCoordinator(meetingId);
    for (const message of [
      { ...countdownStateRequest(meetingId), extra: 'private' },
      countdownStateRequest('fedcba9876543210fedcba9876543210'),
      countdownStateSnapshot(meetingId, snapshot),
      countdownFocusAck(meetingId, 'a'.repeat(32)),
      null,
    ]) {
      expect(coordinator.receive(message, state())).toEqual([]);
    }
  });
});
