import { validMeetingIdentifier } from './meeting-identifier';

const SECRET_RE = /^[A-Za-z0-9_-]{16,256}$/u;

export interface MeetingInviteResult {
  accessLinkId: string;
  shareUrl: string;
  expiresAt?: string;
  version: number;
}

function validInstant(value: unknown): value is string {
  return (
    typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
  );
}

function invalidResponse(): never {
  throw new Error('Invalid invite response');
}

export async function createMeetingInvite(input: {
  meetingId: string;
  version: number;
  expiresAt: string;
  origin: string;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<MeetingInviteResult> {
  if (
    !validMeetingIdentifier(input.meetingId)
    || !Number.isSafeInteger(input.version)
    || input.version < 1
    || !validInstant(input.expiresAt)
  ) {
    throw new Error('Invalid invite request');
  }

  const origin = new URL(input.origin);
  if (
    (origin.protocol !== 'https:' && origin.protocol !== 'http:')
    || origin.username
    || origin.password
  ) {
    throw new Error('Invalid invite request');
  }

  const response = await (input.fetcher ?? fetch)(
    `/meet/${input.meetingId}/api/access-links`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key':
          input.idempotencyKey
          ?? `browser_invite_${globalThis.crypto.randomUUID().replaceAll('-', '')}`,
        'if-match': `"${input.version}"`,
      },
      body: JSON.stringify({ expiresAt: input.expiresAt }),
    },
  );
  if (!response.ok) throw new Error('Invite request failed');

  const payload: unknown = await response.json().catch(() => null);
  const data =
    payload
    && typeof payload === 'object'
    && 'data' in payload
    && payload.data
    && typeof payload.data === 'object'
      ? payload.data as Record<string, unknown>
      : null;
  if (
    data === null
    || !validMeetingIdentifier(data.accessLinkId)
    || typeof data.secret !== 'string'
    || !SECRET_RE.test(data.secret)
    || !Number.isSafeInteger(data.version)
    || (data.version as number) <= input.version
    || (data.expiresAt !== undefined && !validInstant(data.expiresAt))
  ) {
    invalidResponse();
  }

  return {
    accessLinkId: data.accessLinkId,
    shareUrl: new URL(
      `/meet/j/${encodeURIComponent(data.secret as string)}`,
      origin.origin,
    ).toString(),
    ...(data.expiresAt === undefined ? {} : { expiresAt: data.expiresAt as string }),
    version: data.version as number,
  };
}
