import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import app from './index';
import type { Env } from './types';

type Row = Record<string, unknown>;

function fakeDb() {
  const tokens = new Map<string, { email: string; expires_at: number; purpose: string }>();
  const codes = new Map<string, { email: string; expires_at: number }>();
  const users = new Map<string, { email: string; role: string }>();
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  function run(sql: string, args: unknown[]): Row | null {
    const q = norm(sql);
    if (q === 'DELETE FROM magic_tokens WHERE purpose = ? AND email = ?') {
      const [purpose, email] = args as [string, string];
      for (const [key, row] of tokens) {
        if (row.purpose === purpose && row.email === email) tokens.delete(key);
      }
      return null;
    }
    if (q.startsWith('INSERT INTO magic_tokens')) {
      const [token, email, expires_at, purpose] = args as [string, string, number, string];
      tokens.set(token, { email, expires_at, purpose });
      return null;
    }
    if (q.startsWith('DELETE FROM magic_tokens') && q.includes('RETURNING')) {
      const [token, purpose] = args as [string, string];
      const row = tokens.get(token);
      if (!row || row.purpose !== purpose) return null;
      tokens.delete(token);
      return { email: row.email, expires_at: row.expires_at };
    }
    if (q.startsWith('INSERT INTO site_session_codes')) {
      const [hash, email, expires_at] = args as [string, string, number];
      codes.set(hash, { email, expires_at });
      return null;
    }
    if (q.startsWith('DELETE FROM site_session_codes') && q.includes('RETURNING')) {
      const [hash] = args as [string];
      const row = codes.get(hash);
      if (!row) return null;
      codes.delete(hash);
      return row;
    }
    if (q.startsWith('SELECT email, role FROM users')) return users.get(args[0] as string) ?? null;
    if (q.startsWith('INSERT INTO users')) {
      const [email, role] = args as [string, string];
      if (!users.has(email)) users.set(email, { email, role });
      return null;
    }
    throw new Error(`fake D1: unhandled query: ${q}`);
  }
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            first: async () => run(sql, args),
            run: async () => { run(sql, args); return { success: true, meta: {} }; },
            exec: () => run(sql, args),
          };
        },
      };
    },
    async batch(statements: Array<{ exec: () => Row | null }>) {
      return statements.map((s) => { s.exec(); return { success: true, meta: {} }; });
    },
  };
  return { db: db as unknown as D1Database, tokens, codes, users };
}

const MANNAN_SECRET = 'mannan-exchange-secret';
const CIVIC_SECRET = 'civic-site-secret';
const SITES = JSON.stringify({
  'civic-signal': { secret: CIVIC_SECRET, return_url: 'https://civic.example/auth/callback', name: 'Civic Signal' },
});

