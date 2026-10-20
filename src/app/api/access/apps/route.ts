import { accessCaller } from '@/lib/access-caller';
import { visibleApps } from '@/lib/app-access';
import { accessDb, reply } from '../shared';

export const dynamic = 'force-dynamic';

/** GET /api/access/apps: the apps the caller may see and open (signed-in browser, or the MCP for its user). */
export async function GET(request: Request) {
  const caller = await accessCaller(request);
  if (!caller) return reply({ error: 'Sign in first' }, 401);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  const apps = await visibleApps(db, caller.email);
  // Visibility is Mannan's business: other people get what they may open, not how it is gated.
  return reply({
    email: caller.email,
    apps: apps.map(({ id, name, description, url, visibility }) => ({ id, name, description, url, ...(caller.owner ? { visibility } : {}) })),
  });
}
