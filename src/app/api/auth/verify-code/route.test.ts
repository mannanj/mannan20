import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as route from './route';

const originalFetch = globalThis.fetch;
const originalExchange = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
const originalSession = process.env.MANNAN_SESSION_SECRET;
const REJECTED = "That code didn't work. Check it or send a new one.";

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'exchange';
  process.env.MANNAN_SESSION_SECRET = 'session-secret-for-tests';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restore('CLOUDFLARE_AUTH_EXCHANGE_SECRET', originalExchange);
  restore('MANNAN_SESSION_SECRET', originalSession);
});

function verifyRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://mannan.is/api/auth/verify-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });
}

function stubWorker(respond: () => Response) {
  const calls: Array<{ url: string; body: unknown; headers: Headers }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body)),
      headers: new Headers(init?.headers),
    });
    return respond();
  }) as unknown as typeof fetch;
  return calls;
}

describe('POST /api/auth/verify-code', () => {
  test('malformed input is refused without calling the worker', async () => {
    const calls = stubWorker(() => Response.json({}));
    for (const body of [null, {}, { email: 'a@b.co' }, { email: 'a@b.co', code: '1234567' }, { email: 'nope', code: '12345678' }]) {
      const res = await route.POST(verifyRequest(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(REJECTED);
    }
    expect(calls).toHaveLength(0);
  });

  test('a non-JSON body is refused, so a cross-site form cannot post a code', async () => {
    const calls = stubWorker(() => Response.json({}));
    const res = await route.POST(
      verifyRequest({ email: 'a@b.co', code: '12345678' }, { 'content-type': 'text/plain' }),
    );
    expect(res.status).toBe(415);
    expect(calls).toHaveLength(0);
  });

  test('a rejected code gets the generic message and no session', async () => {
    stubWorker(() => Response.json({ error: 'invalid-code' }, { status: 400 }));
    const res = await route.POST(verifyRequest({ email: 'a@b.co', code: '12-345-678' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(REJECTED);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  test('the worker rate limit comes back as 429', async () => {
    stubWorker(() => Response.json({ error: 'too-many-requests' }, { status: 429 }));
    const res = await route.POST(verifyRequest({ email: 'a@b.co', code: '12345678' }));
    expect(res.status).toBe(429);
  });

  test('a good code sets the session, clears return-to, and sends the digits and client IP', async () => {
    const calls = stubWorker(() => Response.json({ email: 'a@b.co', role: 'user', admin: false }));
    const res = await route.POST(
      verifyRequest(
        { email: ' A@B.co ', code: '12-345-678' },
        { cookie: '__Host-mannan-return=%2Fmcp%2Fsign-in%3Fnext%3D1' },
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, redirectTo: '/mcp/sign-in?next=1' });
    const cookies = res.headers.get('set-cookie') ?? '';
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('__Host-mannan-return=;');
    expect(calls[0].url).toEndWith('/auth/site/verify-code');
    expect(calls[0].body).toEqual({ email: 'a@b.co', code: '12345678' });
    expect(calls[0].headers.get('x-site-auth-ip')).toBe('203.0.113.7');
    expect(calls[0].headers.get('authorization')).toBe('Bearer exchange');
  });

  test('an off-site return-to cookie falls back to /', async () => {
    stubWorker(() => Response.json({ email: 'a@b.co', role: 'user', admin: false }));
    const res = await route.POST(
      verifyRequest({ email: 'a@b.co', code: '12345678' }, { cookie: '__Host-mannan-return=https%3A%2F%2Fevil.example' }),
    );
    expect((await res.json()).redirectTo).toBe('/');
  });
});
