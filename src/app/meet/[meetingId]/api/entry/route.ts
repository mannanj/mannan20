import {
  clearMeetingCookies,
  createGuestCredentialCookie,
  readGuestCandidate,
  readPendingAccess,
} from '@/lib/meeting-cookies';
import {
  meetingResultResponse,
  quotedVersion,
  sameOrigin,
  validMeetingIdentifier,
} from '@/lib/meeting-bff';
import { meetingWorkerRequest } from '@/lib/meeting-worker';
import { readSiteSession } from '@/lib/site-session';

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
  const cookieHeader = request.headers.get('cookie');
  const access = readPendingAccess(cookieHeader, meetingId);
  if (access === null) {
    return Response.json({ error: { code: 'access_link_unavailable' } }, { status: 404 });
  }
  const session = await readSiteSession(cookieHeader);
  const candidate = session === null ? readGuestCandidate(cookieHeader, meetingId) : null;
  if (session === null && candidate === null) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const result = await meetingWorkerRequest<Record<string, unknown>>({
    method: 'POST',
    path: `/v1/meetings/${meetingId}/entry`,
    body: {
      secret: access.secret,
      ...(session === null && candidate !== null
        ? {
            guestCandidate: {
              participantId: candidate.participantId,
              displayName: candidate.displayName,
              identitySessionId: candidate.identitySessionId,
            },
          }
        : {}),
    },
    ...(session === null ? {} : { accountId: session.accountId }),
    idempotencyKey: request.headers.get('idempotency-key') ?? undefined,
    ifMatch: quotedVersion(request),
  });
  const response = meetingResultResponse(result);
  if (!result.ok) return response;
  for (const cookie of clearMeetingCookies(meetingId)) response.headers.append('set-cookie', cookie);
  if (session === null && candidate !== null) {
    const credential = result.data.guestCredential;
    if (typeof credential !== 'string') {
      return Response.json({ error: { code: 'dependency_unavailable' } }, { status: 503 });
    }
    response.headers.append(
      'set-cookie',
      createGuestCredentialCookie({
        meetingId,
        participantId: candidate.participantId,
        credential,
      }),
    );
  }
  return response;
}
