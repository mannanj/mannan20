import { validMeetingIdentifier } from './meeting-identifier';

const IDEMPOTENCY_KEY_RE = /^browser_extend_[a-f0-9]{32}$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const OFFERED_SECONDS = new Set([900, 1800, 3600]);
const MAX_REASON_BYTES = 500;
const MAX_RESPONSE_BYTES = 16 * 1024;

export type MeetingDurationExtensionErrorCode =
  | 'invalid_request'
  | 'meeting_conflict'
  | 'extension_unavailable'
  | 'identity_required'
  | 'dependency_unavailable'
  | 'invalid_response';

export class MeetingDurationExtensionError extends Error {
  readonly code: MeetingDurationExtensionErrorCode;

  constructor(code: MeetingDurationExtensionErrorCode) {
    super(code);
    this.name = 'MeetingDurationExtensionError';
    this.code = code;
  }
}

export interface MeetingDurationExtensionResult {
  readonly extensionId: string;
  readonly sessionId: string;
  readonly requestedSeconds: number;
  readonly appliedSeconds: number;
  readonly oldEffectiveEndsAt: string;
  readonly effectiveEndsAt: string;
  readonly policyDecision: 'applied_full' | 'applied_truncated';
  readonly version: number;
}

export interface MeetingDurationExtensionCommand {
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
  readonly requestedSeconds: number;
  readonly reason: string;
}

export interface MeetingDurationExtensionBody {
  readonly requestedSeconds: number;
  readonly reason: string;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function normalizedReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  return reason.length > 0
      && !CONTROL_RE.test(reason)
      && utf8Length(reason) <= MAX_REASON_BYTES
    ? reason
    : null;
}

function validCommand(input: {
  readonly expectedVersion: number;
  readonly requestedSeconds: number;
  readonly reason: unknown;
  readonly idempotencyKey: string;
}): MeetingDurationExtensionCommand | null {
  const body = parseMeetingDurationExtensionBody({
    requestedSeconds: input.requestedSeconds,
    reason: input.reason,
  });
  if (
    !Number.isSafeInteger(input.expectedVersion)
    || input.expectedVersion < 1
    || body === null
    || !validMeetingDurationExtensionKey(input.idempotencyKey)
  ) {
    return null;
  }
  return {
    idempotencyKey: input.idempotencyKey,
    expectedVersion: input.expectedVersion,
    ...body,
  };
}

function canonicalInstant(value: unknown): value is string {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

export function validMeetingDurationExtensionKey(value: unknown): value is string {
  return typeof value === 'string' && IDEMPOTENCY_KEY_RE.test(value);
}

export function parseMeetingDurationExtensionBody(
  value: unknown,
): MeetingDurationExtensionBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const reason = normalizedReason(record.reason);
  return exactKeys(record, ['requestedSeconds', 'reason'])
      && typeof record.requestedSeconds === 'number'
      && OFFERED_SECONDS.has(record.requestedSeconds)
      && reason !== null
    ? { requestedSeconds: record.requestedSeconds, reason }
    : null;
}

function exactResult(
  value: unknown,
  command: MeetingDurationExtensionCommand,
): value is MeetingDurationExtensionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (!exactKeys(record, [
    'extensionId',
    'sessionId',
    'requestedSeconds',
    'appliedSeconds',
    'oldEffectiveEndsAt',
    'effectiveEndsAt',
    'policyDecision',
    'version',
  ])) return false;
  if (
    !validMeetingIdentifier(record.extensionId)
    || !validMeetingIdentifier(record.sessionId)
    || record.requestedSeconds !== command.requestedSeconds
    || !Number.isSafeInteger(record.appliedSeconds)
    || (record.appliedSeconds as number) < 1
    || (record.appliedSeconds as number) > command.requestedSeconds
    || !canonicalInstant(record.oldEffectiveEndsAt)
    || !canonicalInstant(record.effectiveEndsAt)
    || Date.parse(record.effectiveEndsAt) - Date.parse(record.oldEffectiveEndsAt)
      !== (record.appliedSeconds as number) * 1000
    || !Number.isSafeInteger(record.version)
    || (record.version as number) <= command.expectedVersion
  ) return false;
  const full = record.appliedSeconds === command.requestedSeconds;
  return record.policyDecision === (full ? 'applied_full' : 'applied_truncated');
}

