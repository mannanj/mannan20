import { NextResponse } from 'next/server';
import { listAllFiles } from '@/lib/uploads';
import { parseBatchKind } from '@/lib/uploads-shared';
import { ownerEnv } from '@/lib/upload-owner';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const kind = parseBatchKind(new URL(request.url).searchParams.get('kind'));
  if (!kind) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  return NextResponse.json({ files: await listAllFiles(owner.env, kind) });
}
