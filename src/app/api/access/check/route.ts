import { accessCaller } from '@/lib/access-caller';
import { canOpen, isAppId } from '@/lib/app-access';
import { accessDb, reply } from '../shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/access/check?app=<id>: may the signed-in browser open this app?
 * For the apps on mannan.is (the ones hosted under mannan.is), which forward the visitor's
 * cookie server to server. Session only: an MCP actor token is refused here.
 *   200 {allowed:true, email}   401 not signed in   403 {allowed:false}
 */
export async function GET(request: Request) {
  const app = new URL(request.url).searchParams.get('app');
  if (!isAppId(app)) return reply({ error: 'Unknown app' }, 400);
  const caller = await accessCaller(request, { sessionOnly: true });
  if (!caller) return reply({ allowed: false }, 401);
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  return (await canOpen(db, caller.email, app)) ? reply({ allowed: true, email: caller.email }) : reply({ allowed: false }, 403);
}
