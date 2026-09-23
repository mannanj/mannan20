import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

/**
 * The half that actually signs a calendar MCP grant.
 *
 * Reachable only by the token the consent page put in its own form — every
 * case below is a way of reaching this route WITHOUT that token, and every
 * one of them must come back with no grant.
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

const { POST } = await import('./route');
const { verifyMcpGrant } = await import('@/lib/mcp/grant');
const { consentToken } = await import('@/vendor/mcp-connector/consent');

function post(params: Record<string, string>) {
  const url = new URL('https://mannan.is/api/mcp/calendar/authorize/confirm');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return POST(new Request(url, { method: 'POST' }));
}

const SIGNED_IN = { email: 'hello@mannan.is', role: 'user', admin: false, exp: 2 ** 40 };
const STATE = 'st_abcdefgh';

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

describe('the right consent token', () => {
  it('signs a grant bound to the state and sends the browser to the worker', async () => {
    const consent = await consentToken(COOKIE_VALUE, STATE, SECRET);
    const response = await post({ state: STATE, consent });
    expect(response.status).toBe(307);

    const location = new URL(response.headers.get('location')!);
    expect(location.origin + location.pathname).toBe(CALLBACK);
    expect(location.searchParams.get('state')).toBe(STATE);

    const verified = await verifyMcpGrant(location.searchParams.get('grant')!, SECRET, {
      expectedState: STATE,
    });
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.payload.email).toBe('hello@mannan.is');
  });

  it('does not let the grant be cached or leak through a Referer', async () => {
    const consent = await consentToken(COOKIE_VALUE, STATE, SECRET);
    const response = await post({ state: STATE, consent });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('ignores any destination the caller tries to supply', async () => {
    const consent = await consentToken(COOKIE_VALUE, STATE, SECRET);
    const response = await post({
      state: STATE,
      consent,
      redirect_uri: 'https://evil.example/steal',
      callback: 'https://evil.example/steal',
    });

    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://calendar-mcp.mannanteam.workers.dev');
  });
});

describe('a wrong or missing consent token', () => {
  it('signs nothing for a token minted for a different session', async () => {
    const consent = await consentToken('someone-elses-cookie', STATE, SECRET);
    const response = await post({ state: STATE, consent });
    expect(response.headers.get('location') ?? '').not.toContain('grant=');
  });

  it('signs nothing for a token minted for a different state', async () => {
    const consent = await consentToken(COOKIE_VALUE, 'st_somethingelse', SECRET);
    const response = await post({ state: STATE, consent });
    expect(response.headers.get('location') ?? '').not.toContain('grant=');
  });

  it('signs nothing when the token is missing entirely', async () => {
    const response = await post({ state: STATE });
    expect(response.status).toBe(400);
    expect(response.headers.get('location') ?? '').not.toContain('grant=');
  });

  it('signs nothing for garbage', async () => {
    const response = await post({ state: STATE, consent: 'not-a-real-token' });
    expect(response.headers.get('location') ?? '').not.toContain('grant=');
  });
});

describe('without a session', () => {
  beforeEach(() => {
    sessionAnswer = null;
  });

  it('signs nothing, even with a well-formed-looking request', async () => {
    const response = await post({ state: STATE, consent: 'anything' });
    expect(response.headers.get('location') ?? '').not.toContain('grant=');
  });

  it('sends the browser home rather than to the worker', async () => {
    const response = await post({ state: STATE, consent: 'anything' });
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://mannan.is');
    expect(location.pathname).toBe('/');
  });
});

describe('the state parameter', () => {
  it('is rejected before any session is read when it is the wrong shape', async () => {
    for (const state of ['', 'short', 'has spaces!!', 'x'.repeat(257)]) {
      const response = await post({ state, consent: 'anything' });
      expect(response.status, `state=${JSON.stringify(state)}`).toBe(400);
    }
  });
});

describe('when the site is not configured for this', () => {
  it('answers 503 rather than pretending to sign anything', async () => {
    delete process.env.CALENDAR_MCP_GRANT_SECRET;
    const response = await post({ state: STATE, consent: 'anything' });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('not configured');
  });

  it('checks configuration BEFORE the session', async () => {
    sessionAnswer = null;
    delete process.env.CALENDAR_MCP_GRANT_SECRET;
    expect((await post({ state: STATE, consent: 'anything' })).status).toBe(503);
  });
});
