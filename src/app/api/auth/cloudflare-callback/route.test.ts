import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// The code exchange is a fetch to the cloud worker; answering it here keeps
// the real exchange code in the path rather than mocking the module.
let exchanged: { email: string; role: 'user' | 'admin'; admin: boolean } | null = null;
const originalFetch = globalThis.fetch;
const OLD_SECRET = process.env.MANNAN_SESSION_SECRET;
const OLD_EXCHANGE = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;

const route = await import('./route');

function callback(cookie?: string) {
  return new Request('https://mannan.is/api/auth/cloudflare-callback?code=abc', {
    headers: cookie ? { cookie } : {},
  });
}

describe('the sign-in callback', () => {
  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'exchange';
    exchanged = { email: 'hello@mannan.is', role: 'user', admin: false };
    globalThis.fetch = (async () =>
      exchanged
        ? Response.json(exchanged)
        : Response.json({ error: 'invalid-code' }, { status: 400 })) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [name, value] of [
      ['MANNAN_SESSION_SECRET', OLD_SECRET],
      ['CLOUDFLARE_AUTH_EXCHANGE_SECRET', OLD_EXCHANGE],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test('lands where the link was asked for from, and forgets it', async () => {
    const res = await route.GET(callback('__Host-mannan-return=%2Fcalendar'));
    expect(res.headers.get('location')).toBe('https://mannan.is/calendar');

    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('__Host-mannan-session='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('__Host-mannan-return=;') && c.includes('Max-Age=0'))).toBe(
      true,
    );
  });

  test('resumes an MCP connect flow', async () => {
    const path = '/api/mcp/calendar/authorize?state=st_abcdefgh';
    const res = await route.GET(callback(`__Host-mannan-return=${encodeURIComponent(path)}`));
    expect(res.headers.get('location')).toBe(`https://mannan.is${path}`);
  });

  test('with nothing remembered, lands home as before', async () => {
    const res = await route.GET(callback());
    expect(res.headers.get('location')).toBe('https://mannan.is/');
  });

  test('a tampered cookie cannot send a fresh session off-site', async () => {
    const res = await route.GET(callback(`__Host-mannan-return=${encodeURIComponent('//evil.example')}`));
    expect(res.headers.get('location')).toBe('https://mannan.is/');
  });

  test('a bad code sets no session and says so', async () => {
    exchanged = null;
    const res = await route.GET(callback('__Host-mannan-return=%2Fcalendar'));
    expect(res.headers.get('location')).toBe('https://mannan.is/?auth=expired');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('__Host-mannan-session='))).toBe(false);
  });
});
