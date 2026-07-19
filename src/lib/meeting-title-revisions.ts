import { validMeetingIdentifier } from './meeting-identifier';

const MAX_RESPONSE_BYTES = 64 * 1_024;
const MAX_TITLE_CODE_POINTS = 200;
const MAX_REASON_CODE_POINTS = 500;
const MAX_DISPLAY_NAME_CODE_POINTS = 100;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/u;
const IDEMPOTENCY_KEY_RE = /^browser_title_[a-f0-9]{32}$/u;

export type MeetingTitleEditPolicy = 'administrators' | 'any_participant';

export interface MeetingTitleRevision {
  readonly id: string;
  readonly meetingId: string;
  readonly previousTitle: string | null;
  readonly title: string | null;
  readonly editor: {
    readonly participantId: string;
    readonly identityKind: 'account' | 'browser_guest';
    readonly displayName?: string;
  };
  readonly reason?: string;
  readonly restoredFromRevisionId?: string;
  readonly resultingVersion: number;
  readonly createdAt: string;
}

export interface MeetingTitleRevisionPage {
  readonly revisions: readonly MeetingTitleRevision[];
  readonly nextCursor?: string;
}

export interface MeetingTitleMutationResult {
  readonly meetingId: string;
  readonly title: string | null;
  readonly titleEditPolicy: MeetingTitleEditPolicy;
  readonly revision: MeetingTitleRevision;
  readonly version: number;
}

export interface MeetingTitlePolicyResult {
  readonly meetingId: string;
  readonly title: string | null;
  readonly titleEditPolicy: MeetingTitleEditPolicy;
  readonly version: number;
}

export type MeetingTitleClientErrorCode =
  | 'invalid_request'
  | 'identity_required'
  | 'meeting_unavailable'
  | 'meeting_conflict'
  | 'title_edit_forbidden'
  | 'title_policy_forbidden'
  | 'title_unchanged'
  | 'revision_unavailable'
  | 'dependency_unavailable'
  | 'invalid_response';

export class MeetingTitleClientError extends Error {
  readonly code: MeetingTitleClientErrorCode;

  constructor(code: MeetingTitleClientErrorCode) {
    super(code);
    this.name = 'MeetingTitleClientError';
    this.code = code;
  }
}

export type MeetingTitleMutation =
  | {
      readonly kind: 'update_title';
      readonly title: string | null;
      readonly reason?: string;
    }
  | {
      readonly kind: 'update_policy';
      readonly policy: MeetingTitleEditPolicy;
    }
  | {
      readonly kind: 'restore_title';
      readonly revisionId: string;
      readonly reason?: string;
    };

export interface MeetingTitleMutationCommand {
  readonly idempotencyKey: string;
  readonly version: number;
  readonly mutation: MeetingTitleMutation;
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

function validText(value: string, maximumCodePoints: number): boolean {
  return [...value].length <= maximumCodePoints && !CONTROL_RE.test(value);
}

function normalizeTitle(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  return validText(normalized, MAX_TITLE_CODE_POINTS) ? normalized : undefined;
}

function normalizeReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && validText(normalized, MAX_REASON_CODE_POINTS)
    ? normalized
    : null;
}

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0
      && validText(normalized, MAX_DISPLAY_NAME_CODE_POINTS)
    ? normalized
    : null;
}

function validPolicy(value: unknown): value is MeetingTitleEditPolicy {
  return value === 'administrators' || value === 'any_participant';
}

function canonicalInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function positiveVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function parseEditor(value: unknown): MeetingTitleRevision['editor'] | null {
  const editor = record(value);
  if (
    editor === null
    || !exactKeys(
      editor,
      ['participantId', 'identityKind'],
      ['displayName'],
    )
    || !validMeetingIdentifier(editor.participantId)
  ) return null;
  if (editor.identityKind === 'account') {
    return Object.hasOwn(editor, 'displayName')
      ? null
      : {
          participantId: editor.participantId,
          identityKind: 'account',
        };
  }
  if (editor.identityKind !== 'browser_guest') return null;
  const displayName = normalizeDisplayName(editor.displayName);
  return displayName !== null && displayName === editor.displayName
    ? {
        participantId: editor.participantId,
        identityKind: 'browser_guest',
        displayName,
      }
    : null;
}

