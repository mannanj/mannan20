import { validMeetingIdentifier } from './meeting-identifier';

const MAX_RESPONSE_BYTES = 16 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{1,8192}$/u;

export type MeetingMediaGrantErrorCode =
  | 'invalid_request'
  | 'identity_required'
  | 'media_not_open'
  | 'meeting_ended'
  | 'dependency_unavailable'
  | 'invalid_response';

const ERROR_MESSAGES: Record<MeetingMediaGrantErrorCode, string> = {
  invalid_request: 'This meeting request is invalid.',
  identity_required: 'Enter the meeting again to continue.',
  media_not_open: 'This meeting is not open yet.',
  meeting_ended: 'This meeting has ended.',
  dependency_unavailable: 'Could not connect. Try again.',
  invalid_response: 'Could not connect. Try again.',
};

export class MeetingMediaGrantError extends Error {
  readonly code: MeetingMediaGrantErrorCode;

  constructor(code: MeetingMediaGrantErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'MeetingMediaGrantError';
    this.code = code;
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

export interface MeetingMediaGrant {
  provider: 'realtimekit';
  authToken: string;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

async function boundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  const text = await response.text().catch(() => '');
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MeetingMediaGrantError('invalid_response');
  }
}

function statusCode(status: number): MeetingMediaGrantErrorCode {
  if (status === 401 || status === 403 || status === 404) return 'identity_required';
  if (status === 409) return 'media_not_open';
  if (status === 410) return 'meeting_ended';
  return 'dependency_unavailable';
}

function parseGrant(value: unknown): MeetingMediaGrant {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  const envelope = value as Record<string, unknown>;
  if (!exactKeys(envelope, ['data']) || !envelope.data ||
    typeof envelope.data !== 'object' || Array.isArray(envelope.data)) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  const data = envelope.data as Record<string, unknown>;
  if (
    !exactKeys(data, ['provider', 'authToken']) ||
    data.provider !== 'realtimekit' ||
    typeof data.authToken !== 'string' ||
    !TOKEN_PATTERN.test(data.authToken)
  ) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  return { provider: 'realtimekit', authToken: data.authToken };
}

export async function requestMeetingMediaGrant(
  meetingId: string,
  fetcher: typeof fetch = fetch,
): Promise<MeetingMediaGrant> {
  if (!validMeetingIdentifier(meetingId)) {
    throw new MeetingMediaGrantError('invalid_request');
  }
  let response: Response;
  try {
    response = await fetcher(`/meet/${meetingId}/api/media-grant`, {
      method: 'POST',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
    });
  } catch {
    throw new MeetingMediaGrantError('dependency_unavailable');
  }
  const value = await boundedJson(response);
  if (!response.ok) throw new MeetingMediaGrantError(statusCode(response.status));
  return parseGrant(value);
}
