import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dbRoleForEmail,
  siteRoleFromDbRole,
  hashSecret,
  consumeMagicToken,
  consumeSiteSessionCode,
  mintMagicToken,
  mintSiteSessionCode,
  ensureUser,
  sanitizeReturnPath,
  acceptCurrentLegalTerms,
} from './auth';
import type { Env } from './types';
import { PRIVACY_VERSION, TERMS_VERSION } from './legal';

describe('shared auth helpers', () => {
  test('migration 0003 defines stable accounts and append-only consent', () => {
    const sql = readFileSync(
      join(import.meta.dir, '../migrations/0003_account_identity_consent.sql'),
      'utf8',
    );

    expect(sql).toContain('ALTER TABLE users ADD COLUMN account_id TEXT');
    expect(sql).toContain(
      "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'",
    );
    expect(sql).toContain('CREATE UNIQUE INDEX users_account_id_idx');
    expect(sql).toContain('CREATE TABLE legal_acceptances');
    expect(sql).toContain('ALTER TABLE magic_tokens ADD COLUMN return_path TEXT');
    expect(sql).toContain('ALTER TABLE site_session_codes ADD COLUMN return_path TEXT');
  });

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

  test.each([
    ['/meet/meeting-1', '/meet/meeting-1'],
    ['/garden?view=products', '/garden?view=products'],
    ['https://evil.example/x', '/'],
    ['//evil.example/x', '/'],
    ['/\\evil', '/'],
    ['', '/'],
  ])('sanitizes auth return path %s', (input, expected) => {
    expect(sanitizeReturnPath(input)).toBe(expected);
  });

  test('creates a stable pending account without changing it on repeat', async () => {
    const env = createFakeEnv();
    const first = await ensureUser(env, ' Person@Example.com ');
    const second = await ensureUser(env, 'person@example.com');

    expect(first.accountId).toMatch(/^[a-f0-9]{32}$/);
    expect(first.status).toBe('pending_consent');
    expect(second.accountId).toBe(first.accountId);
    expect(second.status).toBe('pending_consent');
  });

  test('creates an active invited account without later downgrading it', async () => {
    const env = createFakeEnv();
    const invited = await ensureUser(env, 'invite@example.com', {
      initialStatus: 'active',
    });
    const repeated = await ensureUser(env, 'invite@example.com');

    expect(invited.status).toBe('active');
    expect(repeated.status).toBe('active');
    expect(repeated.accountId).toBe(invited.accountId);
  });

  test('records current consent and activates a pending account idempotently', async () => {
    const env = createFakeEnv();
    const account = await ensureUser(env, 'person@example.com');

    const first = await acceptCurrentLegalTerms(
      env,
      account.accountId,
      1_752_816_000_000,
    );
    const second = await acceptCurrentLegalTerms(
      env,
      account.accountId,
      1_752_816_001_000,
    );

    expect(first?.status).toBe('active');
    expect(second).toEqual(first);
    expect(first?.acceptedAt).toBe(1_752_816_000_000);
    expect(first?.termsVersion).toBe(TERMS_VERSION);
    expect(first?.privacyVersion).toBe(PRIVACY_VERSION);
  });

  test('does not activate an unknown account', async () => {
    expect(
      await acceptCurrentLegalTerms(createFakeEnv(), 'missing', Date.now()),
    ).toBeNull();
  });
});

interface MagicTokenRow {
  email: string;
  expires_at: number;
  purpose: string;
  return_path: string;
}

interface SiteSessionCodeRow {
  email: string;
  expires_at: number;
  return_path: string;
}

interface UserRow {
  account_id: string;
  email: string;
  role: string;
  status: 'active' | 'pending_consent';
  created_at: number;
}

