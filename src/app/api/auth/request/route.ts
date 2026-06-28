import { NextResponse } from 'next/server';
import { requestCloudflareContinueEmail } from '@/lib/cloudflare-auth';
import { limitMagicEmail } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  return (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const email =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).email === 'string'
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : '';

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const ip = requestIp(request);
  const [ipLimit, emailLimit] = await Promise.all([
    limitMagicEmail(`site:${ip}`),
    limitMagicEmail(`site:e:${email}`),
  ]);
  if (!ipLimit.success || !emailLimit.success) {
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
  }

  const result = await requestCloudflareContinueEmail({ email, ip });
  if (!result.ok) {
    const status = result.status === 429 ? 429 : 503;
    return NextResponse.json({ error: 'Could not send email' }, { status });
  }

  return NextResponse.json({ ok: true });
}
