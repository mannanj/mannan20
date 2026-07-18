import { NextResponse } from 'next/server';
import { exchangeCloudflareCode } from '@/lib/cloudflare-auth';
import {
  clearConsentSessionCookie,
  createConsentSessionCookie,
} from '@/lib/consent-session';
import { clearSiteSessionCookie, createSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  const user = code ? await exchangeCloudflareCode(code) : null;

  if (!user) {
    const redirect = new URL('/', url.origin);
    redirect.searchParams.set('auth', 'expired');
    return NextResponse.redirect(redirect);
  }

  if (user.status === 'pending_consent') {
    const response = NextResponse.redirect(new URL('/auth/consent', url.origin));
    response.headers.append(
      'Set-Cookie',
      await createConsentSessionCookie({
        accountId: user.accountId,
        email: user.email,
        role: user.role,
        returnTo: user.returnTo,
      }),
    );
    response.headers.append('Set-Cookie', clearSiteSessionCookie());
    return response;
  }

  const response = NextResponse.redirect(new URL(user.returnTo, url.origin));
  response.headers.append(
    'Set-Cookie',
    await createSiteSessionCookie({
      accountId: user.accountId,
      email: user.email,
      role: user.role,
    }),
  );
  response.headers.append('Set-Cookie', clearConsentSessionCookie());
  return response;
}
