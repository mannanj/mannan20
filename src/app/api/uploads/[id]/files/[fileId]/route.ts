import { NextResponse } from 'next/server';
import { duplicateFile, isId } from '@/lib/uploads';
import { ownerEnv } from '@/lib/upload-owner';
import { recordEvent } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const { env } = owner;

  const { id, fileId } = await params;
  if (!isId(id) || !isId(fileId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const record = (body ?? {}) as { title?: unknown; description?: unknown };
  const sets: string[] = [];
  const values: unknown[] = [];

  if (typeof record.title === 'string') {
    const title = record.title.trim().slice(0, MAX_TITLE);
    if (!title) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    sets.push(`title = ?${sets.length + 1}`);
    values.push(title);
  }
  if (typeof record.description === 'string') {
    sets.push(`description = ?${sets.length + 1}`);
    values.push(record.description.trim().slice(0, MAX_DESCRIPTION));
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });

  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_files SET ${sets.join(', ')}
      WHERE id = ?${values.length + 1} AND batch_id = ?${values.length + 2} AND deleted_at IS NULL`,
  )
    .bind(...values, fileId, id)
    .run();

  if (!result.meta.changes) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const { env } = owner;

  const { id, fileId } = await params;
  if (!isId(id) || !isId(fileId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_files SET deleted_at = ?1
      WHERE id = ?2 AND batch_id = ?3 AND deleted_at IS NULL`,
  )
    .bind(Date.now(), fileId, id)
    .run();

  if (!result.meta.changes) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordEvent(env, { type: 'file_deleted', actor: owner.actor, batchId: id, fileId });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;

  const { id, fileId } = await params;
  if (!isId(id) || !isId(fileId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body: unknown = await request.json().catch(() => null);
  if ((body as { action?: unknown } | null)?.action !== 'duplicate') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const file = await duplicateFile(owner.env, id, fileId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordEvent(owner.env, {
    type: 'file_duplicated',
    actor: owner.actor,
    batchId: id,
    fileId: file.id,
  });
  return NextResponse.json({ file }, { status: 201 });
}
