import { NextResponse } from 'next/server';
import { isId, isUploadOwner, objectKey, uploadsEnv } from '@/lib/uploads';
import { MAX_UPLOAD_BYTES, UPLOAD_PART_SIZE } from '@/lib/uploads-shared';
import type { R2UploadedPart } from '@/lib/cf-bindings';
import { withKnownLength } from '@/lib/fixed-length';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

interface PendingRow {
  upload_id: string;
  size: number;
}

async function pending(
  env: NonNullable<ReturnType<typeof uploadsEnv>>,
  batchId: string,
  fileId: string,
): Promise<PendingRow | null> {
  return env.UPLOADS_DB.prepare(
    `SELECT upload_id, size FROM upload_files
      WHERE id = ?1 AND batch_id = ?2 AND status = 'pending' AND deleted_at IS NULL`,
  )
    .bind(fileId, batchId)
    .first<PendingRow>();
}

async function guard(
  request: Request,
  params: RouteContext['params'],
): Promise<
  | { ok: true; env: NonNullable<ReturnType<typeof uploadsEnv>>; id: string; fileId: string; row: PendingRow }
  | { ok: false; response: NextResponse }
> {
  if (!(await isUploadOwner(request))) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const env = uploadsEnv();
  if (!env) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Storage unavailable' }, { status: 503 }),
    };
  }
  const { id, fileId } = await params;
  if (!isId(id) || !isId(fileId)) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const row = await pending(env, id, fileId);
  if (!row?.upload_id) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { ok: true, env, id, fileId, row };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const checked = await guard(request, params);
  if (!checked.ok) return checked.response;
  const { env, id, fileId, row } = checked;

  const partNumber = Number(new URL(request.url).searchParams.get('part'));
  const expected = Math.ceil(row.size / UPLOAD_PART_SIZE);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > expected) {
    return NextResponse.json({ error: 'Invalid part' }, { status: 400 });
  }

  const declared = Number(request.headers.get('content-length') ?? NaN);
  if (!Number.isFinite(declared) || declared <= 0 || declared > UPLOAD_PART_SIZE) {
    return NextResponse.json({ error: 'Invalid part size' }, { status: 413 });
  }
  if (partNumber < expected && declared !== UPLOAD_PART_SIZE) {
    return NextResponse.json({ error: 'Invalid part size' }, { status: 400 });
  }
  if (!request.body) {
    return NextResponse.json({ error: 'Empty part' }, { status: 400 });
  }

  const body =
    withKnownLength(request.body, declared) ?? (await request.arrayBuffer());

  const multipart = env.UPLOADS.resumeMultipartUpload(objectKey(id, fileId), row.upload_id);
  const uploaded = await multipart.uploadPart(partNumber, body);

  return NextResponse.json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
}

export async function POST(request: Request, { params }: RouteContext) {
  const checked = await guard(request, params);
  if (!checked.ok) return checked.response;
  const { env, id, fileId, row } = checked;

  const body: unknown = await request.json().catch(() => null);
  const raw = (body as { parts?: unknown } | null)?.parts;
  if (!Array.isArray(raw) || raw.length !== Math.ceil(row.size / UPLOAD_PART_SIZE)) {
    return NextResponse.json({ error: 'Invalid parts' }, { status: 400 });
  }

  const parts: R2UploadedPart[] = [];
  for (const entry of raw) {
    const part = entry as { partNumber?: unknown; etag?: unknown };
    if (typeof part.partNumber !== 'number' || typeof part.etag !== 'string') {
      return NextResponse.json({ error: 'Invalid parts' }, { status: 400 });
    }
    parts.push({ partNumber: part.partNumber, etag: part.etag });
  }

  const multipart = env.UPLOADS.resumeMultipartUpload(objectKey(id, fileId), row.upload_id);
  const object = await multipart.complete(parts);

  if (object.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is too large' }, { status: 413 });
  }

  const now = Date.now();
  await env.UPLOADS_DB.batch([
    env.UPLOADS_DB.prepare(
      `UPDATE upload_files SET status = 'complete', size = ?1, created_at = ?2
        WHERE id = ?3 AND batch_id = ?4`,
    ).bind(object.size, now, fileId, id),
    env.UPLOADS_DB.prepare(`UPDATE upload_batches SET updated_at = ?1 WHERE id = ?2`).bind(now, id),
  ]);

  return NextResponse.json({ id: fileId, size: object.size });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const checked = await guard(request, params);
  if (!checked.ok) return checked.response;
  const { env, id, fileId, row } = checked;

  await env.UPLOADS.resumeMultipartUpload(objectKey(id, fileId), row.upload_id)
    .abort()
    .catch(() => null);

  await env.UPLOADS_DB.prepare(
    `UPDATE upload_files SET status = 'aborted' WHERE id = ?1 AND batch_id = ?2`,
  )
    .bind(fileId, id)
    .run();

  return NextResponse.json({ ok: true });
}
