import { cookieValue, readSiteSession } from '@/lib/site-session';
import { signMcpGrant } from '@/lib/mcp/grant';
import { consentToken, constantTimeEqual, grantRedirect } from '@/vendor/mcp-connector/consent';
import {
  STATE_PATTERN,
  uploadsMcpEnv,
  problem,
  signedOutRedirect,
} from '../../shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const presented = url.searchParams.get('consent') ?? '';

  if (!STATE_PATTERN.test(state) || !presented) return problem(400, 'Invalid request.');

  const { secret, callback } = uploadsMcpEnv();
  if (!secret || !callback) {
    return problem(503, 'Upload MCP is not configured on this site.');
  }

  const cookie = request.headers.get('cookie');
  const session = await readSiteSession(cookie);
  if (!session) return signedOutRedirect(url.origin);

  // Any account may connect; what it gets is decided by the MCP Worker per email.
  const id = cookieValue(cookie);
  if (!id) return signedOutRedirect(url.origin);

  const expected = await consentToken(id, state, secret);
  if (!constantTimeEqual(presented, expected)) return problem(400, 'Invalid request.');

  const grant = await signMcpGrant({ sub: session.email, email: session.email, state }, secret);
  return grantRedirect(callback, grant, state);
}
