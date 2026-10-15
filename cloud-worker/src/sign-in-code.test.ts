import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import app from './index';
import {
  consumeMagicToken,
  consumeSignInCode,
  formatSignInCode,
  generateSignInCode,
  MAX_ATTEMPTS_PER_CODE,
  MAX_FAILURES_PER_EMAIL,
  mintMagicToken,
  normalizeSignInCode,
} from './auth';
import { NEVER_SHARE } from './email';
import type { Env } from './types';

const MIGRATIONS = join(import.meta.dir, '..', 'migrations');
const EMAIL = 'person@example.com';
const EXCHANGE_SECRET = 'test-exchange-secret';
const realNow = Date.now;
const realFetch = globalThis.fetch;

afterEach(() => {
  Date.now = realNow;
  globalThis.fetch = realFetch;
});

function sqliteD1(db: Database): D1Database {
  const statement = (sql: string, args: unknown[] = []) => ({
    bind: (...next: unknown[]) => statement(sql, next),
    first: async <T>() => (db.query(sql).get(...(args as never[])) as T | null) ?? null,
    run: async () => {
      db.query(sql).run(...(args as never[]));
      return { success: true, meta: {} };
    },
    all: async <T>() => ({ results: db.query(sql).all(...(args as never[])) as T[], success: true, meta: {} }),
  });
  return {
    prepare: (sql: string) => statement(sql),
    batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
      db.exec('BEGIN');
      try {
        for (const s of statements) await s.run();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return [];
    },
  } as unknown as D1Database;
}

const CIVIC_SECRET = 'civic-site-secret';

function createEnv(options: { verifyAllowed?: boolean } = {}): { env: Env; db: Database; limiterKeys: string[] } {
  const db = new Database(':memory:');
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  const limiterKeys: string[] = [];
  const env = {
    DB: sqliteD1(db),
    REQUEST_LIMITER: { limit: async () => ({ success: true }) },
    VERIFY_LIMITER: {
      limit: async ({ key }: { key: string }) => {
        limiterKeys.push(key);
        return { success: options.verifyAllowed ?? true };
      },
    },
    SESSION_SECRET: 'test-session-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM: 'test@example.com',
    PUBLIC_BASE_URL: 'https://example.com',
    SITE_AUTH_RETURN_URL: 'https://example.com/callback',
    SITE_AUTH_EXCHANGE_SECRET: EXCHANGE_SECRET,
    SITE_AUTH_SITES: JSON.stringify({
      civic: { secret: CIVIC_SECRET, return_url: 'https://civic.example/auth/callback', name: 'Civic' },
    }),
  } as unknown as Env;
  return { env, db, limiterKeys };
}

function wrongCode(code: string): string {
  return String((Number(code) + 1) % 1e8).padStart(8, '0');
}

