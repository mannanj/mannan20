import { NextResponse } from 'next/server';
import {
  UPLOAD_OWNER_EMAIL,
  getBatch,
  isId,
  isUploadOwner,
  listFiles,
  uploadsEnv,
} from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const batch = await getBatch(env, id);
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ batch, files: await listFiles(env, id) });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const raw = (body as { title?: unknown } | null)?.title;
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }
  const title = raw.trim().slice(0, MAX_TITLE);
  if (!title) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_batches SET title = ?1, updated_at = ?2
      WHERE id = ?3 AND owner_email = ?4 AND deleted_at IS NULL`,
  )
    .bind(title, Date.now(), id, UPLOAD_OWNER_EMAIL)
    .run();

  if (!result.meta.changes) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ title });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = Date.now();
  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_batches SET deleted_at = ?1, updated_at = ?1
      WHERE id = ?2 AND owner_email = ?3 AND deleted_at IS NULL`,
  )
    .bind(now, id, UPLOAD_OWNER_EMAIL)
    .run();

  if (!result.meta.changes) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await env.UPLOADS_DB.prepare(
    `UPDATE upload_files SET deleted_at = ?1 WHERE batch_id = ?2 AND deleted_at IS NULL`,
  )
    .bind(now, id)
    .run();

  return NextResponse.json({ ok: true });
}
