import { validMeetingIdentifier } from './meeting-identifier';

const IDEMPOTENCY_KEY_RE = /^browser_remove_[A-Za-z0-9._~-]{1,113}$/u;
const STABLE_CODES = new Set<MeetingParticipantRemovalErrorCode>([
  'meeting_conflict',
  'owner_immutable',
  'identity_required',
  'dependency_unavailable',
]);

export type MeetingParticipantRemovalErrorCode =
  | 'invalid_request'
  | 'meeting_conflict'
  | 'owner_immutable'
  | 'identity_required'
  | 'dependency_unavailable'
  | 'request_failed'
  | 'invalid_response';

export class MeetingParticipantRemovalError extends Error {
  readonly code: MeetingParticipantRemovalErrorCode;

  constructor(code: MeetingParticipantRemovalErrorCode) {
    super(code);
    this.name = 'MeetingParticipantRemovalError';
    this.code = code;
  }
}

export interface MeetingParticipantRemovalResult {
  membershipIntervalId: string;
  version: number;
}

function exactResult(value: unknown): value is MeetingParticipantRemovalResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 2
    && keys[0] === 'membershipIntervalId'
    && keys[1] === 'version'
    && validMeetingIdentifier(record.membershipIntervalId)
    && Number.isSafeInteger(record.version)
    && (record.version as number) > 0
  );
}

export async function removeMeetingParticipant(input: {
  meetingId: string;
  participantId: string;
  version: number;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<MeetingParticipantRemovalResult> {
  const idempotencyKey = input.idempotencyKey
    ?? `browser_remove_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  if (
    !validMeetingIdentifier(input.meetingId)
    || !validMeetingIdentifier(input.participantId)
    || !Number.isSafeInteger(input.version)
    || input.version < 1
    || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)
  ) {
    throw new MeetingParticipantRemovalError('invalid_request');
  }

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      `/meet/${input.meetingId}/api/participants/${input.participantId}`,
      {
        method: 'DELETE',
        headers: {
          'idempotency-key': idempotencyKey,
          'if-match': `"${input.version}"`,
        },
      },
    );
  } catch {
    throw new MeetingParticipantRemovalError('request_failed');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const rawCode = payload && typeof payload === 'object'
      && 'error' in payload && payload.error && typeof payload.error === 'object'
      && 'code' in payload.error && typeof payload.error.code === 'string'
      ? payload.error.code
      : '';
    const code = STABLE_CODES.has(rawCode as MeetingParticipantRemovalErrorCode)
      ? rawCode as MeetingParticipantRemovalErrorCode
      : 'request_failed';
    throw new MeetingParticipantRemovalError(code);
  }
  const data = payload && typeof payload === 'object' && 'data' in payload
    ? payload.data
    : null;
  if (!exactResult(data) || data.version <= input.version) {
    throw new MeetingParticipantRemovalError('invalid_response');
  }
  return data;
}
