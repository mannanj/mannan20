import { NextResponse } from 'next/server';
import { cookieValue, readSiteSession } from '@/lib/site-session';
import { consentResponse, consentToken } from '@/vendor/mcp-connector/consent';
import {
  CONSENT_ABILITIES,
  CONSENT_APP_NAME,
  CONSENT_CAPABILITIES_PATH,
  CONSENT_SITE_URL,
  STATE_PATTERN,
  isFreshStartAllowed,
  freshStartEnv,
  problem,
  signedOutRedirect,
} from '../shared';

export const dynamic = 'force-dynamic';

/**
 * The identity bridge for Fresh Start (the Safari price extension).
 *
 * WHY IT IS HERE AND NOT THERE. `__Host-mannan-session` is host-only to
 * mannan.is, so a Worker on fresh-start.mannanteam.workers.dev cannot read
 * it — and widening the cookie to a whole domain would expose the session to
 * every present and future subdomain for one feature's convenience.
 *
 * So the Worker bounces the browser here, this route reads the cookie, and it
 * asks before handing back a short-lived signed assertion of who the person is.
 *
 *   fresh-start /auth/start ──▶ HERE (ask) ──▶ confirm (sign) ──grant──▶ fresh-start /auth/callback
 *
 * THIS ROUTE MINTS IDENTITY, NOT AUTHORITY. The grant says "this browser
 * belongs to alice@example.com" and confers nothing on its own; the Worker
 * exchanges it for an OAuth token bound to the client's PKCE challenge. The
 * secret here therefore cannot be used to act for anyone in Fresh Start — that is a
 * different key, held by the app, deliberately not by
 * this one.
 *
 * NO CALLER-SUPPLIED REDIRECT. There is no `redirect_uri` parameter and there
 * must never be one: the destination is configuration, so this cannot be
 * turned into an open redirect that launders a mannan.is session to somebody
 * else's host.
 *
 * A GET used to sign the grant and redirect immediately, which meant anybody
 * could start a connect flow in their own client, take the opaque `state`, and
 * send a signed-in person this URL — one click, and that person's account was
 * readable and writable by a stranger's assistant. So a GET now only asks: it
 * renders `consentResponse` naming the account and what the assistant will be
 * able to do, and the grant is signed only on the confirm POST, carrying a
 * token bound to this session that a cross-site link cannot produce.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  if (!STATE_PATTERN.test(state)) return problem(400, 'Invalid request.');

  const { secret, callback } = freshStartEnv();
  if (!secret || !callback) {
    return problem(503, 'Fresh Start is not configured on this site.');
  }

  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  if (!session) {
    // The MCP sign-in page, with `next` pointing back at THIS request. The
    // sign-in form sends `next` as its return path, so once the link is
    // clicked the callback lands here again, signed in, and the connect flow
    // resumes instead of dying at `/`.
    //
    // `next` is our own path with the Worker's already-validated state in it
    // — never a caller-chosen destination — and it is re-validated as a
    // same-origin path by the sign-in route that stores it.
    const signIn = new URL('/mcp/sign-in', url.origin);
    signIn.searchParams.set('next', `${url.pathname}?state=${encodeURIComponent(state)}`);
    return NextResponse.redirect(signIn, {
      headers: { 'cache-control': 'no-store, private', 'referrer-policy': 'no-referrer' },
    });
  }

  // Not listed: 404 BEFORE consent, so nobody outside the list ever sees
  // "Fresh Start would like to know you are ...". Logged like other denials.
  if (!(await isFreshStartAllowed(session.email))) {
    console.warn(JSON.stringify({ event: 'fresh_start_authorize_denied', email: session.email }));
    return problem(404, 'Not found.');
  }

  const id = cookieValue(cookie);
  if (!id) return signedOutRedirect(url.origin);

  const action = new URL('/api/mcp/fresh-start/authorize/confirm', url.origin);
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
