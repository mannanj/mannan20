export interface MeetingCountdownClockInput {
  readonly serverNow: string;
  readonly receivedAtMs: number;
  readonly currentClientMs: number;
  readonly startsAt: string;
}

export interface MeetingCountdownView {
  readonly signedSeconds: number;
  readonly label: string;
  readonly accessibleLabel: string;
  readonly precise: boolean;
}

export class MeetingCountdownStateError extends Error {
  constructor() {
    super('Meeting countdown state is unavailable.');
    this.name = 'MeetingCountdownStateError';
  }
}

function instant(value: string): number {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new MeetingCountdownStateError();
  }
  return parsed.valueOf();
}

function plural(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function durationWords(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return [
    ...(hours === 0 ? [] : [plural(hours, 'hour')]),
    ...(minutes === 0 ? [] : [plural(minutes, 'minute')]),
    ...(remainder === 0 ? [] : [plural(remainder, 'second')]),
  ].join(' ');
}

function compactLabel(seconds: number): string {
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `Starts in ${totalMinutes} min`;
  return `Starts in ${hours} hr${hours === 1 ? '' : 's'}${
    minutes === 0 ? '' : ` ${minutes} min`
  }`;
}

function preciseLabel(seconds: number, negative: boolean): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  const clock = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  return negative ? `-${clock}` : clock;
}

export function meetingCountdownView(
  input: MeetingCountdownClockInput,
): MeetingCountdownView {
  if (
    !Number.isFinite(input.receivedAtMs)
    || !Number.isFinite(input.currentClientMs)
  ) {
    throw new MeetingCountdownStateError();
  }
  const serverNowMs = instant(input.serverNow);
  const startsAtMs = instant(input.startsAt);
  const currentServerMs = serverNowMs + Math.max(
    0,
    input.currentClientMs - input.receivedAtMs,
  );
  const differenceMs = startsAtMs - currentServerMs;
  const signedSeconds = differenceMs > 0
    ? Math.ceil(differenceMs / 1_000)
    : differenceMs < 0
      ? (() => {
          const elapsed = Math.floor(-differenceMs / 1_000);
          return elapsed === 0 ? 0 : -elapsed;
        })()
      : 0;
  if (signedSeconds === 0) {
    return {
      signedSeconds: 0,
      label: '00:00',
      accessibleLabel: 'Scheduled start is now',
      precise: true,
    };
  }
  if (signedSeconds > 300) {
    return {
      signedSeconds,
      label: compactLabel(signedSeconds),
      accessibleLabel: `${durationWords(signedSeconds)} until start`,
      precise: false,
    };
  }
  const absoluteSeconds = Math.abs(signedSeconds);
  return {
    signedSeconds,
    label: preciseLabel(absoluteSeconds, signedSeconds < 0),
    accessibleLabel: `${durationWords(absoluteSeconds)} ${
      signedSeconds < 0 ? 'since scheduled start' : 'until start'
    }`,
    precise: true,
  };
}
