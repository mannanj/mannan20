import { NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/turnstile-verify';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ success: true, checked: false, 'error-codes': [] });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  const result = await verifyTurnstileToken(body?.token, secret, ip);
  return NextResponse.json({
    success: result.success,
    checked: true,
    'error-codes': result.errorCodes,
  });
}
