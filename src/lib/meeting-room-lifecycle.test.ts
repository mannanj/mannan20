import { describe, expect, test } from 'bun:test';
import {
  meetingRoomLifecycle,
  serverClockNowMs,
} from './meeting-room-lifecycle';

const base = {
  nowMs: Date.parse('2026-07-19T13:30:00.000Z'),
  role: 'participant',
  status: 'scheduled',
  schedule: {
    startsAt: '2026-07-19T14:00:00.000Z',
    endsAt: '2026-07-19T15:00:00.000Z',
  },
};

describe('meeting room lifecycle', () => {
  test('keeps early start owner-only before the scheduled instant', () => {
    expect(meetingRoomLifecycle({ ...base, role: 'owner' })).toEqual({
      phase: 'before-start',
      canStartEarly: true,
      canJoinMedia: false,
      secondsUntilStart: 1800,
    });
    expect(meetingRoomLifecycle(base)).toEqual({
      phase: 'before-start',
      canStartEarly: false,
      canJoinMedia: false,
      secondsUntilStart: 1800,
    });
  });

  test('opens at the scheduled instant without inventing a live session', () => {
    expect(
      meetingRoomLifecycle({
        ...base,
        nowMs: Date.parse(base.schedule.startsAt),
      }),
    ).toEqual({
      phase: 'open',
      canStartEarly: false,
      canJoinMedia: true,
    });
  });

  test('projects an active first-party live session', () => {
    expect(
      meetingRoomLifecycle({
        ...base,
        nowMs: Date.parse('2026-07-19T13:45:00.000Z'),
        session: {
          state: 'live',
          actualStartedAt: '2026-07-19T13:40:00.000Z',
          effectiveEndsAt: '2026-07-19T14:40:00.000Z',
        },
      }),
    ).toEqual({
      phase: 'live',
      canStartEarly: false,
      canJoinMedia: true,
    });
  });

  test('closes ended and expired live sessions', () => {
    const endedSession = {
      ...base,
      nowMs: Date.parse('2026-07-19T14:20:00.000Z'),
      session: {
        state: 'ended',
        actualStartedAt: '2026-07-19T13:40:00.000Z',
        effectiveEndsAt: '2026-07-19T14:40:00.000Z',
        actualEndedAt: '2026-07-19T14:10:00.000Z',
      },
    };
    expect(meetingRoomLifecycle(endedSession)).toEqual({
      phase: 'ended',
      canStartEarly: false,
      canJoinMedia: false,
    });
    expect(
      meetingRoomLifecycle({
        ...endedSession,
        nowMs: Date.parse('2026-07-19T14:40:00.000Z'),
        session: { ...endedSession.session, state: 'live' },
      }),
    ).toEqual({
      phase: 'ended',
      canStartEarly: false,
      canJoinMedia: false,
    });
  });

  test('fails closed for terminal status, invalid dates, and invalid time', () => {
    for (const input of [
      { ...base, status: 'cancelled' },
      { ...base, schedule: { ...base.schedule, startsAt: 'not-a-date' } },
      { ...base, nowMs: Number.NaN },
    ]) {
      expect(meetingRoomLifecycle(input)).toEqual({
        phase: 'ended',
        canStartEarly: false,
        canJoinMedia: false,
      });
    }
  });

  test('advances from server time using only non-negative monotonic elapsed time', () => {
    expect(
      serverClockNowMs({
        serverNow: '2026-07-19T13:59:55.000Z',
        receivedAtMs: 100,
        currentClientMs: 5_100,
      }),
    ).toBe(Date.parse('2026-07-19T14:00:00.000Z'));
    expect(
      serverClockNowMs({
        serverNow: '2026-07-19T13:59:55.000Z',
        receivedAtMs: 100,
        currentClientMs: 50,
      }),
    ).toBe(Date.parse('2026-07-19T13:59:55.000Z'));
    expect(
      serverClockNowMs({
        serverNow: 'invalid',
        receivedAtMs: 100,
        currentClientMs: 5_100,
      }),
    ).toBeNaN();
  });
});
