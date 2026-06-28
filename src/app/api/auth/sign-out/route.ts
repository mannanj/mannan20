import { NextResponse } from 'next/server';
import { clearSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.headers.append('Set-Cookie', clearSiteSessionCookie());
  return response;
}
