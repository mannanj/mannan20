import { NextResponse } from 'next/server';
import { verifyUpdatesEmail } from '@/lib/game-updates';
import { accessDb } from '../../../access/shared';
import {
  MAGIC_TOKEN_RE,
  OWNER_COOKIE,
  consumeMagicToken,
  maskEmail,
  readCookieValue,
} from '@/lib/leaderboard-store';

export const dynamic = 'force-dynamic';

const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const token =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).token === 'string'
      ? ((body as Record<string, unknown>).token as string)
      : '';
  if (!MAGIC_TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 400 });
  }
  const device = readCookieValue(request.headers.get('cookie'), OWNER_COOKIE);
  try {
    const result = await consumeMagicToken(token, device);
    if (!result) {
      return NextResponse.json({ error: 'invalid-token' }, { status: 400 });
    }
    const db = accessDb();
    if (db) await verifyUpdatesEmail(db, result.email.toLowerCase()).catch(() => undefined);
    const res = NextResponse.json({
      ok: true,
      names: result.names,
      email: maskEmail(result.email),
      verified: true,
    });
    res.cookies.set(OWNER_COOKIE, result.ownerId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: OWNER_COOKIE_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Claim unavailable' }, { status: 503 });
  }
}
