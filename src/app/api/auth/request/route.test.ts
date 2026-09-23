import { afterEach, describe, expect, test } from 'bun:test';
import * as route from './route';

const originalFetch = globalThis.fetch;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;

const SITEVERIFY = 'challenges.cloudflare.com';

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restore('TURNSTILE_SECRET_KEY', originalSecret);
});

function signInRequest(body: Record<string, unknown>) {
  return new Request('https://mannan.is/api/auth/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

function stubNetwork(siteverify: () => Promise<Response>) {
  const calls = { siteverify: 0 };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes(SITEVERIFY)) {
      calls.siteverify += 1;
      return siteverify();
    }
    return Response.json({ ok: true });
  }) as unknown as typeof fetch;
  return calls;
}

describe('sign-in bot check', () => {
  test('a rejected token is refused and no mail is sent', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const calls = stubNetwork(async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
    );
    const res = await route.POST(signInRequest({ email: 'a@b.co', turnstileToken: 'nope' }));
    expect(res.status).toBe(403);
    expect(calls.siteverify).toBe(1);
  });

  test('a siteverify outage skips the check rather than blocking sign-in', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const calls = stubNetwork(async () => {
      throw new Error('siteverify unreachable');
    });
    const res = await route.POST(signInRequest({ email: 'a@b.co', turnstileToken: 'tok' }));
    expect(res.status).not.toBe(403);
    expect(calls.siteverify).toBe(1);
  });

  test('a siteverify 5xx skips the check rather than blocking sign-in', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const calls = stubNetwork(async () => new Response('bad gateway', { status: 502 }));
    const res = await route.POST(signInRequest({ email: 'a@b.co', turnstileToken: 'tok' }));
    expect(res.status).not.toBe(403);
    expect(calls.siteverify).toBe(1);
  });

  test('no configured secret means no check at all', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const calls = stubNetwork(async () => {
      throw new Error('siteverify should not be called');
    });
    const res = await route.POST(signInRequest({ email: 'a@b.co' }));
    expect(res.status).not.toBe(403);
    expect(calls.siteverify).toBe(0);
  });
});

describe('where sign-in returns to', () => {
  const originalExchange = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
  afterEach(() => restore('CLOUDFLARE_AUTH_EXCHANGE_SECRET', originalExchange));

  function returnCookie(res: Response): string | undefined {
    return res.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith('__Host-mannan-return='));
  }

  test('a sent link remembers the page it was asked for from', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'exchange';
    stubNetwork(async () => Response.json({ success: true }));

    const res = await route.POST(signInRequest({ email: 'rt1@b.co', returnTo: '/calendar' }));
    expect(res.status).toBe(200);
    expect(returnCookie(res)).toContain('__Host-mannan-return=%2Fcalendar;');
  });

  test('an off-site return path is dropped, not stored', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'exchange';
    stubNetwork(async () => Response.json({ success: true }));

    const res = await route.POST(
      signInRequest({ email: 'rt2@b.co', returnTo: '//evil.example/' }),
    );
    expect(res.status).toBe(200);
    expect(returnCookie(res)).toBeUndefined();
  });

  test('a refused request leaves no cookie for a later sign-in to find', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'exchange';
    stubNetwork(async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
    );

    const res = await route.POST(
      signInRequest({ email: 'rt3@b.co', turnstileToken: 'no', returnTo: '/calendar' }),
    );
    expect(res.status).toBe(403);
    expect(returnCookie(res)).toBeUndefined();
  });
});
