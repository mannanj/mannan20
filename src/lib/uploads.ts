import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSiteSession } from '@/lib/site-session';
import { verifyActor } from '@/lib/mcp/grant';
import type { D1Binding, R2Binding } from '@/lib/cf-bindings';
import type { UploadBatch, UploadFile, UploadFileEntry } from '@/lib/uploads-shared';

export { defaultBatchTitle, formatBytes } from '@/lib/uploads-shared';
export type { UploadBatch, UploadFile } from '@/lib/uploads-shared';

export const UPLOAD_OWNER_EMAIL = 'hello@mannan.is';

const ID_RE = /^[0-9a-z]{24}$/;

export type BucketName = 'owner' | 'shared';

export interface UploadsEnv {
  UPLOADS: R2Binding;
  SHARED_UPLOADS: R2Binding | null;
  UPLOADS_DB: D1Binding;
}

export function uploadsEnv(): UploadsEnv | null {
  try {
    const env = getCloudflareContext().env as unknown as Partial<UploadsEnv>;
    if (!env.UPLOADS || !env.UPLOADS_DB) return null;
    return {
      UPLOADS: env.UPLOADS,
      SHARED_UPLOADS: env.SHARED_UPLOADS ?? null,
      UPLOADS_DB: env.UPLOADS_DB,
    };
  } catch {
    return null;
  }
}

export function bucketFor(env: UploadsEnv, name: BucketName): R2Binding | null {
  return name === 'shared' ? env.SHARED_UPLOADS : env.UPLOADS;
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
}

export async function isMcpOwner(request: Request): Promise<boolean> {
  const token = bearer(request);
  const secret = process.env.UPLOADS_MCP_ACTOR_SECRET;
  if (!token || !secret) return false;
  const actor = await verifyActor(token, secret).catch(() => null);
  return actor?.email === UPLOAD_OWNER_EMAIL;
}

export async function isUploadOwner(request: Request): Promise<boolean> {
  const session = await readSiteSession(request.headers.get('cookie')).catch(() => null);
  if (session?.email === UPLOAD_OWNER_EMAIL) return true;
  return isMcpOwner(request);
}

export async function ownerActor(request: Request): Promise<'owner' | 'mcp'> {
  return (await isMcpOwner(request)) ? 'mcp' : 'owner';
}

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let out = '';
  for (const byte of bytes) out += byte.toString(36).padStart(2, '0');
  return out.slice(0, 24);
}

export function isId(value: string): boolean {
  return ID_RE.test(value);
}

export function objectKey(batchId: string, fileId: string): string {
  return `${batchId}/${fileId}`;
}

interface BatchRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  file_count: number;
  total_size: number;
}

const BATCH_SELECT = `SELECT b.id, b.title, b.created_at, b.updated_at,
            COUNT(f.id) AS file_count,
            COALESCE(SUM(f.size), 0) AS total_size
       FROM upload_batches b
       LEFT JOIN upload_files f ON f.batch_id = b.id AND f.deleted_at IS NULL
                                AND f.status = 'complete'`;

function toBatch(row: BatchRow): UploadBatch {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileCount: Number(row.file_count),
    totalSize: Number(row.total_size),
  };
}

