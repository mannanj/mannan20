import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { createDrop, listDrops, type DropCreateInput } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

async function requireAdmin(request: Request) {
  const session = await readSiteSession(request.headers.get('cookie'));
  return session?.admin ? session : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await listDrops();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as DropCreateInput | null;
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const result = await createDrop({ ...body }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
