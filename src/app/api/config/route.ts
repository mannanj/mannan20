import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sitekey = process.env.TURNSTILE_SITE_KEY?.trim() || '';
  const hasSecret = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  const enabled = Boolean(sitekey && hasSecret);
  return NextResponse.json(
    { turnstile: { enabled, sitekey: enabled ? sitekey : null } },
    { headers: { 'cache-control': 'no-store' } },
  );
}
