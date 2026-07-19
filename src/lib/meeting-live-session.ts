import { validMeetingIdentifier } from './meeting-identifier';

const IDEMPOTENCY_KEY_RE = /^browser_start_[A-Za-z0-9._~-]{1,114}$/u;
const END_KEY_RE = /^browser_end_[A-Za-z0-9._~-]{1,116}$/u;
const END_STABLE_CODES = new Set<MeetingLiveSessionErrorCode>([
  'meeting_conflict',
  'dependency_unavailable',
]);

export type MeetingLiveSessionErrorCode =
  | 'invalid_request'
  | 'meeting_conflict'
  | 'dependency_unavailable'
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

export interface MeetingLiveSessionEndResult {
  sessionId: string;
  actualEndedAt: string;
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

function exactEndResult(value: unknown): value is MeetingLiveSessionEndResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 3
    && keys[0] === 'actualEndedAt'
    && keys[1] === 'sessionId'
    && keys[2] === 'version'
    && validMeetingIdentifier(record.sessionId)
    && validInstant(record.actualEndedAt)
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

export async function endMeetingLiveSession(input: {
  meetingId: string;
  version: number;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<MeetingLiveSessionEndResult> {
  const idempotencyKey = input.idempotencyKey
    ?? `browser_end_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  if (
    !validMeetingIdentifier(input.meetingId)
    || !Number.isSafeInteger(input.version)
    || input.version < 1
    || !END_KEY_RE.test(idempotencyKey)
  ) {
    throw new MeetingLiveSessionError('invalid_request');
  }

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      `/meet/${input.meetingId}/api/live-session`,
      {
        method: 'DELETE',
        headers: {
          'idempotency-key': idempotencyKey,
          'if-match': `"${input.version}"`,
        },
      },
    );
  } catch {
    throw new MeetingLiveSessionError('request_failed');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const rawCode = payload && typeof payload === 'object'
      && 'error' in payload && payload.error && typeof payload.error === 'object'
      && 'code' in payload.error && typeof payload.error.code === 'string'
      ? payload.error.code
      : '';
    const code = END_STABLE_CODES.has(rawCode as MeetingLiveSessionErrorCode)
      ? rawCode as MeetingLiveSessionErrorCode
      : 'request_failed';
    throw new MeetingLiveSessionError(code);
  }

  const data = payload && typeof payload === 'object' && 'data' in payload
    ? payload.data
    : null;
  if (!exactEndResult(data) || data.version <= input.version) {
    throw new MeetingLiveSessionError('invalid_response');
  }
  return data;
}

export class MeetingLiveSessionEndAttempt {
  private key: string | null = null;

  constructor(
    private readonly generateKey: () => string = () =>
      `browser_end_${globalThis.crypto.randomUUID().replaceAll('-', '')}`,
  ) {}

  begin(): string {
    if (this.key === null) this.key = this.generateKey();
    return this.key;
  }

  current(): string | null {
    return this.key;
  }

  failed(): void {
    // Retain the key so a retry resolves the same durable application receipt.
  }

  complete(): void {
    this.key = null;
  }

  cancel(): void {
    this.key = null;
  }
}
