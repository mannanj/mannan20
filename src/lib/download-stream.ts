import { safeAttachmentDisposition } from './attachment';
import { streamZip, type ZipSource } from './zip';
import type { D1Binding, R2Binding } from './cf-bindings';

export const STREAM_PREFIX = '/api/uploads/stream/';
export const TICKET_TTL_MS = 10 * 60 * 1000;
const TICKET_RE = /^[A-Za-z0-9_-]{32}$/;
const RANGE_RE = /^bytes=(\d*)-(\d*)$/;

export interface TicketEntry {
  bucket: 'owner' | 'shared';
  key: string;
  name: string;
  size: number;
  modified: number;
}

export interface TicketManifest {
  kind: 'file' | 'zip';
  name: string;
  contentType: string;
  inline: boolean;
  entries: TicketEntry[];
}

export interface StreamEnv {
  UPLOADS?: R2Binding;
  SHARED_UPLOADS?: R2Binding;
  UPLOADS_DB?: D1Binding;
}

interface RangedR2 {
  get(
    key: string,
    options?: { range?: { offset: number; length?: number } },
  ): Promise<{ body: ReadableStream<Uint8Array> | null; size: number } | null>;
}

export function newTicketId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function issueTicket(db: D1Binding, manifest: TicketManifest): Promise<string> {
  const id = newTicketId();
  const now = Date.now();
  await db.batch([
    db.prepare(`DELETE FROM download_tickets WHERE expires_at < ?1`).bind(now),
    db
      .prepare(`INSERT INTO download_tickets (id, manifest, expires_at) VALUES (?1, ?2, ?3)`)
      .bind(id, JSON.stringify(manifest), now + TICKET_TTL_MS),
  ]);
  return `${STREAM_PREFIX}${id}`;
}

const BASE_HEADERS = {
  'cache-control': 'private, no-store, no-transform',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
  'referrer-policy': 'no-referrer',
};

function fail(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } });
}

function bucketOf(env: StreamEnv, name: TicketEntry['bucket']): R2Binding | undefined {
  return name === 'shared' ? env.SHARED_UPLOADS : env.UPLOADS;
}

export function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const match = RANGE_RE.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return 'invalid';
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

async function serveFile(request: Request, env: StreamEnv, manifest: TicketManifest): Promise<Response> {
  const entry = manifest.entries[0];
  const bucket = bucketOf(env, entry.bucket) as unknown as RangedR2 | undefined;
  if (!bucket) return fail(503, 'Storage unavailable');

  const range = parseRange(request.headers.get('range'), entry.size);
  if (range === 'invalid') {
    return new Response(null, { status: 416, headers: { 'content-range': `bytes */${entry.size}` } });
  }
  const object = await bucket.get(
    entry.key,
    range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined,
  );
  if (!object?.body) return fail(502, 'File unavailable');

  const headers = new Headers({
    ...BASE_HEADERS,
    'content-type': manifest.contentType,
    'content-disposition': manifest.inline ? 'inline' : safeAttachmentDisposition(entry.name),
    'accept-ranges': 'bytes',
    'last-modified': new Date(entry.modified).toUTCString(),
  });
  if (range) {
    headers.set('content-length', String(range.end - range.start + 1));
    headers.set('content-range', `bytes ${range.start}-${range.end}/${entry.size}`);
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 206, headers });
  }
  headers.set('content-length', String(entry.size));
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

function serveZip(env: StreamEnv, manifest: TicketManifest): Response {
  const sources = (async function* (): AsyncGenerator<ZipSource> {
    for (const entry of manifest.entries) {
      const object = await bucketOf(env, entry.bucket)?.get(entry.key);
      if (!object) continue;
      yield { name: entry.name, body: object.body, modified: entry.modified };
    }
  })();
  const response = streamZip(sources, manifest.name);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(BASE_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

export async function handleStream(request: Request, env: StreamEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Method not allowed');
  const id = new URL(request.url).pathname.slice(STREAM_PREFIX.length);
  if (!TICKET_RE.test(id) || !env.UPLOADS_DB) return fail(404, 'Not found');

  const row = await env.UPLOADS_DB.prepare(
    `SELECT manifest, expires_at FROM download_tickets WHERE id = ?1`,
  )
    .bind(id)
    .first<{ manifest: string; expires_at: number }>();
  if (!row || Number(row.expires_at) < Date.now()) return fail(410, 'This download link expired');

  const manifest = JSON.parse(row.manifest) as TicketManifest;
  if (!manifest.entries.length) return fail(404, 'Not found');
  return manifest.kind === 'file' ? serveFile(request, env, manifest) : serveZip(env, manifest);
}
