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
