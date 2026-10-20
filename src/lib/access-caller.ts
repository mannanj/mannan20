import { verifyActor } from '@/lib/mcp/grant';
import { readSiteSession } from '@/lib/site-session';
import { OWNER_EMAIL, normalizeEmail } from '@/lib/app-access';

/**
 * Who is asking the /api/access routes: a signed-in browser (the session
 * cookie), or the MCP Worker acting for the person it signed in (a 60-second
 * actor token). An actor token names an account and confers nothing else: every
 * route still checks the grants for that account.
 */
export interface AccessCaller {
  email: string;
  via: 'session' | 'mcp';
  owner: boolean;
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header === null) return null;
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

export async function accessCaller(request: Request, opts: { sessionOnly?: boolean } = {}): Promise<AccessCaller | null> {
  const token = bearer(request);
  // A bearer that is present is the only identity considered: no falling back to the cookie.
  if (token !== null) {
    if (opts.sessionOnly) return null;
    const secret = process.env.UPLOADS_MCP_ACTOR_SECRET;
    if (!token || !secret) return null;
    const actor = await verifyActor(token, secret).catch(() => null);
    const email = normalizeEmail(actor?.email);
    return email ? { email, via: 'mcp', owner: email === OWNER_EMAIL } : null;
  }
  const session = await readSiteSession(request.headers.get('cookie')).catch(() => null);
  const email = normalizeEmail(session?.email);
  return email ? { email, via: 'session', owner: email === OWNER_EMAIL } : null;
}

/** Browser mutations must come from mannan.is itself (on top of the SameSite cookie). */
export function sameSiteMutation(request: Request, caller: AccessCaller): boolean {
  if (caller.via === 'mcp') return true;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  return origin !== null && origin === new URL(request.url).origin;
}
