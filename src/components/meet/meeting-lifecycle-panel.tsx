'use client';

import type { MeetingRoomLifecycle } from '@/lib/meeting-room-lifecycle';

function localDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function remainingLabel(seconds: number): string {
  if (seconds <= 300) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  const minutes = Math.ceil(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `Starts in ${minutes} min`;
  return `Starts in ${hours} hr${hours === 1 ? '' : 's'}${remainder ? ` ${remainder} min` : ''}`;
}

export function MeetingLifecyclePanel({
  lifecycle,
  schedule,
  starting = false,
  errorMessage,
  onStartEarly,
  onOpenCountdown,
  countdownPopoutIssue = false,
}: {
  lifecycle: MeetingRoomLifecycle;
  schedule: { startsAt: string; endsAt: string };
  starting?: boolean;
  errorMessage?: string;
  onStartEarly?(): void;
  onOpenCountdown?(): void;
  countdownPopoutIssue?: boolean;
}) {
  if (lifecycle.phase === 'ended') {
    return (
      <section
        aria-labelledby="meeting-lifecycle-title"
        className="mx-auto max-w-xl py-14 text-center sm:py-20"
      >
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Workspace remains available</p>
        <h2
          id="meeting-lifecycle-title"
          className="mt-4 font-[family-name:var(--font-caption)] text-5xl tracking-[-0.04em]"
        >
          Meeting ended
        </h2>
        <p className="mt-5 text-sm leading-6 text-white/45">
          Scheduled{' '}
          <time dateTime={schedule.startsAt} suppressHydrationWarning>
            {localDateTime(schedule.startsAt)}
          </time>
          {' – '}
          <time dateTime={schedule.endsAt} suppressHydrationWarning>
            {localDateTime(schedule.endsAt)}
          </time>
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/35">
          Live media is closed. Meeting notes, links, and shared work can remain here as the workspace grows.
        </p>
      </section>
    );
  }

  if (lifecycle.phase !== 'before-start') return null;

  return (
    <section
      aria-labelledby="meeting-lifecycle-title"
      className="mx-auto max-w-xl py-12 text-center sm:py-16"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/50">Upcoming</p>
      <h2
        id="meeting-lifecycle-title"
        className="mt-4 font-[family-name:var(--font-caption)] text-4xl tracking-[-0.04em] sm:text-5xl"
      >
        {lifecycle.canStartEarly
          ? 'Scheduled to start'
          : 'Live meeting has not started'}
      </h2>
      <p className="mt-5 text-sm text-white/45">
        <time dateTime={schedule.startsAt} suppressHydrationWarning>
          {localDateTime(schedule.startsAt)}
        </time>
      </p>
      <p
        aria-live="polite"
        className={`mt-7 font-[family-name:var(--font-caption)] tracking-[-0.03em] text-white/85 ${
          lifecycle.secondsUntilStart <= 300 ? 'text-5xl tabular-nums' : 'text-3xl'
        }`}
      >
        {remainingLabel(lifecycle.secondsUntilStart)}
      </p>

      {onOpenCountdown && (
        <button
          type="button"
          aria-label="Open countdown in pop-out"
          onClick={onOpenCountdown}
          className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/12 px-3.5 text-xs font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
          >
            <path d="M6 3.5H3.75a1.25 1.25 0 0 0-1.25 1.25v7.5a1.25 1.25 0 0 0 1.25 1.25h7.5a1.25 1.25 0 0 0 1.25-1.25V10" />
            <path d="M8.5 2.5h5v5M13.25 2.75 7 9" />
          </svg>
          Open countdown
        </button>
      )}

      {countdownPopoutIssue && (
        <p role="status" className="mt-3 text-xs leading-5 text-amber-50/60">
          Could not open the countdown window. Allow pop-ups and try again.
        </p>
      )}

      {lifecycle.canStartEarly && onStartEarly ? (
        <div className="mx-auto mt-9 max-w-xs">
          <button
            type="button"
            disabled={starting}
            onClick={onStartEarly}
            className="min-h-11 w-full rounded-md bg-[#f1efe8] px-4 text-sm font-medium text-[#10100e] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:cursor-wait disabled:opacity-55"
          >
            {starting ? 'Starting…' : 'Start meeting early'}
          </button>
          <p className="mt-3 text-xs leading-5 text-white/30">
            Starting early opens live media now and counts toward this meeting’s duration.
          </p>
        </div>
      ) : (
        <p className="mx-auto mt-8 max-w-sm text-sm leading-6 text-white/35">
          You can keep this page open. Device setup becomes available at the scheduled start.
        </p>
      )}

      {errorMessage && (
        <p role="status" className="mt-5 text-sm text-amber-50/65">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
