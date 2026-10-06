import { readSiteSession } from '@/lib/site-session';
import { getBatch, newId, type UploadsEnv } from '@/lib/uploads';
import {
  MAX_SHARE_DURATION_MS,
  MAX_UPLOAD_BYTES,
  canShareRead,
  canShareWrite,
  type ShareSettings,
  type UploadShare,
} from '@/lib/uploads-shared';

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const MAX_LABEL = 120;
const MAX_COUNT = 1_000_000;
const MAX_CAPACITY_BYTES = 10 * 1024 * MAX_UPLOAD_BYTES;

export function isShareToken(value: string): boolean {
  return TOKEN_RE.test(value);
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface ShareRow {
  id: string;
  token: string;
  batch_id: string;
  batch_title: string;
  file_id: string | null;
  file_title: string | null;
  label: string;
  can_read: number;
  can_write: number;
  expires_at: number | null;
  max_uploads: number | null;
  upload_count: number;
  max_downloads: number | null;
  download_count: number;
  max_bytes: number | null;
  used_bytes: number;
  sign_in_read: number;
  sign_in_write: number;
  created_at: number;
  updated_at: number;
  revoked_at: number | null;
}

const SHARE_SELECT = `SELECT s.*, b.title AS batch_title, f.title AS file_title
       FROM upload_shares s
       JOIN upload_batches b ON b.id = s.batch_id AND b.deleted_at IS NULL
       LEFT JOIN upload_files f ON f.id = s.file_id`;

const nullableNumber = (value: number | null) => (value === null ? null : Number(value));

function toShare(row: ShareRow): UploadShare {
  return {
    id: row.id,
    token: row.token,
    batchId: row.batch_id,
    batchTitle: row.batch_title,
    fileId: row.file_id,
    fileTitle: row.file_title,
    label: row.label,
    canRead: Boolean(row.can_read),
    canWrite: Boolean(row.can_write),
    expiresAt: nullableNumber(row.expires_at),
    maxUploads: nullableNumber(row.max_uploads),
    uploadCount: Number(row.upload_count),
    maxDownloads: nullableNumber(row.max_downloads),
    downloadCount: Number(row.download_count),
    maxBytes: nullableNumber(row.max_bytes),
    usedBytes: Number(row.used_bytes),
    signInRead: Boolean(row.sign_in_read),
    signInWrite: Boolean(row.sign_in_write),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    revokedAt: nullableNumber(row.revoked_at),
  };
}

export async function listShares(env: UploadsEnv): Promise<UploadShare[]> {
  const { results } = await env.UPLOADS_DB.prepare(
    `${SHARE_SELECT}
      WHERE (s.file_id IS NULL OR (f.id IS NOT NULL AND f.deleted_at IS NULL))
      ORDER BY s.created_at DESC`,
  ).all<ShareRow>();
  return results.map(toShare);
}

export async function getShare(env: UploadsEnv, id: string): Promise<UploadShare | null> {
  const row = await env.UPLOADS_DB.prepare(`${SHARE_SELECT} WHERE s.id = ?1`)
    .bind(id)
    .first<ShareRow>();
  return row ? toShare(row) : null;
}

export async function shareByToken(env: UploadsEnv, token: string): Promise<UploadShare | null> {
  if (!isShareToken(token)) return null;
  const row = await env.UPLOADS_DB.prepare(
    `${SHARE_SELECT}
      WHERE s.token = ?1 AND (s.file_id IS NULL OR (f.id IS NOT NULL AND f.deleted_at IS NULL))`,
  )
    .bind(token)
    .first<ShareRow>();
  return row ? toShare(row) : null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function limit(raw: unknown, max: number, name: string): Parsed<number | null | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1 || raw > max) {
    return { ok: false, error: `Invalid ${name}` };
  }
  return { ok: true, value: raw };
}

export function parseShareSettings(input: unknown): Parsed<ShareSettings> {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const settings: ShareSettings = {};

  if (record.label !== undefined) {
    if (typeof record.label !== 'string') return { ok: false, error: 'Invalid label' };
    settings.label = record.label.trim().slice(0, MAX_LABEL);
  }
  for (const key of ['canRead', 'canWrite'] as const) {
    if (record[key] === undefined) continue;
    if (typeof record[key] !== 'boolean') return { ok: false, error: `Invalid ${key}` };
    settings[key] = record[key] as boolean;
  }

  const duration = limit(record.expiresInMs, MAX_SHARE_DURATION_MS, 'duration');
  if (!duration.ok) return duration;
  if (duration.value !== undefined) settings.expiresInMs = duration.value;

  const uploads = limit(record.maxUploads, MAX_COUNT, 'upload limit');
  if (!uploads.ok) return uploads;
  if (uploads.value !== undefined) settings.maxUploads = uploads.value;

  const downloads = limit(record.maxDownloads, MAX_COUNT, 'download limit');
  if (!downloads.ok) return downloads;
  if (downloads.value !== undefined) settings.maxDownloads = downloads.value;

  const bytes = limit(record.maxBytes, MAX_CAPACITY_BYTES, 'capacity');
  if (!bytes.ok) return bytes;
  if (bytes.value !== undefined) settings.maxBytes = bytes.value;

  return { ok: true, value: settings };
}

