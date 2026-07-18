import { createGuestCandidateCookie, readPendingAccess } from '@/lib/meeting-cookies';
import { readMeetingJson, sameOrigin, validMeetingIdentifier } from '@/lib/meeting-bff';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ meetingId: string }> },
) {
  if (!sameOrigin(request)) {
    return Response.json({ error: { code: 'invalid_origin' } }, { status: 403 });
  }
  const { meetingId } = await context.params;
  if (!validMeetingIdentifier(meetingId)) {
    return Response.json({ error: { code: 'route_not_found' } }, { status: 404 });
  }
  if (readPendingAccess(request.headers.get('cookie'), meetingId) === null) {
    return Response.json({ error: { code: 'access_link_unavailable' } }, { status: 404 });
  }
  const body = await readMeetingJson(request);
  if (body === null || typeof body.displayName !== 'string') {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  try {
    const candidate = createGuestCandidateCookie({ meetingId, displayName: body.displayName });
    return new Response(JSON.stringify({ data: { displayName: candidate.candidate.displayName } }), {
      status: 201,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': candidate.cookie,
      },
    });
  } catch {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
}
