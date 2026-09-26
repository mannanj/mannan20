import { NextResponse } from 'next/server';
import {
  UPLOAD_OWNER_EMAIL,
  getBatch,
  isId,
  isUploadOwner,
  newId,
  objectKey,
  uploadsEnv,
} from '@/lib/uploads';
import { MAX_UPLOAD_BYTES, UPLOAD_PART_SIZE } from '@/lib/uploads-shared';
import { safeAttachmentFilename } from '@/lib/attachment';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await getBatch(env, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const record = (body ?? {}) as {
    name?: unknown;
    size?: unknown;
    contentType?: unknown;
    lastModified?: unknown;
  };

  const size = typeof record.size === 'number' ? record.size : NaN;
  if (!Number.isSafeInteger(size) || size <= 0) {
    return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is too large' }, { status: 413 });
  }
  if (typeof record.name !== 'string' || !record.name.trim()) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  const title = safeAttachmentFilename(record.name).slice(0, MAX_TITLE);
  const contentType =
    typeof record.contentType === 'string' && record.contentType
      ? record.contentType.slice(0, 200)
      : 'application/octet-stream';

  const rawModified = typeof record.lastModified === 'number' ? record.lastModified : NaN;
  const modifiedAt =
    Number.isSafeInteger(rawModified) && rawModified > 0 && rawModified < 4102444800000
      ? rawModified
      : null;

  const fileId = newId();
  const multipart = await env.UPLOADS.createMultipartUpload(objectKey(id, fileId), {
    httpMetadata: { contentType },
    customMetadata: { owner: UPLOAD_OWNER_EMAIL, batch: id },
  });

  await env.UPLOADS_DB.prepare(
    `INSERT INTO upload_files
       (id, batch_id, object_key, title, description, content_type, size, created_at,
        status, upload_id, modified_at)
     VALUES (?1, ?2, ?3, ?4, '', ?5, ?6, ?7, 'pending', ?8, ?9)`,
  )
    .bind(
      fileId,
      id,
      objectKey(id, fileId),
      title,
      contentType,
      size,
      Date.now(),
      multipart.uploadId,
      modifiedAt,
    )
    .run();

  return NextResponse.json(
    { fileId, partSize: UPLOAD_PART_SIZE, parts: Math.ceil(size / UPLOAD_PART_SIZE) },
    { status: 201 },
  );
}
