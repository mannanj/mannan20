import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hasValidGrant } from '@/lib/transcript-gate';
import { limitTranscriptDownload } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

const OBJECT_KEY = 'sun-signal/transcripts.zip';
const FILENAME = 'sun-signal-transcripts.zip';
const CONTENT_TYPE = 'application/zip';

const ATTACHMENT_HEADERS = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};

interface GatedBucket {
  get(key: string): Promise<{ body: ReadableStream | null; size?: number } | null>;
}

function gatedBucket(): GatedBucket | undefined {
  try {
    return (getCloudflareContext().env as unknown as { GATED_FILES?: GatedBucket }).GATED_FILES;
  } catch {
    return undefined;
  }
}

async function localFallback(): Promise<{ body: Uint8Array } | null> {
  const path = process.env.TRANSCRIPTS_LOCAL_FILE;
  if (!path || process.env.NODE_ENV === 'production') return null;
  try {
    const { readFile } = await import('node:fs/promises');
    return { body: await readFile(path) };
  } catch {
    return null;
  }
}

async function serve(request: Request, head: boolean) {
  if (!hasValidGrant(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Locked' }, { status: 403, headers: { 'cache-control': 'private, no-store' } });
  }

  let limit;
  try {
    limit = await limitTranscriptDownload(clientIp(request.headers));
  } catch {
    return NextResponse.json(
      { error: 'Temporarily unavailable, try again shortly' },
      { status: 503, headers: { 'cache-control': 'private, no-store' } },
    );
  }

  const rateHeaders: Record<string, string> = {
    'x-ratelimit-limit': String(limit.limit),
    'x-ratelimit-remaining': String(Math.max(0, limit.remaining)),
  };

  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many downloads, try again shortly' },
      { status: 429, headers: { ...rateHeaders, 'retry-after': String(retryAfter) } },
    );
  }

  const headers = new Headers(rateHeaders);
  for (const [name, value] of Object.entries(ATTACHMENT_HEADERS)) headers.set(name, value);
  headers.set('content-type', CONTENT_TYPE);
  headers.set('content-disposition', `attachment; filename="${FILENAME}"`);

  const bucket = gatedBucket();
  if (bucket) {
    const object = await bucket.get(OBJECT_KEY);
    if (!object) {
      return NextResponse.json({ error: 'File unavailable' }, { status: 502, headers: rateHeaders });
    }
    if (typeof object.size === 'number') headers.set('content-length', String(object.size));
    return new Response(head ? null : object.body, { status: 200, headers });
  }

  const local = await localFallback();
  if (!local) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502, headers: rateHeaders });
  }
  headers.set('content-length', String(local.body.byteLength));
  return new Response(head ? null : new Uint8Array(local.body), { status: 200, headers });
}

export async function GET(request: Request) {
  return serve(request, false);
}

export async function HEAD(request: Request) {
  return serve(request, true);
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'GET, HEAD' } });
}

export const POST = methodNotAllowed;
