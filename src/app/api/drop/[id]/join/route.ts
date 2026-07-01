import { NextResponse, type NextRequest } from 'next/server';
import { joinDrop } from '@/lib/drops';
import { limitDropJoin } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = ipOf(request);
  const limit = await limitDropJoin(`${ip}:${id}`);
  if (!limit.success) return NextResponse.json({ error: 'Too many attempts, try again shortly' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { name?: string; passcode?: string; magic_token?: string } | null;
  const result = await joinDrop(id, body ?? {}, ip);
  if (!result.ok || !result.data) return NextResponse.json({ error: result.error ?? 'join-failed' }, { status: result.status });

  const res = NextResponse.json({ ok: true, participant_id: result.data.participant_id });
  res.cookies.set(`drop_pt_${id}`, result.data.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 21_600,
  });
  return res;
}
