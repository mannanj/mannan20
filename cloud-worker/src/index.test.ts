import { afterEach, describe, expect, mock, test } from 'bun:test';
import app from './index';
import {
  consumeMagicToken,
  createSessionCookie,
  ensureUser,
  mintMagicToken,
  mintSiteSessionCode,
} from './auth';
import type { Env, RateLimit } from './types';
import { PRIVACY_VERSION, TERMS_VERSION } from './legal';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function fakeDb(role: 'admin' | 'client' | null = 'admin', hasGrant = false): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return {
            first: async () => {
              if (sql.includes('SELECT account_id, email, role, status FROM users')) {
                return role
                  ? {
                      account_id: '0123456789abcdef0123456789abcdef',
                      email: 'person@example.com',
                      role,
                      status: 'active',
                    }
                  : null;
              }
              if (sql.includes('SELECT 1 FROM folder_members')) return hasGrant ? { 1: 1 } : null;
              throw new Error(`unexpected D1 query: ${sql}`);
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function storedObject(value = 'private data', contentType = 'application/pdf'): R2ObjectBody {
  const bytes = new TextEncoder().encode(value);
  return {
    key: 'general/report.pdf',
    version: '1',
    size: bytes.length,
    etag: 'etag-value',
    httpEtag: '"etag-value"',
    uploaded: new Date('2026-07-12T00:00:00Z'),
    checksums: {},
    httpMetadata: {
      contentType,
      contentDisposition: 'inline; filename="attacker.html"',
      cacheControl: 'public, max-age=31536000',
    },
    customMetadata: { 'x-hostile': 'forward-me' },
    range: undefined,
    storageClass: 'Standard',
    body: new Blob([bytes]).stream(),
    bodyUsed: false,
    arrayBuffer: async () => bytes.buffer,
    text: async () => value,
    json: async <T>() => JSON.parse(value) as T,
    blob: async () => new Blob([bytes]),
    writeHttpMetadata(headers: Headers) {
      headers.set('content-type', contentType);
      headers.set('content-disposition', 'inline; filename="attacker.html"');
      headers.set('cache-control', 'public, max-age=31536000');
      headers.set('x-hostile', 'forward-me');
    },
  } as unknown as R2ObjectBody;
}

interface BucketState {
  getKeys: string[];
  headKeys: string[];
  putKeys: string[];
  listPrefixes: string[];
  object: R2ObjectBody | null;
  listedObjects: R2Object[];
}

function fakeBucket(state: BucketState): R2Bucket {
  return {
    async get(key: string) {
      state.getKeys.push(key);
      return state.object;
    },
    async head(key: string) {
      state.headKeys.push(key);
      return state.object;
    },
    async put(key: string) {
      state.putKeys.push(key);
      return { key, version: '1', etag: 'etag', size: 1, uploaded: new Date() };
    },
    async list(options: R2ListOptions) {
      state.listPrefixes.push(options.prefix ?? '');
      return { objects: state.listedObjects, truncated: false, delimitedPrefixes: [] };
    },
  } as unknown as R2Bucket;
}

function limiter(result = true, keys: string[] = []): RateLimit {
  return {
    async limit({ key }) {
      keys.push(key);
      return { success: result };
    },
  };
}

function fakeEnv(options: {
  role?: 'admin' | 'client' | null;
  hasGrant?: boolean;
  object?: R2ObjectBody | null;
  fileLimiter?: RateLimit | null;
} = {}): { env: Env; state: BucketState; states: Record<'general' | 'hans' | 'backups', BucketState> } {
  const makeState = (object: R2ObjectBody | null): BucketState => ({
    getKeys: [],
    headKeys: [],
    putKeys: [],
    listPrefixes: [],
    object,
    listedObjects: [],
  });
  const states = {
    general: makeState(options.object === undefined ? storedObject() : options.object),
    hans: makeState(storedObject()),
    backups: makeState(storedObject()),
  };
  const env = {
    DB: fakeDb(options.role === undefined ? 'admin' : options.role, options.hasGrant),
    FILES: fakeBucket(states.general),
    FILES_HANS: fakeBucket(states.hans),
    FILES_BACKUPS: fakeBucket(states.backups),
    FILES_LIMITER: options.fileLimiter === null ? undefined : options.fileLimiter ?? limiter(),
    REQUEST_LIMITER: limiter(),
    VERIFY_LIMITER: limiter(),
    SESSION_SECRET: 'test-session-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM: 'test@example.com',
    PUBLIC_BASE_URL: 'https://example.com',
    SITE_AUTH_RETURN_URL: 'https://example.com/callback',
    SITE_AUTH_EXCHANGE_SECRET: 'test-exchange-secret',
  } as unknown as Env;
  return { env, state: states.general, states };
}

const executionCtx = {
  waitUntil(promise: Promise<unknown>) { void promise; },
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

interface AuthDbState {
  users: Map<string, {
    account_id: string;
    email: string;
    role: string;
    status: 'active' | 'pending_consent';
    created_at: number;
  }>;
  magicTokens: Map<string, {
    email: string;
    expires_at: number;
    purpose: string;
    return_path: string;
  }>;
  siteCodes: Map<string, {
    email: string;
    expires_at: number;
    return_path: string;
  }>;
  legalAcceptances: Map<string, {
    account_id: string;
    terms_version: string;
    privacy_version: string;
    accepted_at: number;
  }>;
}

function authDb(): { db: D1Database; state: AuthDbState } {
  const state: AuthDbState = {
    users: new Map(),
    magicTokens: new Map(),
    siteCodes: new Map(),
    legalAcceptances: new Map(),
  };

  function query(sql: string, args: unknown[]): unknown {
    const normalized = sql.replace(/\s+/gu, ' ').trim();
    if (normalized.startsWith('SELECT account_id, email, role, status FROM users WHERE account_id')) {
      return [...state.users.values()].find((row) => row.account_id === args[0]) ?? null;
    }
    if (normalized.startsWith('SELECT account_id, email, role, status FROM users')) {
      return state.users.get(String(args[0])) ?? null;
    }
    if (normalized.startsWith('INSERT INTO users')) {
      const [email, role, createdAt, accountId, status] = args as [
        string,
        string,
        number,
        string,
        'active' | 'pending_consent',
      ];
      const existing = state.users.get(email);
      state.users.set(email, existing ?? {
        account_id: accountId,
        email,
        role,
        status,
        created_at: createdAt,
      });
      return null;
    }
    if (normalized.startsWith('INSERT INTO magic_tokens')) {
      const [token, email, expiresAt, purpose, returnPath] = args as [
        string,
        string,
        number,
        string,
        string,
      ];
      state.magicTokens.set(token, {
        email,
        expires_at: expiresAt,
        purpose,
        return_path: returnPath,
      });
      return null;
    }
    if (normalized.startsWith('DELETE FROM magic_tokens')) {
      const [token, purpose] = args as [string, string];
      const row = state.magicTokens.get(token);
      if (!row || row.purpose !== purpose) return null;
      state.magicTokens.delete(token);
      return row;
    }
    if (normalized.startsWith('INSERT INTO site_session_codes')) {
      const [codeHash, email, expiresAt, returnPath] = args as [
        string,
        string,
        number,
        string,
      ];
      state.siteCodes.set(codeHash, {
        email,
        expires_at: expiresAt,
        return_path: returnPath,
      });
      return null;
    }
    if (normalized.startsWith('DELETE FROM site_session_codes')) {
      const row = state.siteCodes.get(String(args[0]));
      if (!row) return null;
      state.siteCodes.delete(String(args[0]));
      return row;
    }
    if (normalized.startsWith('INSERT OR IGNORE INTO legal_acceptances')) {
      const [accountId, termsVersion, privacyVersion, acceptedAt] = args as [
        string,
        string,
        string,
        number,
      ];
      if (![...state.users.values()].some((row) => row.account_id === accountId)) {
        return null;
      }
      const key = `${accountId}:${termsVersion}:${privacyVersion}`;
      if (!state.legalAcceptances.has(key)) {
        state.legalAcceptances.set(key, {
          account_id: accountId,
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          accepted_at: acceptedAt,
        });
      }
      return null;
    }
    if (normalized.startsWith("UPDATE users SET status = 'active'")) {
      const user = [...state.users.values()].find((row) => row.account_id === args[0]);
      if (user) user.status = 'active';
      return null;
    }
    if (normalized.startsWith('SELECT terms_version, privacy_version, accepted_at')) {
      return state.legalAcceptances.get(`${args[0]}:${args[1]}:${args[2]}`) ?? null;
    }
    throw new Error(`auth fake D1: unexpected query: ${normalized}`);
  }

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            first: async <T>() => query(sql, args) as T | null,
            run: async () => {
              query(sql, args);
              return { success: true, meta: {} };
            },
          };
        },
      };
    },
    batch: async (statements: D1PreparedStatement[]) =>
      Promise.all(statements.map((statement) => statement.run())),
  } as unknown as D1Database;
  return { db, state };
}

