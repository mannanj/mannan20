import { accessCaller, sameSiteMutation } from '@/lib/access-caller';
import { decrementItem, ITEM_ID_PATTERN } from '@/lib/user-inventory';
import { accessDb, reply } from '../../access/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const caller = await accessCaller(request, { sessionOnly: true });
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  if (!sameSiteMutation(request, caller)) return reply({ error: 'Forbidden' }, 403);
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== 'string' || !ITEM_ID_PATTERN.test(body.id)) return reply({ error: 'Invalid id' }, 400);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  return reply({ items: await decrementItem(db, caller.email, body.id) });
}
