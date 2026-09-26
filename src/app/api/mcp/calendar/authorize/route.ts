import { NextResponse } from 'next/server';
import { cookieValue, readSiteSession } from '@/lib/site-session';
import { consentResponse, consentToken } from '@/vendor/mcp-connector/consent';
import {
  CONSENT_ABILITIES,
  CONSENT_APP_NAME,
  CONSENT_CAPABILITIES_PATH,
  CONSENT_SITE_URL,
  STATE_PATTERN,
  calendarMcpEnv,
  problem,
  signedOutRedirect,
} from '../shared';

export const dynamic = 'force-dynamic';

/**
 * The identity bridge for the Calendar MCP Worker.
 *
 * WHY IT IS HERE AND NOT THERE. `__Host-mannan-session` is host-only to
 * mannan.is, so a Worker on calendar-mcp.mannanteam.workers.dev cannot read
 * it — and widening the cookie to a whole domain would expose the session to
 * every present and future subdomain for one feature's convenience.
 *
 * So the Worker bounces the browser here, this route reads the cookie, and it
 * asks before handing back a short-lived signed assertion of who the person is.
 *
 *   calendar-mcp /authorize ──▶ HERE (ask) ──▶ confirm (sign) ──grant──▶ calendar-mcp /callback
 *
 * THIS ROUTE MINTS IDENTITY, NOT AUTHORITY. The grant says "this browser
 * belongs to alice@example.com" and confers nothing on its own; the Worker
 * exchanges it for an OAuth token bound to the client's PKCE challenge. The
 * secret here therefore cannot be used to act on anyone's calendar — that is a
 * different key, held by the Worker and the calendar app, deliberately not by
 * this one.
 *
 * NO CALLER-SUPPLIED REDIRECT. There is no `redirect_uri` parameter and there
 * must never be one: the destination is configuration, so this cannot be
 * turned into an open redirect that launders a mannan.is session to somebody
 * else's host.
 *
 * A GET used to sign the grant and redirect immediately, which meant anybody
 * could start a connect flow in their own client, take the opaque `state`, and
 * send a signed-in person this URL — one click, and that person's calendar was
 * readable and writable by a stranger's assistant. So a GET now only asks: it
 * renders `consentResponse` naming the account and what the assistant will be
 * able to do, and the grant is signed only on the confirm POST, carrying a
 * token bound to this session that a cross-site link cannot produce.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  if (!STATE_PATTERN.test(state)) return problem(400, 'Invalid request.');

  const { secret, callback } = calendarMcpEnv();
  if (!secret || !callback) {
    return problem(503, 'Calendar MCP is not configured on this site.');
  }

  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  if (!session) {
    // Home, with a marker, and `next` pointing back at THIS request. The
    // sign-in form sends `next` as its return path, so once the link is
    // clicked the callback lands here again, signed in, and the connect flow
    // resumes instead of dying at `/`.
    //
    // `next` is our own path with the Worker's already-validated state in it
    // — never a caller-chosen destination — and it is re-validated as a
    // same-origin path by the sign-in route that stores it.
    const home = new URL('/', url.origin);
    home.searchParams.set('mcp', 'calendar');
    home.searchParams.set('next', `${url.pathname}?state=${encodeURIComponent(state)}`);
    return NextResponse.redirect(home, {
      headers: { 'cache-control': 'no-store, private', 'referrer-policy': 'no-referrer' },
    });
  }

  const id = cookieValue(cookie);
  if (!id) return signedOutRedirect(url.origin);

  const action = new URL('/api/mcp/calendar/authorize/confirm', url.origin);
  action.searchParams.set('state', state);
  action.searchParams.set('consent', await consentToken(id, state, secret));

  return consentResponse({
    appName: CONSENT_APP_NAME,
    siteUrl: CONSENT_SITE_URL,
    account: session.email,
    abilities: CONSENT_ABILITIES,
    action: action.pathname + action.search,
    capabilitiesPath: CONSENT_CAPABILITIES_PATH,
  });
}