function authFlowEnv(db: D1Database): Env {
  return { ...fakeEnv().env, DB: db };
}

describe('shared site authentication routes', () => {
  test('preserves a sanitized return path for site sign-in', async () => {
    const { db, state } = authDb();
    const env = authFlowEnv(db);
    globalThis.fetch = mock(async () => Response.json({ id: 'email_1' })) as unknown as typeof fetch;

    const response = await app.request('/auth/site/request', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.SITE_AUTH_EXCHANGE_SECRET}`,
        'content-type': 'application/json',
        'x-site-auth-ip': '198.51.100.8',
      },
      body: JSON.stringify({
        email: 'person@example.com',
        returnTo: '/meet/abc?join=1',
      }),
    }, env);

    expect(response.status).toBe(200);
    expect([...state.magicTokens.values()]).toHaveLength(1);
    expect([...state.magicTokens.values()][0]?.return_path).toBe('/meet/abc?join=1');
  });

  test('exchanges a verified code for stable account identity and return path', async () => {
    const { db } = authDb();
    const env = authFlowEnv(db);
    const account = await ensureUser(env, 'person@example.com');
    const token = await mintMagicToken(env, account.email, 'site', '/meet/abc');
    const verified = await consumeMagicToken(env, token, 'site');
    const code = await mintSiteSessionCode(env, account.email, verified!.returnPath);

    const response = await app.request('/auth/site/exchange', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.SITE_AUTH_EXCHANGE_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ code }),
    }, env);

    expect(response.status).toBe(200);
    expect(await response.json() as unknown).toEqual({
      accountId: account.accountId,
      email: 'person@example.com',
      role: 'user',
      admin: false,
      status: 'pending_consent',
      returnTo: '/meet/abc',
    });
  });

  test('keeps unknown direct Cloud sign-in generic without creating or emailing', async () => {
    const { db, state } = authDb();
    const env = authFlowEnv(db);
    let sends = 0;
    globalThis.fetch = mock(async () => {
      sends += 1;
      return Response.json({ id: 'email_1' });
    }) as unknown as typeof fetch;
    const form = new FormData();
    form.set('email', 'unknown@example.com');

    const response = await app.request('/auth/request', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.9' },
      body: form,
    }, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Check your inbox');
    expect(state.users.size).toBe(0);
    expect(state.magicTokens.size).toBe(0);
    expect(sends).toBe(0);
  });

  test('activates a pending account only for current legal versions', async () => {
    const { db, state } = authDb();
    const env = authFlowEnv(db);
    const account = await ensureUser(env, 'person@example.com');

    const response = await app.request('/auth/site/consent', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.SITE_AUTH_EXCHANGE_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        accountId: account.accountId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      }),
    }, env);

    expect(response.status).toBe(200);
    expect(await response.json() as unknown).toMatchObject({
      accountId: account.accountId,
      email: 'person@example.com',
      role: 'user',
      admin: false,
      status: 'active',
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
    expect(state.users.get('person@example.com')?.status).toBe('active');
  });

  test.each([
    ['bad service secret', 'Bearer wrong', TERMS_VERSION, 401],
    ['stale terms', 'Bearer test-exchange-secret', '2025-01-01', 400],
  ])('rejects consent with %s', async (_label, authorization, termsVersion, status) => {
    const { db } = authDb();
    const env = authFlowEnv(db);
    const account = await ensureUser(env, 'person@example.com');
    const response = await app.request('/auth/site/consent', {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({
        accountId: account.accountId,
        termsVersion,
        privacyVersion: PRIVACY_VERSION,
      }),
    }, env);

    expect(response.status).toBe(status);
  });
});

Object.defineProperty(globalThis, 'caches', {
  configurable: true,
  value: {
    default: {
      match: async () => undefined,
      put: async () => undefined,
      delete: async () => true,
    },
  },
});

async function authHeaders(env: Env, ip = '203.0.113.8'): Promise<HeadersInit> {
  const cookie = await createSessionCookie(env, 'person@example.com');
  return { cookie, 'cf-connecting-ip': ip };
}

describe('authenticated direct files', () => {
  test('GET returns the private object with only safe attachment metadata', async () => {
    const { env, state } = fakeEnv();
    const res = await app.request('/files/general/report.pdf', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('private data');
    expect(state.getKeys).toEqual(['general/report.pdf']);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="report.pdf"');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('etag')).toBe('"etag-value"');
    expect(res.headers.has('x-hostile')).toBeFalse();
  });

  test('does not emit a hostile stored content type', async () => {
    const { env } = fakeEnv({ object: storedObject('private data', 'text/html\r\nx-hostile: yes') });
    const res = await app.request('/files/general/report.pdf', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.has('x-hostile')).toBeFalse();
  });

  test('HEAD authorizes and inspects metadata without retrieving or returning a body', async () => {
    const { env, state } = fakeEnv();
    const res = await app.request('/files/general/client/report.pdf', {
      method: 'HEAD',
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(200);
    expect(await res.arrayBuffer()).toHaveLength(0);
    expect(state.headKeys).toEqual(['general/client/report.pdf']);
    expect(state.getKeys).toEqual([]);
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="report.pdf"');
  });

  test('selects FILES_HANS for direct hans downloads', async () => {
    const { env, states } = fakeEnv();
    const res = await app.request('/files/hans/report.pdf', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('private data');
    expect(states.hans.getKeys).toEqual(['report.pdf']);
    expect(states.general.getKeys).toEqual([]);
    expect(states.backups.getKeys).toEqual([]);
  });

  test('decodes ordinary URL characters without accepting encoded separators', async () => {
    const { env, state } = fakeEnv();
    const headers = await authHeaders(env);

    const accepted = await app.request('/files/general/final%20deck.pdf', { headers }, env);
    const rejected = await app.request('/files/general/client%2Freport.pdf', { headers }, env);

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(404);
    expect(state.getKeys).toEqual(['general/final deck.pdf']);
  });

  test('rejects unsupported direct-file methods with Allow', async () => {
    const { env } = fakeEnv();
    const res = await app.request('/files/general/report.pdf', {
      method: 'POST',
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });

  test.each([
    ['no session', null, '/files/general/report.pdf'],
    ['no folder grant', 'client', '/files/general/report.pdf'],
    ['invalid identifier', 'admin', '/files/general/client%252Freport.pdf'],
    ['missing object', 'admin', '/files/general/report.pdf'],
  ] as const)('makes %s indistinguishable as 404', async (_label, role, path) => {
    const { env, state } = fakeEnv({
      role: role ?? 'admin',
      object: _label === 'missing object' ? null : undefined,
    });
    const headers = role === null ? undefined : await authHeaders(env);
    const res = await app.request(path, { headers }, env);

    expect(res.status).toBe(404);
    expect(await res.json() as unknown).toEqual({ error: 'not found' });
    if (_label === 'invalid identifier') expect(state.getKeys).toEqual([]);
  });

  test('limits files by authenticated email and connecting IP', async () => {
    const keys: string[] = [];
    const { env, state } = fakeEnv({ fileLimiter: limiter(false, keys) });
    const res = await app.request('/files/general/report.pdf', {
      headers: await authHeaders(env, '198.51.100.4'),
    }, env);

    expect(res.status).toBe(429);
    expect(keys).toEqual(['files:person@example.com:198.51.100.4']);
    expect(state.getKeys).toEqual([]);
  });

  test('fails closed when the files limiter binding is missing', async () => {
    const { env, state } = fakeEnv({ fileLimiter: null });
    const res = await app.request('/files/general/report.pdf', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(503);
    expect(state.getKeys).toEqual([]);
  });
});

describe('private listing, ZIP, and upload boundaries', () => {
  test('marks authenticated HTML private and varies on the session cookie', async () => {
    const { env } = fakeEnv();
    const res = await app.request('/cloud', { headers: await authHeaders(env) }, env);

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toContain('Cookie');
  });

  test('rejects a malformed listing subpath before R2 work', async () => {
    const { env, state } = fakeEnv();
    const res = await app.request('/cloud/general/client%252Fsecrets', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(400);
    expect(state.getKeys).toEqual([]);
    expect(state.headKeys).toEqual([]);
  });

  test('filters invalid object identifiers returned by listing storage', async () => {
    const { env, state } = fakeEnv();
    state.listedObjects = [
      { key: 'general/client/report.pdf', size: 12, uploaded: new Date('2026-07-12') },
      { key: 'general/client/../secret.pdf', size: 12, uploaded: new Date('2026-07-12') },
    ] as R2Object[];

    const res = await app.request('/cloud/general/client', {
      headers: await authHeaders(env),
    }, env, executionCtx);
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('report.pdf');
    expect(html).not.toContain('../secret.pdf');
  });

  test('rejects a singly encoded separator in a listing subpath before R2 work', async () => {
    const { env, state } = fakeEnv();
    const res = await app.request('/cloud/general/client%2Fsecrets', {
      headers: await authHeaders(env),
    }, env);

    expect(res.status).toBe(400);
    expect(state.getKeys).toEqual([]);
    expect(state.headKeys).toEqual([]);
  });

  test('rate-limits ZIP creation using the authenticated email and IP', async () => {
    const keys: string[] = [];
    const { env, state } = fakeEnv({ fileLimiter: limiter(false, keys) });
    const form = new FormData();
    form.set('mode', 'selected');
    form.set('subpath', '');
    form.set('name', 'report.pdf');

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env, '198.51.100.9'),
      body: form,
    }, env);

    expect(res.status).toBe(429);
    expect(keys).toEqual(['files:person@example.com:198.51.100.9']);
    expect(state.getKeys).toEqual([]);
  });

  test('rejects malformed selected ZIP names before R2 work', async () => {
    const { env, state } = fakeEnv();
    const form = new FormData();
    form.set('mode', 'selected');
    form.set('subpath', '');
    form.set('name', '../secret.pdf');

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env),
      body: form,
    }, env);

    expect(res.status).toBe(400);
    expect(state.getKeys).toEqual([]);
    expect(state.headKeys).toEqual([]);
  });

  test('rejects ZIP requests over the maximum entry count', async () => {
    const { env, state } = fakeEnv();
    const form = new FormData();
    form.set('mode', 'selected');
    form.set('subpath', '');
    for (let i = 0; i < 1001; i++) form.append('name', `report-${i}.pdf`);

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env),
      body: form,
    }, env);

    expect(res.status).toBe(413);
    expect(state.headKeys).toEqual([]);
  });

  test('rejects ZIP requests over the maximum total bytes before streaming', async () => {
    const huge = storedObject();
    Object.defineProperty(huge, 'size', { value: 1024 * 1024 * 1024 + 1 });
    const { env, state } = fakeEnv({ object: huge });
    const form = new FormData();
    form.set('mode', 'selected');
    form.set('subpath', '');
    form.set('name', 'report.pdf');

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env),
      body: form,
    }, env);

    expect(res.status).toBe(413);
    expect(state.headKeys).toEqual(['general/report.pdf']);
    expect(state.getKeys).toEqual([]);
  });

  test('rejects an unsafe admin upload filename before put', async () => {
    const { env, state } = fakeEnv();
    const form = new FormData();
    form.set('folder', 'general');
    form.set('file', new File(['secret'], 'client%2Fsecret.pdf', { type: 'application/pdf' }));
    const headers = new Headers(await authHeaders(env));
    headers.set('content-length', '1024');

    const res = await app.request('/admin/upload', {
      method: 'POST',
      headers,
      body: form,
    }, env);

    expect(res.status).toBe(400);
    expect(state.putKeys).toEqual([]);
  });

  test('rejects an upload declared over 100 MiB before parsing or put', async () => {
    const { env, state } = fakeEnv();
    const form = new FormData();
    form.set('folder', 'general');
    form.set('file', new File(['small'], 'report.pdf', { type: 'application/pdf' }));

    const headers = new Headers(await authHeaders(env));
    headers.set('content-length', String(100 * 1024 * 1024 + 1));
    const res = await app.request('/admin/upload', {
      method: 'POST',
      headers,
      body: form,
    }, env);

    expect(res.status).toBe(413);
    expect(state.putKeys).toEqual([]);
  });

  test.each([
    ['missing', null, 411],
    ['invalid', 'not-a-number', 400],
    ['negative', '-1', 400],
  ] as const)('rejects upload Content-Length when it is %s', async (_label, length, status) => {
    const { env, states } = fakeEnv();
    const form = new FormData();
    form.set('folder', 'general');
    form.set('file', new File(['small'], 'report.pdf', { type: 'application/pdf' }));
    const headers = new Headers(await authHeaders(env));
    if (length !== null) headers.set('content-length', length);

    const res = await app.request('/admin/upload', {
      method: 'POST',
      headers,
      body: form,
    }, env, executionCtx);

    expect(res.status).toBe(status);
    expect(states.general.putKeys).toEqual([]);
    expect(states.hans.putKeys).toEqual([]);
    expect(states.backups.putKeys).toEqual([]);
  });

  test('uploads an actual bounded file to the configured backup bucket', async () => {
    const { env, states } = fakeEnv();
    const form = new FormData();
    form.set('folder', 'hans-backups');
    form.set('file', new File(['backup'], 'report.pdf', { type: 'application/pdf' }));
    const headers = new Headers(await authHeaders(env));
    headers.set('content-length', '1024');

    const res = await app.request('/admin/upload', {
      method: 'POST',
      headers,
      body: form,
    }, env, executionCtx);

    expect(res.status).toBe(200);
    expect(await res.json() as unknown).toEqual({ ok: true, key: 'report.pdf', size: 6 });
    expect(states.backups.putKeys).toEqual(['report.pdf']);
    expect(states.general.putKeys).toEqual([]);
    expect(states.hans.putKeys).toEqual([]);
  });

  test('rejects a declared upload length smaller than the parsed file', async () => {
    const { env, states } = fakeEnv();
    const form = new FormData();
    form.set('folder', 'general');
    form.set('file', new File(['backup'], 'report.pdf', { type: 'application/pdf' }));
    const headers = new Headers(await authHeaders(env));
    headers.set('content-length', '1');

    const res = await app.request('/admin/upload', {
      method: 'POST',
      headers,
      body: form,
    }, env, executionCtx);

    expect(res.status).toBe(400);
    expect(states.general.putKeys).toEqual([]);
  });

  test('creates a bounded mode=all ZIP from the selected folder binding', async () => {
    const { env, states } = fakeEnv();
    states.general.listedObjects = [
      { key: 'general/report.pdf', size: 12, uploaded: new Date('2026-07-12') },
    ] as R2Object[];
    const form = new FormData();
    form.set('mode', 'all');
    form.set('subpath', '');

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env),
      body: form,
    }, env);
    const serialized = new TextDecoder().decode(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(states.general.listPrefixes).toEqual(['general/']);
    expect(states.general.getKeys).toEqual(['general/report.pdf']);
    expect(states.hans.listPrefixes).toEqual([]);
    expect(serialized).toContain('report.pdf');
  });

  test('rejects mode=all ZIPs over the entry budget before object retrieval', async () => {
    const { env, states } = fakeEnv();
    states.general.listedObjects = Array.from({ length: 1001 }, (_, index) => ({
      key: `general/report-${index}.pdf`,
      size: 1,
      uploaded: new Date('2026-07-12'),
    })) as R2Object[];
    const form = new FormData();
    form.set('mode', 'all');
    form.set('subpath', '');

    const res = await app.request('/cloud/general/download', {
      method: 'POST',
      headers: await authHeaders(env),
      body: form,
    }, env);

    expect(res.status).toBe(413);
    expect(states.general.getKeys).toEqual([]);
  });
});
