import type { ViewerTokenResponse } from '@mannan/manna-protocol';
import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await readSiteSession(request.headers.get('cookie'));
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!session.admin) return json({ error: 'unavailable' }, 403);

  const workerUrl = configuredWorkerUrl();
  const serviceSecret = process.env.MANNA_SERVICE_AUTH_SECRET;
  if (!workerUrl || !serviceSecret) return json({ error: 'manna_unavailable' }, 503);

  let upstream: Response;
  try {
    upstream = await fetch(`${workerUrl}/v1/viewer-token`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${serviceSecret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: session.email, projectId: 'meet' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return json({ error: 'manna_unavailable' }, 503);
  }
  if (!upstream.ok) return json({ error: 'manna_unavailable' }, 503);

  const parsed = parseViewerResponse(await upstream.json().catch(() => null), workerUrl);
  return parsed
    ? json(parsed, 200)
    : json({ error: 'manna_unavailable' }, 503);
}

function configuredWorkerUrl(): string | null {
  const raw = process.env.MANNA_WORKER_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const localHttp =
      url.protocol === 'http:' &&
      process.env.NODE_ENV !== 'production' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
    if (url.protocol !== 'https:' && !localHttp) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/' && url.pathname !== '') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function parseViewerResponse(value: unknown, expectedWorkerUrl: string): ViewerTokenResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 3 ||
    !keys.every((key) => ['token', 'expiresAt', 'workerUrl'].includes(key))
  ) return null;
  if (typeof record.token !== 'string' || !record.token.startsWith('mnv1.') || record.token.length > 4_096) return null;
  if (typeof record.expiresAt !== 'string' || !Number.isFinite(Date.parse(record.expiresAt))) return null;
  if (record.workerUrl !== expectedWorkerUrl) return null;
  return {
    token: record.token,
    expiresAt: record.expiresAt,
    workerUrl: expectedWorkerUrl,
  };
}

function json(body: Record<string, unknown>, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
