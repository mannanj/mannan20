import { describe, expect, test } from 'bun:test';
import { createMeetingInvite } from './meeting-invite';

describe('meeting private invite client', () => {
  test('binds expiry and authoritative version to one same-origin request', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return Response.json(
        {
          data: {
            accessLinkId: 'link_0123456789abcdef',
            secret: 'private_guest_secret_0123456789abcdef',
            expiresAt: '2026-07-19T15:00:00.000Z',
            version: 8,
          },
        },
        { status: 201 },
      );
    }) as typeof fetch;

    const result = await createMeetingInvite({
      meetingId: 'meeting_0123456789abcdef',
      version: 7,
      expiresAt: '2026-07-19T15:00:00.000Z',
      origin: 'https://mannan.is',
      idempotencyKey: 'browser_invite_0123456789abcdef',
      fetcher,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.input).toBe(
      '/meet/meeting_0123456789abcdef/api/access-links',
    );
    expect(requests[0]?.init).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'browser_invite_0123456789abcdef',
        'if-match': '"7"',
      },
      body: JSON.stringify({ expiresAt: '2026-07-19T15:00:00.000Z' }),
    });
    expect(result).toEqual({
      accessLinkId: 'link_0123456789abcdef',
      shareUrl:
        'https://mannan.is/meet/j/private_guest_secret_0123456789abcdef',
      expiresAt: '2026-07-19T15:00:00.000Z',
      version: 8,
    });
  });

  test('rejects an unsafe returned secret', async () => {
    const fetcher = (async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) =>
      Response.json(
        {
          data: {
            accessLinkId: 'link_0123456789abcdef',
            secret: '../not-a-secret',
            version: 8,
          },
        },
        { status: 201 },
      )) as typeof fetch;

    await expect(
      createMeetingInvite({
        meetingId: 'meeting_0123456789abcdef',
        version: 7,
        expiresAt: '2026-07-19T15:00:00.000Z',
        origin: 'https://mannan.is',
        fetcher,
      }),
    ).rejects.toThrow('Invalid invite response');
  });
});
