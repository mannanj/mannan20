import { readSiteSession } from '@/lib/site-session';
import { proxyAccountMeeting, readMeetingJson, sameOrigin } from '@/lib/meeting-bff';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: { code: 'invalid_origin' } }, { status: 403 });
  }
  const session = await readSiteSession(request.headers.get('cookie'));
  if (session === null) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const body = await readMeetingJson(request);
  if (body === null) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  return proxyAccountMeeting({
    request,
    workerPath: '/v1/meetings',
    accountId: session.accountId,
    body,
  });
}
