import { NextResponse } from 'next/server';
import { exchangeCloudflareCode } from '@/lib/cloudflare-auth';
import { createSiteSessionCookie } from '@/lib/site-session';
import { clearReturnToCookie, readReturnTo } from '@/lib/return-to';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  const user = code ? await exchangeCloudflareCode(code) : null;

  if (!user) {
    const expired = new URL('/', url.origin);
    expired.searchParams.set('auth', 'expired');
    return NextResponse.redirect(expired);
  }

  // Back to the page the link was asked for from — `/calendar/signup` lands on
  // the calendar's sign-up page, an MCP connect flow resumes where it paused.
  // Re-validated on read, so the cookie cannot be made to point off-site.
  const destination = new URL(readReturnTo(request.headers.get('cookie')) ?? '/', url.origin);
  const response = NextResponse.redirect(destination);
  response.headers.append(
    'Set-Cookie',
    await createSiteSessionCookie({ email: user.email, role: user.role }),
  );
  response.headers.append('Set-Cookie', clearReturnToCookie());
  return response;
}
