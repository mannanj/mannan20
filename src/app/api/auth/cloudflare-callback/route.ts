import { NextResponse } from 'next/server';
import { exchangeCloudflareCode } from '@/lib/cloudflare-auth';
import { createSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  const user = code ? await exchangeCloudflareCode(code) : null;

  const redirect = new URL('/', url.origin);
  if (!user) {
    redirect.searchParams.set('auth', 'expired');
    return NextResponse.redirect(redirect);
  }

  const response = NextResponse.redirect(redirect);
  response.headers.append(
    'Set-Cookie',
    await createSiteSessionCookie({ email: user.email, role: user.role }),
  );
  return response;
}
