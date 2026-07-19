import { proxyAccountMeeting } from '@/lib/meeting-bff';
import { readSiteSession } from '@/lib/site-session';

const DIRECTORY_CURSOR_RE = /^[A-Za-z0-9_-]{1,1024}$/u;

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly cursor: string }> },
) {
  const { cursor } = await context.params;
  if (!DIRECTORY_CURSOR_RE.test(cursor)) {
    return Response.json({ error: { code: 'route_not_found' } }, { status: 404 });
  }
  if (
    new URL(request.url).search !== ''
    || request.body !== null
    || request.headers.has('if-match')
    || request.headers.has('idempotency-key')
  ) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  const session = await readSiteSession(request.headers.get('cookie'));
  if (session === null) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  return proxyAccountMeeting({
    request,
    workerPath: `/v1/account/meetings/upcoming/${cursor}`,
    accountId: session.accountId,
  });
}
