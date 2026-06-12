import { NextResponse } from 'next/server';
import { limitLeaderboard } from '@/lib/rate-limit';
import {
  NAME_RE,
  OWNER_COOKIE,
  boards,
  normalizeName,
  readCookieValue,
  renameIdentity,
} from '@/lib/leaderboard-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const ip = (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();
  const limit = await limitLeaderboard(`rename:${ip}`);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const ownerId = readCookieValue(request.headers.get('cookie'), OWNER_COOKIE);
  if (!ownerId) {
    return NextResponse.json({ error: 'no-identity' }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { to: rawTo, from: rawFrom } = body as Record<string, unknown>;
  const to = typeof rawTo === 'string' ? normalizeName(rawTo) : '';
  const from = typeof rawFrom === 'string' ? normalizeName(rawFrom) : undefined;
  if (!NAME_RE.test(to) || (from !== undefined && !NAME_RE.test(from))) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  try {
    const result = await renameIdentity({ ownerId, to, from });
    if (!result.ok) {
      const status = result.code === 'taken' ? 409 : 400;
      return NextResponse.json({ error: result.code }, { status });
    }
    return NextResponse.json({ ok: true, ...(await boards()) });
  } catch {
    return NextResponse.json({ error: 'Rename unavailable' }, { status: 503 });
  }
}
