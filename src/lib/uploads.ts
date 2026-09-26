import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSiteSession } from '@/lib/site-session';
import type { D1Binding, R2Binding } from '@/lib/cf-bindings';
import type { UploadBatch, UploadFile } from '@/lib/uploads-shared';

export { defaultBatchTitle, formatBytes } from '@/lib/uploads-shared';
export type { UploadBatch, UploadFile } from '@/lib/uploads-shared';

export const UPLOAD_OWNER_EMAIL = 'hello@mannan.is';

const ID_RE = /^[0-9a-z]{24}$/;

interface UploadsEnv {
  UPLOADS: R2Binding;
  UPLOADS_DB: D1Binding;
}

export function uploadsEnv(): UploadsEnv | null {
  try {
    const env = getCloudflareContext().env as unknown as Partial<UploadsEnv>;
    if (!env.UPLOADS || !env.UPLOADS_DB) return null;
    return { UPLOADS: env.UPLOADS, UPLOADS_DB: env.UPLOADS_DB };
  } catch {
    return null;
  }
}

export async function isUploadOwner(request: Request): Promise<boolean> {
  const session = await readSiteSession(request.headers.get('cookie')).catch(() => null);
  return session?.email === UPLOAD_OWNER_EMAIL;
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

export async function listBatches(env: UploadsEnv): Promise<UploadBatch[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `SELECT b.id, b.title, b.created_at, b.updated_at,
            COUNT(f.id) AS file_count,
            COALESCE(SUM(f.size), 0) AS total_size
       FROM upload_batches b
       LEFT JOIN upload_files f ON f.batch_id = b.id AND f.deleted_at IS NULL
                                AND f.status = 'complete'
      WHERE b.owner_email = ?1 AND b.deleted_at IS NULL
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
  )
    .bind(UPLOAD_OWNER_EMAIL)
    .all<{
      id: string;
      title: string;
      created_at: number;
      updated_at: number;
      file_count: number;
      total_size: number;
    }>();

  return results.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileCount: Number(row.file_count),
    totalSize: Number(row.total_size),
  }));
}

export async function getBatch(env: UploadsEnv, id: string): Promise<UploadBatch | null> {
  const row = await env.UPLOADS_DB.prepare(
    `SELECT b.id, b.title, b.created_at, b.updated_at,
            COUNT(f.id) AS file_count,
            COALESCE(SUM(f.size), 0) AS total_size
       FROM upload_batches b
       LEFT JOIN upload_files f ON f.batch_id = b.id AND f.deleted_at IS NULL
                                AND f.status = 'complete'
      WHERE b.id = ?1 AND b.owner_email = ?2 AND b.deleted_at IS NULL
      GROUP BY b.id`,
  )
    .bind(id, UPLOAD_OWNER_EMAIL)
    .first<{
      id: string;
      title: string;
      created_at: number;
      updated_at: number;
      file_count: number;
      total_size: number;
    }>();

  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileCount: Number(row.file_count),
    totalSize: Number(row.total_size),
  };
}

export async function listFiles(env: UploadsEnv, batchId: string): Promise<UploadFile[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `SELECT id, title, description, content_type, size, created_at, modified_at
       FROM upload_files
      WHERE batch_id = ?1 AND deleted_at IS NULL AND status = 'complete'
      ORDER BY created_at ASC`,
  )
    .bind(batchId)
    .all<{
      id: string;
      title: string;
      description: string;
      content_type: string;
      size: number;
      created_at: number;
      modified_at: number | null;
    }>();

  return results.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    contentType: row.content_type,
    size: Number(row.size),
    createdAt: row.created_at,
    modifiedAt: row.modified_at ? Number(row.modified_at) : null,
  }));
}

