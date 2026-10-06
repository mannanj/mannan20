import { NextResponse } from 'next/server';
import { isId } from '@/lib/uploads';
import { getShare, parseShareSettings, updateShare } from '@/lib/upload-shares';
import { notFound, ownerEnv } from '@/lib/upload-owner';
import { recordEvent } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ shareId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const { shareId } = await params;
  const share = isId(shareId) ? await getShare(owner.env, shareId) : null;
  return share ? NextResponse.json({ share }) : notFound();
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const { shareId } = await params;
  if (!isId(shareId)) return notFound();

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const parsed = parseShareSettings(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (body.revoked !== undefined && typeof body.revoked !== 'boolean') {
    return NextResponse.json({ error: 'Invalid revoked' }, { status: 400 });
  }

  const share = await updateShare(owner.env, shareId, {
    ...parsed.value,
    revoked: body.revoked as boolean | undefined,
  });
  if ('error' in share) {
    return NextResponse.json({ error: share.error }, { status: share.error === 'Not found' ? 404 : 400 });
  }
  await recordEvent(owner.env, {
    type: body.revoked === true ? 'share_revoked' : 'share_updated',
    actor: owner.actor,
    batchId: share.batchId,
    fileId: share.fileId,
    shareId,
  });
  return NextResponse.json({ share });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const { shareId } = await params;
  if (!isId(shareId)) return notFound();
  const share = await updateShare(owner.env, shareId, { revoked: true });
  if ('error' in share) return notFound();
  await recordEvent(owner.env, {
    type: 'share_revoked',
    actor: owner.actor,
    batchId: share.batchId,
    fileId: share.fileId,
    shareId,
  });
  return NextResponse.json({ share });
}