interface LegalAcceptanceRow {
  account_id: string;
  terms_version: string;
  privacy_version: string;
  accepted_at: number;
  source: 'first_account_sign_in';
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function createFakeDb(): Pick<Env, 'DB'>['DB'] {
  const magicTokens = new Map<string, MagicTokenRow>();
  const siteSessionCodes = new Map<string, SiteSessionCodeRow>();
  const users = new Map<string, UserRow>();
  const legalAcceptances = new Map<string, LegalAcceptanceRow>();

  function run(sql: string, args: unknown[]): unknown {
    const normalized = normalize(sql);

    if (normalized.startsWith('INSERT INTO magic_tokens')) {
      const [token, email, expiresAt, purpose, returnPath = '/'] = args as [
        string,
        string,
        number,
        string,
        string?,
      ];
      magicTokens.set(token, {
        email,
        expires_at: expiresAt,
        purpose,
        return_path: returnPath,
      });
      return null;
    }
    if (normalized.startsWith('DELETE FROM magic_tokens') && normalized.includes('RETURNING')) {
      const [token, purpose] = args as [string, string];
      const row = magicTokens.get(token);
      if (!row || row.purpose !== purpose) return null;
      magicTokens.delete(token);
      return {
        email: row.email,
        expires_at: row.expires_at,
        return_path: row.return_path,
      };
    }
    if (normalized.startsWith('INSERT INTO site_session_codes')) {
      const [codeHash, email, expiresAt, returnPath = '/'] = args as [
        string,
        string,
        number,
        string?,
      ];
      siteSessionCodes.set(codeHash, {
        email,
        expires_at: expiresAt,
        return_path: returnPath,
      });
      return null;
    }
    if (normalized.startsWith('DELETE FROM site_session_codes') && normalized.includes('RETURNING')) {
      const [codeHash] = args as [string];
      const row = siteSessionCodes.get(codeHash);
      if (!row) return null;
      siteSessionCodes.delete(codeHash);
      return {
        email: row.email,
        expires_at: row.expires_at,
        return_path: row.return_path,
      };
    }
    if (normalized.startsWith('SELECT account_id, email, role, status FROM users WHERE account_id')) {
      return [...users.values()].find((row) => row.account_id === args[0]) ?? null;
    }
    if (normalized.startsWith('SELECT account_id, email, role, status FROM users')) {
      const [email] = args as [string];
      const row = users.get(email);
      return row ?? null;
    }
    if (normalized.startsWith('INSERT INTO users')) {
      const [email, role, createdAt, accountId, status] = args as [
        string,
        string,
        number,
        string,
        UserRow['status'],
      ];
      const existing = users.get(email);
      const resolvedRole = existing?.role === 'admin' ? 'admin' : role === 'admin' ? 'admin' : existing?.role ?? role;
      users.set(email, {
        account_id: existing?.account_id ?? accountId,
        email,
        role: resolvedRole,
        status: existing?.status ?? status,
        created_at: existing?.created_at ?? createdAt,
      });
      return null;
    }
    if (normalized.startsWith('INSERT OR IGNORE INTO legal_acceptances')) {
      const [accountId, termsVersion, privacyVersion, acceptedAt, source] = args as [
        string,
        string,
        string,
        number,
        'first_account_sign_in',
      ];
      const user = [...users.values()].find((row) => row.account_id === accountId);
      if (!user) return null;
      const key = `${accountId}:${termsVersion}:${privacyVersion}`;
      if (!legalAcceptances.has(key)) {
        legalAcceptances.set(key, {
          account_id: accountId,
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          accepted_at: acceptedAt,
          source,
        });
      }
      return null;
    }
    if (normalized.startsWith("UPDATE users SET status = 'active'")) {
      const [accountId] = args as [string];
      const user = [...users.values()].find((row) => row.account_id === accountId);
      if (user) user.status = 'active';
      return null;
    }
    if (normalized.startsWith('SELECT terms_version, privacy_version, accepted_at')) {
      const [accountId, termsVersion, privacyVersion] = args as [string, string, string];
      return legalAcceptances.get(`${accountId}:${termsVersion}:${privacyVersion}`) ?? null;
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

  return {
    prepare,
    batch: async (statements: D1PreparedStatement[]) =>
      Promise.all(statements.map((statement) => statement.run())),
  } as unknown as Pick<Env, 'DB'>['DB'];
}

function createFakeEnv(): Env {
  return {
    DB: createFakeDb(),
    FILES: {} as Env['FILES'],
    FILES_HANS: {} as Env['FILES_HANS'],
    FILES_BACKUPS: {} as Env['FILES_BACKUPS'],
    FILES_LIMITER: { limit: async () => ({ success: true }) },
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

    expect(email).toEqual({ email: 'person@example.com', returnPath: '/' });
  });

  test('rejects the same token on a second consumption (double-redeem race)', async () => {
    const env = createFakeEnv();
    const token = await mintMagicToken(env, 'person@example.com', 'cloud');

    const first = await consumeMagicToken(env, token, 'cloud');
    const second = await consumeMagicToken(env, token, 'cloud');

    expect(first).toEqual({ email: 'person@example.com', returnPath: '/' });
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
  test('carries one sanitized return path through token and code consumption', async () => {
    const env = createFakeEnv();
    const account = await ensureUser(env, 'person@example.com');
    const token = await mintMagicToken(
      env,
      account.email,
      'site',
      '/meet/abc?join=1',
    );
    const verified = await consumeMagicToken(env, token, 'site');
    expect(verified).toEqual({
      email: account.email,
      returnPath: '/meet/abc?join=1',
    });

    const code = await mintSiteSessionCode(
      env,
      account.email,
      verified!.returnPath,
    );
    const exchanged = await consumeSiteSessionCode(env, code);
    expect(exchanged).toMatchObject({
      accountId: account.accountId,
      email: account.email,
      status: 'pending_consent',
      returnPath: '/meet/abc?join=1',
    });
  });

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
