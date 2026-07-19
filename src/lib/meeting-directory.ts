const MAX_RESPONSE_BYTES = 64 * 1_024;
const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,1024}$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/u;

export interface UpcomingMeeting {
  readonly meetingId: string;
  readonly title: string | null;
  readonly status: 'scheduled' | 'live';
  readonly role: 'owner' | 'moderator' | 'participant';
  readonly startsAt: string;
  readonly endsAt: string;
  readonly durationSeconds: number;
  readonly participantCount: number;
  readonly version: number;
  readonly canonicalPath: string;
}

export interface UpcomingMeetingPage {
  readonly serverNow: string;
  readonly meetings: readonly UpcomingMeeting[];
  readonly nextCursor?: string;
}

export type MeetingDirectoryClientErrorCode =
  | 'identity_required'
  | 'invalid_request'
  | 'dependency_unavailable';

export class MeetingDirectoryClientError extends Error {
  readonly code: MeetingDirectoryClientErrorCode;

  constructor(code: MeetingDirectoryClientErrorCode) {
    super(code);
    this.name = 'MeetingDirectoryClientError';
    this.code = code;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function canonicalInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function exactTitle(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || [...value].length > 200
    || CONTROL_RE.test(value)
  ) return undefined;
  return value;
}

function parseMeeting(value: unknown): UpcomingMeeting | null {
  const source = record(value);
  if (
    source === null
    || !exactKeys(source, [
      'meetingId',
      'title',
      'status',
      'role',
      'startsAt',
      'endsAt',
      'durationSeconds',
      'participantCount',
      'version',
      'canonicalPath',
    ])
    || typeof source.meetingId !== 'string'
    || !IDENTIFIER_RE.test(source.meetingId)
    || source.canonicalPath !== `/meet/${source.meetingId}`
    || (source.status !== 'scheduled' && source.status !== 'live')
    || (
      source.role !== 'owner'
      && source.role !== 'moderator'
      && source.role !== 'participant'
    )
    || !canonicalInstant(source.startsAt)
    || !canonicalInstant(source.endsAt)
    || Date.parse(source.endsAt) <= Date.parse(source.startsAt)
    || !positiveSafeInteger(source.durationSeconds)
    || (Date.parse(source.endsAt) - Date.parse(source.startsAt)) / 1_000
      !== source.durationSeconds
    || !positiveSafeInteger(source.participantCount)
    || !positiveSafeInteger(source.version)
  ) return null;
  const title = exactTitle(source.title);
  if (title === undefined) return null;
  return {
    meetingId: source.meetingId,
    title,
    status: source.status,
    role: source.role,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    durationSeconds: source.durationSeconds,
    participantCount: source.participantCount,
    version: source.version,
    canonicalPath: source.canonicalPath as string,
  };
}

function isStrictlyAfter(
  current: UpcomingMeeting,
  previous: UpcomingMeeting,
): boolean {
  if (previous.status === 'scheduled' && current.status === 'live') return false;
  if (previous.status === 'live' || current.status === 'live') return true;
  return current.startsAt > previous.startsAt
    || (
      current.startsAt === previous.startsAt
      && current.meetingId > previous.meetingId
    );
}

function parsePage(value: unknown): UpcomingMeetingPage | null {
  const source = record(value);
  if (
    source === null
    || !exactKeys(source, ['serverNow', 'meetings'], ['nextCursor'])
    || !canonicalInstant(source.serverNow)
    || !Array.isArray(source.meetings)
    || source.meetings.length > 25
  ) return null;
  const meetings: UpcomingMeeting[] = [];
  const ids = new Set<string>();
  for (const value of source.meetings) {
    const parsed = parseMeeting(value);
    const previous = meetings.at(-1);
    if (
      parsed === null
      || ids.has(parsed.meetingId)
      || (previous !== undefined && !isStrictlyAfter(parsed, previous))
    ) return null;
    ids.add(parsed.meetingId);
    meetings.push(parsed);
  }
  const nextCursor = Object.hasOwn(source, 'nextCursor')
    ? source.nextCursor
    : undefined;
  if (
    nextCursor !== undefined
    && (
      typeof nextCursor !== 'string'
      || !CURSOR_RE.test(nextCursor)
      || meetings.length !== 25
    )
  ) return null;
  return {
    serverNow: source.serverNow,
    meetings,
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

async function boundedText(response: Response): Promise<string | null> {
  const declared = response.headers.get('content-length');
  if (declared !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/u.test(declared)) return null;
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size > MAX_RESPONSE_BYTES) return null;
  }
  const reader = response.body?.getReader();
  if (reader === undefined) return '';
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
      .decode(bytes);
  } catch {
    return null;
  }
}

function exactErrorCode(value: unknown): string | null {
  const envelope = record(value);
  if (envelope === null || !exactKeys(envelope, ['error'])) return null;
  const error = record(envelope.error);
  return error !== null
      && exactKeys(error, ['code'])
      && typeof error.code === 'string'
    ? error.code
    : null;
}

function mappedError(
  status: number,
  code: string | null,
): MeetingDirectoryClientErrorCode {
  if (status === 400 && code === 'invalid_request') return code;
  if (status === 401 && code === 'identity_required') return code;
  return 'dependency_unavailable';
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.redirected) {
    throw new MeetingDirectoryClientError('dependency_unavailable');
  }
  const text = await boundedText(response);
  if (text === null) {
    throw new MeetingDirectoryClientError('dependency_unavailable');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new MeetingDirectoryClientError('dependency_unavailable');
  }
  if (!response.ok) {
    throw new MeetingDirectoryClientError(
      mappedError(response.status, exactErrorCode(payload)),
    );
  }
  return payload;
}

function responseData(value: unknown): unknown | null {
  const envelope = record(value);
  return envelope !== null && exactKeys(envelope, ['data'])
    ? envelope.data
    : null;
}

export async function loadUpcomingMeetings(
  cursor?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpcomingMeetingPage> {
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    throw new MeetingDirectoryClientError('invalid_request');
  }
  const path = cursor === undefined
    ? '/api/meetings'
    : `/api/meetings/upcoming/${cursor}`;
  let response: Response;
  try {
    response = await fetchImpl(path, { method: 'GET', cache: 'no-store' });
  } catch {
    throw new MeetingDirectoryClientError('dependency_unavailable');
  }
  const payload = await responsePayload(response);
  const parsed = parsePage(responseData(payload));
  if (parsed === null) {
    throw new MeetingDirectoryClientError('dependency_unavailable');
  }
  return parsed;
}
