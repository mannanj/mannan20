import { NextResponse } from 'next/server';
import { acceptCloudflareLegalConsent } from '@/lib/cloudflare-auth';
import {
  clearConsentSessionCookie,
  readConsentSession,
} from '@/lib/consent-session';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal-documents';
import { createSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) {
    return errorResponse('Invalid origin', 403);
  }

  const pending = readConsentSession(request.headers.get('cookie'));
  if (pending === null) {
    return errorResponse('Consent session expired', 401);
  }

  const form = await request.formData().catch(() => null);
  if (form?.get('accepted') !== 'yes') {
    return errorResponse('Consent is required', 400);
  }

  const account = await acceptCloudflareLegalConsent({
    accountId: pending.accountId,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  });
  if (account === null) {
    return errorResponse('Could not complete consent', 502);
  }
  if (account.accountId !== pending.accountId) {
    return errorResponse('Account identity changed', 409);
  }

  const response = NextResponse.redirect(new URL(pending.returnTo, url.origin), 303);
  response.headers.append(
    'Set-Cookie',
    await createSiteSessionCookie({
      accountId: account.accountId,
      email: account.email,
      role: account.role,
    }),
  );
  response.headers.append('Set-Cookie', clearConsentSessionCookie());
  return response;
}
