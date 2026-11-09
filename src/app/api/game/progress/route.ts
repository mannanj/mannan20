import { accessCaller, sameSiteMutation } from '@/lib/access-caller';
import { getScore, isGameId, mergeScore } from '@/lib/user-inventory';
import { accessDb, reply } from '../../access/shared';

export const dynamic = 'force-dynamic';

const DEFAULT_GAME = 'chicken-v3';

export async function GET(request: Request) {
  const caller = await accessCaller(request);
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  const game = new URL(request.url).searchParams.get('game') ?? DEFAULT_GAME;
  if (!isGameId(game)) return reply({ error: 'Unknown game' }, 400);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  return reply({ game, score: await getScore(db, caller.email, game) });
}

export async function POST(request: Request) {
  const caller = await accessCaller(request, { sessionOnly: true });
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  if (!sameSiteMutation(request, caller)) return reply({ error: 'Forbidden' }, 403);
  const body = (await request.json().catch(() => null)) as { game?: unknown; score?: unknown } | null;
  if (!isGameId(body?.game) || typeof body?.score !== 'number' || !Number.isFinite(body.score) || body.score < 0) {
    return reply({ error: 'Invalid progress' }, 400);
  }
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  return reply({ game: body.game, score: await mergeScore(db, caller.email, body.game, body.score) });
}
