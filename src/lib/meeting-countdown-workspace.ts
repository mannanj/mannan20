import { validMeetingIdentifier } from './meeting-identifier';

const MAX_RESPONSE_BYTES = 64 * 1_024;
const MAX_TITLE_LENGTH = 500;
const MAX_PARTICIPANTS = 100;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;

export interface MeetingCountdownSnapshot {
  readonly meetingId: string;
  readonly title: string | null;
  readonly status: 'scheduled' | 'ended' | 'cancelled';
  readonly version: number;
  readonly serverNow: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly liveStartedAt: string | null;
}

export class MeetingCountdownLoadError extends Error {
  readonly code: 'unavailable' | 'invalid_response';
  readonly terminal: boolean;

  constructor(
    code: 'unavailable' | 'invalid_response',
    terminal = false,
  ) {
    super(code === 'unavailable'
      ? 'Meeting countdown is unavailable.'
      : 'Meeting countdown response is invalid.');
    this.name = 'MeetingCountdownLoadError';
    this.code = code;
    this.terminal = terminal;
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

function title(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'string'
      && value.length > 0
      && value.length <= MAX_TITLE_LENGTH
      && !CONTROL_RE.test(value)
    ? value
    : undefined;
}

function validRole(value: unknown): boolean {
  return value === 'owner' || value === 'moderator' || value === 'participant';
}

function validTitleEditing(value: unknown, role: unknown): boolean {
  const titleEditing = record(value);
  if (
    titleEditing === null
    || !exactKeys(
      titleEditing,
      ['policy', 'canEdit', 'canManagePolicy'],
    )
    || (titleEditing.policy !== 'administrators'
      && titleEditing.policy !== 'any_participant')
    || typeof titleEditing.canEdit !== 'boolean'
    || typeof titleEditing.canManagePolicy !== 'boolean'
  ) return false;
  const canManagePolicy = role === 'owner' || role === 'moderator';
  return titleEditing.canManagePolicy === canManagePolicy
    && titleEditing.canEdit
      === (titleEditing.policy === 'any_participant' || canManagePolicy);
}

function validParticipant(value: unknown): boolean {
  const participant = record(value);
  if (participant === null || !exactKeys(
    participant,
    ['participantId', 'role', 'identityKind'],
    ['displayName'],
  )) return false;
  if (
    !validMeetingIdentifier(participant.participantId)
    || !validRole(participant.role)
    || (participant.identityKind !== 'account'
      && participant.identityKind !== 'browser_guest')
  ) return false;
  const displayName = participant.displayName;
  if (participant.identityKind === 'account') return displayName === undefined;
  return typeof displayName === 'string'
    && displayName.length > 0
    && displayName.length <= 100
    && !CONTROL_RE.test(displayName);
}

function invalid(): never {
  throw new MeetingCountdownLoadError('invalid_response');
}

export function parseMeetingCountdownSnapshotValue(
  value: unknown,
  expectedMeetingId: string,
): MeetingCountdownSnapshot {
  const snapshot = record(value);
  if (
    !validMeetingIdentifier(expectedMeetingId)
    || snapshot === null
    || !exactKeys(snapshot, [
      'meetingId',
      'title',
      'status',
      'version',
      'serverNow',
      'startsAt',
      'endsAt',
      'liveStartedAt',
    ])
    || snapshot.meetingId !== expectedMeetingId
    || title(snapshot.title) === undefined
    || (snapshot.status !== 'scheduled'
      && snapshot.status !== 'ended'
      && snapshot.status !== 'cancelled')
    || !Number.isSafeInteger(snapshot.version)
    || (snapshot.version as number) < 1
    || !canonicalInstant(snapshot.serverNow)
    || !canonicalInstant(snapshot.startsAt)
    || !canonicalInstant(snapshot.endsAt)
    || Date.parse(snapshot.startsAt as string) >= Date.parse(snapshot.endsAt as string)
    || (snapshot.liveStartedAt !== null
      && !canonicalInstant(snapshot.liveStartedAt))
    || (snapshot.liveStartedAt !== null
      && Date.parse(snapshot.liveStartedAt as string) >= Date.parse(snapshot.endsAt as string))
    || (snapshot.status !== 'scheduled' && snapshot.liveStartedAt !== null)
  ) return invalid();
  return {
    meetingId: expectedMeetingId,
    title: snapshot.title as string | null,
    status: snapshot.status,
    version: snapshot.version as number,
    serverNow: snapshot.serverNow,
    startsAt: snapshot.startsAt,
    endsAt: snapshot.endsAt,
    liveStartedAt: snapshot.liveStartedAt as string | null,
  };
}

function workspaceSnapshot(
  value: unknown,
  expectedMeetingId: string,
  requireDurationProjection: boolean,
): MeetingCountdownSnapshot {
  const workspace = record(value);
  if (
    !validMeetingIdentifier(expectedMeetingId)
    || workspace === null
    || !exactKeys(
      workspace,
      [
        'meetingId',
        'version',
        'serverNow',
        'status',
        'schedule',
        'currentParticipant',
        'participants',
      ],
      ['title', 'session', 'duration', 'titleEditing'],
    )
    || workspace.meetingId !== expectedMeetingId
    || !Number.isSafeInteger(workspace.version)
    || (workspace.version as number) < 1
    || !canonicalInstant(workspace.serverNow)
    || title(workspace.title) === undefined
    || (workspace.status !== 'scheduled'
      && workspace.status !== 'ended'
      && workspace.status !== 'cancelled')
  ) return invalid();

  const schedule = record(workspace.schedule);
  const currentParticipant = record(workspace.currentParticipant);
  if (
    schedule === null
    || !exactKeys(schedule, ['startsAt', 'endsAt', 'durationSeconds'])
    || !canonicalInstant(schedule.startsAt)
    || !canonicalInstant(schedule.endsAt)
    || Date.parse(schedule.startsAt) >= Date.parse(schedule.endsAt)
    || !Number.isSafeInteger(schedule.durationSeconds)
    || (schedule.durationSeconds as number) < 1
    || Date.parse(schedule.endsAt) - Date.parse(schedule.startsAt)
      !== (schedule.durationSeconds as number) * 1_000
    || currentParticipant === null
    || !exactKeys(currentParticipant, ['participantId', 'role'])
    || !validMeetingIdentifier(currentParticipant.participantId)
    || !validRole(currentParticipant.role)
    || !Array.isArray(workspace.participants)
    || workspace.participants.length < 1
    || workspace.participants.length > MAX_PARTICIPANTS
    || !workspace.participants.every(validParticipant)
  ) return invalid();
  const participantIds = new Set<string>();
  let currentParticipantMatches = false;
  for (const value of workspace.participants) {
    const participant = value as Record<string, unknown>;
    const participantId = participant.participantId as string;
    if (participantIds.has(participantId)) return invalid();
    participantIds.add(participantId);
    if (
      participantId === currentParticipant.participantId
      && participant.role === currentParticipant.role
    ) currentParticipantMatches = true;
  }
  if (!currentParticipantMatches) return invalid();
  if (
    workspace.titleEditing !== undefined
    && !validTitleEditing(workspace.titleEditing, currentParticipant.role)
  ) return invalid();

  let liveStartedAt: string | null = null;
  const session = workspace.session === undefined ? null : record(workspace.session);
  if (workspace.session !== undefined && session === null) return invalid();
  if (session !== null) {
    const ended = session.state === 'ended';
    if (
      (session.state !== 'live' && !ended)
      || !exactKeys(
        session,
        ['state', 'actualStartedAt', 'effectiveEndsAt'],
        ended ? ['actualEndedAt'] : [],
      )
      || !canonicalInstant(session.actualStartedAt)
      || !canonicalInstant(session.effectiveEndsAt)
      || Date.parse(session.actualStartedAt) >= Date.parse(session.effectiveEndsAt)
      || (ended && !canonicalInstant(session.actualEndedAt))
      || (ended
        && Date.parse(session.actualEndedAt as string) < Date.parse(session.actualStartedAt))
      || (ended && workspace.status !== 'ended')
      || (!ended && workspace.status !== 'scheduled')
    ) return invalid();
    if (!ended) liveStartedAt = session.actualStartedAt;
  } else if (workspace.status === 'ended') {
    return invalid();
  }

  const duration = workspace.duration === undefined ? null : record(workspace.duration);
  if ((workspace.duration !== undefined && duration === null)
    || (requireDurationProjection
      && (session?.state === 'live') !== (duration !== null))
    || (duration !== null && session === null)) return invalid();
  if (duration !== null && (
    !exactKeys(duration, ['maximumEndsAt', 'remainingAllowanceSeconds'])
    || !canonicalInstant(duration.maximumEndsAt)
    || !Number.isSafeInteger(duration.remainingAllowanceSeconds)
    || (duration.remainingAllowanceSeconds as number) < 0
    || Date.parse(duration.maximumEndsAt) < Date.parse(session!.effectiveEndsAt as string)
  )) return invalid();

  return parseMeetingCountdownSnapshotValue({
    meetingId: expectedMeetingId,
    title: workspace.title ?? null,
    status: workspace.status,
    version: workspace.version,
    serverNow: workspace.serverNow,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    liveStartedAt,
  }, expectedMeetingId);
}

export function parseMeetingCountdownSnapshot(
  value: unknown,
  expectedMeetingId: string,
): MeetingCountdownSnapshot {
  return workspaceSnapshot(value, expectedMeetingId, true);
}

export function meetingCountdownSnapshotFromWorkspace(
  value: unknown,
  expectedMeetingId: string,
): MeetingCountdownSnapshot {
  return workspaceSnapshot(value, expectedMeetingId, false);
}

async function boundedText(response: Response): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  const reader = response.body?.getReader();
  if (reader === undefined) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
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
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function loadMeetingCountdownSnapshot(input: {
  readonly meetingId: string;
  readonly fetchImpl?: typeof fetch;
  readonly receivedAtMs?: () => number;
}): Promise<{
  readonly snapshot: MeetingCountdownSnapshot;
  readonly receivedAtMs: number;
}> {
  if (!validMeetingIdentifier(input.meetingId)) {
    throw new MeetingCountdownLoadError('invalid_response');
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`/meet/${input.meetingId}/api/workspace`, {
      cache: 'no-store',
    });
  } catch {
    throw new MeetingCountdownLoadError('unavailable');
  }
  if (!response.ok) {
    throw new MeetingCountdownLoadError(
      'unavailable',
      response.status === 401
        || response.status === 403
        || response.status === 404
        || response.status === 410,
    );
  }
  if (
    response.redirected
    || !response.headers.get('content-type')?.toLowerCase().startsWith('application/json')
  ) throw new MeetingCountdownLoadError('invalid_response');
  const text = await boundedText(response);
  if (text === null) throw new MeetingCountdownLoadError('invalid_response');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new MeetingCountdownLoadError('invalid_response');
  }
  const envelope = record(body);
  if (envelope === null || !exactKeys(envelope, ['data'])) {
    throw new MeetingCountdownLoadError('invalid_response');
  }
  const snapshot = parseMeetingCountdownSnapshot(envelope.data, input.meetingId);
  const receivedAtMs = (input.receivedAtMs ?? (() => performance.now()))();
  if (!Number.isFinite(receivedAtMs)) {
    throw new MeetingCountdownLoadError('invalid_response');
  }
  return { snapshot, receivedAtMs };
}

export function advanceMeetingCountdownSnapshot(
  snapshot: MeetingCountdownSnapshot,
  receivedAtMs: number,
  currentClientMs: number,
): MeetingCountdownSnapshot {
  const validated = parseMeetingCountdownSnapshotValue(snapshot, snapshot.meetingId);
  if (!Number.isFinite(receivedAtMs) || !Number.isFinite(currentClientMs)) {
    return invalid();
  }
  const elapsedMs = Math.max(0, currentClientMs - receivedAtMs);
  if (elapsedMs === 0) return snapshot;
  return {
    ...validated,
    serverNow: new Date(Date.parse(validated.serverNow) + elapsedMs).toISOString(),
  };
}

export function preferMeetingCountdownSnapshot(
  current: MeetingCountdownSnapshot,
  candidate: MeetingCountdownSnapshot,
): MeetingCountdownSnapshot {
  const left = parseMeetingCountdownSnapshotValue(current, current.meetingId);
  const right = parseMeetingCountdownSnapshotValue(candidate, current.meetingId);
  return right.version >= left.version
      && Date.parse(right.serverNow) >= Date.parse(left.serverNow)
    ? candidate
    : current;
}
