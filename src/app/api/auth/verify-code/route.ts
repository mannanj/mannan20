import { NextResponse } from 'next/server';
import { verifyCloudflareSignInCode } from '@/lib/cloudflare-auth';
import { clientIp } from '@/lib/client-ip';
import { clearReturnToCookie, readReturnTo } from '@/lib/return-to';
import { normalizeSignInCode, SIGN_IN_CODE_REJECTED } from '@/lib/sign-in-code';
import { createSiteSessionCookie } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: SIGN_IN_CODE_REJECTED }, { status: 415 });
  }
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const code = normalizeSignInCode(record.code);

  if (!EMAIL_RE.test(email) || email.length > 254 || !code) {
    return NextResponse.json({ error: SIGN_IN_CODE_REJECTED }, { status: 400 });
  }

  const { user, status } = await verifyCloudflareSignInCode({
    email,
    code,
    ip: clientIp(request.headers),
  });
  if (!user) {
    if (status === 429) {
      return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
    }
    if (status >= 500) {
      return NextResponse.json({ error: 'Could not check the code. Try again.' }, { status: 503 });
    }
    return NextResponse.json({ error: SIGN_IN_CODE_REJECTED }, { status: 400 });
  }

  const redirectTo = readReturnTo(request.headers.get('cookie')) ?? '/';
  const response = NextResponse.json({ ok: true, redirectTo });
  response.headers.append(
    'Set-Cookie',
    await createSiteSessionCookie({ email: user.email, role: user.role }),
  );
  response.headers.append('Set-Cookie', clearReturnToCookie());
  return response;
}
