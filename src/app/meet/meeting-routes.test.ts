import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGuestCandidateCookie,
  createGuestCredentialCookie,
  createPendingAccessCookie,
} from '@/lib/meeting-cookies';
import { createSiteSessionCookie } from '@/lib/site-session';
import {
  DELETE as deleteMeetingOperation,
  GET as getMeetingOperation,
  POST as meetingOperation,
} from './[meetingId]/api/[...operation]/route';
import { POST as enterMeeting } from './[meetingId]/api/entry/route';
import { GET as resolveShareLink } from './j/[secret]/route';
import * as meetingCollectionRoute from '../api/meetings/route';

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

type DirectoryRouteHandler = (
  request: Request,
  context?: { readonly params: Promise<{ readonly cursor: string }> },
) => Promise<Response>;

function directoryPage() {
  return {
    serverNow: '2026-07-19T12:00:00.000Z',
    meetings: [{
      meetingId: MEETING_ID,
      title: 'Planning',
      status: 'scheduled',
      role: 'owner',
      startsAt: '2026-07-20T14:00:00.000Z',
      endsAt: '2026-07-20T15:00:00.000Z',
      durationSeconds: 3600,
      participantCount: 2,
      version: 3,
      canonicalPath: `/meet/${MEETING_ID}`,
    }],
  };
}

async function directorySession(): Promise<string> {
  return createSiteSessionCookie({
    accountId: ACCOUNT_ID,
    email: 'person@example.com',
    role: 'user',
  });
}