const executionCtx = {
  waitUntil(promise: Promise<unknown>) { void promise; },
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

function siteVerify(env: Env, body: unknown, headers: Record<string, string> = {}) {
  return app.fetch(
    new Request('https://cloud.test/auth/site/verify-code', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${EXCHANGE_SECRET}`,
        'content-type': 'application/json',
        'x-site-auth-ip': '203.0.113.9',
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    env,
    executionCtx,
  );
}

describe('sign-in code format', () => {
  test('generates 8 digits, keeping leading zeros', () => {
    for (let i = 0; i < 200; i++) expect(generateSignInCode()).toMatch(/^\d{8}$/);
  });

  test('formats as NN-NNN-NNN and normalizes typed input', () => {
    expect(formatSignInCode('21123123')).toBe('21-123-123');
    expect(normalizeSignInCode('21-123-123')).toBe('21123123');
    expect(normalizeSignInCode(' 21 123 123 ')).toBe('21123123');
    expect(normalizeSignInCode('00000000')).toBe('00000000');
    expect(normalizeSignInCode('2112312')).toBeNull();
    expect(normalizeSignInCode('211231234')).toBeNull();
    expect(normalizeSignInCode(21123123)).toBeNull();
  });
});

describe('consumeSignInCode', () => {
  test('stores only a hash of the code and of the link token', async () => {
    const { env, db } = createEnv();
    const { token, code } = await mintMagicToken(env, EMAIL, 'site');
    const row = db.query('SELECT token, code_hash FROM magic_tokens').get() as { token: string; code_hash: string };
    expect(row.code_hash).not.toContain(code);
    expect(row.token).not.toBe(token);
  });

  test('a correct code signs in once, and then the link is dead too', async () => {
    const { env } = createEnv();
    const { token, code } = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBe(EMAIL);
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBeNull();
    expect(await consumeMagicToken(env, token, 'site')).toBeNull();
  });

  test('using the link kills the code', async () => {
    const { env } = createEnv();
    const { token, code } = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeMagicToken(env, token, 'site')).toBe(EMAIL);
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBeNull();
  });

  test('the right code for a different email is refused', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeSignInCode(env, 'other@example.com', code, 'site')).toBeNull();
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBe(EMAIL);
  });

  test('a code for one purpose does not work for the other', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'cloud');
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBeNull();
  });

  test('an expired code is refused', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'site');
    const issued = realNow();
    Date.now = () => issued + 15 * 60 * 1000 + 1;
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBeNull();
  });

  test(`after ${MAX_ATTEMPTS_PER_CODE} wrong tries the right code is refused and the link dies`, async () => {
    const { env } = createEnv();
    const { token, code } = await mintMagicToken(env, EMAIL, 'site');
    for (let i = 0; i < MAX_ATTEMPTS_PER_CODE; i++) {
      expect(await consumeSignInCode(env, EMAIL, wrongCode(code), 'site')).toBeNull();
    }
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBeNull();
    expect(await consumeMagicToken(env, token, 'site')).toBeNull();
  });

  test('four wrong tries still allow the right code', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'site');
    for (let i = 0; i < MAX_ATTEMPTS_PER_CODE - 1; i++) {
      await consumeSignInCode(env, EMAIL, wrongCode(code), 'site');
    }
    expect(await consumeSignInCode(env, EMAIL, code, 'site')).toBe(EMAIL);
  });

  test('resending expires the earlier email: only the newest link and code work', async () => {
    const { env } = createEnv();
    const first = await mintMagicToken(env, EMAIL, 'site');
    const second = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeMagicToken(env, first.token, 'site')).toBeNull();
    expect(await consumeSignInCode(env, EMAIL, first.code, 'site')).toBeNull();
    expect(await consumeSignInCode(env, EMAIL, second.code, 'site')).toBe(EMAIL);
  });

  test(`resending cannot farm guesses: ${MAX_FAILURES_PER_EMAIL} failures per email per hour`, async () => {
    const { env } = createEnv();
    let failures = 0;
    while (failures < MAX_FAILURES_PER_EMAIL) {
      const { code } = await mintMagicToken(env, EMAIL, 'site');
      for (let i = 0; i < 3 && failures < MAX_FAILURES_PER_EMAIL; i++, failures++) {
        await consumeSignInCode(env, EMAIL, wrongCode(code), 'site');
      }
    }
    const fresh = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeSignInCode(env, EMAIL, fresh.code, 'site')).toBeNull();

    const issued = realNow();
    Date.now = () => issued + 60 * 60 * 1000 + 1000;
    const later = await mintMagicToken(env, EMAIL, 'site');
    expect(await consumeSignInCode(env, EMAIL, later.code, 'site')).toBe(EMAIL);
  });

  test('guesses against an email with no pending code still count toward its cap', async () => {
    const { env, db } = createEnv();
    await consumeSignInCode(env, EMAIL, '12345678', 'site');
    const row = db.query('SELECT COUNT(*) AS n FROM sign_in_code_failures WHERE email = ?').get(EMAIL) as { n: number };
    expect(row.n).toBe(1);
  });
});

describe('POST /auth/site/verify-code', () => {
  test('refuses without the exchange secret', async () => {
    const { env } = createEnv();
    const res = await siteVerify(env, { email: EMAIL, code: '12-345-678' }, { authorization: 'Bearer wrong' });
    expect(res.status).toBe(401);
  });

  test('refuses a malformed body without touching the limiter', async () => {
    const { env, limiterKeys } = createEnv();
    for (const body of [null, {}, { email: EMAIL }, { email: EMAIL, code: '1234567' }, { email: 'nope', code: '12345678' }]) {
      const res = await siteVerify(env, body);
      expect(res.status).toBe(400);
      expect(await res.json() as unknown).toEqual({ error: 'invalid-code' });
    }
    expect(limiterKeys).toEqual([]);
  });

  test('applies the per-IP limiter', async () => {
    const { env, limiterKeys } = createEnv({ verifyAllowed: false });
    const res = await siteVerify(env, { email: EMAIL, code: '12345678' });
    expect(res.status).toBe(429);
    expect(limiterKeys).toEqual(['site:code:203.0.113.9']);
  });

  test('wrong and right codes, with dashes accepted', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'site');
    const wrong = await siteVerify(env, { email: EMAIL, code: formatSignInCode(wrongCode(code)) });
    expect(wrong.status).toBe(400);
    expect(await wrong.json() as unknown).toEqual({ error: 'invalid-code' });

    await env.DB.prepare("INSERT INTO users (email, role, created_at) VALUES (?, 'client', ?)").bind(EMAIL, 1).run();
    const right = await siteVerify(env, { email: EMAIL.toUpperCase(), code: formatSignInCode(code) });
    expect(right.status).toBe(200);
    expect(await right.json() as unknown).toEqual({ email: EMAIL, role: 'user', admin: false });
  });

  test('a site checks its own codes with its own secret, and the two never mix', async () => {
    const { env } = createEnv();
    await env.DB.prepare("INSERT INTO users (email, role, created_at) VALUES (?, 'client', ?)").bind(EMAIL, 1).run();
    const civic = await mintMagicToken(env, EMAIL, 'site:civic');
    const mannan = await mintMagicToken(env, EMAIL, 'site');
    const asCivic = { authorization: `Bearer ${CIVIC_SECRET}` };

    expect((await siteVerify(env, { site: 'civic', email: EMAIL, code: civic.code })).status).toBe(401);
    expect((await siteVerify(env, { site: 'nope', email: EMAIL, code: civic.code }, asCivic)).status).toBe(401);
    expect((await siteVerify(env, { site: 'civic', email: EMAIL, code: mannan.code }, asCivic)).status).toBe(400);
    expect((await siteVerify(env, { email: EMAIL, code: civic.code })).status).toBe(400);

    const right = await siteVerify(env, { site: 'civic', email: EMAIL, code: civic.code }, asCivic);
    expect(right.status).toBe(200);
    expect(await right.json() as unknown).toEqual({ email: EMAIL, role: 'user', admin: false });
  });
});

describe('Cloud HTML code sign-in', () => {
  function form(env: Env, fields: Record<string, string>, headers: Record<string, string> = {}) {
    return app.fetch(
      new Request('https://cloud.test/auth/verify-code', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.10', ...headers },
        body: new URLSearchParams(fields),
      }),
      env,
      executionCtx,
    );
  }

  test('a wrong code re-renders the form with the generic error', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'cloud');
    const res = await form(env, { email: EMAIL, code: wrongCode(code) });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('That code didn&#39;t work');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  test('a cross-site form post is refused before the code is checked', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'cloud');
    const crossSite: Array<Record<string, string>> = [{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }];
    for (const headers of crossSite) {
      const res = await form(env, { email: EMAIL, code }, headers);
      expect(res.status).toBe(403);
    }
    const sameSite = await form(env, { email: EMAIL, code }, { origin: 'https://example.com' });
    expect(sameSite.status).toBe(302);
  });

  test('the right code sets the Cloud session and redirects', async () => {
    const { env } = createEnv();
    const { code } = await mintMagicToken(env, EMAIL, 'cloud');
    const res = await form(env, { email: EMAIL, code: formatSignInCode(code) });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/cloud');
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
  });

  test('request emails the formatted code with the never-share line, then offers Enter code', async () => {
    const { env } = createEnv();
    const sent: Array<{ text: string; html: string }> = [];
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const res = await app.fetch(
      new Request('https://cloud.test/auth/request', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.11' },
        body: new URLSearchParams({ email: EMAIL }),
      }),
      env,
      executionCtx,
    );
    const page = await res.text();
    expect(page).toContain('/auth/code?email=person%40example.com');
    expect(page).toContain('Resend');
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toMatch(/Or enter this code: \d{2}-\d{3}-\d{3}/);
    expect(sent[0].text).toContain(NEVER_SHARE);
    expect(sent[0].html).toMatch(/\d{2}-\d{3}-\d{3}/);
    expect(sent[0].html).toContain(NEVER_SHARE);
  });
});
