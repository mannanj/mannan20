import { accessCaller, sameSiteMutation } from '@/lib/access-caller';
import { grantAccess, isAppId, listGrants, revokeAccess } from '@/lib/app-access';
import { accessDb, reply } from '../shared';

export const dynamic = 'force-dynamic';

/** Mannan only: who has which app. GET ?app=<id>; POST/DELETE {app, email}. */
async function owner(request: Request, mutation: boolean) {
  const caller = await accessCaller(request);
  if (!caller) return { error: reply({ error: 'Sign in first' }, 401) };
  if (!caller.owner) return { error: reply({ error: 'Only Mannan can change access' }, 403) };
  if (mutation && !sameSiteMutation(request, caller)) return { error: reply({ error: 'Forbidden' }, 403) };
  const db = accessDb();
  if (!db) return { error: reply({ error: 'Unavailable' }, 503) };
  return { caller, db };
}

export async function GET(request: Request) {
  const o = await owner(request, false);
  if (o.error) return o.error;
  const app = new URL(request.url).searchParams.get('app');
  if (app !== null && !isAppId(app)) return reply({ error: 'Unknown app' }, 400);
  return reply({ grants: await listGrants(o.db, app ?? undefined) });
}

async function body(request: Request): Promise<{ app: string; email: string } | null> {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return b && typeof b.app === 'string' && typeof b.email === 'string' ? { app: b.app, email: b.email } : null;
}

export async function POST(request: Request) {
  const o = await owner(request, true);
  if (o.error) return o.error;
  const b = await body(request);
  if (!b) return reply({ error: 'Send {app, email}' }, 400);
  const res = await grantAccess(o.db, b.app, b.email, o.caller.email);
  return res.ok ? reply({ grant: res.value }) : reply({ error: res.error }, 400);
}

export async function DELETE(request: Request) {
  const o = await owner(request, true);
  if (o.error) return o.error;
  const b = await body(request);
  if (!b) return reply({ error: 'Send {app, email}' }, 400);
  return reply({ removed: await revokeAccess(o.db, b.app, b.email) });
}