describe('upcoming account directory BFF routes', () => {
  test('proxies the first page through one exact signed bodyless GET', async () => {
    const session = await directorySession();
    let assertion = '';
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        'https://meeting-worker.example.workers.dev/v1/account/meetings/upcoming',
      );
      expect(init?.method).toBe('GET');
      expect(init?.body).toBeUndefined();
      const headers = new Headers(init?.headers);
      assertion = headers.get('x-account-assertion') ?? '';
      expect(assertion).toContain('.');
      expect(headers.has('x-guest-participant-id')).toBe(false);
      expect(headers.has('x-guest-credential')).toBe(false);
      expect(headers.has('if-match')).toBe(false);
      expect(headers.has('idempotency-key')).toBe(false);
      expect(JSON.stringify({ input: String(input), init })).not.toContain(
        'person@example.com',
      );
      return Response.json({ data: directoryPage() });
    }) as unknown as typeof fetch;
    const get = (meetingCollectionRoute as typeof meetingCollectionRoute & {
      readonly GET: DirectoryRouteHandler;
    }).GET;
    expect(get).toBeTypeOf('function');

    const response = await get(new Request('https://mannan.is/api/meetings', {
      headers: { cookie: cookieHeader(session) },
    }));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(JSON.parse(text)).toEqual({ data: directoryPage() });
    expect(text).not.toContain('person@example.com');
    expect(text).not.toContain(process.env.MEETING_SERVICE_SECRET!);
    expect(text).not.toContain(assertion);
  });

  test('proxies one validated cursor page through the exact Worker path', async () => {
    const routePath = '../api/meetings/upcoming/[cursor]/route';
    const route = await import(routePath) as { readonly GET: DirectoryRouteHandler };
    const session = await directorySession();
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        'https://meeting-worker.example.workers.dev/v1/account/meetings/upcoming/cursor_1',
      );
      expect(init?.method).toBe('GET');
      expect(init?.body).toBeUndefined();
      expect(new Headers(init?.headers).get('x-account-assertion')).toContain('.');
      return Response.json({ data: directoryPage() });
    }) as unknown as typeof fetch;

    const response = await route.GET(
      new Request('https://mannan.is/api/meetings/upcoming/cursor_1', {
        headers: { cookie: cookieHeader(session) },
      }),
      { params: Promise.resolve({ cursor: 'cursor_1' }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: directoryPage() });
  });

  test('requires the shared account session before Worker fetch', async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: directoryPage() });
    }) as unknown as typeof fetch;
    const get = (meetingCollectionRoute as typeof meetingCollectionRoute & {
      readonly GET: DirectoryRouteHandler;
    }).GET;
    expect(get).toBeTypeOf('function');
    const response = await get(new Request('https://mannan.is/api/meetings'));
    expect(response.status).toBe(401);
    expect(calls).toBe(0);
  });

  test('rejects query, body, command headers, and invalid cursor before fetch', async () => {
    const session = await directorySession();
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: directoryPage() });
    }) as unknown as typeof fetch;
    const get = (meetingCollectionRoute as typeof meetingCollectionRoute & {
      readonly GET: DirectoryRouteHandler;
    }).GET;
    expect(get).toBeTypeOf('function');
    const cookie = cookieHeader(session);
    const ordinary = new Request('https://mannan.is/api/meetings', {
      headers: { cookie },
    });
    const bodyRequest = {
      method: 'GET',
      url: ordinary.url,
      headers: ordinary.headers,
      body: new Response('{}').body,
    } as Request;
    for (const request of [
      new Request('https://mannan.is/api/meetings?private=1', {
        headers: { cookie },
      }),
      bodyRequest,
      new Request('https://mannan.is/api/meetings', {
        headers: { cookie, 'if-match': '"1"' },
      }),
      new Request('https://mannan.is/api/meetings', {
        headers: { cookie, 'idempotency-key': 'unsafe_command' },
      }),
    ]) {
      const response = await get(request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: { code: 'invalid_request' } });
    }

    const routePath = '../api/meetings/upcoming/[cursor]/route';
    const route = await import(routePath) as { readonly GET: DirectoryRouteHandler };
    for (const cursor of ['bad.cursor', '../unsafe', 'x'.repeat(1025)]) {
      const response = await route.GET(
        new Request(`https://mannan.is/api/meetings/upcoming/${encodeURIComponent(cursor)}`, {
          headers: { cookie },
        }),
        { params: Promise.resolve({ cursor }) },
      );
      expect(response.status).toBe(404);
    }
    expect(calls).toBe(0);
  });
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
      expect(headers.get('if-match')).toBe('"7"');
      expect(headers.get('idempotency-key')).toBe('browser_media_account_1');
      expect(JSON.parse(String(init?.body))).toEqual({
        displayName: 'owner@example.com',
      });
      return Response.json({
        data: {
          provider: 'realtimekit',
          authToken: 'test-token',
          meetingVersion: 8,
          session: {
            sessionId: 'session_1',
            actualStartedAt: '2026-07-19T14:00:01.000Z',
            effectiveEndsAt: '2026-07-19T15:00:00.000Z',
          },
        },
      }, { headers: { etag: '"8"' } });
    }) as unknown as typeof fetch;

    const response = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'if-match': '"7"',
          'idempotency-key': 'browser_media_account_1',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      data: {
        provider: 'realtimekit',
        authToken: 'test-token',
        meetingVersion: 8,
        session: {
          sessionId: 'session_1',
          actualStartedAt: '2026-07-19T14:00:01.000Z',
          effectiveEndsAt: '2026-07-19T15:00:00.000Z',
        },
      },
    });
    expect(response.headers.get('etag')).toBe('"8"');
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
      expect(headers.get('if-match')).toBe('"7"');
      expect(headers.get('idempotency-key')).toBe('browser_media_guest_1');
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
          'if-match': '"7"',
          'idempotency-key': 'browser_media_guest_1',
        },
      }),
      { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('guest:issued-credential');
  });

  test('rejects missing or malformed command headers before identity or Worker fetch', async () => {
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
    for (const headers of [
      new Headers({
        origin: 'https://mannan.is',
        cookie: cookieHeader(session),
        'if-match': '"7"',
      }),
      new Headers({
        origin: 'https://mannan.is',
        cookie: cookieHeader(session),
        'if-match': '7',
        'idempotency-key': 'browser_media_invalid_1',
      }),
      new Headers({
        origin: 'https://mannan.is',
        cookie: cookieHeader(guest),
        'idempotency-key': 'browser_media_invalid_2',
      }),
      new Headers({
        origin: 'https://mannan.is',
        'if-match': '"7"',
        'idempotency-key': 'browser media invalid',
      }),
    ]) {
      const response = await meetingOperation(
        new Request(`https://mannan.is/meet/${MEETING_ID}/api/media-grant`, {
          method: 'POST',
          headers,
        }),
        { params: Promise.resolve({ meetingId: MEETING_ID, operation: ['media-grant'] }) },
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: { code: 'invalid_request' } });
    }
    expect(calls).toBe(0);
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
        headers: {
          origin: 'https://mannan.is',
          'if-match': '"7"',
          'idempotency-key': 'browser_media_anonymous_1',
        },
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

describe('meeting duration extension route', () => {
  const context = {
    params: Promise.resolve({
      meetingId: MEETING_ID,
      operation: ['live-session', 'extensions'],
    }),
  };

  test('forwards an exact normalized account command and response metadata', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/live-session/extensions`,
      );
      expect(init).toMatchObject({ method: 'POST', cache: 'no-store', redirect: 'error' });
      const headers = new Headers(init?.headers);
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(headers.has('x-guest-credential')).toBe(false);
      expect(headers.get('if-match')).toBe('"7"');
      expect(headers.get('idempotency-key')).toBe(
        'browser_extend_0123456789abcdef0123456789abcdef',
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        requestedSeconds: 1800,
        reason: 'We need time for questions.',
      });
      return Response.json({
        data: {
          extensionId: 'extension_0123456789abcdef',
          sessionId: 'session_0123456789abcdef',
          requestedSeconds: 1800,
          appliedSeconds: 1800,
          oldEffectiveEndsAt: '2026-07-19T14:30:00.000Z',
          effectiveEndsAt: '2026-07-19T15:00:00.000Z',
          policyDecision: 'applied_full',
          version: 8,
        },
      }, { headers: { etag: '"8"' } });
    }) as unknown as typeof fetch;

    const response = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session/extensions`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'content-type': 'application/json',
          'if-match': '"7"',
          'idempotency-key': 'browser_extend_0123456789abcdef0123456789abcdef',
        },
        body: JSON.stringify({
          requestedSeconds: 1800,
          reason: '  We need time for questions.  ',
        }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"8"');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      data: {
        extensionId: 'extension_0123456789abcdef',
        sessionId: 'session_0123456789abcdef',
        requestedSeconds: 1800,
        appliedSeconds: 1800,
        oldEffectiveEndsAt: '2026-07-19T14:30:00.000Z',
        effectiveEndsAt: '2026-07-19T15:00:00.000Z',
        policyDecision: 'applied_full',
        version: 8,
      },
    });
  });

  test('forwards the exact guest identity server-side without exposing its credential', async () => {
    const guest = createGuestCredentialCookie({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      displayName: 'River',
      credential: 'guest:issued-credential',
    });
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe(
        `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/live-session/extensions`,
      );
      const headers = new Headers(init?.headers);
      expect(headers.has('x-account-assertion')).toBe(false);
      expect(headers.get('x-guest-participant-id')).toBe(
        'guest_0123456789abcdef0123456789abcdef',
      );
      expect(headers.get('x-guest-credential')).toBe('guest:issued-credential');
      expect(headers.get('if-match')).toBe('"9"');
      expect(headers.get('idempotency-key')).toBe(
        'browser_extend_abcdef0123456789abcdef0123456789',
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        requestedSeconds: 900,
        reason: 'Guest question period',
      });
      return Response.json({
        data: {
          extensionId: 'extension_abcdef0123456789',
          sessionId: 'session_0123456789abcdef',
          requestedSeconds: 900,
          appliedSeconds: 900,
          oldEffectiveEndsAt: '2026-07-19T15:00:00.000Z',
          effectiveEndsAt: '2026-07-19T15:15:00.000Z',
          policyDecision: 'applied_full',
          version: 10,
        },
      }, { headers: { etag: '"10"' } });
    }) as unknown as typeof fetch;

    const response = await meetingOperation(
      new Request(`https://mannan.is/meet/${MEETING_ID}/api/live-session/extensions`, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(guest),
          'content-type': 'application/json',
          'if-match': '"9"',
          'idempotency-key': 'browser_extend_abcdef0123456789abcdef0123456789',
        },
        body: JSON.stringify({ requestedSeconds: 900, reason: 'Guest question period' }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"10"');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('guest:issued-credential');
  });

  test('rejects malformed transport before identity and rejects wrong method, path, or origin', async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: {} });
    }) as unknown as typeof fetch;
    const base = `https://mannan.is/meet/${MEETING_ID}/api/live-session/extensions`;
    const malformed = [
      new Request(base, {
        method: 'POST',
        headers: { origin: 'https://mannan.is', 'content-type': 'application/json' },
        body: JSON.stringify({ requestedSeconds: 1800, reason: 'Valid' }),
      }),
      new Request(base, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          'content-type': 'application/json',
          'if-match': '"7"',
          'idempotency-key': 'bad key',
        },
        body: JSON.stringify({ requestedSeconds: 1800, reason: 'Valid' }),
      }),
      new Request(base, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          'content-type': 'application/json',
          'if-match': '"7"',
          'idempotency-key': 'browser_extend_0123456789abcdef0123456789abcdef',
        },
        body: JSON.stringify({ requestedSeconds: 901, reason: 'Invalid increment' }),
      }),
      new Request(base, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          'content-type': 'application/json',
          'if-match': '"7"',
          'idempotency-key': 'browser_extend_0123456789abcdef0123456789abcdef',
        },
        body: JSON.stringify({
          requestedSeconds: 1800,
          reason: 'Valid',
          privateExtra: true,
        }),
      }),
    ];
    for (const request of malformed) {
      const response = await meetingOperation(request, context);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: { code: 'invalid_request' } });
    }

    const wrongMethod = await getMeetingOperation(new Request(base), context);
    const wrongPath = await meetingOperation(
      new Request(`${base}/extra`, {
        method: 'POST',
        headers: { origin: 'https://mannan.is' },
      }),
      {
        params: Promise.resolve({
          meetingId: MEETING_ID,
          operation: ['live-session', 'extensions', 'extra'],
        }),
      },
    );
    const wrongOrigin = await meetingOperation(
      new Request(base, {
        method: 'POST',
        headers: { origin: 'https://attacker.example' },
      }),
      context,
    );
    expect(wrongMethod.status).toBe(404);
    expect(wrongPath.status).toBe(404);
    expect(wrongOrigin.status).toBe(403);
    expect(calls).toBe(0);
  });
});

