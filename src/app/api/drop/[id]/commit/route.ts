import { NextResponse, type NextRequest } from 'next/server';
import { commitUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get(`drop_pt_${id}`)?.value;
  if (!token) return NextResponse.json({ error: 'not-joined' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { key?: string; filename?: string } | null;
  if (!body?.key) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  const result = await commitUpload(id, token, { key: body.key, filename: body.filename ?? body.key.split('/').pop() ?? 'file' }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
