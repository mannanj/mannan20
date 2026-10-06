import { NextResponse } from 'next/server';
import { getBatch, isId, isUploadOwner, ownerActor, uploadsEnv, type UploadsEnv } from '@/lib/uploads';
import type { UploadTarget } from '@/lib/upload-handlers';
import { recordEvent } from '@/lib/upload-events';

export const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export const unavailable = () =>
  NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

export async function ownerEnv(
  request: Request,
): Promise<{ ok: true; env: UploadsEnv; actor: 'owner' | 'mcp' } | { ok: false; response: NextResponse }> {
  if (!(await isUploadOwner(request))) return { ok: false, response: notFound() };
  const env = uploadsEnv();
  if (!env) return { ok: false, response: unavailable() };
  const actor = await ownerActor(request);
  if (actor === 'mcp') {
    const { pathname } = new URL(request.url);
    await recordEvent(env, { type: 'mcp_call', actor, detail: `${request.method} ${pathname}` });
  }
  return { ok: true, env, actor };
}

export async function ownerTarget(
  request: Request,
  batchId: string,
): Promise<{ ok: true; target: UploadTarget } | { ok: false; response: NextResponse }> {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner;
  if (!isId(batchId) || !(await getBatch(owner.env, batchId))) {
    return { ok: false, response: notFound() };
  }
  return {
    ok: true,
    target: { env: owner.env, batchId, bucket: 'owner', shareId: null, actor: owner.actor },
  };
}
