import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { signMcpGrant } from '@/lib/mcp/grant';

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
 * hands back a 120-second signed assertion of who the person is.
 *
 *   calendar-mcp /authorize ──▶ HERE ──grant──▶ calendar-mcp /callback
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
 */

/** Opaque, Worker-generated. Validated before it is used for anything. */
const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;

function problem(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  // Shape-checked BEFORE any session work. The state is echoed into a redirect
  // and signed into the grant, so it is validated where it enters rather than
  // trusted because it looks fine.
  if (!STATE_PATTERN.test(state)) return problem(400, 'Invalid request.');

  const secret = process.env.CALENDAR_MCP_GRANT_SECRET;
  const callback = process.env.CALENDAR_MCP_CALLBACK_URL;
  if (!secret || !callback) {
    // Unconfigured is 503, not 500: nothing is broken, the feature is simply
    // not turned on here. Checked before the session so a misconfiguration
    // cannot be mistaken for a sign-in problem.
    return problem(503, 'Calendar MCP is not configured on this site.');
  }

  const session = await readSiteSession(request.headers.get('cookie'));
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

  const grant = await signMcpGrant(
    // The address is the identity everywhere in this system: the calendar
    // scopes every row by owner_email, so `sub` and `email` are the same
    // thing and pretending otherwise would invent a second identifier that
    // nothing maps back.
    { sub: session.email, email: session.email, state },
    secret,
  );

  const destination = new URL(callback);
  destination.searchParams.set('grant', grant);
  destination.searchParams.set('state', state);

  return NextResponse.redirect(destination, {
    headers: {
      // The grant is in the URL for one hop. It must not be cached anywhere,
      // and it must not leak into a Referer header on the way.
      'cache-control': 'no-store, private',
      'referrer-policy': 'no-referrer',
    },
  });
}