describe('meeting title and private revision-history routes', () => {
  const REVISION_ID = 'revision_0123456789abcdef';
  const TITLE_KEY = 'browser_title_0123456789abcdef0123456789abcdef';

  function context(operation: string[]) {
    return { params: Promise.resolve({ meetingId: MEETING_ID, operation }) };
  }

  function titleResponse(path: string): Response {
    if (path.endsWith('/title-policy')) {
      return Response.json({
        data: {
          meetingId: MEETING_ID,
          title: 'Project review',
          titleEditPolicy: 'any_participant',
          version: 5,
        },
      }, { headers: { etag: '"5"' } });
    }
    if (path.endsWith('/restore')) {
      return Response.json({
        data: {
          meetingId: MEETING_ID,
          title: 'Planning',
          titleEditPolicy: 'any_participant',
          revision: {
            id: 'revision_abcdef0123456789',
            meetingId: MEETING_ID,
            previousTitle: 'Project review',
            title: 'Planning',
            editor: {
              participantId: 'guest_0123456789abcdef0123456789abcdef',
              identityKind: 'browser_guest',
              displayName: 'River',
            },
            restoredFromRevisionId: REVISION_ID,
            reason: 'Return to planning',
            resultingVersion: 5,
            createdAt: '2026-07-19T14:00:00.000Z',
          },
          version: 5,
        },
      }, { headers: { etag: '"5"' } });
    }
    if (path.includes('/title-revisions')) {
      return Response.json({
        data: {
          revisions: [],
          ...(path.endsWith(REVISION_ID) ? {} : { nextCursor: REVISION_ID }),
        },
      });
    }
    return Response.json({
      data: {
        meetingId: MEETING_ID,
        title: 'Project review',
        titleEditPolicy: 'administrators',
        revision: {
          id: REVISION_ID,
          meetingId: MEETING_ID,
          previousTitle: 'Planning',
          title: 'Project review',
          editor: {
            participantId: ACCOUNT_ID,
            identityKind: 'account',
          },
          reason: 'Agenda changed',
          resultingVersion: 5,
          createdAt: '2026-07-19T14:00:00.000Z',
        },
        version: 5,
      },
    }, { headers: { etag: '"5"' } });
  }

  test('proxies every literal title operation for both account and guest identities', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    const guest = createGuestCredentialCookie({
      meetingId: MEETING_ID,
      participantId: 'guest_0123456789abcdef0123456789abcdef',
      displayName: 'River',
      credential: 'guest:private-title-credential',
    });
    const observed: Array<{
      url: string;
      method: string | undefined;
      body: BodyInit | null | undefined;
      headers: Headers;
    }> = [];
    globalThis.fetch = mock(async (input, init) => {
      const url = String(input);
      observed.push({
        url,
        method: init?.method,
        body: init?.body,
        headers: new Headers(init?.headers),
      });
      return titleResponse(new URL(url).pathname);
    }) as unknown as typeof fetch;

    const operations = [
      {
        local: ['title'],
        worker: 'title',
        method: 'POST',
        body: { title: 'Project review', reason: 'Agenda changed' },
      },
      {
        local: ['title-policy'],
        worker: 'title-policy',
        method: 'POST',
        body: { policy: 'any_participant' },
      },
      {
        local: ['title-revisions', REVISION_ID, 'restore'],
        worker: `title-revisions/${REVISION_ID}/restore`,
        method: 'POST',
        body: { reason: 'Return to planning' },
      },
      {
        local: ['title-revisions'],
        worker: 'title-revisions',
        method: 'GET',
      },
      {
        local: ['title-revisions', REVISION_ID],
        worker: `title-revisions/${REVISION_ID}`,
        method: 'GET',
      },
    ] as const;

    for (const identityCookie of [session, guest]) {
      for (const operation of operations) {
        const url = `https://mannan.is/meet/${MEETING_ID}/api/${operation.local.join('/')}`;
        const headers = new Headers({ cookie: cookieHeader(identityCookie) });
        let request: Request;
        if (operation.method === 'POST') {
          headers.set('origin', 'https://mannan.is');
          headers.set('content-type', 'application/json');
          headers.set('if-match', '"4"');
          headers.set('idempotency-key', TITLE_KEY);
          request = new Request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(operation.body),
          });
        } else {
          request = new Request(url, { headers });
        }
        const response = operation.method === 'POST'
          ? await meetingOperation(request, context([...operation.local]))
          : await getMeetingOperation(request, context([...operation.local]));
        const text = await response.text();
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(text).not.toContain('guest:private-title-credential');
        if (operation.method === 'POST') {
          expect(response.headers.get('etag')).toBe('"5"');
        }
      }
    }

    expect(observed).toHaveLength(10);
    for (let identityIndex = 0; identityIndex < 2; identityIndex += 1) {
      for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
        const operation = operations[operationIndex]!;
        const request = observed[identityIndex * operations.length + operationIndex]!;
        expect(request.url).toBe(
          `https://meeting-worker.example.workers.dev/v1/meetings/${MEETING_ID}/${operation.worker}`,
        );
        expect(request.method).toBe(operation.method);
        expect(request.body).toBe(
          operation.method === 'POST' ? JSON.stringify(operation.body) : undefined,
        );
        expect(request.headers.get('content-type')).toBe(
          operation.method === 'POST' ? 'application/json' : null,
        );
        expect(request.headers.get('if-match')).toBe(
          operation.method === 'POST' ? '"4"' : null,
        );
        expect(request.headers.get('idempotency-key')).toBe(
          operation.method === 'POST' ? TITLE_KEY : null,
        );
        if (identityIndex === 0) {
          expect(request.headers.get('x-account-assertion')).toContain('.');
          expect(request.headers.has('x-guest-credential')).toBe(false);
        } else {
          expect(request.headers.has('x-account-assertion')).toBe(false);
          expect(request.headers.get('x-guest-participant-id')).toBe(
            'guest_0123456789abcdef0123456789abcdef',
          );
          expect(request.headers.get('x-guest-credential')).toBe(
            'guest:private-title-credential',
          );
        }
      }
    }
  });

  test('rejects invalid title transport, route shapes, query, bodies, and identity before fetch', async () => {
    const session = await createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'owner@example.com',
      role: 'user',
    });
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return Response.json({ data: {} });
    }) as unknown as typeof fetch;
    const titleUrl = `https://mannan.is/meet/${MEETING_ID}/api/title`;
    const historyUrl = `https://mannan.is/meet/${MEETING_ID}/api/title-revisions`;
    const titleContext = context(['title']);
    const historyContext = context(['title-revisions']);

    const crossOrigin = await meetingOperation(
      new Request(titleUrl, {
        method: 'POST',
        headers: {
          origin: 'https://attacker.example',
          'content-type': 'application/json',
          'if-match': '"4"',
          'idempotency-key': TITLE_KEY,
        },
        body: JSON.stringify({ title: 'Private title' }),
      }),
      titleContext,
    );
    expect(crossOrigin.status).toBe(403);

    for (const headers of [
      new Headers({
        origin: 'https://mannan.is',
        'content-type': 'application/json',
        'idempotency-key': TITLE_KEY,
      }),
      new Headers({
        origin: 'https://mannan.is',
        'content-type': 'application/json',
        'if-match': '4',
        'idempotency-key': TITLE_KEY,
      }),
      new Headers({
        origin: 'https://mannan.is',
        'content-type': 'application/json',
        'if-match': '"4"',
        'idempotency-key': 'bad key',
      }),
    ]) {
      const response = await meetingOperation(
        new Request(titleUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: 'Private title' }),
        }),
        titleContext,
      );
      expect(response.status).toBe(400);
    }

    const anonymous = await meetingOperation(
      new Request(titleUrl, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          'content-type': 'application/json',
          'if-match': '"4"',
          'idempotency-key': TITLE_KEY,
        },
        body: JSON.stringify({ title: 'Private title' }),
      }),
      titleContext,
    );
    expect(anonymous.status).toBe(401);

    const invalidBody = await meetingOperation(
      new Request(titleUrl, {
        method: 'POST',
        headers: {
          origin: 'https://mannan.is',
          cookie: cookieHeader(session),
          'if-match': '"4"',
          'idempotency-key': TITLE_KEY,
        },
        body: '{',
      }),
      titleContext,
    );
    expect(invalidBody.status).toBe(400);

    for (const response of [
      await getMeetingOperation(new Request(titleUrl), titleContext),
      await meetingOperation(
        new Request(historyUrl, {
          method: 'POST',
          headers: { origin: 'https://mannan.is' },
        }),
        historyContext,
      ),
      await getMeetingOperation(
        new Request(`${historyUrl}/${REVISION_ID}/restore`),
        context(['title-revisions', REVISION_ID, 'restore']),
      ),
      await meetingOperation(
        new Request(`${titleUrl}/extra`, {
          method: 'POST',
          headers: { origin: 'https://mannan.is' },
        }),
        context(['title', 'extra']),
      ),
      await getMeetingOperation(
        new Request(`${historyUrl}/bad%20revision`),
        context(['title-revisions', 'bad revision']),
      ),
    ]) {
      expect(response.status).toBe(404);
    }

    const queried = await getMeetingOperation(
      new Request(`${historyUrl}?before=${REVISION_ID}`, {
        headers: { cookie: cookieHeader(session) },
      }),
      historyContext,
    );
    expect(queried.status).toBe(400);

    const bodyCarrier = new Request(historyUrl, {
      method: 'POST',
      headers: {
        origin: 'https://mannan.is',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    const getWithBody = new Proxy(bodyCarrier, {
      get(target, property) {
        if (property === 'method') return 'GET';
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    expect((await getMeetingOperation(getWithBody, historyContext)).status).toBe(400);

    const credentialedGetWithCommandHeaders = await getMeetingOperation(
      new Request(historyUrl, {
        headers: {
          cookie: cookieHeader(session),
          'if-match': '"4"',
          'idempotency-key': TITLE_KEY,
        },
      }),
      historyContext,
    );
    expect(credentialedGetWithCommandHeaders.status).toBe(400);

    const anonymousHistory = await getMeetingOperation(
      new Request(historyUrl),
      historyContext,
    );
    expect(anonymousHistory.status).toBe(401);
    expect(calls).toBe(0);
  });
});
