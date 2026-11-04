import { describe, expect, test } from 'bun:test';
import { authorizedToRevoke, hashSession, isSessionRevoked, revokeSession } from './session-revocation';

function fakeDb(rows = new Map<string, unknown[]>()) {
  return {
    rows,
    prepare: (sql: string) => ({
      bind: (...v: unknown[]) => ({
        first: async () => (rows.has(v[0] as string) ? { hit: 1 } : null),
        run: async () => {
          expect(sql).toContain('INSERT OR IGNORE');
          rows.set(v[0] as string, v);
        },
      }),
    }),
  };
}

describe('the revocation list', () => {
  test('a session not on the list passes; one on it does not', async () => {
    const db = fakeDb();
    expect(await isSessionRevoked('cookie', db)).toBe(false);
    expect(await revokeSession({ sessionHash: hashSession('cookie'), email: 'a@b.c', expiresAt: 9, revokedBy: 'x' }, db)).toBe(true);
    expect(await isSessionRevoked('cookie', db)).toBe(true);
    expect(await isSessionRevoked('other', db)).toBe(false);
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
    expect(await isSessionRevoked('cookie', broken as never)).toBe(false);
    console.error = error;
  });

  test('with no database, nothing is revoked and nothing is claimed', async () => {
    expect(await isSessionRevoked('cookie', null)).toBe(false);
    expect(await revokeSession({ sessionHash: 'h', email: 'e', expiresAt: 1, revokedBy: 'x' }, null)).toBe(false);
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
