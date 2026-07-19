import { validMeetingIdentifier } from './meeting-identifier';

const MAX_RESPONSE_BYTES = 16 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{1,8192}$/u;

export type MeetingMediaGrantErrorCode =
  | 'invalid_request'
  | 'identity_required'
  | 'media_not_open'
  | 'meeting_conflict'
  | 'meeting_ended'
  | 'dependency_unavailable'
  | 'invalid_response';

const ERROR_MESSAGES: Record<MeetingMediaGrantErrorCode, string> = {
  invalid_request: 'This meeting request is invalid.',
  identity_required: 'Enter the meeting again to continue.',
  media_not_open: 'This meeting is not open yet.',
  meeting_conflict: 'The meeting changed. Refresh and try again.',
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

export interface ActivatedMeetingMediaGrant extends MeetingMediaGrant {
  meetingVersion: number;
  session: {
    sessionId: string;
    actualStartedAt: string;
    effectiveEndsAt: string;
  };
}

export interface RequestMeetingMediaGrantInput {
  meetingId: string;
  expectedVersion: number;
  idempotencyKey: string;
  fetcher?: typeof fetch;
}

const COMMAND_KEY_PATTERN = /^browser_media_[A-Za-z0-9._~-]{1,114}$/u;

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

function workerErrorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== 'object' || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}

function statusCode(status: number, value: unknown): MeetingMediaGrantErrorCode {
  if (status === 401 || status === 403 || status === 404) return 'identity_required';
  if (status === 409 && workerErrorCode(value) === 'meeting_conflict') {
    return 'meeting_conflict';
  }
  if (status === 409) return 'media_not_open';
  if (status === 410) return 'meeting_ended';
  return 'dependency_unavailable';
}

function canonicalInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function parseGrant(value: unknown): ActivatedMeetingMediaGrant {
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
    !exactKeys(data, ['provider', 'authToken', 'meetingVersion', 'session']) ||
    data.provider !== 'realtimekit' ||
    typeof data.authToken !== 'string' ||
    !TOKEN_PATTERN.test(data.authToken) ||
    !Number.isSafeInteger(data.meetingVersion) ||
    Number(data.meetingVersion) <= 0 ||
    !data.session ||
    typeof data.session !== 'object' ||
    Array.isArray(data.session)
  ) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  const session = data.session as Record<string, unknown>;
  if (
    !exactKeys(session, ['sessionId', 'actualStartedAt', 'effectiveEndsAt']) ||
    !validMeetingIdentifier(session.sessionId) ||
    !canonicalInstant(session.actualStartedAt) ||
    !canonicalInstant(session.effectiveEndsAt) ||
    Date.parse(session.actualStartedAt) >= Date.parse(session.effectiveEndsAt)
  ) {
    throw new MeetingMediaGrantError('invalid_response');
  }
  return {
    provider: 'realtimekit',
    authToken: data.authToken,
    meetingVersion: Number(data.meetingVersion),
    session: {
      sessionId: session.sessionId,
      actualStartedAt: session.actualStartedAt,
      effectiveEndsAt: session.effectiveEndsAt,
    },
  };
}

export async function requestMeetingMediaGrant(
  input: RequestMeetingMediaGrantInput,
): Promise<ActivatedMeetingMediaGrant> {
  if (
    !validMeetingIdentifier(input.meetingId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion <= 0 ||
    !COMMAND_KEY_PATTERN.test(input.idempotencyKey)
  ) {
    throw new MeetingMediaGrantError('invalid_request');
  }
  const fetcher = input.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(`/meet/${input.meetingId}/api/media-grant`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'idempotency-key': input.idempotencyKey,
        'if-match': `"${input.expectedVersion}"`,
      },
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
    });
  } catch {
    throw new MeetingMediaGrantError('dependency_unavailable');
  }
  const value = await boundedJson(response);
  if (!response.ok) {
    throw new MeetingMediaGrantError(statusCode(response.status, value));
  }
  return parseGrant(value);
}
