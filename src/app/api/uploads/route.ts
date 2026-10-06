import { NextResponse } from 'next/server';
import { createBatch, defaultBatchTitle, listBatches } from '@/lib/uploads';
import { ownerEnv } from '@/lib/upload-owner';
import { recordEvent } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  return NextResponse.json({ batches: await listBatches(owner.env) });
}

export async function POST(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;

  const body: unknown = await request.json().catch(() => null);
  const raw = (body as { title?: unknown } | null)?.title;
  const title = (typeof raw === 'string' && raw.trim() ? raw.trim() : defaultBatchTitle()).slice(
    0,
    MAX_TITLE,
  );

  const id = await createBatch(owner.env, title);
  await recordEvent(owner.env, { type: 'page_created', actor: owner.actor, batchId: id });
  return NextResponse.json({ id, title }, { status: 201 });
}
