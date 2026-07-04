import { describe, expect, test } from 'bun:test';
import {
  dbRoleForEmail,
  siteRoleFromDbRole,
  hashSecret,
  consumeMagicToken,
  consumeSiteSessionCode,
  mintMagicToken,
  mintSiteSessionCode,
  ensureUser,
} from './auth';
import type { Env } from './types';

describe('shared auth helpers', () => {
  test('assigns hello@mannan.is as the shared admin account', () => {
    expect(dbRoleForEmail('hello@mannan.is')).toBe('admin');
    expect(dbRoleForEmail(' Hello@Mannan.Is ')).toBe('admin');
    expect(dbRoleForEmail('person@example.com')).toBe('client');
  });

  test('maps cloud client users to normal site users', () => {
    expect(siteRoleFromDbRole('admin')).toBe('admin');
    expect(siteRoleFromDbRole('client')).toBe('user');
    expect(siteRoleFromDbRole('anything-else')).toBe('user');
  });

  test('hashes bearer secrets before storage', async () => {
    const hashed = await hashSecret('raw-token-value');

    expect(hashed).not.toBe('raw-token-value');
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  });
});

interface MagicTokenRow {
  email: string;
  expires_at: number;
  purpose: string;
}

interface SiteSessionCodeRow {
  email: string;
  expires_at: number;
}

interface UserRow {
  email: string;
  role: string;
  created_at: number;
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function createFakeDb(): Pick<Env, 'DB'>['DB'] {
  const magicTokens = new Map<string, MagicTokenRow>();
  const siteSessionCodes = new Map<string, SiteSessionCodeRow>();
  const users = new Map<string, UserRow>();

  function run(sql: string, args: unknown[]): Record<string, unknown> | null {
    const normalized = normalize(sql);

    if (normalized.startsWith('INSERT INTO magic_tokens')) {
      const [token, email, expiresAt, purpose] = args as [string, string, number, string];
      magicTokens.set(token, { email, expires_at: expiresAt, purpose });
      return null;
    }
    if (normalized.startsWith('DELETE FROM magic_tokens') && normalized.includes('RETURNING')) {
      const [token, purpose] = args as [string, string];
      const row = magicTokens.get(token);
      if (!row || row.purpose !== purpose) return null;
      magicTokens.delete(token);
      return { email: row.email, expires_at: row.expires_at };
    }
    if (normalized.startsWith('INSERT INTO site_session_codes')) {
      const [codeHash, email, expiresAt] = args as [string, string, number];
      siteSessionCodes.set(codeHash, { email, expires_at: expiresAt });
      return null;
    }
    if (normalized.startsWith('DELETE FROM site_session_codes') && normalized.includes('RETURNING')) {
      const [codeHash] = args as [string];
      const row = siteSessionCodes.get(codeHash);
      if (!row) return null;
      siteSessionCodes.delete(codeHash);
      return { email: row.email, expires_at: row.expires_at };
    }
    if (normalized.startsWith('SELECT email, role FROM users')) {
      const [email] = args as [string];
      const row = users.get(email);
      return row ? { email: row.email, role: row.role } : null;
    }
    if (normalized.startsWith('INSERT INTO users')) {
      const [email, role, createdAt] = args as [string, string, number];
      const existing = users.get(email);
      const resolvedRole = existing?.role === 'admin' ? 'admin' : role === 'admin' ? 'admin' : existing?.role ?? role;
      users.set(email, { email, role: resolvedRole, created_at: existing?.created_at ?? createdAt });
      return null;
    }

    throw new Error(`fake D1: unhandled query: ${normalized}`);
  }

  function prepare(sql: string) {
    return {
      bind(...args: unknown[]) {
        return {
          first: async <T>() => (run(sql, args) as T | null) ?? null,
          run: async () => {
            run(sql, args);
            return { success: true, meta: {} } as unknown;
          },
          all: async <T>() => ({ results: [] as T[], success: true, meta: {} }) as unknown,
        };
      },
    };
  }

  return { prepare } as unknown as Pick<Env, 'DB'>['DB'];
}

function createFakeEnv(): Env {
  return {
    DB: createFakeDb(),
    FILES: {} as Env['FILES'],
    FILES_HANS: {} as Env['FILES_HANS'],
    FILES_BACKUPS: {} as Env['FILES_BACKUPS'],
    REQUEST_LIMITER: { limit: async () => ({ success: true }) },
    VERIFY_LIMITER: { limit: async () => ({ success: true }) },
    SESSION_SECRET: 'test-session-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM: 'test@example.com',
    PUBLIC_BASE_URL: 'https://example.com',
    SITE_AUTH_RETURN_URL: 'https://example.com/callback',
    SITE_AUTH_EXCHANGE_SECRET: 'test-exchange-secret',
  };
}

describe('consumeMagicToken', () => {
  test('consumes a single valid token successfully', async () => {
    const env = createFakeEnv();
    const token = await mintMagicToken(env, 'person@example.com', 'cloud');

    const email = await consumeMagicToken(env, token, 'cloud');

    expect(email).toBe('person@example.com');
  });

  test('rejects the same token on a second consumption (double-redeem race)', async () => {
    const env = createFakeEnv();
    const token = await mintMagicToken(env, 'person@example.com', 'cloud');

    const first = await consumeMagicToken(env, token, 'cloud');
    const second = await consumeMagicToken(env, token, 'cloud');

    expect(first).toBe('person@example.com');
    expect(second).toBeNull();
  });

  test('rejects an expired token', async () => {
    const env = createFakeEnv();
    const rawToken = 'expired-raw-token';
    await env.DB.prepare(
      'INSERT INTO magic_tokens (token, email, expires_at, purpose) VALUES (?, ?, ?, ?)',
    )
      .bind(await hashSecret(rawToken), 'person@example.com', Date.now() - 1000, 'cloud')
      .run();

    const result = await consumeMagicToken(env, rawToken, 'cloud');

    expect(result).toBeNull();
  });

  test('rejects an unknown/never-issued token', async () => {
    const env = createFakeEnv();

    const result = await consumeMagicToken(env, 'never-issued-token', 'cloud');

    expect(result).toBeNull();
  });
});

describe('consumeSiteSessionCode', () => {
  test('consumes a single valid code successfully', async () => {
    const env = createFakeEnv();
    await ensureUser(env, 'person@example.com');
    const code = await mintSiteSessionCode(env, 'person@example.com');

    const result = await consumeSiteSessionCode(env, code);

    expect(result?.email).toBe('person@example.com');
  });

  test('rejects the same code on a second consumption (double-redeem race)', async () => {
    const env = createFakeEnv();
    await ensureUser(env, 'person@example.com');
    const code = await mintSiteSessionCode(env, 'person@example.com');

    const first = await consumeSiteSessionCode(env, code);
    const second = await consumeSiteSessionCode(env, code);

    expect(first?.email).toBe('person@example.com');
    expect(second).toBeNull();
  });

  test('rejects an expired code', async () => {
    const env = createFakeEnv();
    await ensureUser(env, 'person@example.com');
    const rawCode = 'expired-raw-code';
    await env.DB.prepare(
      'INSERT INTO site_session_codes (code_hash, email, expires_at) VALUES (?, ?, ?)',
    )
      .bind(await hashSecret(rawCode), 'person@example.com', Date.now() - 1000)
      .run();

    const result = await consumeSiteSessionCode(env, rawCode);

    expect(result).toBeNull();
  });

  test('rejects an unknown/never-issued code', async () => {
    const env = createFakeEnv();

    const result = await consumeSiteSessionCode(env, 'never-issued-code');

    expect(result).toBeNull();
  });
});
