import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { limitLeaderboard } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const TOP_N = 10;
const SCORE_MAX = 1_000_000;
const KEEP_PER_BOARD = 200;
const NAME_RE = /^[\p{L}\p{N} ._'-]{1,24}$/u;

const KEYS = {
  human: 'game:chicken:lb:human',
  agent: 'game:chicken:lb:agent',
} as const;

type Kind = keyof typeof KEYS;

interface Entry {
  name: string;
  score: number;
}

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const memoryBoards: Record<Kind, Map<string, number>> = {
  human: new Map(),
  agent: new Map(),
};

function memoryTop(kind: Kind): Entry[] {
  return [...memoryBoards[kind]]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}

async function topFor(kind: Kind): Promise<Entry[]> {
  if (!redis) return memoryTop(kind);
  const raw = await redis.zrange<(string | number)[]>(KEYS[kind], 0, TOP_N - 1, {
    rev: true,
    withScores: true,
  });
  const entries: Entry[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    entries.push({ name: String(raw[i]), score: Number(raw[i + 1]) });
  }
  return entries;
}

async function boards() {
  const [human, agent] = await Promise.all([topFor('human'), topFor('agent')]);
  return { human, agent };
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
  const name = typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '';
  const validKind: Kind | null = kind === 'agent' ? 'agent' : kind === 'human' ? 'human' : null;
  const validScore =
    typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= SCORE_MAX;

  if (!validKind || !validScore || !NAME_RE.test(name)) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  try {
    if (redis) {
      await redis.zadd(KEYS[validKind], { gt: true }, { score, member: name });
      await redis.zremrangebyrank(KEYS[validKind], 0, -(KEEP_PER_BOARD + 1));
    } else {
      const current = memoryBoards[validKind].get(name) ?? 0;
      if (score > current) memoryBoards[validKind].set(name, score);
    }
    return NextResponse.json(await boards());
  } catch {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }
}
