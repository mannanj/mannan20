import { NextResponse } from 'next/server';
import { normalizeClaimEmail, sendClaimLink } from '@/lib/leaderboard-claim-link';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const email = normalizeClaimEmail(body && typeof body === 'object' ? (body as Record<string, unknown>).email : null);
  if (!email) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  const { status, ...result } = await sendClaimLink(request, email);
  return NextResponse.json(result, { status });
}
