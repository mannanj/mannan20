import { NextResponse } from 'next/server';
import { authorizedToRevoke, revokeAllSessions } from '@/lib/session-revocation';

export const dynamic = 'force-dynamic';

/** "Sign out everywhere", asked for by an app that has already checked who is asking. */
export async function POST(request: Request) {
  if (!authorizedToRevoke(request.headers.get('authorization'), process.env.SESSION_REVOKE_SECRET)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { email?: unknown; revokedBy?: unknown } | null;
  if (typeof body?.email !== 'string' || !body.email || typeof body.revokedBy !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const saved = await revokeAllSessions(body.email.trim().toLowerCase(), body.revokedBy);
  return saved ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Unavailable' }, { status: 503 });
}
