import { newId, type UploadsEnv } from '@/lib/uploads';

export const UPLOAD_EVENT_TYPES = [
  'upload',
  'download',
  'share_created',
  'share_updated',
  'share_revoked',
  'share_visit',
  'file_deleted',
  'file_duplicated',
  'page_created',
  'page_deleted',
  'access_request',
  'mcp_call',
] as const;

export type UploadEventType = (typeof UPLOAD_EVENT_TYPES)[number];

export type UploadActor = 'owner' | 'mcp' | 'share' | 'visitor';

export interface UploadEventInput {
  type: UploadEventType;
  actor: UploadActor;
  batchId?: string | null;
  fileId?: string | null;
  shareId?: string | null;
  bytes?: number;
  detail?: string;
}

export async function recordEvent(env: UploadsEnv, event: UploadEventInput): Promise<void> {
  await env.UPLOADS_DB.prepare(
    `INSERT INTO upload_events (id, type, actor, batch_id, file_id, share_id, bytes, detail, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      newId(),
      event.type,
      event.actor,
      event.batchId ?? null,
      event.fileId ?? null,
      event.shareId ?? null,
      Math.max(0, Math.round(event.bytes ?? 0)),
      (event.detail ?? '').slice(0, 300),
      Date.now(),
    )
    .run()
    .catch(() => null);
}

export interface UploadAnalytics {
  since: number;
  totals: { type: string; count: number; bytes: number }[];
  daily: { day: string; type: string; count: number; bytes: number }[];
  byActor: { actor: string; count: number; bytes: number }[];
  topShares: { shareId: string; label: string; batchTitle: string; count: number; bytes: number }[];
  recent: {
    id: string;
    type: string;
    actor: string;
    batchTitle: string | null;
    fileTitle: string | null;
    bytes: number;
    detail: string;
    createdAt: number;
  }[];
  storage: { bucket: string; files: number; bytes: number }[];
  requests: { id: string; email: string; resource: string; message: string; createdAt: number }[];
}

export async function uploadAnalytics(env: UploadsEnv, since: number): Promise<UploadAnalytics> {
  const db = env.UPLOADS_DB;
  const [totals, daily, byActor, topShares, recent, storage, requests] = await Promise.all([
    db
      .prepare(
        `SELECT type, COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes
           FROM upload_events WHERE created_at >= ?1 GROUP BY type ORDER BY count DESC`,
      )
      .bind(since)
      .all<{ type: string; count: number; bytes: number }>(),
    db
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, type,
                COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes
           FROM upload_events WHERE created_at >= ?1
          GROUP BY day, type ORDER BY day ASC`,
      )
      .bind(since)
      .all<{ day: string; type: string; count: number; bytes: number }>(),
    db
      .prepare(
        `SELECT actor, COUNT(*) AS count, COALESCE(SUM(bytes), 0) AS bytes
           FROM upload_events WHERE created_at >= ?1 GROUP BY actor ORDER BY count DESC`,
      )
      .bind(since)
      .all<{ actor: string; count: number; bytes: number }>(),
    db
      .prepare(
        `SELECT e.share_id AS shareId, COALESCE(s.label, '') AS label,
                COALESCE(b.title, '') AS batchTitle,
                COUNT(*) AS count, COALESCE(SUM(e.bytes), 0) AS bytes
           FROM upload_events e
           LEFT JOIN upload_shares s ON s.id = e.share_id
           LEFT JOIN upload_batches b ON b.id = s.batch_id
          WHERE e.created_at >= ?1 AND e.share_id IS NOT NULL
          GROUP BY e.share_id ORDER BY count DESC LIMIT 10`,
      )
      .bind(since)
      .all<{ shareId: string; label: string; batchTitle: string; count: number; bytes: number }>(),
    db
      .prepare(
        `SELECT e.id, e.type, e.actor, b.title AS batchTitle, f.title AS fileTitle,
                e.bytes, e.detail, e.created_at AS createdAt
           FROM upload_events e
           LEFT JOIN upload_batches b ON b.id = e.batch_id
           LEFT JOIN upload_files f ON f.id = e.file_id
          ORDER BY e.created_at DESC LIMIT 50`,
      )
      .all<UploadAnalytics['recent'][number]>(),
    db
      .prepare(
        `SELECT bucket, COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes
           FROM (SELECT DISTINCT bucket, object_key, size FROM upload_files
                  WHERE deleted_at IS NULL AND status = 'complete')
          GROUP BY bucket`,
      )
      .all<{ bucket: string; files: number; bytes: number }>(),
    db
      .prepare(
        `SELECT id, email, resource, message, created_at AS createdAt
           FROM access_requests ORDER BY created_at DESC LIMIT 25`,
      )
      .all<UploadAnalytics['requests'][number]>(),
  ]);

  const numeric = <T extends Record<string, unknown>>(rows: T[]) =>
    rows.map((row) => {
      const out: Record<string, unknown> = { ...row };
      for (const key of ['count', 'bytes', 'files', 'createdAt']) {
        if (key in out) out[key] = Number(out[key]);
      }
      return out as T;
    });

  return {
    since,
    totals: numeric(totals.results),
    daily: numeric(daily.results),
    byActor: numeric(byActor.results),
    topShares: numeric(topShares.results),
    recent: numeric(recent.results),
    storage: numeric(storage.results),
    requests: numeric(requests.results),
  };
}
