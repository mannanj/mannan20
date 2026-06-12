import { NextResponse } from 'next/server';
import { limitMagicEmail } from '@/lib/rate-limit';
import { createMagicToken } from '@/lib/leaderboard-store';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function originFor(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(request.url).origin;
  const proto = host.includes('localhost')
    ? 'http'
    : (request.headers.get('x-forwarded-proto') ?? 'https');
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const ip = (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();

  const body: unknown = await request.json().catch(() => null);
  const email =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).email === 'string'
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const [ipLimit, emailLimit] = await Promise.all([
    limitMagicEmail(ip),
    limitMagicEmail(`e:${email}`),
  ]);
  if (!ipLimit.success || !emailLimit.success) {
    return NextResponse.json(
      { error: 'Too many link requests, try again later' },
      { status: 429 }
    );
  }

  try {
    const token = await createMagicToken(email);
    const link = `${originFor(request)}/game?claim=${token}`;
    const result = await sendEmail({
      to: email,
      subject: 'Sign in to the chicken leaderboard',
      text: `Click this link to claim your leaderboard name on mannan.is:\n\n${link}\n\nThe link expires in 15 minutes. If you didn't request it, ignore this email.`,
      html: `<p>Click the link below to claim your leaderboard name on <strong>mannan.is</strong>:</p><p><a href="${link}">${link}</a></p><p>The link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
    });
    const dev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      sent: result.sent,
      ...(dev ? { devLink: link } : {}),
      ...(!result.sent && !dev ? { error: 'email-unavailable' } : {}),
    });
  } catch {
    return NextResponse.json({ error: 'Could not create link' }, { status: 503 });
  }
}
