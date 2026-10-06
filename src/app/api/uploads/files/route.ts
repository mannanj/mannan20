import { NextResponse } from 'next/server';
import { listAllFiles } from '@/lib/uploads';
import { ownerEnv } from '@/lib/upload-owner';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  return NextResponse.json({ files: await listAllFiles(owner.env) });
}
