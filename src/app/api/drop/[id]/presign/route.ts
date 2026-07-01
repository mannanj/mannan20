import { NextResponse, type NextRequest } from 'next/server';
import { presignUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get(`drop_pt_${id}`)?.value;
  if (!token) return NextResponse.json({ error: 'not-joined' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { filename?: string; size?: number; type?: string } | null;
  if (!body?.filename || typeof body.size !== 'number') return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  const result = await presignUpload(id, token, { filename: body.filename, size: body.size, type: body.type ?? 'application/octet-stream' }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