async function boundedText(response: Response): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  const reader = response.body?.getReader();
  if (!reader) return '';
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const envelope = value as Record<string, unknown>;
  if (!exactKeys(envelope, ['error'])) return null;
  if (!envelope.error || typeof envelope.error !== 'object' || Array.isArray(envelope.error)) {
    return null;
  }
  const error = envelope.error as Record<string, unknown>;
  return exactKeys(error, ['code']) && typeof error.code === 'string'
    ? error.code
    : null;
}

function mappedError(code: string, status: number): MeetingDurationExtensionErrorCode | null {
  if (status === 409 && code === 'meeting_conflict') return 'meeting_conflict';
  if (status === 409 && code === 'session_extension_unavailable') {
    return 'extension_unavailable';
  }
  if (status === 401 && code === 'identity_required') return 'identity_required';
  if (status >= 500 && code === 'dependency_unavailable') {
    return 'dependency_unavailable';
  }
  return null;
}

export async function requestMeetingDurationExtension(input: {
  readonly meetingId: string;
  readonly expectedVersion: number;
  readonly requestedSeconds: number;
  readonly reason: string;
  readonly idempotencyKey?: string;
  readonly fetcher?: typeof fetch;
}): Promise<MeetingDurationExtensionResult> {
  const idempotencyKey = input.idempotencyKey
    ?? `browser_extend_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  const command = validCommand({
    expectedVersion: input.expectedVersion,
    requestedSeconds: input.requestedSeconds,
    reason: input.reason,
    idempotencyKey,
  });
  if (!validMeetingIdentifier(input.meetingId) || command === null) {
    throw new MeetingDurationExtensionError('invalid_request');
  }

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(
      `/meet/${input.meetingId}/api/live-session/extensions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': command.idempotencyKey,
          'if-match': `"${command.expectedVersion}"`,
        },
        body: JSON.stringify({
          requestedSeconds: command.requestedSeconds,
          reason: command.reason,
        }),
        cache: 'no-store',
        redirect: 'error',
      },
    );
  } catch {
    throw new MeetingDurationExtensionError('dependency_unavailable');
  }
  if (response.redirected) {
    throw new MeetingDurationExtensionError('invalid_response');
  }
  const text = await boundedText(response);
  if (text === null) throw new MeetingDurationExtensionError('invalid_response');
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new MeetingDurationExtensionError('invalid_response');
  }
  if (!response.ok) {
    const code = exactErrorCode(payload);
    const mapped = code === null ? null : mappedError(code, response.status);
    throw new MeetingDurationExtensionError(mapped ?? 'invalid_response');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new MeetingDurationExtensionError('invalid_response');
  }
  const envelope = payload as Record<string, unknown>;
  if (!exactKeys(envelope, ['data']) || !exactResult(envelope.data, command)) {
    throw new MeetingDurationExtensionError('invalid_response');
  }
  if (response.headers.get('etag') !== `"${envelope.data.version}"`) {
    throw new MeetingDurationExtensionError('invalid_response');
  }
  return envelope.data;
}

function sameCommand(
  left: MeetingDurationExtensionCommand,
  right: MeetingDurationExtensionCommand,
): boolean {
  return left.expectedVersion === right.expectedVersion
    && left.requestedSeconds === right.requestedSeconds
    && left.reason === right.reason;
}

export class MeetingDurationExtensionAttempt {
  private command: MeetingDurationExtensionCommand | null = null;

  constructor(
    private readonly generateKey: () => string = () =>
      `browser_extend_${globalThis.crypto.randomUUID().replaceAll('-', '')}`,
  ) {}

  begin(
    expectedVersion: number,
    requestedSeconds: number,
    reason: string,
  ): MeetingDurationExtensionCommand {
    const normalized = normalizedReason(reason);
    if (
      !Number.isSafeInteger(expectedVersion)
      || expectedVersion < 1
      || !OFFERED_SECONDS.has(requestedSeconds)
      || normalized === null
    ) {
      throw new Error('invalid_meeting_duration_extension_attempt');
    }
    const candidate = validCommand({
      expectedVersion,
      requestedSeconds,
      reason: normalized,
      idempotencyKey: this.command?.idempotencyKey ?? this.generateKey(),
    });
    if (candidate === null) {
      throw new Error('invalid_meeting_duration_extension_attempt');
    }
    if (this.command !== null) {
      if (!sameCommand(this.command, candidate)) {
        throw new Error('invalid_meeting_duration_extension_attempt');
      }
      return this.command;
    }
    this.command = Object.freeze(candidate);
    return this.command;
  }

  current(): MeetingDurationExtensionCommand | null {
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