export async function listBatches(env: UploadsEnv): Promise<UploadBatch[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `${BATCH_SELECT}
      WHERE b.owner_email = ?1 AND b.deleted_at IS NULL
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
  )
    .bind(UPLOAD_OWNER_EMAIL)
    .all<BatchRow>();
  return results.map(toBatch);
}

export async function getBatch(env: UploadsEnv, id: string): Promise<UploadBatch | null> {
  const row = await env.UPLOADS_DB.prepare(
    `${BATCH_SELECT}
      WHERE b.id = ?1 AND b.owner_email = ?2 AND b.deleted_at IS NULL
      GROUP BY b.id`,
  )
    .bind(id, UPLOAD_OWNER_EMAIL)
    .first<BatchRow>();
  return row ? toBatch(row) : null;
}

export async function createBatch(env: UploadsEnv, title: string): Promise<string> {
  const id = newId();
  const now = Date.now();
  await env.UPLOADS_DB.prepare(
    `INSERT INTO upload_batches (id, owner_email, title, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?4)`,
  )
    .bind(id, UPLOAD_OWNER_EMAIL, title, now)
    .run();
  return id;
}

interface FileRow {
  id: string;
  batch_id: string;
  title: string;
  description: string;
  content_type: string;
  size: number;
  created_at: number;
  modified_at: number | null;
  share_id: string | null;
  uploader_name: string | null;
  uploader_email: string | null;
}

const FILE_COLUMNS = `f.id, f.batch_id, f.title, f.description, f.content_type, f.size,
            f.created_at, f.modified_at, f.share_id, f.uploader_name, f.uploader_email`;

function toFile(row: FileRow): UploadFile {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    contentType: row.content_type,
    size: Number(row.size),
    createdAt: row.created_at,
    modifiedAt: row.modified_at ? Number(row.modified_at) : null,
    uploadedBy: row.share_id ? (row.uploader_name ?? row.uploader_email ?? '') : null,
  };
}

export async function listFiles(env: UploadsEnv, batchId: string): Promise<UploadFile[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `SELECT ${FILE_COLUMNS}
       FROM upload_files f
      WHERE f.batch_id = ?1 AND f.deleted_at IS NULL AND f.status = 'complete'
      ORDER BY f.created_at ASC`,
  )
    .bind(batchId)
    .all<FileRow>();
  return results.map(toFile);
}

export async function listAllFiles(env: UploadsEnv): Promise<UploadFileEntry[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `SELECT ${FILE_COLUMNS}, b.title AS batch_title
       FROM upload_files f
       JOIN upload_batches b ON b.id = f.batch_id
      WHERE f.deleted_at IS NULL AND f.status = 'complete'
        AND b.deleted_at IS NULL AND b.owner_email = ?1
      ORDER BY f.created_at DESC`,
  )
    .bind(UPLOAD_OWNER_EMAIL)
    .all<FileRow & { batch_title: string }>();
  return results.map((row) => ({
    ...toFile(row),
    batchId: row.batch_id,
    batchTitle: row.batch_title,
    viaShare: row.share_id !== null,
  }));
}

export interface StoredFile {
  id: string;
  batchId: string;
  title: string;
  contentType: string;
  size: number;
  createdAt: number;
  modifiedAt: number | null;
  objectKey: string;
  bucket: BucketName;
  uploadedBy: string | null;
}

export async function storedFiles(env: UploadsEnv, batchId: string): Promise<StoredFile[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `SELECT id, batch_id, title, content_type, size, created_at, modified_at, object_key, bucket,
            share_id, uploader_name, uploader_email
       FROM upload_files
      WHERE batch_id = ?1 AND deleted_at IS NULL AND status = 'complete'
      ORDER BY created_at ASC`,
  )
    .bind(batchId)
    .all<{
      id: string;
      batch_id: string;
      title: string;
      content_type: string;
      size: number;
      created_at: number;
      modified_at: number | null;
      object_key: string;
      bucket: string;
      share_id: string | null;
      uploader_name: string | null;
      uploader_email: string | null;
    }>();
  return results.map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    contentType: row.content_type,
    size: Number(row.size),
    createdAt: row.created_at,
    modifiedAt: row.modified_at ? Number(row.modified_at) : null,
    objectKey: row.object_key,
    bucket: row.bucket === 'shared' ? 'shared' : 'owner',
    uploadedBy: row.share_id ? (row.uploader_name ?? row.uploader_email ?? '') : null,
  }));
}

export async function findFile(
  env: UploadsEnv,
  fileId: string,
): Promise<StoredFile | null> {
  const row = await env.UPLOADS_DB.prepare(
    `SELECT f.batch_id FROM upload_files f
       JOIN upload_batches b ON b.id = f.batch_id
      WHERE f.id = ?1 AND f.deleted_at IS NULL AND f.status = 'complete'
        AND b.deleted_at IS NULL`,
  )
    .bind(fileId)
    .first<{ batch_id: string }>();
  if (!row) return null;
  return (await storedFiles(env, row.batch_id)).find((file) => file.id === fileId) ?? null;
}

export async function duplicateFile(
  env: UploadsEnv,
  batchId: string,
  fileId: string,
): Promise<UploadFile | null> {
  const source = (await storedFiles(env, batchId)).find((file) => file.id === fileId);
  if (!source) return null;
  const id = newId();
  const now = Date.now();
  const dot = source.title.lastIndexOf('.');
  const title =
    dot > 0
      ? `${source.title.slice(0, dot)} copy${source.title.slice(dot)}`
      : `${source.title} copy`;
  await env.UPLOADS_DB.batch([
    env.UPLOADS_DB.prepare(
      `INSERT INTO upload_files
         (id, batch_id, object_key, title, description, content_type, size, created_at,
          status, modified_at, bucket)
       SELECT ?1, batch_id, object_key, ?2, description, content_type, size, ?3,
              'complete', modified_at, bucket
         FROM upload_files WHERE id = ?4 AND batch_id = ?5`,
    ).bind(id, title.slice(0, 200), now, fileId, batchId),
    env.UPLOADS_DB.prepare(`UPDATE upload_batches SET updated_at = ?1 WHERE id = ?2`).bind(
      now,
      batchId,
    ),
  ]);
  return {
    id,
    title,
    description: '',
    contentType: source.contentType,
    size: source.size,
    createdAt: now,
    modifiedAt: source.modifiedAt,
  };
}
