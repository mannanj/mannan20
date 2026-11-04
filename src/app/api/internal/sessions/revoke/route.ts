import { NextResponse } from 'next/server';
import { authorizedToRevoke, revokeSession } from '@/lib/session-revocation';

export const dynamic = 'force-dynamic';

const HASH_RE = /^[0-9a-f]{64}$/;

/**
 * Another app on this site ending a session (the calendar's remote sign-out).
 * It sends a hash, never the cookie. It can end a session, and nothing else.
 */
export async function POST(request: Request) {
  if (!authorizedToRevoke(request.headers.get('authorization'), process.env.SESSION_REVOKE_SECRET)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { sessionHash?: unknown; email?: unknown; expiresAt?: unknown; revokedBy?: unknown } | null;
  const { sessionHash, email, expiresAt, revokedBy } = body ?? {};
  if (typeof sessionHash !== 'string' || !HASH_RE.test(sessionHash) || typeof email !== 'string' || typeof expiresAt !== 'number' || typeof revokedBy !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const saved = await revokeSession({ sessionHash, email, expiresAt, revokedBy });
  return saved ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Unavailable' }, { status: 503 });
}
