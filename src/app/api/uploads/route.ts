import { NextResponse } from 'next/server';
import { createBatch, defaultBatchTitle, ensureChatBatch, listBatches } from '@/lib/uploads';
import { isBatchId, parseBatchKind } from '@/lib/uploads-shared';
import { ownerEnv } from '@/lib/upload-owner';
import { recordEvent } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const kind = parseBatchKind(new URL(request.url).searchParams.get('kind'));
  if (!kind) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  return NextResponse.json({ batches: await listBatches(owner.env, kind) });
}

export async function POST(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;

  const body: unknown = await request.json().catch(() => null);
  const input = (body ?? {}) as { title?: unknown; kind?: unknown; id?: unknown };
  const raw = input.title;
  const kind = parseBatchKind(input.kind);
  if (!kind) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  if (input.id !== undefined && (kind !== 'chat' || !isBatchId(input.id))) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const title = (typeof raw === 'string' && raw.trim() ? raw.trim() : defaultBatchTitle()).slice(
    0,
    MAX_TITLE,
  );

  if (kind === 'chat' && typeof input.id === 'string') {
    const chat = await ensureChatBatch(owner.env, input.id, title);
    if (!chat) return NextResponse.json({ error: 'Id belongs to another kind' }, { status: 409 });
    if (chat.created) {
      await recordEvent(owner.env, { type: 'page_created', actor: owner.actor, batchId: chat.id });
    }
    return NextResponse.json({ id: chat.id, title }, { status: chat.created ? 201 : 200 });
  }

  const id = await createBatch(owner.env, title, kind);
  await recordEvent(owner.env, { type: 'page_created', actor: owner.actor, batchId: id });
  return NextResponse.json({ id, title }, { status: 201 });
}
