import { NextRequest, NextResponse } from 'next/server';
import {
  GRANT_TTL_SECONDS,
  MAX_GUESSES,
  MAX_GUESS_LENGTH,
  gateForFilm,
  grantCookie,
  guessKey,
  hasValidGrant,
  isCorrectGuess,
  mintGrantToken,
} from '@/lib/transcript-gate';
import { limitTranscriptGuess } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

const UNLOCKED_MESSAGE = 'Thanks — that checks out. Your download is unlocked below.';
const UNAVAILABLE_MESSAGE = 'The door is jammed on my side — try again in a bit.';
const EMPTY = { message: '', unlocked: false };
const unknownFilm = () => NextResponse.json({ error: 'Unknown film' }, { status: 404 });

function wrongMessage(remaining: number): string {
  if (remaining <= 0) {
    return "That's not it, and that was the last of three tries. The door reopens in 10 minutes.";
  }
  const tries = remaining === 1 ? '1 try' : `${remaining} tries`;
  return `That's not it — ${tries} left.`;
}

function lockedMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Still locked — three tries used. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
}

export async function POST(request: NextRequest) {
  const gate = gateForFilm(request.nextUrl.searchParams.get('film'));
  if (!gate) return unknownFilm();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(EMPTY);
  }

  const guess = (body as { message?: unknown } | null)?.message;
  if (typeof guess !== 'string' || !guess.trim()) {
    return NextResponse.json(EMPTY);
  }
  if (guess.length > MAX_GUESS_LENGTH) {
    return NextResponse.json({ error: 'Message too long.' }, { status: 400 });
  }

  const cookieHeader = request.headers.get('cookie');
  if (hasValidGrant(cookieHeader, Date.now(), gate)) {
    return NextResponse.json({ message: UNLOCKED_MESSAGE, unlocked: true, remaining: MAX_GUESSES });
  }

  const ip = clientIp(request.headers);

  let limit;
  try {
    limit = await limitTranscriptGuess(guessKey(ip, gate));
  } catch {
    return NextResponse.json(
      { message: UNAVAILABLE_MESSAGE, unlocked: false, remaining: 0 },
      { status: 503, headers: { 'cache-control': 'private, no-store' } },
    );
  }

  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { message: lockedMessage(retryAfter), unlocked: false, remaining: 0, retryAfterSeconds: retryAfter },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  if (!isCorrectGuess(guess, gate)) {
    const remaining = Math.max(0, limit.remaining);
    return NextResponse.json({ message: wrongMessage(remaining), unlocked: false, remaining });
  }

  const token = mintGrantToken(Date.now(), gate);
  if (!token) {
    return NextResponse.json(
      { message: 'The door is jammed on my side — try again later.', unlocked: false, remaining: Math.max(0, limit.remaining) },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { message: UNLOCKED_MESSAGE, unlocked: true, remaining: Math.max(0, limit.remaining), expiresInSeconds: GRANT_TTL_SECONDS },
    { headers: { 'set-cookie': grantCookie(token, gate) } },
  );
}

export async function GET(request: NextRequest) {
  const gate = gateForFilm(request.nextUrl.searchParams.get('film'));
  if (!gate) return unknownFilm();
  return NextResponse.json(
    { unlocked: hasValidGrant(request.headers.get('cookie'), Date.now(), gate) },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
