import { clearMeetingCookies, readGuestCredential } from '@/lib/meeting-cookies';
import {
  parseMeetingDurationExtensionBody,
  validMeetingDurationExtensionKey,
  type MeetingDurationExtensionBody,
} from '@/lib/meeting-duration-extension';
import {
  meetingResultResponse,
  proxyAccountMeeting,
  quotedVersion,
  readMeetingJson,
  sameOrigin,
  validMeetingIdentifier,
} from '@/lib/meeting-bff';
import { meetingWorkerRequest } from '@/lib/meeting-worker';
import { readSiteSession } from '@/lib/site-session';

export const dynamic = 'force-dynamic';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/u;

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
  if (
    operation.length === 2 &&
    operation[0] === 'live-session' &&
    operation[1] === 'extensions' &&
    method === 'POST'
  ) {
    return `/v1/meetings/${meetingId}/live-session/extensions`;
  }
  if (operation.length === 1 && operation[0] === 'media-grant' && method === 'POST') {
    return `/v1/meetings/${meetingId}/media-grant`;
  }
  if (operation.length === 1 && operation[0] === 'title' && method === 'POST') {
    return `/v1/meetings/${meetingId}/title`;
  }
  if (operation.length === 1 && operation[0] === 'title-policy' && method === 'POST') {
    return `/v1/meetings/${meetingId}/title-policy`;
  }
  if (
    operation.length === 3
    && operation[0] === 'title-revisions'
    && validMeetingIdentifier(operation[1])
    && operation[2] === 'restore'
    && method === 'POST'
  ) {
    return `/v1/meetings/${meetingId}/title-revisions/${operation[1]}/restore`;
  }
  if (
    operation.length === 1
    && operation[0] === 'title-revisions'
    && method === 'GET'
  ) {
    return `/v1/meetings/${meetingId}/title-revisions`;
  }
  if (
    operation.length === 2
    && operation[0] === 'title-revisions'
    && validMeetingIdentifier(operation[1])
    && method === 'GET'
  ) {
    return `/v1/meetings/${meetingId}/title-revisions/${operation[1]}`;
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
  const titleMutation =
    request.method === 'POST'
    && (
      (operation.length === 1
        && (operation[0] === 'title' || operation[0] === 'title-policy'))
      || (operation.length === 3
        && operation[0] === 'title-revisions'
        && operation[2] === 'restore')
    );
  const titleHistoryRead =
    request.method === 'GET'
    && operation[0] === 'title-revisions'
    && (operation.length === 1 || operation.length === 2);
  if (
    (titleMutation || titleHistoryRead)
    && new URL(request.url).search !== ''
  ) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  if (request.method !== 'GET' && !sameOrigin(request)) {
    return Response.json({ error: { code: 'invalid_origin' } }, { status: 403 });
  }
  if (
    titleHistoryRead
    && (
      request.body !== null
      || request.headers.has('if-match')
      || request.headers.has('idempotency-key')
    )
  ) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
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
  const durationExtension =
    operation.length === 2
    && operation[0] === 'live-session'
    && operation[1] === 'extensions'
    && request.method === 'POST';
  const mediaExpectedVersion = mediaGrant ? quotedVersion(request) : undefined;
  const mediaIdempotencyKey = mediaGrant
    ? request.headers.get('idempotency-key') ?? undefined
    : undefined;
  if (
    mediaGrant &&
    (
      mediaExpectedVersion === undefined ||
      mediaIdempotencyKey === undefined ||
      !IDEMPOTENCY_KEY_PATTERN.test(mediaIdempotencyKey)
    )
  ) {
    return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
  }
  let durationBody: MeetingDurationExtensionBody | null = null;
  const durationExpectedVersion = durationExtension ? quotedVersion(request) : undefined;
  const durationIdempotencyKey = durationExtension
    ? request.headers.get('idempotency-key')
    : null;
  if (durationExtension) {
    durationBody = parseMeetingDurationExtensionBody(await readMeetingJson(request));
    if (
      durationExpectedVersion === undefined
      || !validMeetingDurationExtensionKey(durationIdempotencyKey)
      || durationBody === null
    ) {
      return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
    }
  }
  let titleBody: Record<string, unknown> | null = null;
  const titleExpectedVersion = titleMutation ? quotedVersion(request) : undefined;
  const titleIdempotencyKey = titleMutation
    ? request.headers.get('idempotency-key')
    : null;
  if (titleMutation) {
    titleBody = await readMeetingJson(request);
    if (
      titleExpectedVersion === undefined
      || titleIdempotencyKey === null
      || !IDEMPOTENCY_KEY_PATTERN.test(titleIdempotencyKey)
      || titleBody === null
    ) {
      return Response.json({ error: { code: 'invalid_request' } }, { status: 400 });
    }
  }
  const session = await readSiteSession(request.headers.get('cookie'));
  if (session !== null) {
    const body = request.method === 'POST'
      ? mediaGrant
        ? { displayName: session.email }
        : durationExtension
          ? { ...durationBody }
          : titleMutation
            ? titleBody
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
  if (
    !workspaceRead
    && !mediaGrant
    && !durationExtension
    && !titleMutation
    && !titleHistoryRead
  ) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const guest = readGuestCredential(request.headers.get('cookie'), meetingId);
  if (guest === null) {
    return Response.json({ error: { code: 'identity_required' } }, { status: 401 });
  }
  const result = await meetingWorkerRequest({
    method: mediaGrant || durationExtension || titleMutation ? 'POST' : 'GET',
    path,
    ...(mediaGrant
      ? { body: { displayName: guest.displayName } }
      : durationExtension && durationBody !== null
        ? { body: durationBody }
        : titleMutation && titleBody !== null
          ? { body: titleBody }
        : {}),
    ...(mediaGrant || durationExtension || titleMutation
      ? {
          idempotencyKey: mediaGrant
            ? mediaIdempotencyKey
            : durationExtension
              ? durationIdempotencyKey ?? undefined
              : titleIdempotencyKey ?? undefined,
          ifMatch: mediaGrant
            ? mediaExpectedVersion
            : durationExtension
              ? durationExpectedVersion
              : titleExpectedVersion,
        }
      : {}),
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
