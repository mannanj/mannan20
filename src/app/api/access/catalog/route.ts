import { accessCaller, sameSiteMutation } from '@/lib/access-caller';
import { isAppId, parseApp, removeApp, saveApp, visibleApps } from '@/lib/app-access';
import { accessDb, reply } from '../shared';

export const dynamic = 'force-dynamic';

/** Mannan only: the app catalog. GET; PUT {id, name, description, url, visibility, sort?}; DELETE {id}. */
async function owner(request: Request, mutation: boolean) {
  const caller = await accessCaller(request);
  if (!caller) return { error: reply({ error: 'Sign in first' }, 401) };
  if (!caller.owner) return { error: reply({ error: 'Only Mannan can change apps' }, 403) };
  if (mutation && !sameSiteMutation(request, caller)) return { error: reply({ error: 'Forbidden' }, 403) };
  const db = accessDb();
  if (!db) return { error: reply({ error: 'Unavailable' }, 503) };
  return { caller, db };
}

export async function GET(request: Request) {
  const o = await owner(request, false);
  if (o.error) return o.error;
  return reply({ apps: await visibleApps(o.db, o.caller.email) });
}

export async function PUT(request: Request) {
  const o = await owner(request, true);
  if (o.error) return o.error;
  const parsed = parseApp(await request.json().catch(() => null));
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  await saveApp(o.db, parsed.value);
  return reply({ app: parsed.value });
}

export async function DELETE(request: Request) {
  const o = await owner(request, true);
  if (o.error) return o.error;
  const b = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (!isAppId(b?.id)) return reply({ error: 'Send {id}' }, 400);
  return reply({ removed: await removeApp(o.db, b.id) });
}
