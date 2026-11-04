import { describe, expect, test } from 'bun:test';
import { authorizedToRevoke, hashSession, issuedAtMs, isSessionRevoked, revocationList, revokeAllSessions, revokeSession } from './session-revocation';

const who = { email: 'a@b.c', issuedAt: 1_000 };

function fakeDb(rows = new Map<string, unknown[]>()) {
  const cutoffs = new Map<string, number>();
  const cutoff = (email: unknown) => cutoffs.get(email as string);
  return {
    rows,
    prepare: (sql: string) => ({
      bind: (...v: unknown[]) => ({
        first: async () => (rows.has(v[0] as string) || (cutoff(v[1]) ?? 0) > (v[2] as number) ? { hit: 1 } : null),
        all: async () => ({ results: sql.includes('session_hash') ? [...rows.values()].filter((r) => (r[3] as number) > (v[0] as number)).map((r) => ({ session_hash: r[0] })) : [...cutoffs].map(([email, not_before]) => ({ email, not_before })) }),
        run: async () => {
          if (sql.includes('session_cutoff')) cutoffs.set(v[0] as string, v[1] as number);
          else rows.set(v[0] as string, v);
        },
      }),
    }),
  };
}

describe('the revocation list', () => {
  test('a session not on the list passes; one on it does not', async () => {
    const db = fakeDb();
    expect(await isSessionRevoked('cookie', who, db)).toBe(false);
    expect(await revokeSession({ sessionHash: hashSession('cookie'), email: 'a@b.c', expiresAt: 9, revokedBy: 'x' }, db)).toBe(true);
    expect(await isSessionRevoked('cookie', who, db)).toBe(true);
    expect(await isSessionRevoked('other', who, db)).toBe(false);
  });

  test('stores the hash and who did it, never the cookie', async () => {
    const db = fakeDb();
    await revokeSession({ sessionHash: hashSession('cookie'), email: 'a@b.c', expiresAt: 9, revokedBy: 'x' }, db);
    const [row] = [...db.rows.values()];
    expect(row[0]).toBe(hashSession('cookie'));
    expect(row).toContain('x');
    expect(JSON.stringify(row)).not.toContain('"cookie"');
  });

  test('an outage does not sign anyone out', async () => {
    const broken = { prepare: () => { throw new Error('D1 down'); } };
    const error = console.error;
    console.error = () => undefined;
    expect(await isSessionRevoked('cookie', who, broken as never)).toBe(false);
    console.error = error;
  });

  test('with no database, nothing is revoked and nothing is claimed', async () => {
    expect(await isSessionRevoked('cookie', who, null)).toBe(false);
    expect(await revokeSession({ sessionHash: 'h', email: 'e', expiresAt: 1, revokedBy: 'x' }, null)).toBe(false);
  });
});

describe('sign out everywhere', () => {
  test('ends what was issued before it, not what comes after', async () => {
    const db = fakeDb();
    expect(await revokeAllSessions('a@b.c', 'a@b.c', 5_000, db)).toBe(true);
    expect(await isSessionRevoked('old', { email: 'a@b.c', issuedAt: 4_999 }, db)).toBe(true);
    expect(await isSessionRevoked('new', { email: 'a@b.c', issuedAt: 5_000 }, db)).toBe(false);
    expect(await isSessionRevoked('other', { email: 'x@y.z', issuedAt: 1 }, db)).toBe(false);
  });

  test('works out when a session was issued from its expiry', () => {
    expect(issuedAtMs(1_000, 400)).toBe(600_000);
  });

  test('with no database it claims nothing', async () => {
    expect(await revokeAllSessions('a@b.c', 'x', 1, null)).toBe(false);
    expect(await revocationList(1, null)).toBeNull();
  });
});

describe('the published list', () => {
  test('has what is in force, not what has expired', async () => {
    const db = fakeDb();
    await revokeSession({ sessionHash: 'live', email: 'a@b.c', expiresAt: 100, revokedBy: 'x' }, db);
    await revokeSession({ sessionHash: 'gone', email: 'a@b.c', expiresAt: 10, revokedBy: 'x' }, db);
    await revokeAllSessions('a@b.c', 'x', 7, db);
    expect(await revocationList(50, db)).toEqual({ hashes: ['live'], cutoffs: { 'a@b.c': 7 } });
  });
});

describe('who may revoke', () => {
  test('the right secret only', () => {
    expect(authorizedToRevoke('Bearer s3cret', 's3cret')).toBe(true);
    expect(authorizedToRevoke('Bearer wrong', 's3cret')).toBe(false);
    expect(authorizedToRevoke('s3cret', 's3cret')).toBe(false);
    expect(authorizedToRevoke(null, 's3cret')).toBe(false);
  });
  test('no secret configured refuses everyone', () => {
    expect(authorizedToRevoke('Bearer ', undefined)).toBe(false);
    expect(authorizedToRevoke('Bearer ', '')).toBe(false);
  });
});
