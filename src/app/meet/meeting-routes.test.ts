import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGuestCandidateCookie,
  createGuestCredentialCookie,
  createPendingAccessCookie,
} from '@/lib/meeting-cookies';
import { createSiteSessionCookie } from '@/lib/site-session';
import {
  DELETE as deleteMeetingOperation,
  POST as meetingOperation,
} from './[meetingId]/api/[...operation]/route';
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
      return Response.json({ data: { meetingId: MEETING_ID, version: 4 } });
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
    const access = createPendingAccessCookie({
      meetingId: MEETING_ID,
      secret: ACCESS_SECRET,
      version: 1,
    });
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
    const access = createPendingAccessCookie({
      meetingId: MEETING_ID,
      secret: ACCESS_SECRET,
      version: 1,
    });
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

describe('meeting media-grant route', () => {
  test('derives an account display name from the active site session', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/media-grant`,
      );
      const headers = new Headers(init?.headers);
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(headers.has('x-guest-credential')).toBe(false);
      expect(JSON.parse(String(init?.body))).toEqual({
        displayName: 'owner@example.com',
      });
      return Response.json({
        data: { provider: 'realtimekit', authToken: 'test-token' },
      });
    }) as unknown as typeof fetch;

    const response = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'Mallory' }),
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      data: { provider: 'realtimekit', authToken: 'test-token' },
    });
  });

  test('derives a guest display name without exposing its credential to JavaScript', async () => {
    const guest = createGuestCredentialCookie({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      displayName: 'River',
      credential: 'guest:issued-credential',
    });
    globalThis.fetch = mock(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.has('x-account-assertion')).toBe(false);
      expect(headers.get('x-guest-participant-id')).toBe(
        'guest_0123456789abcdef0123456789abcdef',
      );
      expect(headers.get('x-guest-credential')).toBe('guest:issued-credential');
      expect(JSON.parse(String(init?.body))).toEqual({ displayName: 'River' });
      return Response.json({
        data: { provider: 'realtimekit', authToken: 'guest-test-token' },
      });
    }) as unknown as typeof fetch;

    const response = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(guest),
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('guest:issued-credential');
  });

  test('requires same-origin active account or guest identity', async () => {
    const crossOrigin = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
        method: 'POST',
        headers: { origin: 'https://attacker.example' },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );
    expect(crossOrigin.status).toBe(403);

    const anonymous = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
        method: 'POST',
        headers: { origin: 'https://mannan.is' },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );
    expect(anonymous.status).toBe(401);
  });
});

describe('meeting participant removal route', () => {
  test('proxies one bodyless same-origin account deletion with concurrency headers', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/participants/guest_1`,
      );
      expect(init?.method).toBe('DELETE');
      expect(init?.body).toBeUndefined();
      const headers = new Headers(init?.headers);
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(headers.get('if-match')).toBe('"7"');
      expect(headers.get('idempotency-key')).toBe('browser_remove_0123456789abcdef');
      return Response.json({
        data: { membershipIntervalId: 'membership_1', version: 8 },
      }, { headers: { etag: '"8"' } });
    }) as unknown as typeof fetch;

    const response = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/participants/guest_1`, {
        method: 'DELETE',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'if-match': '"7"',
          'idempotency-key': 'browser_remove_0123456789abcdef',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['participants', 'guest_1'] }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { membershipIntervalId: 'membership_1', version: 8 },
    });
  });

  test('rejects guests and cross-origin participant deletion before the Worker', async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: {} });
    }) as unknown as typeof fetch;
    const context = {
      params: Promise.resolve({ meetingId: MEETING_ID, operation: ['participants', 'guest_1'] }),
    };
    const crossOrigin = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/participants/guest_1`, {
        method: 'DELETE',
        headers: { origin: 'https://attacker.example' },
      }),
      context,
    );
    const anonymous = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/participants/guest_1`, {
        method: 'DELETE',
        headers: { origin: 'https://mannan.is' },
      }),
      context,
    );
    expect(crossOrigin.status).toBe(403);
    expect(anonymous.status).toBe(401);
    expect(calls).toBe(0);
  });
});

describe('meeting live-session end route', () => {
  test('proxies one bodyless same-origin account deletion with concurrency headers', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/live-session`,
      );
      expect(init?.method).toBe('DELETE');
      expect(init?.body).toBeUndefined();
      const headers = new Headers(init?.headers);
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(headers.get('if-match')).toBe('"7"');
      expect(headers.get('idempotency-key')).toBe('browser_end_0123456789abcdef');
      expect(headers.has('content-type')).toBe(false);
      return Response.json({
        data: {
          sessionId: 'session_0123456789abcdef',
          actualEndedAt: '2026-07-19T14:30:00.000Z',
          version: 8,
        },
      }, { headers: { etag: '"8"' } });
    }) as unknown as typeof fetch;

    const response = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session`, {
        method: 'DELETE',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'if-match': '"7"',
          'idempotency-key': 'browser_end_0123456789abcdef',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['live-session'] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        sessionId: 'session_0123456789abcdef',
        actualEndedAt: '2026-07-19T14:30:00.000Z',
        version: 8,
      },
    });
  });

  test('rejects non-account, cross-origin, body-bearing, and extra-path deletion before the Worker', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    const guest = createGuestCredentialCookie({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      displayName: 'River',
      credential: 'guest:issued-credential',
    });
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: {} });
    }) as unknown as typeof fetch;
    const context = {
      params: Promise.resolve({ meetingId: MEETING_ID, operation: ['live-session'] }),
    };

    const crossOrigin = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session`, {
        method: 'DELETE',
        headers: { origin: 'https://attacker.example', cookie: cookieHeader(session) },
      }),
      context,
    );
    const anonymous = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session`, {
        method: 'DELETE',
        headers: { origin: 'https://mannan.is' },
      }),
      context,
    );
    const guestRequest = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session`, {
        method: 'DELETE',
        headers: { origin: 'https://mannan.is', cookie: cookieHeader(guest) },
      }),
      context,
    );
    const bodyBearing = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session`, {
        method: 'DELETE',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'content-type': 'application/json',
        },
        body: '{}',
      }),
      context,
    );
    const extraPath = await deleteMeetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session/extra`, {
        method: 'DELETE',
        headers: { origin: 'https://mannan.is', cookie: cookieHeader(session) },
      }),
      {
        params: Promise.resolve({
          meetingId: MEETING_ID,
          operation: ['live-session', 'extra'],
        }),
      },
    );

    expect(crossOrigin.status).toBe(403);
    expect(anonymous.status).toBe(401);
    expect(guestRequest.status).toBe(401);
    expect(bodyBearing.status).toBe(400);
    expect(extraPath.status).toBe(404);
    expect(calls).toBe(0);
  });
});
