import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

/**
 * The bridge that turns a mannan.is session into a calendar MCP grant.
 *
 * This route is the only place a session cookie becomes a portable assertion
 * of identity, so every case below is a way that must not work. A test file
 * that only showed the happy path would be satisfied by an implementation that
 * signed a grant for whoever asked.
 */

const SECRET = 'grant-secret-for-tests';
const CALLBACK = 'https://calendar-mcp.mannanteam.workers.dev/callback';

let sessionAnswer: { email: string; role: string; admin: boolean; exp: number } | null = null;

mock.module('@/lib/site-session', () => ({
  readSiteSession: async () => sessionAnswer,
}));

const { GET } = await import('./route');
const { verifyMcpGrant } = await import('@/lib/mcp/grant');

function get(params: Record<string, string>, cookie?: string) {
  const url = new URL('https://mannan.is/api/mcp/calendar/authorize');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return GET(new Request(url, { headers: cookie ? { cookie } : {} }));
}

const SIGNED_IN = { email: 'hello@mannan.is', role: 'user', admin: false, exp: 2 ** 40 };

beforeEach(() => {
  process.env.CALENDAR_MCP_GRANT_SECRET = SECRET;
  process.env.CALENDAR_MCP_CALLBACK_URL = CALLBACK;
  sessionAnswer = SIGNED_IN;
});

afterEach(() => {
  delete process.env.CALENDAR_MCP_GRANT_SECRET;
  delete process.env.CALENDAR_MCP_CALLBACK_URL;
});

describe('a signed-in person', () => {
  it('is redirected to the worker with a grant bound to the state', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.status).toBe(307);

    const location = new URL(response.headers.get('location')!);
    expect(location.origin + location.pathname).toBe(CALLBACK);
    expect(location.searchParams.get('state')).toBe('st_abcdefgh');

    const verified = await verifyMcpGrant(location.searchParams.get('grant')!, SECRET, {
      expectedState: 'st_abcdefgh',
    });
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.payload.email).toBe('hello@mannan.is');
  });

  it('mints a grant that is useless for any other authorization request', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    const grant = new URL(response.headers.get('location')!).searchParams.get('grant')!;

    const replayed = await verifyMcpGrant(grant, SECRET, { expectedState: 'st_somethingelse' });
    expect(replayed).toEqual({ ok: false, reason: 'state_mismatch' });
  });

  it('ignores any destination the caller tries to supply', async () => {
    // Found by mutation: the open-redirect test below only ran for a
    // SIGNED-OUT visitor, and the destination is only computed for a signed-in
    // one — so the branch that actually builds the redirect had no cover at
    // all. Sending a grant off-site is the worst thing this route could do.
    const response = await get({
      state: 'st_abcdefgh',
      redirect_uri: 'https://evil.example/steal',
      callback: 'https://evil.example/steal',
      next: 'https://evil.example/steal',
    });

    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://calendar-mcp.mannanteam.workers.dev');
    expect(response.headers.get('location')).not.toContain('evil.example');
  });

  it('does not let the grant be cached or leak through a Referer', async () => {
    // The grant is in the URL for exactly one hop.
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
});

describe('a signed-out person', () => {
  beforeEach(() => {
    sessionAnswer = null;
  });

  it('is sent home, never to a caller-chosen destination', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    const location = new URL(response.headers.get('location')!);

    expect(location.origin).toBe('https://mannan.is');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.get('mcp')).toBe('calendar');
  });

  it('gets no grant at all', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.headers.get('location')).not.toContain('grant=');
  });

  it('cannot be redirected off-site by adding parameters', async () => {
    // There is no redirect_uri and there must never be one. If somebody adds
    // it later, this test is what says no.
    const response = await get({
      state: 'st_abcdefgh',
      redirect_uri: 'https://evil.example/steal',
      next: 'https://evil.example/steal',
      callback: 'https://evil.example/steal',
    });

    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://mannan.is');
    expect(response.headers.get('location')).not.toContain('evil.example');
  });
});

describe('the state parameter', () => {
  it('is rejected before any session is read when it is the wrong shape', async () => {
    for (const state of ['', 'short', 'has spaces!!', 'x'.repeat(257), '<script>', '../../etc']) {
      const response = await get({ state });
      expect(response.status, `state=${JSON.stringify(state)}`).toBe(400);
    }
  });

  it('is checked even for a signed-out visitor', async () => {
    sessionAnswer = null;
    expect((await get({ state: 'no' })).status).toBe(400);
  });
});

describe('when the site is not configured for this', () => {
  it('answers 503, and says so, rather than pretending to sign anything', async () => {
    delete process.env.CALENDAR_MCP_GRANT_SECRET;
    const response = await get({ state: 'st_abcdefgh' });

    expect(response.status).toBe(503);
    expect(await response.text()).toContain('not configured');
  });

  it('needs the callback URL too', async () => {
    delete process.env.CALENDAR_MCP_CALLBACK_URL;
    expect((await get({ state: 'st_abcdefgh' })).status).toBe(503);
  });

  it('checks configuration BEFORE the session', async () => {
    // Otherwise a misconfigured deployment looks like a sign-in problem and
    // sends signed-out people round the sign-in loop forever.
    sessionAnswer = null;
    delete process.env.CALENDAR_MCP_GRANT_SECRET;
    expect((await get({ state: 'st_abcdefgh' })).status).toBe(503);
  });
});
