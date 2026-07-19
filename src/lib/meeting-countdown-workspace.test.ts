import { describe, expect, mock, test } from 'bun:test';
import {
  MeetingCountdownLoadError,
  advanceMeetingCountdownSnapshot,
  loadMeetingCountdownSnapshot,
  meetingCountdownSnapshotFromWorkspace,
  parseMeetingCountdownSnapshot,
  preferMeetingCountdownSnapshot,
  type MeetingCountdownSnapshot,
} from './meeting-countdown-workspace';

const meetingId = '0123456789abcdef0123456789abcdef';
const workspace = {
  meetingId,
  version: 4,
  serverNow: '2026-07-19T14:00:00.000Z',
  title: 'Project review',
  status: 'scheduled',
  schedule: {
    startsAt: '2026-07-19T15:00:00.000Z',
    endsAt: '2026-07-19T16:00:00.000Z',
    durationSeconds: 3_600,
  },
  currentParticipant: {
    participantId: 'owner-1',
    role: 'owner',
  },
  participants: [{
    participantId: 'owner-1',
    role: 'owner',
    identityKind: 'account',
  }],
};

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

function json(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('meeting countdown workspace snapshot', () => {
  test('extracts the exact bounded scheduled and live projections', () => {
    expect(parseMeetingCountdownSnapshot(workspace, meetingId)).toEqual(snapshot);
    expect(parseMeetingCountdownSnapshot({
      ...workspace,
      version: 5,
      serverNow: '2026-07-19T14:30:00.000Z',
      session: {
        state: 'live',
        actualStartedAt: '2026-07-19T14:29:00.000Z',
        effectiveEndsAt: '2026-07-19T15:29:00.000Z',
      },
      duration: {
        maximumEndsAt: '2026-07-19T17:29:00.000Z',
        remainingAllowanceSeconds: 7_200,
      },
    }, meetingId)).toEqual({
      ...snapshot,
      version: 5,
      serverNow: '2026-07-19T14:30:00.000Z',
      liveStartedAt: '2026-07-19T14:29:00.000Z',
    });
  });

  test('rejects mismatched, unknown, unsafe, and incoherent workspace fields', () => {
    const invalid = [
      { ...workspace, meetingId: 'fedcba9876543210fedcba9876543210' },
      { ...workspace, extra: true },
      { ...workspace, version: 0 },
      { ...workspace, version: Number.MAX_SAFE_INTEGER + 1 },
      { ...workspace, serverNow: '2026-07-19T14:00:00Z' },
      { ...workspace, schedule: { ...workspace.schedule, startsAt: 'invalid' } },
      { ...workspace, schedule: { ...workspace.schedule, endsAt: workspace.schedule.startsAt } },
      { ...workspace, status: 'private-status' },
      { ...workspace, title: 'x'.repeat(501) },
      { ...workspace, currentParticipant: { ...workspace.currentParticipant, extra: true } },
      {
        ...workspace,
        currentParticipant: { participantId: 'missing-1', role: 'participant' },
      },
      {
        ...workspace,
        participants: [...workspace.participants, workspace.participants[0]],
      },
      { ...workspace, participants: [{ ...workspace.participants[0], extra: true }] },
      {
        ...workspace,
        session: {
          state: 'live',
          actualStartedAt: '2026-07-19T14:30:00.000Z',
          effectiveEndsAt: '2026-07-19T14:29:00.000Z',
        },
      },
      {
        ...workspace,
        status: 'ended',
        session: {
          state: 'ended',
          actualStartedAt: '2026-07-19T14:00:00.000Z',
          effectiveEndsAt: '2026-07-19T15:00:00.000Z',
        },
      },
    ];
    for (const value of invalid) {
      expect(() => parseMeetingCountdownSnapshot(value, meetingId)).toThrow(
        MeetingCountdownLoadError,
      );
    }
  });

  test('advances a sample monotonically and accepts only non-older snapshots', () => {
    expect(
      advanceMeetingCountdownSnapshot(snapshot, 100, 5_100),
    ).toEqual({
      ...snapshot,
      serverNow: '2026-07-19T14:00:05.000Z',
    });
    expect(
      advanceMeetingCountdownSnapshot(snapshot, 100, 50),
    ).toBe(snapshot);

    const later = {
      ...snapshot,
      serverNow: '2026-07-19T14:00:15.000Z',
    };
    expect(preferMeetingCountdownSnapshot(snapshot, later)).toBe(later);
    expect(preferMeetingCountdownSnapshot(later, snapshot)).toBe(later);
    expect(preferMeetingCountdownSnapshot(later, {
      ...later,
      version: 3,
      serverNow: '2026-07-19T14:00:30.000Z',
    })).toBe(later);
    expect(preferMeetingCountdownSnapshot(later, {
      ...later,
      version: 5,
      serverNow: '2026-07-19T14:00:14.000Z',
    })).toBe(later);
  });

  test('extracts known optimistic main-window live and terminal transitions', () => {
    const optimisticLive = {
      ...workspace,
      version: 5,
      session: {
        state: 'live',
        actualStartedAt: '2026-07-19T14:30:00.000Z',
        effectiveEndsAt: '2026-07-19T15:30:00.000Z',
      },
    };
    expect(() => parseMeetingCountdownSnapshot(
      optimisticLive,
      meetingId,
    )).toThrow(MeetingCountdownLoadError);
    expect(meetingCountdownSnapshotFromWorkspace(
      optimisticLive,
      meetingId,
    )).toMatchObject({
      version: 5,
      status: 'scheduled',
      liveStartedAt: '2026-07-19T14:30:00.000Z',
    });

    const optimisticEnded = {
      ...optimisticLive,
      status: 'ended',
      session: {
        ...optimisticLive.session,
        state: 'ended',
        actualEndedAt: '2026-07-19T14:45:00.000Z',
      },
      duration: {
        maximumEndsAt: '2026-07-19T17:30:00.000Z',
        remainingAllowanceSeconds: 7_200,
      },
    };
    expect(meetingCountdownSnapshotFromWorkspace(
      optimisticEnded,
      meetingId,
    )).toMatchObject({
      status: 'ended',
      liveStartedAt: null,
    });
  });
});

describe('meeting countdown workspace client', () => {
  test('loads the exact no-store workspace and records monotonic receipt time', async () => {
    const fetchImpl = mock(async () => json({ data: workspace }));
    await expect(loadMeetingCountdownSnapshot({
      meetingId,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      receivedAtMs: () => 125,
    })).resolves.toEqual({ snapshot, receivedAtMs: 125 });
    expect(fetchImpl).toHaveBeenCalledWith(
      `/meet/${meetingId}/api/workspace`,
      { cache: 'no-store' },
    );
  });

  test('rejects redirects, non-success, malformed, unknown, and oversized responses', async () => {
    const cases: Array<() => Promise<Response>> = [
      async () => json({ data: workspace }, { status: 302 }),
      async () => json({ error: { code: 'meeting_unavailable' } }, { status: 404 }),
      async () => new Response('{', { status: 200 }),
      async () => json({ data: workspace, extra: true }),
      async () => json({ data: { ...workspace, extra: true } }),
      async () => json({ data: workspace, padding: 'x'.repeat(66 * 1_024) }),
    ];
    for (const createResponse of cases) {
      await expect(loadMeetingCountdownSnapshot({
        meetingId,
        fetchImpl: (async () => createResponse()) as unknown as typeof fetch,
        receivedAtMs: () => 125,
      })).rejects.toBeInstanceOf(MeetingCountdownLoadError);
    }
  });

  test('uses stable private-safe load errors for network and response failures', async () => {
    const privateDetail = 'private network response detail';
    for (const input of [
      {
        fetchImpl: (async () => {
          throw new Error(privateDetail);
        }) as unknown as typeof fetch,
        code: 'unavailable',
      },
      {
        fetchImpl: (async () => json({
          data: { ...workspace, extra: privateDetail },
        })) as unknown as typeof fetch,
        code: 'invalid_response',
      },
    ] as const) {
      try {
        await loadMeetingCountdownSnapshot({
          meetingId,
          fetchImpl: input.fetchImpl,
          receivedAtMs: () => 125,
        });
        throw new Error('expected load to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(MeetingCountdownLoadError);
        expect((error as MeetingCountdownLoadError).code).toBe(input.code);
        expect(String(error)).not.toContain(privateDetail);
        expect(JSON.stringify(error)).not.toContain(privateDetail);
      }
    }
  });
});