function parseRevision(
  value: unknown,
  expectedMeetingId: string,
): MeetingTitleRevision | null {
  const source = record(value);
  if (
    source === null
    || !exactKeys(
      source,
      [
        'id',
        'meetingId',
        'previousTitle',
        'title',
        'editor',
        'resultingVersion',
        'createdAt',
      ],
      ['reason', 'restoredFromRevisionId'],
    )
    || !validMeetingIdentifier(source.id)
    || source.meetingId !== expectedMeetingId
    || !positiveVersion(source.resultingVersion)
    || !canonicalInstant(source.createdAt)
  ) return null;
  const previousTitle = normalizeTitle(source.previousTitle);
  const title = normalizeTitle(source.title);
  const editor = parseEditor(source.editor);
  if (
    previousTitle === undefined
    || previousTitle !== source.previousTitle
    || title === undefined
    || title !== source.title
    || editor === null
  ) return null;
  const reason = Object.hasOwn(source, 'reason')
    ? normalizeReason(source.reason)
    : undefined;
  if (
    (Object.hasOwn(source, 'reason') && reason === null)
    || (typeof reason === 'string' && reason !== source.reason)
  ) return null;
  const restoredFromRevisionId = Object.hasOwn(source, 'restoredFromRevisionId')
    ? source.restoredFromRevisionId
    : undefined;
  if (
    restoredFromRevisionId !== undefined
    && !validMeetingIdentifier(restoredFromRevisionId)
  ) return null;
  return {
    id: source.id,
    meetingId: expectedMeetingId,
    previousTitle,
    title,
    editor,
    ...(typeof reason === 'string' ? { reason } : {}),
    ...(restoredFromRevisionId === undefined
      ? {}
      : { restoredFromRevisionId }),
    resultingVersion: source.resultingVersion,
    createdAt: source.createdAt,
  };
}

function parseHistoryData(
  value: unknown,
  expectedMeetingId: string,
): MeetingTitleRevisionPage | null {
  const page = record(value);
  if (
    page === null
    || !exactKeys(page, ['revisions'], ['nextCursor'])
    || !Array.isArray(page.revisions)
    || page.revisions.length > 50
  ) return null;
  const revisions: MeetingTitleRevision[] = [];
  const ids = new Set<string>();
  let previousVersion = Number.POSITIVE_INFINITY;
  for (const value of page.revisions) {
    const parsed = parseRevision(value, expectedMeetingId);
    if (
      parsed === null
      || ids.has(parsed.id)
      || parsed.resultingVersion >= previousVersion
    ) return null;
    ids.add(parsed.id);
    previousVersion = parsed.resultingVersion;
    revisions.push(parsed);
  }
  const nextCursor = Object.hasOwn(page, 'nextCursor')
    ? page.nextCursor
    : undefined;
  if (
    nextCursor !== undefined
    && (
      !validMeetingIdentifier(nextCursor)
      || revisions.length === 0
      || revisions.at(-1)?.id !== nextCursor
    )
  ) return null;
  return {
    revisions,
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

async function boundedText(response: Response): Promise<string | null> {
  const declaredHeader = response.headers.get('content-length');
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (!Number.isFinite(declared) || declared < 0 || declared > MAX_RESPONSE_BYTES) {
      return null;
    }
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
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
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
  code: string,
): MeetingTitleClientErrorCode | null {
  if (status === 400 && code === 'invalid_request') return code;
  if (status === 401 && code === 'identity_required') return code;
  if (
    status === 403
    && (code === 'title_edit_forbidden' || code === 'title_policy_forbidden')
  ) return code;
  if (
    status === 404
    && (code === 'meeting_unavailable' || code === 'revision_unavailable')
  ) return code;
  if (
    status === 409
    && (code === 'meeting_conflict' || code === 'title_unchanged')
  ) return code;
  if (status >= 500 && code === 'dependency_unavailable') return code;
  return null;
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.redirected) {
    throw new MeetingTitleClientError('invalid_response');
  }
  const text = await boundedText(response);
  if (text === null) throw new MeetingTitleClientError('invalid_response');
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new MeetingTitleClientError('invalid_response');
  }
  if (!response.ok) {
    const code = exactErrorCode(payload);
    const mapped = code === null ? null : mappedError(response.status, code);
    throw new MeetingTitleClientError(mapped ?? 'invalid_response');
  }
  return payload;
}

function responseData(value: unknown): unknown | null {
  const envelope = record(value);
  return envelope !== null && exactKeys(envelope, ['data'])
    ? envelope.data
    : null;
}

async function safeFetch(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchImpl(input, init);
  } catch {
    throw new MeetingTitleClientError('dependency_unavailable');
  }
}

function validVersionAndKey(version: number, idempotencyKey: string): boolean {
  return positiveVersion(version) && IDEMPOTENCY_KEY_RE.test(idempotencyKey);
}

function mutationInit(
  version: number,
  idempotencyKey: string,
  body: Record<string, unknown>,
): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'if-match': `"${version}"`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    redirect: 'error',
  };
}

