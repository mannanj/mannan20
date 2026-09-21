import { NextResponse } from 'next/server';
import { requestCloudflareContinueEmail } from '@/lib/cloudflare-auth';
import { limitMagicEmail, limitMagicIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function requestIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const candidate =
    request.headers.get('cf-connecting-ip') ??
    forwarded?.[0] ??
    request.headers.get('x-real-ip');
  const trimmed = candidate?.trim();
  return trimmed ? trimmed : null;
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
    ip ? limitMagicIp(`site:${ip}`) : Promise.resolve(null),
    limitMagicEmail(`site:e:${email}`),
  ]);
  if ((ipLimit && !ipLimit.success) || !emailLimit.success) {
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
  }

  const result = await requestCloudflareContinueEmail({ email, ip: ip ?? 'unknown' });
  if (!result.ok) {
    const status = result.status === 429 ? 429 : 503;
    return NextResponse.json({ error: 'Could not send email' }, { status });
  }

  return NextResponse.json({ ok: true });
}
