import { NextResponse } from 'next/server';
import { readSiteSession, upgradeSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  const response = NextResponse.json({
    user: session
      ? {
          email: session.email,
          role: session.role,
          admin: session.admin,
        }
      : null,
  });
  // Sessions from before the public-key signature get it here, whoever asks
  // (a site page, or the calendar passing it on) — see site-session.ts.
  const upgraded = await upgradeSiteSessionCookie(cookie);
  if (upgraded) response.headers.append('Set-Cookie', upgraded);
  return response;
}
