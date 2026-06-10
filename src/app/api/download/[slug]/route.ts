import { NextResponse } from 'next/server';
import { DOWNLOADS } from '@/lib/downloads';
import { R2_PUBLIC_BASE } from '@/lib/r2';
import { limitDownload } from '@/lib/rate-limit';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  const upstream = await fetch(`${R2_PUBLIC_BASE}/${entry.key}`);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502, headers: rateHeaders });
  }

  const headers = new Headers(rateHeaders);
  headers.set('content-type', entry.contentType);
  headers.set('content-disposition', `attachment; filename="${entry.filename}"`);
  headers.set('cache-control', 'private, no-store');
  const length = upstream.headers.get('content-length');
  if (length && !upstream.headers.get('content-encoding')) headers.set('content-length', length);

  return new Response(upstream.body, { status: 200, headers });
}
