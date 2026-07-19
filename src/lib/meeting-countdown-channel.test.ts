import { describe, expect, test } from 'bun:test';
import {
  countdownFocusAck,
  countdownFocusRequest,
  countdownStateRequest,
  countdownStateSnapshot,
  meetingCountdownChannelName,
  meetingCountdownFocusCanAcknowledge,
  parseMeetingCountdownChannelMessage,
} from './meeting-countdown-channel';
import type { MeetingCountdownSnapshot } from './meeting-countdown-workspace';

const meetingId = '0123456789abcdef0123456789abcdef';
const requestId = 'a'.repeat(32);
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

describe('meeting countdown channel protocol', () => {
  test('creates and parses each exact versioned same-meeting message', () => {
    const messages = [
      countdownStateRequest(meetingId),
      countdownStateSnapshot(meetingId, snapshot),
      countdownFocusRequest(meetingId, requestId, 'manual'),
      countdownFocusRequest(meetingId, 'b'.repeat(32), 'auto'),
      countdownFocusAck(meetingId, requestId),
    ];
    for (const message of messages) {
      expect(parseMeetingCountdownChannelMessage(message, meetingId)).toEqual(message);
    }
    expect(messages).toEqual([
      { protocol: 1, type: 'state-request', meetingId },
      { protocol: 1, type: 'state-snapshot', meetingId, snapshot },
      { protocol: 1, type: 'focus-request', meetingId, requestId, reason: 'manual' },
      { protocol: 1, type: 'focus-request', meetingId, requestId: 'b'.repeat(32), reason: 'auto' },
      { protocol: 1, type: 'focus-ack', meetingId, requestId },
    ]);
  });

  test('rejects extra, unknown, cross-meeting, malformed ID, and malformed snapshot messages', () => {
    const otherMeeting = 'fedcba9876543210fedcba9876543210';
    const invalid = [
      { ...countdownStateRequest(meetingId), extra: true },
      { ...countdownStateRequest(meetingId), protocol: 2 },
      { ...countdownStateRequest(meetingId), meetingId: otherMeeting },
      { ...countdownStateRequest(meetingId), type: 'private-message' },
      { ...countdownFocusRequest(meetingId, requestId, 'manual'), requestId: 'A'.repeat(32) },
      { ...countdownFocusRequest(meetingId, requestId, 'manual'), requestId: 'a'.repeat(31) },
      { ...countdownFocusRequest(meetingId, requestId, 'manual'), reason: 'private-reason' },
      {
        ...countdownStateSnapshot(meetingId, snapshot),
        snapshot: { ...snapshot, title: 'x'.repeat(501) },
      },
      null,
      'private-message',
    ];
    for (const message of invalid) {
      expect(parseMeetingCountdownChannelMessage(message, meetingId)).toBeNull();
    }
  });

  test('uses one safe versioned channel name and strict focused-visible acknowledgement', () => {
    expect(meetingCountdownChannelName(meetingId)).toBe(
      `mannan.meet.countdown.v1.${meetingId}`,
    );
    expect(() => meetingCountdownChannelName('../private')).toThrow();
    expect(meetingCountdownFocusCanAcknowledge({
      hasFocus: true,
      visibilityState: 'visible',
    })).toBe(true);
    for (const input of [
      { hasFocus: false, visibilityState: 'visible' },
      { hasFocus: true, visibilityState: 'hidden' },
      { hasFocus: false, visibilityState: 'hidden' },
    ]) {
      expect(meetingCountdownFocusCanAcknowledge(input)).toBe(false);
    }
  });
});