export async function createShare(
  env: UploadsEnv,
  target: { batchId: string; fileId: string | null },
  settings: ShareSettings,
): Promise<UploadShare | { error: string }> {
  const batch = await getBatch(env, target.batchId);
  if (!batch) return { error: 'Not found' };

  const isFile = target.fileId !== null;
  const canRead = isFile ? true : (settings.canRead ?? false);
  const canWrite = isFile ? false : (settings.canWrite ?? true);
  if (!canRead && !canWrite) return { error: 'Pick read, write, or both' };

  if (isFile) {
    const file = await env.UPLOADS_DB.prepare(
      `SELECT id FROM upload_files WHERE id = ?1 AND batch_id = ?2 AND deleted_at IS NULL
         AND status = 'complete'`,
    )
      .bind(target.fileId, target.batchId)
      .first<{ id: string }>();
    if (!file) return { error: 'Not found' };
  }

  const id = newId();
  const now = Date.now();
  await env.UPLOADS_DB.prepare(
    `INSERT INTO upload_shares
       (id, token, batch_id, file_id, label, can_read, can_write, expires_at,
        max_uploads, max_downloads, max_bytes, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
  )
    .bind(
      id,
      newToken(),
      target.batchId,
      target.fileId,
      settings.label ?? '',
      canRead ? 1 : 0,
      canWrite ? 1 : 0,
      settings.expiresInMs ? now + settings.expiresInMs : null,
      canWrite ? (settings.maxUploads ?? null) : null,
      canRead ? (settings.maxDownloads ?? null) : null,
      canWrite ? (settings.maxBytes ?? null) : null,
      now,
    )
    .run();

  return (await getShare(env, id)) ?? { error: 'Not found' };
}

export async function updateShare(
  env: UploadsEnv,
  id: string,
  settings: ShareSettings & { revoked?: boolean },
): Promise<UploadShare | { error: string }> {
  const current = await getShare(env, id);
  if (!current) return { error: 'Not found' };

  const isFile = current.fileId !== null;
  const canRead = isFile ? true : (settings.canRead ?? current.canRead);
  const canWrite = isFile ? false : (settings.canWrite ?? current.canWrite);
  if (!canRead && !canWrite) return { error: 'Pick read, write, or both' };

  const now = Date.now();
  const expiresAt =
    settings.expiresInMs === undefined
      ? current.expiresAt
      : settings.expiresInMs === null
        ? null
        : now + settings.expiresInMs;
  const pick = <T>(next: T | undefined, was: T) => (next === undefined ? was : next);
  const revokedAt =
    settings.revoked === undefined ? current.revokedAt : settings.revoked ? now : null;

  await env.UPLOADS_DB.prepare(
    `UPDATE upload_shares
        SET label = ?1, can_read = ?2, can_write = ?3, expires_at = ?4, max_uploads = ?5,
            max_downloads = ?6, max_bytes = ?7, revoked_at = ?8, updated_at = ?9
      WHERE id = ?10`,
  )
    .bind(
      pick(settings.label, current.label),
      canRead ? 1 : 0,
      canWrite ? 1 : 0,
      expiresAt,
      pick(settings.maxUploads, current.maxUploads),
      pick(settings.maxDownloads, current.maxDownloads),
      pick(settings.maxBytes, current.maxBytes),
      revokedAt,
      now,
      id,
    )
    .run();

  return (await getShare(env, id)) ?? { error: 'Not found' };
}

export type ShareDenial = 'not-found' | 'unavailable' | 'sign-in';

export async function resolveShare(
  env: UploadsEnv,
  token: string,
  need: 'read' | 'write' | 'continue' | 'view',
  cookie: string | null,
): Promise<{ ok: true; share: UploadShare; viewer: string | null } | { ok: false; reason: ShareDenial }> {
  const share = await shareByToken(env, token);
  if (!share) return { ok: false, reason: 'not-found' };

  const session = await readSiteSession(cookie).catch(() => null);
  const viewer = session?.email ?? null;
  const needsSignIn =
    (need === 'read' && share.signInRead) ||
    ((need === 'write' || need === 'continue') && share.signInWrite) ||
    (need === 'view' && share.signInRead && share.signInWrite);
  if (needsSignIn && !viewer) return { ok: false, reason: 'sign-in' };

  if (need === 'read' && !canShareRead(share)) return { ok: false, reason: 'unavailable' };
  if (need === 'write' && !canShareWrite(share)) return { ok: false, reason: 'unavailable' };
  if (
    need === 'continue' &&
    (!share.canWrite || share.revokedAt !== null || (share.expiresAt !== null && share.expiresAt <= Date.now()))
  ) {
    return { ok: false, reason: 'unavailable' };
  }
  return { ok: true, share, viewer };
}

export async function reserveUpload(
  env: UploadsEnv,
  shareId: string,
  bytes: number,
): Promise<boolean> {
  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_shares
        SET upload_count = upload_count + 1, used_bytes = used_bytes + ?1
      WHERE id = ?2 AND revoked_at IS NULL AND can_write = 1
        AND (expires_at IS NULL OR expires_at > ?3)
        AND (max_uploads IS NULL OR upload_count < max_uploads)
        AND (max_bytes IS NULL OR used_bytes + ?1 <= max_bytes)`,
  )
    .bind(bytes, shareId, Date.now())
    .run();
  return result.meta.changes > 0;
}

export async function releaseUpload(
  env: UploadsEnv,
  shareId: string,
  bytes: number,
): Promise<void> {
  await env.UPLOADS_DB.prepare(
    `UPDATE upload_shares
        SET upload_count = MAX(upload_count - 1, 0), used_bytes = MAX(used_bytes - ?1, 0)
      WHERE id = ?2`,
  )
    .bind(bytes, shareId)
    .run();
}

export async function reserveDownload(env: UploadsEnv, shareId: string): Promise<boolean> {
  const result = await env.UPLOADS_DB.prepare(
    `UPDATE upload_shares SET download_count = download_count + 1
      WHERE id = ?1 AND revoked_at IS NULL AND can_read = 1
        AND (expires_at IS NULL OR expires_at > ?2)
        AND (max_downloads IS NULL OR download_count < max_downloads)`,
  )
    .bind(shareId, Date.now())
    .run();
  return result.meta.changes > 0;
}
