import { describe, expect, test } from 'bun:test';
import {
  MeetingLiveSessionEndAttempt,
  MeetingLiveSessionError,
  endMeetingLiveSession,
  startMeetingLiveSession,
} from './meeting-live-session';

describe('meeting live-session client', () => {
  test('starts through the exact versioned same-origin route', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return Response.json({
        data: {
          sessionId: 'session_0123456789abcdef',
          actualStartedAt: '2026-07-19T13:30:00.000Z',
          effectiveEndsAt: '2026-07-19T14:30:00.000Z',
          version: 8,
        },
      });
    }) as typeof fetch;

    await expect(
      startMeetingLiveSession({
        meetingId: 'meeting_0123456789abcdef',
        version: 7,
        fetcher,
      }),
    ).resolves.toEqual({
      sessionId: 'session_0123456789abcdef',
      actualStartedAt: '2026-07-19T13:30:00.000Z',
      effectiveEndsAt: '2026-07-19T14:30:00.000Z',
      version: 8,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.input).toBe(
      '/meet/meeting_0123456789abcdef/api/live-session',
    );
    expect(requests[0]?.init).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'if-match': '"7"',
      },
      body: '{}',
    });
    expect(
      (requests[0]?.init?.headers as Record<string, string>)['idempotency-key'],
    ).toMatch(/^browser_start_[a-f0-9]{32}$/u);
  });

  test('preserves only the actionable conflict code from a failed request', async () => {
    const fetcher = (async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => Response.json(
        { error: { code: 'meeting_conflict', privateDetail: 'not exposed' } },
        { status: 409 },
      )) as unknown as typeof fetch;

    const error = await startMeetingLiveSession({
      meetingId: 'meeting_0123456789abcdef',
      version: 7,
      fetcher,
    }).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(MeetingLiveSessionError);
    expect(error).toMatchObject({ code: 'meeting_conflict' });
    expect(JSON.stringify(error)).not.toContain('privateDetail');
  });

  test('rejects malformed requests and responses', async () => {
    await expect(
      startMeetingLiveSession({
        meetingId: '../unsafe',
        version: 0,
      }),
    ).rejects.toMatchObject({ code: 'invalid_request' });

    const fetcher = (async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => Response.json({
        data: {
          sessionId: 'session_0123456789abcdef',
          actualStartedAt: 'yesterday',
          effectiveEndsAt: '2026-07-19T14:30:00.000Z',
          version: 7,
        },
      })) as typeof fetch;
    await expect(
      startMeetingLiveSession({
        meetingId: 'meeting_0123456789abcdef',
        version: 7,
        fetcher,
      }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
});

describe('meeting live-session end client', () => {
  test('ends through the exact bodyless versioned same-origin route', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return Response.json({
        data: {
          sessionId: 'session_0123456789abcdef',
          actualEndedAt: '2026-07-19T14:30:00.000Z',
          version: 8,
        },
      });
    }) as typeof fetch;

    await expect(endMeetingLiveSession({
      meetingId: 'meeting_0123456789abcdef',
      version: 7,
      idempotencyKey: 'browser_end_0123456789abcdef',
      fetcher,
    })).resolves.toEqual({
      sessionId: 'session_0123456789abcdef',
      actualEndedAt: '2026-07-19T14:30:00.000Z',
      version: 8,
    });

    expect(requests).toEqual([{
      input: '/meet/meeting_0123456789abcdef/api/live-session',
      init: {
        method: 'DELETE',
        headers: {
          'idempotency-key': 'browser_end_0123456789abcdef',
          'if-match': '"7"',
        },
      },
    }]);
  });

  test('preserves only actionable end failure codes', async () => {
    for (const code of ['meeting_conflict', 'dependency_unavailable'] as const) {
      const fetcher = (async () => Response.json(
        { error: { code, privateDetail: 'not exposed' } },
        { status: code === 'meeting_conflict' ? 409 : 503 },
      )) as unknown as typeof fetch;
      const error = await endMeetingLiveSession({
        meetingId: 'meeting_0123456789abcdef',
        version: 7,
        idempotencyKey: 'browser_end_0123456789abcdef',
        fetcher,
      }).catch((failure: unknown) => failure);

      expect(error).toBeInstanceOf(MeetingLiveSessionError);
      expect(error).toMatchObject({ code });
      expect(JSON.stringify(error)).not.toContain('privateDetail');
    }

    const unknown = (async () => Response.json(
      { error: { code: 'raw_provider_failure', secret: 'not exposed' } },
      { status: 502 },
    )) as unknown as typeof fetch;
    await expect(endMeetingLiveSession({
      meetingId: 'meeting_0123456789abcdef',
      version: 7,
      idempotencyKey: 'browser_end_0123456789abcdef',
      fetcher: unknown,
    })).rejects.toMatchObject({ code: 'request_failed' });
  });

  test('rejects malformed end input and non-exact or stale results', async () => {
    await expect(endMeetingLiveSession({
      meetingId: '../unsafe',
      version: 0,
      idempotencyKey: 'browser_start_wrong-boundary',
    })).rejects.toMatchObject({ code: 'invalid_request' });

    for (const data of [
      {
        sessionId: 'session_0123456789abcdef',
        actualEndedAt: 'not-an-instant',
        version: 8,
      },
      {
        sessionId: 'session_0123456789abcdef',
        actualEndedAt: '2026-07-19T14:30:00.000Z',
        version: 7,
      },
      {
        sessionId: 'session_0123456789abcdef',
        actualEndedAt: '2026-07-19T14:30:00.000Z',
        version: 8,
        provider: 'private',
      },
    ]) {
      const fetcher = (async () => Response.json({ data })) as unknown as typeof fetch;
      await expect(endMeetingLiveSession({
        meetingId: 'meeting_0123456789abcdef',
        version: 7,
        idempotencyKey: 'browser_end_0123456789abcdef',
        fetcher,
      })).rejects.toMatchObject({ code: 'invalid_response' });
    }
  });

  test('retains one end key across failure and clears it after terminal outcomes', () => {
    const keys = ['browser_end_first', 'browser_end_second'];
    const attempt = new MeetingLiveSessionEndAttempt(() => keys.shift()!);

    expect(attempt.begin()).toBe('browser_end_first');
    attempt.failed();
    expect(attempt.begin()).toBe('browser_end_first');
    attempt.complete();
    expect(attempt.begin()).toBe('browser_end_second');
    attempt.cancel();
    expect(attempt.current()).toBeNull();
  });
});
