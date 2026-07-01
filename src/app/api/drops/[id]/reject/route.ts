import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { rejectUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSiteSession(request.headers.get('cookie'));
  if (!session?.admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  const result = await rejectUpload(id, body.event_id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
