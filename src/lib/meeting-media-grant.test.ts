import { describe, expect, mock, test } from 'bun:test';
import {
  MeetingMediaGrantError,
  requestMeetingMediaGrant,
} from './meeting-media-grant';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';

describe('meeting media grant client', () => {
  test('requests one strict no-store same-origin grant without a browser body', async () => {
    const fetcher = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`/meet/${MEETING_ID}/api/media-grant`);
      expect(init).toMatchObject({
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      expect(init?.body).toBeUndefined();
      expect(new Headers(init?.headers).get('accept')).toBe('application/json');
      return Response.json({
        data: { provider: 'realtimekit', authToken: 'memory-only-token' },
      });
    }) as unknown as typeof fetch;

    await expect(requestMeetingMediaGrant(MEETING_ID, fetcher)).resolves.toEqual({
      provider: 'realtimekit',
      authToken: 'memory-only-token',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test.each([
    [{ data: { provider: 'other', authToken: 'token' } }, 'invalid_response'],
    [{ data: { provider: 'realtimekit', authToken: 'spaces are invalid' } }, 'invalid_response'],
    [{ data: { provider: 'realtimekit', authToken: 'x'.repeat(8193) } }, 'invalid_response'],
    [{ data: { provider: 'realtimekit', authToken: 'token', extra: true } }, 'invalid_response'],
  ])('rejects malformed success data without returning its value', async (body, code) => {
    const fetcher = mock(async () => Response.json(body)) as unknown as typeof fetch;
    const error = await requestMeetingMediaGrant(MEETING_ID, fetcher).catch((reason) => reason);
    expect(error).toBeInstanceOf(MeetingMediaGrantError);
    expect(error.code).toBe(code);
    expect(JSON.stringify(error)).not.toContain('spaces are invalid');
  });

  test.each([
    [401, 'identity_required'],
    [409, 'media_not_open'],
    [410, 'meeting_ended'],
    [503, 'dependency_unavailable'],
  ])('maps HTTP %i to stable code %s', async (status, code) => {
    const fetcher = mock(async () => Response.json(
      { error: { code, detail: 'private-token-value' } },
      { status },
    )) as unknown as typeof fetch;

    const error = await requestMeetingMediaGrant(MEETING_ID, fetcher).catch((reason) => reason);
    expect(error).toBeInstanceOf(MeetingMediaGrantError);
    expect(error.code).toBe(code);
    expect(error.message).not.toContain('private-token-value');
    expect(JSON.stringify(error)).not.toContain('private-token-value');
  });

  test('fails closed on an invalid identifier, oversized response, or network error', async () => {
    const fetcher = mock(async () => new Response(`{"data":"${'x'.repeat(17 * 1024)}"}`)) as unknown as typeof fetch;
    await expect(requestMeetingMediaGrant('../private', fetcher)).rejects.toMatchObject({
      code: 'invalid_request',
    });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(requestMeetingMediaGrant(MEETING_ID, fetcher)).rejects.toMatchObject({
      code: 'invalid_response',
    });
    const failed = mock(async () => {
      throw new Error('network contains private-token-value');
    }) as unknown as typeof fetch;
    const error = await requestMeetingMediaGrant(MEETING_ID, failed).catch((reason) => reason);
    expect(error).toMatchObject({ code: 'dependency_unavailable' });
    expect(error.message).not.toContain('private-token-value');
  });
});
