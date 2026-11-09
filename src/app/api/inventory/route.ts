import { accessCaller, sameSiteMutation } from '@/lib/access-caller';
import { getInventory, getScore, mergeInventory, parseBagEntries } from '@/lib/user-inventory';
import { accessDb, reply } from '../access/shared';

export const dynamic = 'force-dynamic';

const GAME = 'chicken-v3';

export async function GET(request: Request) {
  const caller = await accessCaller(request);
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  const [items, score] = await Promise.all([getInventory(db, caller.email), getScore(db, caller.email, GAME)]);
  return reply({ email: caller.email, items, scores: { [GAME]: score } });
}

export async function POST(request: Request) {
  const caller = await accessCaller(request, { sessionOnly: true });
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  if (!sameSiteMutation(request, caller)) return reply({ error: 'Forbidden' }, 403);
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const items = parseBagEntries(body?.items);
  if (!items) return reply({ error: 'Invalid items' }, 400);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  return reply({ items: await mergeInventory(db, caller.email, items) });
}
