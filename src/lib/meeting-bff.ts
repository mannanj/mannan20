import { meetingWorkerRequest, type MeetingWorkerResult } from './meeting-worker';
import { validMeetingIdentifier } from './meeting-identifier';

const MAX_BODY_BYTES = 16 * 1024;
export { validMeetingIdentifier };

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
}

export async function readMeetingJson(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get('content-type') !== 'application/json') return null;
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const text = await request.text().catch(() => '');
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function quotedVersion(request: Request): number | undefined {
  const match = request.headers.get('if-match')?.match(/^"([1-9][0-9]*)"$/u);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : undefined;
}

export function meetingResultResponse(result: MeetingWorkerResult): Response {
  const headers = new Headers({
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  if (result.ok) {
    if (result.etag) headers.set('etag', result.etag);
    if (result.location) headers.set('location', result.location);
    return new Response(JSON.stringify({ data: result.data }), {
      status: result.status,
      headers,
    });
  }
  return new Response(JSON.stringify({ error: { code: result.errorCode } }), {
    status: result.status,
    headers,
  });
}

export async function proxyAccountMeeting(input: {
  request: Request;
  workerPath: string;
  accountId: string;
  body?: Record<string, unknown>;
}): Promise<Response> {
  return meetingResultResponse(
    await meetingWorkerRequest({
      method: input.request.method as 'GET' | 'POST' | 'DELETE',
      path: input.workerPath,
      accountId: input.accountId,
      ...(input.body === undefined ? {} : { body: input.body }),
      ...(input.request.method === 'GET'
        ? {}
        : {
            idempotencyKey: input.request.headers.get('idempotency-key') ?? undefined,
            ...(input.workerPath === '/v1/meetings'
              ? {}
              : { ifMatch: quotedVersion(input.request) }),
          }),
    }),
  );
}
