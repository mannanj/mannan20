import { createHash, timingSafeEqual } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Ending a signed session before it expires.
 *
 * A session is self-contained, so nothing here runs when it is issued. Every
 * check asks this list, and a check that cannot reach it lets the session
 * through: a database outage must not sign the whole site out. That is the
 * 2026-10-11 lesson, and the failure it risks is a revoked session working a
 * little longer, which is the milder of the two.
 */

interface D1Like {
  prepare(sql: string): { bind(...values: unknown[]): { first(): Promise<unknown>; run(): Promise<unknown>; all(): Promise<{ results: unknown[] }> } };
}

export const hashSession = (cookieValue: string) => createHash('sha256').update(cookieValue).digest('hex');

function database(): D1Like | null {
  try {
    return (getCloudflareContext().env as unknown as { UPLOADS_DB?: D1Like }).UPLOADS_DB ?? null;
  } catch {
    return null;
  }
}

/** When a session was issued, in ms. Sessions always live this long, so `exp` tells. */
export const issuedAtMs = (expSeconds: number, ttlSeconds: number) => (expSeconds - ttlSeconds) * 1000;

export async function isSessionRevoked(
  cookieValue: string,
  session: { email: string; issuedAt: number },
  db: D1Like | null = database(),
): Promise<boolean> {
  if (!db) return false;
  try {
    const hit = await db
      .prepare(
        `SELECT 1 AS hit WHERE EXISTS (SELECT 1 FROM revoked_site_session WHERE session_hash = ?)
            OR EXISTS (SELECT 1 FROM session_cutoff WHERE email = ? AND not_before > ?)`,
      )
      .bind(hashSession(cookieValue), session.email, session.issuedAt)
      .first();
    return hit !== null && hit !== undefined;
  } catch (error) {
    console.error('Could not read the session revocation list:', error);
    return false;
  }
}

export async function revokeSession(
  input: { sessionHash: string; email: string; expiresAt: number; revokedBy: string },
  db: D1Like | null = database(),
): Promise<boolean> {
  if (!db) return false;
  await db
    .prepare('INSERT OR IGNORE INTO revoked_site_session (session_hash, email, revoked_at, expires_at, revoked_by) VALUES (?, ?, ?, ?, ?)')
    .bind(input.sessionHash, input.email, Date.now(), input.expiresAt, input.revokedBy)
    .run();
  return true;
}

/** End every session this account holds, this browser's included. */
export async function revokeAllSessions(email: string, revokedBy: string, now = Date.now(), db: D1Like | null = database()): Promise<boolean> {
  if (!db) return false;
  await db
    .prepare('INSERT OR REPLACE INTO session_cutoff (email, not_before, revoked_by) VALUES (?, ?, ?)')
    .bind(email, now, revokedBy)
    .run();
  return true;
}

/** Everything still in force, for an app that checks sessions itself. */
export async function revocationList(now = Date.now(), db: D1Like | null = database()): Promise<{ hashes: string[]; cutoffs: Record<string, number> } | null> {
  if (!db) return null;
  const hashes = await db.prepare('SELECT session_hash FROM revoked_site_session WHERE expires_at > ?').bind(now).all();
  const cutoffs = await db.prepare('SELECT email, not_before FROM session_cutoff').bind().all();
  return {
    hashes: (hashes.results as { session_hash: string }[]).map((r) => r.session_hash),
    cutoffs: Object.fromEntries((cutoffs.results as { email: string; not_before: number }[]).map((r) => [r.email, r.not_before])),
  };
}

/** `Authorization: Bearer <secret>`, compared in constant time. No secret set refuses everyone. */
export function authorizedToRevoke(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const given = createHash('sha256').update(header.slice('Bearer '.length)).digest();
  return timingSafeEqual(given, createHash('sha256').update(secret).digest());
}