function parsePolicyResult(
  value: unknown,
  expected: {
    readonly meetingId: string;
    readonly version: number;
    readonly policy: MeetingTitleEditPolicy;
  },
): MeetingTitlePolicyResult | null {
  const result = record(value);
  if (
    result === null
    || !exactKeys(result, [
      'meetingId',
      'title',
      'titleEditPolicy',
      'version',
    ])
    || result.meetingId !== expected.meetingId
    || result.version !== expected.version + 1
    || result.titleEditPolicy !== expected.policy
  ) return null;
  const title = normalizeTitle(result.title);
  return title !== undefined && title === result.title
    ? {
        meetingId: expected.meetingId,
        title,
        titleEditPolicy: expected.policy,
        version: result.version as number,
      }
    : null;
}

function parseMutationResult(
  value: unknown,
  expected: {
    readonly meetingId: string;
    readonly version: number;
    readonly kind: 'update' | 'restore';
    readonly title?: string | null;
    readonly reason?: string;
    readonly restoredFromRevisionId?: string;
  },
): MeetingTitleMutationResult | null {
  const result = record(value);
  if (
    result === null
    || !exactKeys(result, [
      'meetingId',
      'title',
      'titleEditPolicy',
      'revision',
      'version',
    ])
    || result.meetingId !== expected.meetingId
    || result.version !== expected.version + 1
    || !validPolicy(result.titleEditPolicy)
  ) return null;
  const title = normalizeTitle(result.title);
  const parsedRevision = parseRevision(result.revision, expected.meetingId);
  if (
    title === undefined
    || title !== result.title
    || parsedRevision === null
    || parsedRevision.title !== title
    || parsedRevision.resultingVersion !== result.version
    || (expected.title !== undefined && title !== expected.title)
    || parsedRevision.reason !== expected.reason
  ) return null;
  if (
    (expected.kind === 'update'
      && parsedRevision.restoredFromRevisionId !== undefined)
    || (expected.kind === 'restore'
      && parsedRevision.restoredFromRevisionId !== expected.restoredFromRevisionId)
  ) return null;
  return {
    meetingId: expected.meetingId,
    title,
    titleEditPolicy: result.titleEditPolicy,
    revision: parsedRevision,
    version: result.version as number,
  };
}

function requireEtag(response: Response, version: number): void {
  if (response.headers.get('etag') !== `"${version}"`) {
    throw new MeetingTitleClientError('invalid_response');
  }
}

