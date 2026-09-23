import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

/**
 * The bridge that turns a mannan.is session into a calendar MCP grant.
 *
 * This route only ASKS: it must never sign anything on a GET, because a GET
 * is exactly what a cross-site link can trigger with one click. Every case
 * below is a way that must not produce a grant.
 */

const SECRET = 'grant-secret-for-tests';
const CALLBACK = 'https://calendar-mcp.mannanteam.workers.dev/callback';
const COOKIE_VALUE = 'signed-cookie-value-for-tests';

let sessionAnswer: { email: string; role: string; admin: boolean; exp: number } | null = null;
let cookieAnswer: string | null = COOKIE_VALUE;

mock.module('@/lib/site-session', () => ({
  readSiteSession: async () => sessionAnswer,
  cookieValue: () => cookieAnswer,
}));

const { GET } = await import('./route');

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
  cookieAnswer = COOKIE_VALUE;
});

afterEach(() => {
  delete process.env.CALENDAR_MCP_GRANT_SECRET;
  delete process.env.CALENDAR_MCP_CALLBACK_URL;
});

describe('a signed-in person', () => {
  it('is asked, not redirected — a 200 consent page with no grant in it', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('Connect an assistant?');
    expect(html).toContain('Continue');
    expect(html).toContain("If this wasn't you, close this page.");
    expect(html).toContain('https://mannan.is/calendar/mcp');
    expect(html).not.toContain('grant=');
  });

  it('names the account being connected', async () => {
    const html = await (await get({ state: 'st_abcdefgh' })).text();
    expect(html).toContain('hello@mannan.is');
  });

  it('posts to the confirm route, carrying the state and a consent token', async () => {
    const html = await (await get({ state: 'st_abcdefgh' })).text();
    expect(html).toContain('/api/mcp/calendar/authorize/confirm');
    expect(html).toContain('state=st_abcdefgh');
    expect(html).toMatch(/consent=[\w-]+/);
  });

  it('does not let the page be cached, framed or leak through a Referer', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
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

  it('is told to come back here once signed in, with the same state', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    const next = new URL(response.headers.get('location')!).searchParams.get('next');
    // Our own path, never another host: the sign-in route re-validates it.
    expect(next).toBe('/api/mcp/calendar/authorize?state=st_abcdefgh');
  });

  it('gets no grant at all', async () => {
    const response = await get({ state: 'st_abcdefgh' });
    expect(response.headers.get('location')).not.toContain('grant=');
  });

  it('cannot be redirected off-site by adding parameters', async () => {
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
  it('answers 503, and says so, rather than pretending to ask anything', async () => {
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
    sessionAnswer = null;
    delete process.env.CALENDAR_MCP_GRANT_SECRET;
    expect((await get({ state: 'st_abcdefgh' })).status).toBe(503);
  });
});
