import { NextResponse } from 'next/server';
import { findFile, isId } from '@/lib/uploads';
import { createShare, listShares, parseShareSettings } from '@/lib/upload-shares';
import { ownerEnv } from '@/lib/upload-owner';
import { recordEvent } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  return NextResponse.json({ shares: await listShares(owner.env) });
}

export async function POST(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const parsed = parseShareSettings(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const fileId = typeof body.fileId === 'string' && isId(body.fileId) ? body.fileId : null;
  let batchId = typeof body.batchId === 'string' && isId(body.batchId) ? body.batchId : null;
  if (fileId && !batchId) batchId = (await findFile(owner.env, fileId))?.batchId ?? null;
  if (!batchId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const share = await createShare(owner.env, { batchId, fileId }, parsed.value);
  if ('error' in share) {
    return NextResponse.json({ error: share.error }, { status: share.error === 'Not found' ? 404 : 400 });
  }
  await recordEvent(owner.env, {
    type: 'share_created',
    actor: owner.actor,
    batchId,
    fileId,
    shareId: share.id,
  });
  return NextResponse.json({ share }, { status: 201 });
}
