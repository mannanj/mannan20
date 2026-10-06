import { NextResponse } from 'next/server';
import {
  UPLOAD_OWNER_EMAIL,
  bucketFor,
  newId,
  objectKey,
  type BucketName,
  type StoredFile,
  type UploadsEnv,
} from '@/lib/uploads';
import {
  MAX_UPLOAD_BYTES,
  cleanNamePart,
  UPLOAD_PART_SIZE,
  planDownload,
  previewableImageType,
} from '@/lib/uploads-shared';
import { releaseUpload, reserveUpload } from '@/lib/upload-shares';
import { recordEvent, type UploadActor } from '@/lib/upload-events';
import { safeAttachmentFilename } from '@/lib/attachment';
import { blobWithKnownLength, withKnownLength } from '@/lib/fixed-length';
import type { R2UploadedPart } from '@/lib/cf-bindings';
import { issueTicket, type TicketEntry } from '@/lib/download-stream';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;
const LATEST_VALID_TIMESTAMP = 4102444800000;

export interface UploadTarget {
  env: UploadsEnv;
  batchId: string;
  bucket: BucketName;
  shareId: string | null;
  actor: UploadActor;
  uploaderEmail?: string | null;
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

function modifiedAt(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isSafeInteger(value) && value > 0 && value < LATEST_VALID_TIMESTAMP ? value : null;
}

type Uploader = { ok: true; name: string | null; email: string | null } | { ok: false };

function uploaderFor(target: UploadTarget, first: unknown, last: unknown): Uploader {
  if (!target.shareId) return { ok: true, name: null, email: null };
  const firstName = cleanNamePart(first);
  const lastName = cleanNamePart(last);
  const email = target.uploaderEmail ?? null;
  const name = firstName && lastName ? `${firstName} ${lastName}` : null;
  if (!name && !email) return { ok: false };
  return { ok: true, name, email };
}

const NAME_REQUIRED = { error: 'Add your first and last name' };

async function reserve(target: UploadTarget, bytes: number): Promise<boolean> {
  if (!target.shareId) return true;
  return reserveUpload(target.env, target.shareId, bytes);
}

async function release(target: UploadTarget, bytes: number): Promise<void> {
  if (target.shareId) await releaseUpload(target.env, target.shareId, bytes).catch(() => null);
}

function storage(target: UploadTarget) {
  return bucketFor(target.env, target.bucket);
}

export async function handleWholeUpload(
  request: Request,
  target: UploadTarget,
): Promise<NextResponse> {
  const bucket = storage(target);
  if (!bucket) return json({ error: 'Storage unavailable' }, 503);

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: 'Invalid upload' }, 400);

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return json({ error: 'No file' }, 400);
  if (file.size > UPLOAD_PART_SIZE) return json({ error: 'File is too large' }, 413);

  const uploader = uploaderFor(target, form.get('firstName'), form.get('lastName'));
  if (!uploader.ok) return json(NAME_REQUIRED, 400);

  if (!(await reserve(target, file.size))) {
    return json({ error: 'This link has no room left' }, 403);
  }

  const description = String(form.get('description') ?? '')
    .trim()
    .slice(0, MAX_DESCRIPTION);
  const title = safeAttachmentFilename(file.name).slice(0, MAX_TITLE);
  const contentType = file.type || 'application/octet-stream';
  const fileId = newId();
  const key = objectKey(target.batchId, fileId);
  const modified = modifiedAt(form.get('lastModified'));

  try {
    await bucket.put(key, blobWithKnownLength(file), {
      httpMetadata: { contentType },
      customMetadata: { owner: UPLOAD_OWNER_EMAIL, batch: target.batchId },
    });
  } catch {
    await release(target, file.size);
    return json({ error: 'Upload failed' }, 502);
  }

  const now = Date.now();
  await target.env.UPLOADS_DB.batch([
    target.env.UPLOADS_DB.prepare(
      `INSERT INTO upload_files
         (id, batch_id, object_key, title, description, content_type, size, created_at,
          modified_at, bucket, share_id, uploader_name, uploader_email)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    ).bind(
      fileId,
      target.batchId,
      key,
      title,
      description,
      contentType,
      file.size,
      now,
      modified,
      target.bucket,
      target.shareId,
      uploader.name,
      uploader.email,
    ),
    target.env.UPLOADS_DB.prepare(`UPDATE upload_batches SET updated_at = ?1 WHERE id = ?2`).bind(
      now,
      target.batchId,
    ),
  ]);

  await recordEvent(target.env, {
    type: 'upload',
    actor: target.actor,
    batchId: target.batchId,
    fileId,
    shareId: target.shareId,
    bytes: file.size,
    detail: uploader.name ?? uploader.email ?? '',
  });

  return json(
    {
      file: {
        id: fileId,
        title,
        description,
        contentType,
        size: file.size,
        createdAt: now,
        modifiedAt: modified,
      },
    },
    201,
  );
}

export async function handleStartMultipart(
  request: Request,
  target: UploadTarget,
): Promise<NextResponse> {
  const bucket = storage(target);
  if (!bucket) return json({ error: 'Storage unavailable' }, 503);

  const body: unknown = await request.json().catch(() => null);
  const record = (body ?? {}) as Record<string, unknown>;

  const size = typeof record.size === 'number' ? record.size : NaN;
  if (!Number.isSafeInteger(size) || size <= 0) return json({ error: 'Invalid size' }, 400);
  if (size > MAX_UPLOAD_BYTES) return json({ error: 'File is too large' }, 413);
  if (typeof record.name !== 'string' || !record.name.trim()) {
    return json({ error: 'Invalid name' }, 400);
  }
  const uploader = uploaderFor(target, record.firstName, record.lastName);
  if (!uploader.ok) return json(NAME_REQUIRED, 400);

  if (!(await reserve(target, size))) return json({ error: 'This link has no room left' }, 403);

  const title = safeAttachmentFilename(record.name).slice(0, MAX_TITLE);
  const contentType =
    typeof record.contentType === 'string' && record.contentType
      ? record.contentType.slice(0, 200)
      : 'application/octet-stream';

  const fileId = newId();
  const key = objectKey(target.batchId, fileId);

  let uploadId: string;
  try {
    const multipart = await bucket.createMultipartUpload(key, {
      httpMetadata: { contentType },
      customMetadata: { owner: UPLOAD_OWNER_EMAIL, batch: target.batchId },
    });
    uploadId = multipart.uploadId;
  } catch {
    await release(target, size);
    return json({ error: 'Upload failed' }, 502);
  }

  await target.env.UPLOADS_DB.prepare(
    `INSERT INTO upload_files
       (id, batch_id, object_key, title, description, content_type, size, created_at,
        status, upload_id, modified_at, bucket, share_id, uploader_name, uploader_email)
     VALUES (?1, ?2, ?3, ?4, '', ?5, ?6, ?7, 'pending', ?8, ?9, ?10, ?11, ?12, ?13)`,
  )
    .bind(
      fileId,
      target.batchId,
      key,
      title,
      contentType,
      size,
      Date.now(),
      uploadId,
      modifiedAt(record.lastModified),
      target.bucket,
      target.shareId,
      uploader.name,
      uploader.email,
    )
    .run();

  return json({ fileId, partSize: UPLOAD_PART_SIZE, parts: Math.ceil(size / UPLOAD_PART_SIZE) }, 201);
}

interface PendingRow {
  upload_id: string;
  size: number;
  object_key: string;
}

async function pendingUpload(target: UploadTarget, fileId: string): Promise<PendingRow | null> {
  const row = await target.env.UPLOADS_DB.prepare(
    `SELECT upload_id, size, object_key FROM upload_files
      WHERE id = ?1 AND batch_id = ?2 AND status = 'pending' AND deleted_at IS NULL
        AND bucket = ?3 AND (?4 IS NULL OR share_id = ?4)`,
  )
    .bind(fileId, target.batchId, target.bucket, target.shareId)
    .first<PendingRow>();
  return row?.upload_id ? row : null;
}

export async function handleUploadPart(
  request: Request,
  target: UploadTarget,
  fileId: string,
): Promise<NextResponse> {
  const bucket = storage(target);
  if (!bucket) return json({ error: 'Storage unavailable' }, 503);
  const row = await pendingUpload(target, fileId);
  if (!row) return json({ error: 'Not found' }, 404);

  const partNumber = Number(new URL(request.url).searchParams.get('part'));
  const expected = Math.ceil(row.size / UPLOAD_PART_SIZE);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > expected) {
    return json({ error: 'Invalid part' }, 400);
  }

  const declared = Number(request.headers.get('content-length') ?? NaN);
  if (!Number.isFinite(declared) || declared <= 0 || declared > UPLOAD_PART_SIZE) {
    return json({ error: 'Invalid part size' }, 413);
  }
  if (partNumber < expected && declared !== UPLOAD_PART_SIZE) {
    return json({ error: 'Invalid part size' }, 400);
  }
  if (!request.body) return json({ error: 'Empty part' }, 400);

  const body = withKnownLength(request.body, declared) ?? (await request.arrayBuffer());
  const uploaded = await bucket.resumeMultipartUpload(row.object_key, row.upload_id).uploadPart(
    partNumber,
    body,
  );
  return json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
}

export async function handleCompleteMultipart(
  request: Request,
  target: UploadTarget,
  fileId: string,
): Promise<NextResponse> {
  const bucket = storage(target);
  if (!bucket) return json({ error: 'Storage unavailable' }, 503);
  const row = await pendingUpload(target, fileId);
  if (!row) return json({ error: 'Not found' }, 404);

  const body: unknown = await request.json().catch(() => null);
  const raw = (body as { parts?: unknown } | null)?.parts;
  if (!Array.isArray(raw) || raw.length !== Math.ceil(row.size / UPLOAD_PART_SIZE)) {
    return json({ error: 'Invalid parts' }, 400);
  }

  const parts: R2UploadedPart[] = [];
  for (const entry of raw) {
    const part = entry as { partNumber?: unknown; etag?: unknown };
    if (typeof part.partNumber !== 'number' || typeof part.etag !== 'string') {
      return json({ error: 'Invalid parts' }, 400);
    }
    parts.push({ partNumber: part.partNumber, etag: part.etag });
  }

  const object = await bucket.resumeMultipartUpload(row.object_key, row.upload_id).complete(parts);
  if (object.size > row.size) return json({ error: 'File is too large' }, 413);

  const now = Date.now();
  await target.env.UPLOADS_DB.batch([
    target.env.UPLOADS_DB.prepare(
      `UPDATE upload_files SET status = 'complete', size = ?1, created_at = ?2
        WHERE id = ?3 AND batch_id = ?4`,
    ).bind(object.size, now, fileId, target.batchId),
    target.env.UPLOADS_DB.prepare(`UPDATE upload_batches SET updated_at = ?1 WHERE id = ?2`).bind(
      now,
      target.batchId,
    ),
  ]);

  await recordEvent(target.env, {
    type: 'upload',
    actor: target.actor,
    batchId: target.batchId,
    fileId,
    shareId: target.shareId,
    bytes: object.size,
  });

  return json({ id: fileId, size: object.size });
}

export async function handleAbortMultipart(
  target: UploadTarget,
  fileId: string,
): Promise<NextResponse> {
  const bucket = storage(target);
  if (!bucket) return json({ error: 'Storage unavailable' }, 503);
  const row = await pendingUpload(target, fileId);
  if (!row) return json({ error: 'Not found' }, 404);

  await bucket
    .resumeMultipartUpload(row.object_key, row.upload_id)
    .abort()
    .catch(() => null);
  await target.env.UPLOADS_DB.prepare(
    `UPDATE upload_files SET status = 'aborted' WHERE id = ?1 AND batch_id = ?2`,
  )
    .bind(fileId, target.batchId)
    .run();
  await release(target, row.size);

  return json({ ok: true });
}

function zipName(title: string, part?: { index: number; total: number }): string {
  const base = title.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'uploads';
  if (!part) return `${base}.zip`;
  return `${base}-part-${part.index + 1}-of-${part.total}.zip`;
}

function uniqueName(taken: Set<string>, raw: string): string {
  const name = safeAttachmentFilename(raw);
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  taken.add(candidate);
  return candidate;
}

function ticketEntry(file: StoredFile, name = file.title): TicketEntry {
  return {
    bucket: file.bucket,
    key: file.objectKey,
    name,
    size: file.size,
    modified: file.modifiedAt ?? file.createdAt,
  };
}

function redirect(request: Request, path: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL(path, request.url).toString(),
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}

export interface DownloadScope {
  env: UploadsEnv;
  title: string;
  files: StoredFile[];
  actor: UploadActor;
  shareId: string | null;
  spend: () => Promise<boolean>;
}

export async function serveDownload(request: Request, scope: DownloadScope): Promise<Response> {
  const { env, files } = scope;
  const url = new URL(request.url);
  const single = url.searchParams.get('file');

  const spent = async (bytes: number, fileId: string | null, batchId: string | null) => {
    if (!(await scope.spend())) return false;
    await recordEvent(env, {
      type: 'download',
      actor: scope.actor,
      batchId,
      fileId,
      shareId: scope.shareId,
      bytes,
    });
    return true;
  };

  if (single) {
    const entry = files.find((file) => file.id === single);
    if (!entry) return json({ error: 'Not found' }, 404);

    const imageType = previewableImageType(entry.contentType);
    const inline = url.searchParams.get('inline') === '1' && imageType !== null;

    const preview = inline && scope.shareId === null;
    if (!preview && !(await spent(entry.size, entry.id, entry.batchId))) {
      return json({ error: 'This link has no downloads left' }, 403);
    }
    const path = await issueTicket(env.UPLOADS_DB, {
      kind: 'file',
      name: entry.title,
      contentType: inline && imageType ? imageType : entry.contentType,
      inline,
      entries: [ticketEntry(entry)],
    });
    return redirect(request, path);
  }

  const requested = url.searchParams.get('ids');
  const wanted = requested ? new Set(requested.split(',')) : null;
  const selected = wanted ? files.filter((file) => wanted.has(file.id)) : files;
  if (!selected.length) return json({ error: 'Nothing to download' }, 400);

  const plan = planDownload(selected);

  if (url.searchParams.get('plan') === '1') {
    return json({
      total: selected.reduce((sum, file) => sum + file.size, 0),
      parts: plan.map((part, index) => ({
        index,
        kind: part.kind,
        bytes: part.bytes,
        count: part.ids.length,
        fileId: part.kind === 'file' ? part.ids[0] : null,
      })),
    });
  }

  const rawPart = url.searchParams.get('part');
  const partIndex = rawPart === null ? null : Number(rawPart);
  if (partIndex !== null && (!Number.isInteger(partIndex) || !plan[partIndex])) {
    return json({ error: 'Unknown part' }, 400);
  }

  const inPart = partIndex === null ? null : new Set(plan[partIndex].ids);
  const chosen = inPart ? selected.filter((file) => inPart.has(file.id)) : selected;

  const bytes = chosen.reduce((sum, file) => sum + file.size, 0);
  if (!(await spent(bytes, null, chosen[0]?.batchId ?? null))) {
    return json({ error: 'This link has no downloads left' }, 403);
  }

  const taken = new Set<string>();
  const label =
    partIndex === null || plan.length < 2 ? undefined : { index: partIndex, total: plan.length };

  if (chosen.length === 1 && plan.length > 1) {
    const path = await issueTicket(env.UPLOADS_DB, {
      kind: 'file',
      name: chosen[0].title,
      contentType: chosen[0].contentType,
      inline: false,
      entries: [ticketEntry(chosen[0])],
    });
    return redirect(request, path);
  }

  const path = await issueTicket(env.UPLOADS_DB, {
    kind: 'zip',
    name: zipName(scope.title, label),
    contentType: 'application/zip',
    inline: false,
    entries: chosen.map((file) => ticketEntry(file, uniqueName(taken, file.title))),
  });
  return redirect(request, path);
}
