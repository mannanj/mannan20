import { NextResponse } from 'next/server';
import { clearSiteSessionCookie, cookieValue, readSiteSession } from '@/lib/site-session';
import { hashSession, revokeSession } from '@/lib/session-revocation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.headers.append('Set-Cookie', clearSiteSessionCookie());
  // Ending the session, not only forgetting it here: a copy of this cookie stops
  // working too. Clearing the cookie must happen whatever becomes of this.
  try {
    const cookie = request.headers.get('cookie');
    const session = await readSiteSession(cookie);
    const value = cookieValue(cookie);
    if (session && value) {
      await revokeSession({ sessionHash: hashSession(value), email: session.email, expiresAt: session.exp * 1000, revokedBy: session.email });
    }
  } catch (error) {
    console.error('Could not end the session at sign-out:', error);
  }
  return response;
}
