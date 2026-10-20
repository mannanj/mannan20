import { NextResponse } from 'next/server';
import { cookieValue, readSiteSession } from '@/lib/site-session';
import { consentResponse, consentToken } from '@/vendor/mcp-connector/consent';
import {
  CONSENT_ABILITIES,
  CONSENT_APP_NAME,
  CONSENT_CAPABILITIES_PATH,
  CONSENT_SITE_URL,
  STATE_PATTERN,
  MEMBER_ABILITIES,
  MEMBER_APP_NAME,
  MEMBER_SITE_URL,
  uploadsMcpEnv,
  OWNER_EMAIL,
  problem,
  signedOutRedirect,
} from '../shared';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';

  if (!STATE_PATTERN.test(state)) return problem(400, 'Invalid request.');

  const { secret, callback } = uploadsMcpEnv();
  if (!secret || !callback) {
    return problem(503, 'Upload MCP is not configured on this site.');
  }

  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  if (!session) {
    const signIn = new URL('/mcp/sign-in', url.origin);
    signIn.searchParams.set('next', `${url.pathname}?state=${encodeURIComponent(state)}`);
    return NextResponse.redirect(signIn, {
      headers: { 'cache-control': 'no-store, private', 'referrer-policy': 'no-referrer' },
    });
  }

  const owner = session.email.toLowerCase() === OWNER_EMAIL;

  const id = cookieValue(cookie);
  if (!id) return signedOutRedirect(url.origin);

  const action = new URL('/api/mcp/uploads/authorize/confirm', url.origin);
  action.searchParams.set('state', state);
  action.searchParams.set('consent', await consentToken(id, state, secret));

  return consentResponse({
    appName: owner ? CONSENT_APP_NAME : MEMBER_APP_NAME,
    siteUrl: owner ? CONSENT_SITE_URL : MEMBER_SITE_URL,
    account: session.email,
    abilities: owner ? CONSENT_ABILITIES : MEMBER_ABILITIES,
    action: action.pathname + action.search,
    capabilitiesPath: CONSENT_CAPABILITIES_PATH,
  });
}