export async function loadMeetingTitleRevisions(input: {
  readonly meetingId: string;
  readonly beforeRevisionId?: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<MeetingTitleRevisionPage> {
  if (
    !validMeetingIdentifier(input.meetingId)
    || (input.beforeRevisionId !== undefined
      && !validMeetingIdentifier(input.beforeRevisionId))
  ) throw new MeetingTitleClientError('invalid_request');
  const path = `/meet/${input.meetingId}/api/title-revisions`
    + (input.beforeRevisionId === undefined ? '' : `/${input.beforeRevisionId}`);
  const response = await safeFetch(
    input.fetchImpl ?? fetch,
    path,
    { cache: 'no-store' },
  );
  const payload = await responsePayload(response);
  const page = parseHistoryData(responseData(payload), input.meetingId);
  if (page === null) throw new MeetingTitleClientError('invalid_response');
  return page;
}

export async function updateMeetingTitle(input: {
  readonly meetingId: string;
  readonly version: number;
  readonly idempotencyKey: string;
  readonly title: string | null;
  readonly reason?: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<MeetingTitleMutationResult> {
  const title = normalizeTitle(input.title);
  const reason = input.reason === undefined ? undefined : normalizeReason(input.reason);
  if (
    !validMeetingIdentifier(input.meetingId)
    || !validVersionAndKey(input.version, input.idempotencyKey)
    || title === undefined
    || reason === null
  ) throw new MeetingTitleClientError('invalid_request');
  const body = {
    title,
    ...(reason === undefined ? {} : { reason }),
  };
  const response = await safeFetch(
    input.fetchImpl ?? fetch,
    `/meet/${input.meetingId}/api/title`,
    mutationInit(input.version, input.idempotencyKey, body),
  );
  const payload = await responsePayload(response);
  const result = parseMutationResult(responseData(payload), {
    meetingId: input.meetingId,
    version: input.version,
    kind: 'update',
    title,
    ...(reason === undefined ? {} : { reason }),
  });
  if (result === null) throw new MeetingTitleClientError('invalid_response');
  requireEtag(response, result.version);
  return result;
}

export async function updateMeetingTitlePolicy(input: {
  readonly meetingId: string;
  readonly version: number;
  readonly idempotencyKey: string;
  readonly policy: MeetingTitleEditPolicy;
  readonly fetchImpl?: typeof fetch;
}): Promise<MeetingTitlePolicyResult> {
  if (
    !validMeetingIdentifier(input.meetingId)
    || !validVersionAndKey(input.version, input.idempotencyKey)
    || !validPolicy(input.policy)
  ) throw new MeetingTitleClientError('invalid_request');
  const response = await safeFetch(
    input.fetchImpl ?? fetch,
    `/meet/${input.meetingId}/api/title-policy`,
    mutationInit(input.version, input.idempotencyKey, { policy: input.policy }),
  );
  const payload = await responsePayload(response);
  const result = parsePolicyResult(responseData(payload), input);
  if (result === null) throw new MeetingTitleClientError('invalid_response');
  requireEtag(response, result.version);
  return result;
}

export async function restoreMeetingTitle(input: {
  readonly meetingId: string;
  readonly revisionId: string;
  readonly version: number;
  readonly idempotencyKey: string;
  readonly reason?: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<MeetingTitleMutationResult> {
  const reason = input.reason === undefined ? undefined : normalizeReason(input.reason);
  if (
    !validMeetingIdentifier(input.meetingId)
    || !validMeetingIdentifier(input.revisionId)
    || !validVersionAndKey(input.version, input.idempotencyKey)
    || reason === null
  ) throw new MeetingTitleClientError('invalid_request');
  const body = reason === undefined ? {} : { reason };
  const response = await safeFetch(
    input.fetchImpl ?? fetch,
    `/meet/${input.meetingId}/api/title-revisions/${input.revisionId}/restore`,
    mutationInit(input.version, input.idempotencyKey, body),
  );
  const payload = await responsePayload(response);
  const result = parseMutationResult(responseData(payload), {
    meetingId: input.meetingId,
    version: input.version,
    kind: 'restore',
    restoredFromRevisionId: input.revisionId,
    ...(reason === undefined ? {} : { reason }),
  });
  if (result === null) throw new MeetingTitleClientError('invalid_response');
  requireEtag(response, result.version);
  return result;
}

function normalizeMutation(value: MeetingTitleMutation): MeetingTitleMutation | null {
  if (!value || typeof value !== 'object') return null;
  if (value.kind === 'update_title') {
    const title = normalizeTitle(value.title);
    const reason = value.reason === undefined ? undefined : normalizeReason(value.reason);
    return title === undefined || reason === null
      ? null
      : {
          kind: 'update_title',
          title,
          ...(reason === undefined ? {} : { reason }),
        };
  }
  if (value.kind === 'update_policy') {
    return validPolicy(value.policy)
      ? { kind: 'update_policy', policy: value.policy }
      : null;
  }
  if (value.kind === 'restore_title') {
    const reason = value.reason === undefined ? undefined : normalizeReason(value.reason);
    return validMeetingIdentifier(value.revisionId) && reason !== null
      ? {
          kind: 'restore_title',
          revisionId: value.revisionId,
          ...(reason === undefined ? {} : { reason }),
        }
      : null;
  }
  return null;
}

function sameMutation(
  left: MeetingTitleMutation,
  right: MeetingTitleMutation,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function defaultMutationKey(): string {
  return `browser_title_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
}

export class MeetingTitleMutationAttempt {
  private command: MeetingTitleMutationCommand | null = null;

  constructor(
    private readonly generateKey: () => string = defaultMutationKey,
  ) {}

  begin(
    version: number,
    mutation: MeetingTitleMutation,
  ): MeetingTitleMutationCommand {
    const normalized = normalizeMutation(mutation);
    if (!positiveVersion(version) || normalized === null) {
      throw new Error('invalid_meeting_title_mutation_attempt');
    }
    if (this.command !== null) {
      if (
        this.command.version !== version
        || !sameMutation(this.command.mutation, normalized)
      ) throw new Error('invalid_meeting_title_mutation_attempt');
      return this.command;
    }
    const idempotencyKey = this.generateKey();
    if (!IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      throw new Error('invalid_meeting_title_mutation_attempt');
    }
    const frozenMutation = Object.freeze(normalized);
    this.command = Object.freeze({
      idempotencyKey,
      version,
      mutation: frozenMutation,
    });
    return this.command;
  }

  current(): MeetingTitleMutationCommand | null {
    return this.command;
  }

  failed(): void {}

  conflict(): void {
    this.command = null;
  }

  complete(): void {
    this.command = null;
  }

  cancel(): void {
    this.command = null;
  }
}
