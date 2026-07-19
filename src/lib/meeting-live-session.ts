import { validMeetingIdentifier } from './meeting-identifier';

const IDEMPOTENCY_KEY_RE = /^browser_start_[A-Za-z0-9._~-]{1,114}$/u;

export type MeetingLiveSessionErrorCode =
  | 'invalid_request'
  | 'meeting_conflict'
  | 'request_failed'
  | 'invalid_response';

export class MeetingLiveSessionError extends Error {
  readonly code: MeetingLiveSessionErrorCode;

  constructor(code: MeetingLiveSessionErrorCode) {
    super(code);
    this.name = 'MeetingLiveSessionError';
    this.code = code;
  }
}

export interface MeetingLiveSessionResult {
  sessionId: string;
  actualStartedAt: string;
  effectiveEndsAt: string;
  version: number;
}

function validInstant(value: unknown): value is string {
  return (
    typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
  );
}

function exactResult(value: unknown): value is MeetingLiveSessionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 4
    && keys[0] === 'actualStartedAt'
    && keys[1] === 'effectiveEndsAt'
    && keys[2] === 'sessionId'
    && keys[3] === 'version'
    && validMeetingIdentifier(record.sessionId)
    && validInstant(record.actualStartedAt)
    && validInstant(record.effectiveEndsAt)
    && Date.parse(record.actualStartedAt) < Date.parse(record.effectiveEndsAt)
    && Number.isSafeInteger(record.version)
  );
}

export async function startMeetingLiveSession(input: {
  meetingId: string;
  version: number;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<MeetingLiveSessionResult> {
  const idempotencyKey =
    input.idempotencyKey
    ?? `browser_start_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  if (
    !validMeetingIdentifier(input.meetingId)
    || !Number.isSafeInteger(input.version)
    || input.version < 1
    || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)
  ) {
    throw new MeetingLiveSessionError('invalid_request');
  }

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      `/meet/${input.meetingId}/api/live-session`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
          'if-match': `"${input.version}"`,
        },
        body: '{}',
      },
    );
  } catch {
    throw new MeetingLiveSessionError('request_failed');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode =
      payload
      && typeof payload === 'object'
      && 'error' in payload
      && payload.error
      && typeof payload.error === 'object'
      && 'code' in payload.error
      && payload.error.code === 'meeting_conflict'
        ? 'meeting_conflict'
        : 'request_failed';
    throw new MeetingLiveSessionError(errorCode);
  }

  const data =
    payload
    && typeof payload === 'object'
    && 'data' in payload
      ? payload.data
      : null;
  if (
    !exactResult(data)
    || data.version <= input.version
  ) {
    throw new MeetingLiveSessionError('invalid_response');
  }
  return data;
}
