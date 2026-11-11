import { limitMagicEmail } from '@/lib/rate-limit';
import { createMagicToken } from '@/lib/leaderboard-store';
import { sendEmail } from '@/lib/email';

export const CLAIM_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 254;

export type ClaimLinkResult = { status: 200; sent: boolean; devLink?: string; error?: string } | { status: 400 | 429 | 503; error: string };

export function normalizeClaimEmail(value: unknown): string | null {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CLAIM_EMAIL_RE.test(email) && email.length <= EMAIL_MAX ? email : null;
}

function originFor(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(request.url).origin;
  const proto = host.includes('localhost') ? 'http' : (request.headers.get('x-forwarded-proto') ?? 'https');
  return `${proto}://${host}`;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  return (forwarded?.[forwarded.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function sendClaimLink(request: Request, email: string): Promise<ClaimLinkResult> {
  const [ipLimit, emailLimit] = await Promise.all([limitMagicEmail(clientIp(request)), limitMagicEmail(`e:${email}`)]);
  if (!ipLimit.success || !emailLimit.success) return { status: 429, error: 'Too many link requests, try again later' };
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
    return {
      status: 200,
      sent: result.sent,
      ...(dev ? { devLink: link } : {}),
      ...(!result.sent && !dev ? { error: 'email-unavailable' } : {}),
    };
  } catch {
    return { status: 503, error: 'Could not create link' };
  }
}
