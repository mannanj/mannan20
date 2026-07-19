import { validMeetingIdentifier } from './meeting-identifier';
import {
  parseMeetingCountdownSnapshotValue,
  type MeetingCountdownSnapshot,
} from './meeting-countdown-workspace';

const REQUEST_ID_RE = /^[a-f0-9]{32}$/u;

export type MeetingCountdownChannelMessage =
  | {
      readonly protocol: 1;
      readonly type: 'state-request';
      readonly meetingId: string;
    }
  | {
      readonly protocol: 1;
      readonly type: 'state-snapshot';
      readonly meetingId: string;
      readonly snapshot: MeetingCountdownSnapshot;
    }
  | {
      readonly protocol: 1;
      readonly type: 'focus-request';
      readonly meetingId: string;
      readonly requestId: string;
      readonly reason: 'manual' | 'auto';
    }
  | {
      readonly protocol: 1;
      readonly type: 'focus-ack';
      readonly meetingId: string;
      readonly requestId: string;
    };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length
    && actual.every((key, index) => key === sorted[index]);
}

function requireMeetingId(meetingId: string): void {
  if (!validMeetingIdentifier(meetingId)) {
    throw new Error('Invalid meeting identifier.');
  }
}

function requireRequestId(requestId: string): void {
  if (!REQUEST_ID_RE.test(requestId)) {
    throw new Error('Invalid countdown request identifier.');
  }
}

export function meetingCountdownChannelName(meetingId: string): string {
  requireMeetingId(meetingId);
  return `mannan.meet.countdown.v1.${meetingId}`;
}

export function countdownStateRequest(
  meetingId: string,
): MeetingCountdownChannelMessage {
  requireMeetingId(meetingId);
  return { protocol: 1, type: 'state-request', meetingId };
}

export function countdownStateSnapshot(
  meetingId: string,
  snapshot: MeetingCountdownSnapshot,
): MeetingCountdownChannelMessage {
  requireMeetingId(meetingId);
  return {
    protocol: 1,
    type: 'state-snapshot',
    meetingId,
    snapshot: parseMeetingCountdownSnapshotValue(snapshot, meetingId),
  };
}

export function countdownFocusRequest(
  meetingId: string,
  requestId: string,
  reason: 'manual' | 'auto',
): MeetingCountdownChannelMessage {
  requireMeetingId(meetingId);
  requireRequestId(requestId);
  if (reason !== 'manual' && reason !== 'auto') {
    throw new Error('Invalid countdown focus reason.');
  }
  return { protocol: 1, type: 'focus-request', meetingId, requestId, reason };
}

export function countdownFocusAck(
  meetingId: string,
  requestId: string,
): MeetingCountdownChannelMessage {
  requireMeetingId(meetingId);
  requireRequestId(requestId);
  return { protocol: 1, type: 'focus-ack', meetingId, requestId };
}

export function parseMeetingCountdownChannelMessage(
  value: unknown,
  expectedMeetingId: string,
): MeetingCountdownChannelMessage | null {
  if (!validMeetingIdentifier(expectedMeetingId)) return null;
  const message = record(value);
  if (
    message === null
    || message.protocol !== 1
    || message.meetingId !== expectedMeetingId
  ) return null;
  if (message.type === 'state-request') {
    return exactKeys(message, ['protocol', 'type', 'meetingId'])
      ? { protocol: 1, type: 'state-request', meetingId: expectedMeetingId }
      : null;
  }
  if (message.type === 'state-snapshot') {
    if (!exactKeys(message, ['protocol', 'type', 'meetingId', 'snapshot'])) {
      return null;
    }
    try {
      return {
        protocol: 1,
        type: 'state-snapshot',
        meetingId: expectedMeetingId,
        snapshot: parseMeetingCountdownSnapshotValue(
          message.snapshot,
          expectedMeetingId,
        ),
      };
    } catch {
      return null;
    }
  }
  if (message.type === 'focus-request') {
    if (
      !exactKeys(message, [
        'protocol',
        'type',
        'meetingId',
        'requestId',
        'reason',
      ])
      || typeof message.requestId !== 'string'
      || !REQUEST_ID_RE.test(message.requestId)
      || (message.reason !== 'manual' && message.reason !== 'auto')
    ) return null;
    return {
      protocol: 1,
      type: 'focus-request',
      meetingId: expectedMeetingId,
      requestId: message.requestId,
      reason: message.reason,
    };
  }
  if (message.type === 'focus-ack') {
    if (
      !exactKeys(message, ['protocol', 'type', 'meetingId', 'requestId'])
      || typeof message.requestId !== 'string'
      || !REQUEST_ID_RE.test(message.requestId)
    ) return null;
    return {
      protocol: 1,
      type: 'focus-ack',
      meetingId: expectedMeetingId,
      requestId: message.requestId,
    };
  }
  return null;
}

export function meetingCountdownFocusCanAcknowledge(input: {
  readonly hasFocus: boolean;
  readonly visibilityState: string;
}): boolean {
  return input.hasFocus && input.visibilityState === 'visible';
}
