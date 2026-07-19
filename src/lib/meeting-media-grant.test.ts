import { describe, expect, mock, test } from 'bun:test';
import {
  MeetingMediaGrantError,
  requestMeetingMediaGrant,
} from './meeting-media-grant';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';
const COMMAND_KEY = 'browser_media_0123456789abcdef';
const ACTIVATED_DATA = {
  provider: 'realtimekit',
  authToken: 'private-token',
  meetingVersion: 8,
  session: {
    sessionId: 'session_0123456789abcdef',
    actualStartedAt: '2026-07-19T14:00:01.000Z',
    effectiveEndsAt: '2026-07-19T15:00:00.000Z',
  },
} as const;

function request(fetcher: typeof fetch) {
  return requestMeetingMediaGrant({
    meetingId: MEETING_ID,
    expectedVersion: 7,
    idempotencyKey: COMMAND_KEY,
    fetcher,
  });
}

describe('meeting media grant client', () => {
  test('sends one versioned command and returns exact activation metadata', async () => {
    const fetcher = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`/meet/${MEETING_ID}/api/media-grant`);
      expect(init).toMatchObject({
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'error',
      });
      expect(init?.body).toBeUndefined();
      expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
        accept: 'application/json',
        'idempotency-key': COMMAND_KEY,
        'if-match': '"7"',
      });
      return Response.json({ data: ACTIVATED_DATA });
    }) as unknown as typeof fetch;

    await expect(request(fetcher)).resolves.toEqual(ACTIVATED_DATA);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test.each([
    { data: { ...ACTIVATED_DATA, provider: 'other' } },
    { data: { ...ACTIVATED_DATA, authToken: 'spaces are invalid' } },
    { data: { ...ACTIVATED_DATA, authToken: 'x'.repeat(8193) } },
    { data: { ...ACTIVATED_DATA, meetingVersion: 0 } },
    { data: { ...ACTIVATED_DATA, meetingVersion: Number.MAX_SAFE_INTEGER + 1 } },
    { data: { ...ACTIVATED_DATA, session: { ...ACTIVATED_DATA.session, sessionId: '../private' } } },
    { data: { ...ACTIVATED_DATA, session: { ...ACTIVATED_DATA.session, actualStartedAt: 'not-an-instant' } } },
    { data: { ...ACTIVATED_DATA, session: { ...ACTIVATED_DATA.session, effectiveEndsAt: '2026-07-19T14:00:01.000Z' } } },
    { data: { ...ACTIVATED_DATA, session: { ...ACTIVATED_DATA.session, extra: true } } },
    { data: { ...ACTIVATED_DATA, extra: true } },
    { data: ACTIVATED_DATA, extra: true },
  ])('rejects malformed activation data without returning its values', async (body) => {
    const fetcher = mock(async () => Response.json(body)) as unknown as typeof fetch;
    const error = await request(fetcher).catch((reason) => reason);
    expect(error).toBeInstanceOf(MeetingMediaGrantError);
    expect(error.code).toBe('invalid_response');
    expect(JSON.stringify(error)).not.toContain('spaces are invalid');
  });

  test('preserves the stable meeting conflict code from the Worker envelope', async () => {
    const fetcher = mock(async () => Response.json(
      { error: { code: 'meeting_conflict', detail: 'private-token-value' } },
      { status: 409 },
    )) as unknown as typeof fetch;

    const error = await request(fetcher).catch((reason) => reason);
    expect(error).toBeInstanceOf(MeetingMediaGrantError);
    expect(error.code).toBe('meeting_conflict');
    expect(error.message).not.toContain('private-token-value');
    expect(JSON.stringify(error)).not.toContain('private-token-value');
  });

  test.each([
    [401, 'identity_required'],
    [409, 'media_not_open'],
    [410, 'meeting_ended'],
    [503, 'dependency_unavailable'],
  ])('maps HTTP %i to stable code %s', async (status, code) => {
    const fetcher = mock(async () => Response.json(
      { error: { code: 'meeting_not_started', detail: 'private-token-value' } },
      { status },
    )) as unknown as typeof fetch;

    const error = await request(fetcher).catch((reason) => reason);
    expect(error).toBeInstanceOf(MeetingMediaGrantError);
    expect(error.code).toBe(code);
    expect(error.message).not.toContain('private-token-value');
    expect(JSON.stringify(error)).not.toContain('private-token-value');
  });

  test('fails closed on invalid command input before fetch', async () => {
    const fetcher = mock(async () => Response.json({ data: ACTIVATED_DATA })) as unknown as typeof fetch;
    for (const input of [
      { meetingId: '../private', expectedVersion: 7, idempotencyKey: COMMAND_KEY },
      { meetingId: MEETING_ID, expectedVersion: 0, idempotencyKey: COMMAND_KEY },
      { meetingId: MEETING_ID, expectedVersion: 7, idempotencyKey: 'wrong_prefix' },
    ]) {
      await expect(requestMeetingMediaGrant({ ...input, fetcher })).rejects.toMatchObject({
        code: 'invalid_request',
      });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('fails closed on an oversized response or network error', async () => {
    const oversized = mock(async () =>
      new Response(`{"data":"${'x'.repeat(17 * 1024)}"}`)
    ) as unknown as typeof fetch;
    await expect(request(oversized)).rejects.toMatchObject({
      code: 'invalid_response',
    });

    const failed = mock(async () => {
      throw new Error('network contains private-token-value');
    }) as unknown as typeof fetch;
    const error = await request(failed).catch((reason) => reason);
    expect(error).toMatchObject({ code: 'dependency_unavailable' });
    expect(error.message).not.toContain('private-token-value');
  });
});
