import { NextResponse } from 'next/server';
import { limitLeaderboard } from '@/lib/rate-limit';
import {
  NAME_RE,
  OWNER_COOKIE,
  SCORE_MAX,
  boards,
  newOwnerId,
  normalizeName,
  readCookieValue,
  submitScore,
  type Kind,
} from '@/lib/leaderboard-store';

export const dynamic = 'force-dynamic';

const NAME_COOKIE = 'chicken-name';
const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function withOwnerCookie(res: NextResponse, ownerId: string): NextResponse {
  res.cookies.set(OWNER_COOKIE, ownerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return res;
}

export async function GET() {
  try {
    return NextResponse.json(await boards());
  } catch {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const ip = (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();

  const result = await limitLeaderboard(ip);
  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many submissions, try again shortly' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }
  const { name: rawName, score, kind } = body as Record<string, unknown>;
  const name = typeof rawName === 'string' ? normalizeName(rawName) : '';
  const validKind: Kind | null = kind === 'agent' ? 'agent' : kind === 'human' ? 'human' : null;
  const validScore =
    typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= SCORE_MAX;

  if (!validKind || !validScore || !NAME_RE.test(name)) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const cookieHeader = request.headers.get('cookie');
  const ownerId = readCookieValue(cookieHeader, OWNER_COOKIE) ?? newOwnerId();
  const cookieName = readCookieValue(cookieHeader, NAME_COOKIE);

  try {
    const submission = await submitScore({
      kind: validKind,
      name,
      score,
      ownerId,
      cookieName,
    });
    if (!submission.ok) {
      return withOwnerCookie(
        NextResponse.json(
          { error: 'name-taken', emailBound: submission.emailBound },
          { status: 409 }
        ),
        ownerId
      );
    }
    return withOwnerCookie(
      NextResponse.json({ ...(await boards()), you: { name: submission.finalName } }),
      ownerId
    );
  } catch {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }
}
