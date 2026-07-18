import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGuestCandidateCookie, createPendingAccessCookie } from '@/lib/meeting-cookies';
import { createSiteSessionCookie } from '@/lib/site-session';
import { POST as enterMeeting } from './[meetingId]/api/entry/route';
import { GET as resolveShareLink } from './j/[secret]/route';

const originalFetch = globalThis.fetch;
const originalEnv = {
  url: process.env.MEETING_WORKER_URL,
  service: process.env.MEETING_SERVICE_SECRET,
  assertion: process.env.MEETING_ACCOUNT_ASSERTION_SECRET,
  session: process.env.MANNAN_SESSION_SECRET,
};
const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const ACCESS_SECRET = 'access:private-link-secret';

function cookieHeader(...cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

beforeEach(() => {
  process.env.MEETING_WORKER_URL = 'https://meeting-worker.example.workers.dev';
  process.env.MEETING_SERVICE_SECRET = 'site-to-worker-service-secret-at-least-32-bytes';
  process.env.MEETING_ACCOUNT_ASSERTION_SECRET = 'account-assertion-secret-at-least-32-bytes';
  process.env.MANNAN_SESSION_SECRET = 'site-session-secret-at-least-thirty-two-bytes';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    const name =
      key === 'url'
        ? 'MEETING_WORKER_URL'
        : key === 'service'
          ? 'MEETING_SERVICE_SECRET'
          : key === 'assertion'
            ? 'MEETING_ACCOUNT_ASSERTION_SECRET'
            : 'MANNAN_SESSION_SECRET';
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('meeting admission routes', () => {
  test('resolves a raw share URL into a clean meeting URL and scoped cookie', async () => {
    globalThis.fetch = mock(async (_input, init) => {
      expect(init?.body).toBe(JSON.stringify({ secret: ACCESS_SECRET }));
      return Response.json({ data: { meetingId: MEETING_ID } });
    }) as unknown as typeof fetch;

    const response = await resolveShareLink(
      new Request(`https://mannan.is/meet/j/${ACCESS_SECRET}`),
      { params: Promise.resolve({ secret: ACCESS_SECRET }) },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`https://mannan.is/meet/${MEETING_ID}`);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Secure-mannan-meeting-access=');
    expect(cookie).toContain(`Path=/meet/${MEETING_ID}`);
    expect(cookie).not.toContain(ACCESS_SECRET);
  });

  test('enters as a guest candidate and replaces temporary state with the issued credential', async () => {
    const access = createPendingAccessCookie({ meetingId: MEETING_ID, secret: ACCESS_SECRET });
    const candidate = createGuestCandidateCookie({ meetingId: MEETING_ID, displayName: 'River' });
    globalThis.fetch = mock(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.has('x-account-assertion')).toBe(false);
      expect(JSON.parse(String(init?.body))).toMatchObject({
        secret: ACCESS_SECRET,
        guestCandidate: {
          participantId: candidate.candidate.participantId,
          displayName: 'River',
        },
      });
      return Response.json(
        { data: { meetingId: MEETING_ID, guestCredential: 'guest:issued-credential', version: 2 } },
        { headers: { etag: '"2"' } },
      );
    }) as unknown as typeof fetch;

    const response = await enterMeeting(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/entry`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(access, candidate.cookie),
          'idempotency-key': 'entry_guest_1',
          'if-match': '"1"',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"2"');
    const cookies = response.headers.get('set-cookie') ?? '';
    expect(cookies).toContain('__Secure-mannan-meeting-candidate=;');
    expect(cookies).toContain('__Secure-mannan-meeting-guest=');
    expect(cookies).not.toContain('guest:issued-credential');
  });

  test('gives an active account precedence and omits guest candidate data', async () => {
    const access = createPendingAccessCookie({ meetingId: MEETING_ID, secret: ACCESS_SECRET });
    const candidate = createGuestCandidateCookie({ meetingId: MEETING_ID, displayName: 'River' });
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
    });
    globalThis.fetch = mock(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(JSON.parse(String(init?.body))).toEqual({ secret: ACCESS_SECRET });
      return Response.json({ data: { meetingId: MEETING_ID, version: 2 } });
    }) as unknown as typeof fetch;

    const response = await enterMeeting(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/entry`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(access, candidate.cookie, session),
          'idempotency-key': 'entry_account_1',
          'if-match': '"1"',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('__Secure-mannan-meeting-guest=;');
  });
});
