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
  prepare(sql: string): { bind(...values: unknown[]): { first(): Promise<unknown>; run(): Promise<unknown> } };
}

export const hashSession = (cookieValue: string) => createHash('sha256').update(cookieValue).digest('hex');

function database(): D1Like | null {
  try {
    return (getCloudflareContext().env as unknown as { UPLOADS_DB?: D1Like }).UPLOADS_DB ?? null;
  } catch {
    return null;
  }
}

export async function isSessionRevoked(cookieValue: string, db: D1Like | null = database()): Promise<boolean> {
  if (!db) return false;
  try {
    const hit = await db.prepare('SELECT 1 AS hit FROM revoked_site_session WHERE session_hash = ?').bind(hashSession(cookieValue)).first();
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

/** `Authorization: Bearer <secret>`, compared in constant time. No secret set refuses everyone. */
export function authorizedToRevoke(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const given = createHash('sha256').update(header.slice('Bearer '.length)).digest();
  return timingSafeEqual(given, createHash('sha256').update(secret).digest());
}
