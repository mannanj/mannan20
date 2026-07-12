import { NextResponse } from 'next/server';
import { DOWNLOADS } from '@/lib/downloads';
import { R2_PUBLIC_BASE } from '@/lib/r2';
import { limitDownload } from '@/lib/rate-limit';

const DOWNLOAD_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ATTACHMENT_HEADERS = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
  'referrer-policy': 'no-referrer',
};

type RouteContext = { params: Promise<{ slug: string }> };

async function serveDownload(request: Request, { params }: RouteContext, head: boolean) {
  const { slug } = await params;
  if (!DOWNLOAD_SLUG.test(slug)) {
    return NextResponse.json({ error: 'Unknown download' }, { status: 404 });
  }
  const entry = DOWNLOADS[slug];
  if (!entry) {
    return NextResponse.json({ error: 'Unknown download' }, { status: 404 });
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const ip = (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();

  const result = await limitDownload(ip);
  const rateHeaders: Record<string, string> = {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(Math.max(0, result.remaining)),
  };

  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many downloads, try again shortly' },
      { status: 429, headers: { ...rateHeaders, 'retry-after': String(retryAfter) } },
    );
  }

  const upstream = await fetch(
    `${R2_PUBLIC_BASE}/${entry.key}`,
    head ? { method: 'HEAD' } : undefined,
  );
  if (!upstream.ok || (!head && !upstream.body)) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502, headers: rateHeaders });
  }

  const headers = new Headers(rateHeaders);
  for (const [name, value] of Object.entries(ATTACHMENT_HEADERS)) headers.set(name, value);
  headers.set('content-type', entry.contentType);
  headers.set('content-disposition', `attachment; filename="${entry.filename}"`);
  const length = upstream.headers.get('content-length');
  if (length && !upstream.headers.get('content-encoding')) headers.set('content-length', length);

  return new Response(head ? null : upstream.body, { status: 200, headers });
}

export async function GET(request: Request, context: RouteContext) {
  return serveDownload(request, context, false);
}

export async function HEAD(request: Request, context: RouteContext) {
  return serveDownload(request, context, true);
}

function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { allow: 'GET, HEAD' } },
  );
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
