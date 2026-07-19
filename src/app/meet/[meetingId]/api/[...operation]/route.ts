import { clearMeetingCookies, readGuestCredential } from '@/lib/meeting-cookies';
import {
  meetingResultResponse,
  proxyAccountMeeting,
  readMeetingJson,
  sameOrigin,
  validMeetingIdentifier,
} from '@/lib/meeting-bff';
import { meetingWorkerRequest } from '@/lib/meeting-worker';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ meetingId: string; operation: string[] }>;
}

function workerPath(meetingId: string, operation: string[], method: string): string | null {
  if (operation.length === 1 && operation[0] === 'workspace' && method === 'GET') {
    return `/v1/meetings/${meetingId}/workspace`;
  }
  if (operation.length === 1 && operation[0] === 'access-links' && method === 'POST') {
    return `/v1/meetings/${meetingId}/access-links`;
  }
  if (
    operation.length === 2 &&
    operation[0] === 'access-links' &&
    validMeetingIdentifier(operation[1]) &&
    method === 'DELETE'
  ) {
    return `/v1/meetings/${meetingId}/access-links/${operation[1]}`;
  }
  if (
    operation.length === 3 &&
    operation[0] === 'access-links' &&
    validMeetingIdentifier(operation[1]) &&
    operation[2] === 'rotation' &&
    method === 'POST'
  ) {
    return `/v1/meetings/${meetingId}/access-links/${operation[1]}/rotation`;
  }
  if (operation.length === 1 && operation[0] === 'participants' && method === 'POST') {
    return `/v1/meetings/${meetingId}/participants`;
  }
  if (
    operation.length === 2 &&
    operation[0] === 'participants' &&
    validMeetingIdentifier(operation[1]) &&
    method === 'DELETE'
  ) {
    return `/v1/meetings/${meetingId}/participants/${operation[1]}`;
  }
  if (
    operation.length === 1 &&
    operation[0] === 'live-session' &&
    (method === 'POST' || method === 'DELETE')
  ) {
    return `/v1/meetings/${meetingId}/live-session`;
  }
  if (operation.length === 1 && operation[0] === 'media-grant' && method === 'POST') {
    return `/v1/meetings/${meetingId}/media-grant`;
  }
  return null;
}

async function handle(request: Request, context: Context): Promise<Response> {
  const { meetingId, operation } = await context.params;
  if (!validMeetingIdentifier(meetingId)) {
    return Response.json({ error: { code: 'route_not_found' } }, { status: 404 });
  }
  const path = workerPath(meetingId, operation, request.method);
  if (path === null) {
    return Response.json({ error: { code: 'route_not_found' } }, { status: 404 });
  }
  if (request.method !== 'GET' && !sameOrigin(request)) {
    return Response.json({ error: { code: 'invalid_origin' } }, { status: 403 });
  }
  const liveSessionEnd =
    operation.length === 1 &&
    operation[0] === 'live-session' &&
    request.method === 'DELETE';
  if (liveSessionEnd && request.body !== null) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  const mediaGrant =
    operation.length === 1 &&
    operation[0] === 'media-grant' &&
    request.method === 'POST';
  const session = await readSiteSession(request.headers.get('cookie'));
  if (session !== null) {
    const body = request.method === 'POST'
      ? mediaGrant
        ? { displayName: session.email }
        : await readMeetingJson(request)
      : undefined;
    if (request.method === 'POST' && body === null) {
      return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
    }
    return proxyAccountMeeting({
      request,
      workerPath: path,
      accountId: session.accountId,
      ...(body === undefined || body === null ? {} : { body }),
    });
  }
  const workspaceRead =
    request.method === 'GET' &&
    operation.length === 1 &&
    operation[0] === 'workspace';
  if (!workspaceRead && !mediaGrant) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const guest = readGuestCredential(request.headers.get('cookie'), meetingId);
  if (guest === null) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const result = await meetingWorkerRequest({
    method: mediaGrant ? 'POST' : 'GET',
    path,
    ...(mediaGrant ? { body: { displayName: guest.displayName } } : {}),
    guest: { participantId: guest.participantId, credential: guest.credential },
  });
  const response = meetingResultResponse(result);
  if (!result.ok && result.status === 404) {
    for (const cookie of clearMeetingCookies(meetingId)) response.headers.append('set-cookie', cookie);
  }
  return response;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
