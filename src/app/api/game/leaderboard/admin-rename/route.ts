import { NextResponse } from 'next/server';
import { isUploadOwner } from '@/lib/uploads';
import { NAME_RE, normalizeName } from '@/lib/leaderboard-store';
import { callPortfolioState, stateOperationId } from '@/lib/portfolio-state-client';

export const dynamic = 'force-dynamic';

const OWNER_ID_RE = /^[a-zA-Z0-9_-]{8,80}$/;

type RenameResult = { ok: true; moved: number } | { ok: false; code: 'not-found' | 'taken' };

export async function POST(request: Request) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { from: rawFrom, to: rawTo, ownerId } = body as Record<string, unknown>;
  const from = typeof rawFrom === 'string' ? normalizeName(rawFrom) : '';
  const to = typeof rawTo === 'string' ? normalizeName(rawTo) : '';
  if (!NAME_RE.test(from) || !NAME_RE.test(to) || typeof ownerId !== 'string' || !OWNER_ID_RE.test(ownerId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  try {
    const result = await callPortfolioState<RenameResult>('/v1/admin/board-rename', {
      opId: stateOperationId(),
      from,
      to,
      ownerId,
    });
    if (!result) return NextResponse.json({ error: 'State service unavailable' }, { status: 503 });
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === 'taken' ? 409 : 404 });
  } catch {
    return NextResponse.json({ error: 'State service unavailable' }, { status: 503 });
  }
}
