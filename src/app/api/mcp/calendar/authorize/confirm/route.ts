import { cookieValue, readSiteSession } from '@/lib/site-session';
import { signMcpGrant } from '@/lib/mcp/grant';
import { consentToken, constantTimeEqual, grantRedirect } from '@/vendor/mcp-connector/consent';
import { STATE_PATTERN, calendarMcpEnv, problem, signedOutRedirect } from '../../shared';

export const dynamic = 'force-dynamic';

/**
 * The half that actually signs.
 *
 * Separate from the consent page (see `../route.ts`) because asking and doing
 * are different operations, and only one of them is safe to reach with a link.
 * A grant is minted only for a token this exact session produced for this
 * exact state — an HMAC a cross-site form cannot construct.
 */

export async function POST(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const presented = url.searchParams.get('consent') ?? '';

  if (!STATE_PATTERN.test(state) || !presented) return problem(400, 'Invalid request.');

  const { secret, callback } = calendarMcpEnv();
  if (!secret || !callback) {
    return problem(503, 'Calendar MCP is not configured on this site.');
  }

  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  if (!session) return signedOutRedirect(url.origin);

  const id = cookieValue(cookie);
  if (!id) return signedOutRedirect(url.origin);

  const expected = await consentToken(id, state, secret);
  if (!constantTimeEqual(presented, expected)) return problem(400, 'Invalid request.');

  const grant = await signMcpGrant({ sub: session.email, email: session.email, state }, secret);

  // 302, not NextResponse.redirect's default 307: a 307 replays this POST to
  // the Worker, which then never sees its SameSite=Lax flow cookie.
  return grantRedirect(callback, grant, state);
}
