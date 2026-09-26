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
import { safeAttachmentFilename } from '@/lib/attachment';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

type FixedLengthStreamCtor = new (length: number) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

function fixedLengthBody(file: File): ReadableStream<Uint8Array> | Blob {
  const ctor = (globalThis as { FixedLengthStream?: FixedLengthStreamCtor }).FixedLengthStream;
  if (!ctor) return file;
  const { readable, writable } = new ctor(file.size);
  void file.stream().pipeTo(writable);
  return readable;
}

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

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File is too large' }, { status: 413 });
  }

  const description = String(form.get('description') ?? '')
    .trim()
    .slice(0, MAX_DESCRIPTION);
  const title = safeAttachmentFilename(file.name).slice(0, MAX_TITLE);
  const contentType = file.type || 'application/octet-stream';
  const fileId = newId();
  const key = objectKey(id, fileId);

  await env.UPLOADS.put(key, fixedLengthBody(file), {
    httpMetadata: { contentType },
    customMetadata: { owner: UPLOAD_OWNER_EMAIL, batch: id },
  });

  const now = Date.now();
  await env.UPLOADS_DB.batch([
    env.UPLOADS_DB.prepare(
      `INSERT INTO upload_files
         (id, batch_id, object_key, title, description, content_type, size, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(fileId, id, key, title, description, contentType, file.size, now),
    env.UPLOADS_DB.prepare(`UPDATE upload_batches SET updated_at = ?1 WHERE id = ?2`).bind(now, id),
  ]);

  return NextResponse.json(
    {
      file: { id: fileId, title, description, contentType, size: file.size, createdAt: now },
    },
    { status: 201 },
  );
}
