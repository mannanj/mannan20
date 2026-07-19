import { describe, expect, test } from 'bun:test';
import {
  MeetingLiveSessionError,
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
      )) as typeof fetch;

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