function makeEnv(sites: string | null = SITES) {
  const d = fakeDb();
  const env = {
    DB: d.db,
    REQUEST_LIMITER: { limit: async () => ({ success: true }) },
    VERIFY_LIMITER: { limit: async () => ({ success: true }) },
    SESSION_SECRET: 'test-session-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM: 'test@example.com',
    PUBLIC_BASE_URL: 'https://cloud.example',
    SITE_AUTH_RETURN_URL: 'https://mannan.example/api/auth/cloudflare-callback',
    SITE_AUTH_EXCHANGE_SECRET: MANNAN_SECRET,
    SITE_AUTH_SITES: sites ?? undefined,
  } as unknown as Env;
  return { env, ...d };
}

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
const realFetch = globalThis.fetch;
let emails: { to: string[]; subject: string; text: string }[] = [];
beforeEach(() => {
  emails = [];
  globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
    emails.push(JSON.parse(String(init.body)));
    return Response.json({ id: 'email-id' });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

const post = (env: Env, path: string, body: unknown, secret?: string) =>
  app.fetch(new Request(`https://cloud.example${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret ? { authorization: `Bearer ${secret}` } : {}) },
    body: JSON.stringify(body),
  }), env, ctx);
const get = (env: Env, path: string) => app.fetch(new Request(`https://cloud.example${path}`), env, ctx);
const linkIn = (text: string) => new URL(text.match(/https:\/\/cloud\.example\S+/)![0]);

async function roundTrip(env: Env, opts: { site?: string; secret: string; email?: string }) {
  const email = opts.email ?? 'person@example.com';
  const req = await post(env, '/auth/site/request', opts.site ? { email, site: opts.site } : { email }, opts.secret);
  if (req.status !== 200) return { req };
  const link = linkIn(emails.at(-1)!.text);
  const verify = await get(env, link.pathname + link.search);
  const back = new URL(verify.headers.get('location') ?? 'https://none.invalid');
  return { req, link, verify, back, code: back.searchParams.get('code') ?? '' };
}

describe('mannan.is sign-in is unchanged', () => {
  for (const sites of [SITES, null]) {
    const label = sites ? 'with sites configured' : 'with no sites configured';
    test(`request → email → verify → exchange works as before (${label})`, async () => {
      const { env } = makeEnv(sites);
      const r = await roundTrip(env, { secret: MANNAN_SECRET });
      expect(r.req.status).toBe(200);
      expect(r.link!.pathname).toBe('/auth/site/verify');
      expect(r.link!.searchParams.has('site')).toBe(false);
      expect(emails[0]!.subject).toBe('Continue to mannan.is');
      expect(r.verify!.status).toBe(302);
      expect(r.back!.origin + r.back!.pathname).toBe('https://mannan.example/api/auth/cloudflare-callback');
      const ex = await post(env, '/auth/site/exchange', { code: r.code }, MANNAN_SECRET);
      expect(ex.status).toBe(200);
      expect((await ex.json()) as unknown).toEqual({ email: 'person@example.com', role: 'user', admin: false });
    });
  }
  test('the mannan.is request still refuses a wrong or missing secret', async () => {
    const { env } = makeEnv();
    expect((await post(env, '/auth/site/request', { email: 'a@example.com' }, 'nope')).status).toBe(401);
    expect((await post(env, '/auth/site/request', { email: 'a@example.com' })).status).toBe(401);
  });
  test('a mannan.is code is single use', async () => {
    const { env } = makeEnv();
    const r = await roundTrip(env, { secret: MANNAN_SECRET });
    expect((await post(env, '/auth/site/exchange', { code: r.code }, MANNAN_SECRET)).status).toBe(200);
    expect((await post(env, '/auth/site/exchange', { code: r.code }, MANNAN_SECRET)).status).toBe(400);
  });
});

describe('per-site sign-in', () => {
  test('a configured site gets its own link, its own return address and its own code', async () => {
    const { env, tokens } = makeEnv();
    const r = await roundTrip(env, { site: 'civic-signal', secret: CIVIC_SECRET });
    expect(r.req.status).toBe(200);
    expect(r.link!.searchParams.get('site')).toBe('civic-signal');
    expect(emails[0]!.subject).toBe('Sign in to Civic Signal');
    expect(tokens.size).toBe(0);
    expect(r.back!.origin + r.back!.pathname).toBe('https://civic.example/auth/callback');
    const ex = await post(env, '/auth/site/exchange', { code: r.code, site: 'civic-signal' }, CIVIC_SECRET);
    expect(ex.status).toBe(200);
    expect((await ex.json() as { email: string }).email).toBe('person@example.com');
  });
  test('a site request with the mannan.is secret is refused', async () => {
    const { env } = makeEnv();
    expect((await post(env, '/auth/site/request', { email: 'a@example.com', site: 'civic-signal' }, MANNAN_SECRET)).status).toBe(401);
  });
  test('an unknown site is refused', async () => {
    const { env } = makeEnv();
    expect((await post(env, '/auth/site/request', { email: 'a@example.com', site: 'other' }, CIVIC_SECRET)).status).toBe(401);
    expect((await get(env, '/auth/site/verify?site=other&token=x')).status).toBe(400);
  });
  test('with no sites configured, every site request is refused', async () => {
    const { env } = makeEnv(null);
    expect((await post(env, '/auth/site/request', { email: 'a@example.com', site: 'civic-signal' }, CIVIC_SECRET)).status).toBe(401);
  });
  test('a malformed sites setting refuses site requests and leaves mannan.is working', async () => {
    const { env } = makeEnv('{not json');
    expect((await post(env, '/auth/site/request', { email: 'a@example.com', site: 'civic-signal' }, CIVIC_SECRET)).status).toBe(401);
    const r = await roundTrip(env, { secret: MANNAN_SECRET });
    expect(r.verify!.status).toBe(302);
  });
  test('a site whose return address is not https is ignored', async () => {
    const { env } = makeEnv(JSON.stringify({ x: { secret: 's', return_url: 'http://insecure.example/cb' } }));
    expect((await post(env, '/auth/site/request', { email: 'a@example.com', site: 'x' }, 's')).status).toBe(401);
  });
});

describe('the two never mix', () => {
  test('a site link cannot be replayed as a mannan.is link', async () => {
    const { env } = makeEnv();
    await post(env, '/auth/site/request', { email: 'a@example.com', site: 'civic-signal' }, CIVIC_SECRET);
    const link = linkIn(emails[0]!.text);
    const res = await get(env, `/auth/site/verify?token=${link.searchParams.get('token')}`);
    expect(res.status).toBe(400);
  });
  test('a mannan.is link cannot be redirected to a site by adding ?site=', async () => {
    const { env } = makeEnv();
    await post(env, '/auth/site/request', { email: 'a@example.com' }, MANNAN_SECRET);
    const link = linkIn(emails[0]!.text);
    const res = await get(env, `/auth/site/verify?site=civic-signal&token=${link.searchParams.get('token')}`);
    expect(res.status).toBe(400);
  });
  test('a site code cannot be exchanged by mannan.is', async () => {
    const { env } = makeEnv();
    const r = await roundTrip(env, { site: 'civic-signal', secret: CIVIC_SECRET });
    expect((await post(env, '/auth/site/exchange', { code: r.code }, MANNAN_SECRET)).status).toBe(400);
  });
  test('a mannan.is code cannot be exchanged by a site', async () => {
    const { env } = makeEnv();
    const r = await roundTrip(env, { secret: MANNAN_SECRET });
    expect((await post(env, '/auth/site/exchange', { code: r.code, site: 'civic-signal' }, CIVIC_SECRET)).status).toBe(400);
  });
  test('a site exchange with the mannan.is secret is refused', async () => {
    const { env } = makeEnv();
    const r = await roundTrip(env, { site: 'civic-signal', secret: CIVIC_SECRET });
    expect((await post(env, '/auth/site/exchange', { code: r.code, site: 'civic-signal' }, MANNAN_SECRET)).status).toBe(401);
  });
});
