import { serverClockNowMs } from './meeting-room-lifecycle';

export { serverClockNowMs } from './meeting-room-lifecycle';

export type MeetingDurationSeverity =
  | 'neutral'
  | 'ten-minutes'
  | 'five-minutes'
  | 'final-minute';

export interface DurationClockInput {
  readonly serverNow: string;
  readonly receivedAtMs: number;
  readonly currentClientMs: number;
  readonly effectiveEndsAt: string;
  readonly maximumEndsAt: string;
  readonly remainingAllowanceSeconds: number;
}

export interface DurationView {
  readonly effectiveEndsAt: string;
  readonly maximumEndsAt: string;
  readonly remainingAllowanceSeconds: number;
  readonly remainingSeconds: number;
  readonly severity: MeetingDurationSeverity;
  readonly label: string;
  readonly requiresEndVerification: boolean;
}

export interface DurationExtensionOption {
  readonly requestedSeconds: 900 | 1800 | 3600;
  readonly appliedSeconds: number;
  readonly truncated: boolean;
}

export interface DurationRefreshInput {
  readonly live: boolean;
  readonly visible: boolean;
  readonly visibilityRestored: boolean;
  readonly loadInFlight: boolean;
  readonly remainingSeconds: number;
  readonly effectiveEndsAt: string;
  readonly verifiedEffectiveEndsAt?: string;
}

const OFFERED_SECONDS = [900, 1800, 3600] as const;

function invalid(): never {
  throw new Error('invalid_meeting_duration');
}

function instant(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
    ? parsed
    : null;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0;
}

function durationLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function severityFor(seconds: number): MeetingDurationSeverity {
  if (seconds > 600) return 'neutral';
  if (seconds > 300) return 'ten-minutes';
  if (seconds > 60) return 'five-minutes';
  return 'final-minute';
}

export function meetingDurationView(input: DurationClockInput): DurationView {
  const nowMs = serverClockNowMs(input);
  const serverNowMs = instant(input.serverNow);
  const effectiveEndsAtMs = instant(input.effectiveEndsAt);
  const maximumEndsAtMs = instant(input.maximumEndsAt);
  if (
    !Number.isFinite(nowMs)
    || serverNowMs === null
    || effectiveEndsAtMs === null
    || maximumEndsAtMs === null
    || maximumEndsAtMs < effectiveEndsAtMs
    || !nonNegativeSafeInteger(input.remainingAllowanceSeconds)
  ) return invalid();
  const allowanceMs = maximumEndsAtMs - effectiveEndsAtMs;
  if (
    allowanceMs % 1000 !== 0
    || allowanceMs / 1000 !== input.remainingAllowanceSeconds
  ) return invalid();
  const remainingSeconds = Math.max(
    0,
    Math.ceil((effectiveEndsAtMs - nowMs) / 1000),
  );
  return {
    effectiveEndsAt: input.effectiveEndsAt,
    maximumEndsAt: input.maximumEndsAt,
    remainingAllowanceSeconds: input.remainingAllowanceSeconds,
    remainingSeconds,
    severity: severityFor(remainingSeconds),
    label: durationLabel(remainingSeconds),
    requiresEndVerification: remainingSeconds === 0,
  };
}

export function meetingDurationExtensionOptions(
  remainingAllowanceSeconds: number,
): readonly DurationExtensionOption[] {
  if (!nonNegativeSafeInteger(remainingAllowanceSeconds)) return invalid();
  const effects = new Set<number>();
  const options: DurationExtensionOption[] = [];
  for (const requestedSeconds of OFFERED_SECONDS) {
    const appliedSeconds = Math.min(
      requestedSeconds,
      remainingAllowanceSeconds,
    );
    if (appliedSeconds === 0 || effects.has(appliedSeconds)) continue;
    effects.add(appliedSeconds);
    options.push({
      requestedSeconds,
      appliedSeconds,
      truncated: appliedSeconds < requestedSeconds,
    });
  }
  return options;
}

export function meetingDurationRefreshDecision(
  input: DurationRefreshInput,
): { readonly delayMs: number | null; readonly verifyEnd: boolean } {
  const effectiveEndsAtMs = instant(input.effectiveEndsAt);
  const verifiedEffectiveEndsAtMs = input.verifiedEffectiveEndsAt === undefined
    ? undefined
    : instant(input.verifiedEffectiveEndsAt);
  if (
    typeof input.live !== 'boolean'
    || typeof input.visible !== 'boolean'
    || typeof input.visibilityRestored !== 'boolean'
    || typeof input.loadInFlight !== 'boolean'
    || !nonNegativeSafeInteger(input.remainingSeconds)
    || effectiveEndsAtMs === null
    || verifiedEffectiveEndsAtMs === null
  ) return invalid();
  if (!input.live || !input.visible || input.loadInFlight) {
    return { delayMs: null, verifyEnd: false };
  }
  if (input.visibilityRestored) {
    return { delayMs: 0, verifyEnd: false };
  }
  if (input.remainingSeconds === 0) {
    return input.verifiedEffectiveEndsAt === input.effectiveEndsAt
      ? { delayMs: null, verifyEnd: false }
      : { delayMs: 0, verifyEnd: true };
  }
  return {
    delayMs: input.remainingSeconds <= 600 ? 5_000 : 15_000,
    verifyEnd: false,
  };
}
