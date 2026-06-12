import { NextResponse } from 'next/server';
import {
  OWNER_COOKIE,
  identityInfo,
  maskEmail,
  readCookieValue,
} from '@/lib/leaderboard-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ownerId = readCookieValue(request.headers.get('cookie'), OWNER_COOKIE);
  if (!ownerId) {
    return NextResponse.json({ names: [], email: null, verified: false });
  }
  try {
    const info = await identityInfo(ownerId);
    return NextResponse.json({
      names: info.names,
      email: info.email ? maskEmail(info.email) : null,
      verified: info.email !== null,
    });
  } catch {
    return NextResponse.json({ names: [], email: null, verified: false });
  }
}
