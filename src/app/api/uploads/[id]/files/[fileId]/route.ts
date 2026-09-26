import { NextResponse } from 'next/server';
import { isId, isUploadOwner, uploadsEnv } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

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
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

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
  return NextResponse.json({ ok: true });
}
