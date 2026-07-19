'use client';

import { useEffect, useRef } from 'react';
import type {
  DurationExtensionOption,
  DurationView,
  MeetingDurationSeverity,
} from '@/lib/meeting-duration';

export interface MeetingDurationModalState {
  readonly open: boolean;
  readonly selectedSeconds: 900 | 1800 | 3600 | null;
  readonly reason: string;
  readonly phase: 'idle' | 'pending' | 'failure';
  readonly feedback: 'success' | null;
}

export type MeetingDurationModalAction =
  | { readonly type: 'open' }
  | { readonly type: 'select'; readonly requestedSeconds: 900 | 1800 | 3600 }
  | { readonly type: 'reason'; readonly reason: string }
  | { readonly type: 'submit' }
  | { readonly type: 'fail' }
  | { readonly type: 'succeed' }
  | { readonly type: 'conflict' }
  | { readonly type: 'cancel' };

export const initialMeetingDurationModalState: MeetingDurationModalState =
  Object.freeze({
    open: false,
    selectedSeconds: null,
    reason: '',
    phase: 'idle',
    feedback: null,
  });

export function meetingDurationModalTransition(
  state: MeetingDurationModalState,
  action: MeetingDurationModalAction,
): MeetingDurationModalState {
  if (action.type === 'succeed') {
    return { ...initialMeetingDurationModalState, feedback: 'success' };
  }
  if (action.type === 'conflict') return initialMeetingDurationModalState;
  if (action.type === 'open') {
    return { ...initialMeetingDurationModalState, open: true };
  }
  if (state.phase === 'pending') {
    if (action.type === 'fail') return { ...state, phase: 'failure' };
    return state;
  }
  if (action.type === 'cancel') return initialMeetingDurationModalState;
  if (!state.open) return state;
  if (action.type === 'select') {
    return { ...state, selectedSeconds: action.requestedSeconds, phase: 'idle' };
  }
  if (action.type === 'reason') {
    return { ...state, reason: action.reason.slice(0, 500), phase: 'idle' };
  }
  if (action.type === 'submit') {
    return state.selectedSeconds !== null && state.reason.trim().length > 0
      ? { ...state, phase: 'pending' }
      : state;
  }
  return state;
}

const severityClasses: Record<MeetingDurationSeverity, string> = {
  neutral: 'border-white/10 bg-white/[0.025] text-white/70',
  'ten-minutes': 'border-amber-200/20 bg-amber-200/[0.035] text-amber-50/80',
  'five-minutes': 'border-amber-200/30 bg-amber-200/[0.055] text-amber-50/90',
  'final-minute': 'border-amber-300/45 bg-amber-300/[0.075] text-amber-50',
};

const thresholdCopy: Record<MeetingDurationSeverity, string> = {
  neutral: 'More than ten minutes remain.',
  'ten-minutes': 'Ten minutes or less remain.',
  'five-minutes': 'Five minutes or less remain.',
  'final-minute': 'Less than one minute remains.',
};

function plural(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function accessibleTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [
    ...(hours > 0 ? [plural(hours, 'hour')] : []),
    ...(minutes > 0 ? [plural(minutes, 'minute')] : []),
    ...(remainder > 0 || (hours === 0 && minutes === 0)
      ? [plural(remainder, 'second')]
      : []),
  ].join(' ');
}

function optionLabel(option: DurationExtensionOption): string {
  const requestedMinutes = option.requestedSeconds / 60;
  if (!option.truncated) return `${requestedMinutes} minutes`;
  return `${requestedMinutes} minutes (adds ${option.appliedSeconds / 60} minutes)`;
}

export function MeetingDurationBar({
  view,
  localizedEnd,
  connected,
  checking,
  syncIssue,
  options,
  modal,
  onOpen,
  onSelect,
  onReason,
  onSubmit,
  onCancel,
}: {
  readonly view: DurationView;
  readonly localizedEnd: string;
  readonly connected: boolean;
  readonly checking: boolean;
  readonly syncIssue: boolean;
  readonly options: readonly DurationExtensionOption[];
  readonly modal: MeetingDurationModalState;
  readonly onOpen: () => void;
  readonly onSelect: (requestedSeconds: 900 | 1800 | 3600) => void;
  readonly onReason: (reason: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modal.open) return;
    dialog.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal.phase !== 'pending') onCancel();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [modal.open, modal.phase, onCancel]);

  const canExtend = connected && options.length > 0;
  const submitDisabled =
    !connected
    || modal.phase === 'pending'
    || modal.selectedSeconds === null
    || modal.reason.trim().length === 0;
  return (
    <>
      <section
        aria-label="Meeting duration"
        className={`mt-5 rounded-lg border px-4 py-3.5 transition-colors ${severityClasses[view.severity]}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-current/55">
              Time remaining
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p
                role="timer"
                aria-label={`Time remaining ${accessibleTime(view.remainingSeconds)}`}
                className="font-[family-name:var(--font-caption)] text-2xl tabular-nums tracking-[-0.025em]"
              >
                {checking ? '—:—' : view.label}
              </p>
              <p className="text-xs text-current/55">Ends at {localizedEnd}</p>
            </div>
            {checking && (
              <p className="mt-1.5 text-xs text-current/65">Checking meeting time…</p>
            )}
          </div>
          {canExtend && (
            <button
              type="button"
              onClick={onOpen}
              className="min-h-11 shrink-0 rounded-md border border-current/15 px-3.5 text-xs font-medium text-current/80 transition hover:bg-white/[0.06] hover:text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b36d]"
            >
              Extend meeting
            </button>
          )}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {thresholdCopy[view.severity]}
        </p>
        {syncIssue && (
          <p role="status" className="mt-2 text-xs leading-5 text-amber-100/70">
            Meeting time could not be synchronized. Try again.
          </p>
        )}
        {modal.feedback === 'success' && (
          <p role="status" className="mt-2 text-xs leading-5 text-emerald-100/70">
            Meeting time extended.
          </p>
        )}
      </section>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-duration-dialog-title"
            aria-describedby="meeting-duration-dialog-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-xl border border-white/12 bg-[#11110f] p-5 text-[#f1efe8] shadow-2xl shadow-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b36d] sm:p-6"
          >
            <h2
              id="meeting-duration-dialog-title"
              className="font-[family-name:var(--font-caption)] text-3xl tracking-[-0.03em]"
            >
              Extend this meeting
            </h2>
            <p
              id="meeting-duration-dialog-description"
              className="mt-2 text-sm leading-6 text-white/50"
            >
              Choose the time you need and leave a short reason for the meeting record.
            </p>

            <fieldset className="mt-5" disabled={modal.phase === 'pending'}>
              <legend className="text-xs font-medium uppercase tracking-[0.13em] text-white/45">
                Add time
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {options.map((option) => (
                  <label
                    key={option.requestedSeconds}
                    className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-white/10 px-3 text-center text-xs text-white/70 transition has-[:checked]:border-amber-200/45 has-[:checked]:bg-amber-200/[0.08] has-[:checked]:text-amber-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#e0b36d]"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="meeting-duration-extension"
                      value={option.requestedSeconds}
                      checked={modal.selectedSeconds === option.requestedSeconds}
                      onChange={() => onSelect(option.requestedSeconds)}
                    />
                    {optionLabel(option)}
                  </label>
                ))}
              </div>
            </fieldset>

            <label
              htmlFor="meeting-duration-reason"
              className="mt-5 block text-xs font-medium uppercase tracking-[0.13em] text-white/45"
            >
              Reason
            </label>
            <textarea
              id="meeting-duration-reason"
              required
              maxLength={500}
              rows={3}
              disabled={modal.phase === 'pending'}
              value={modal.reason}
              onChange={(event) => onReason(event.target.value)}
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-amber-200/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b36d] disabled:cursor-wait disabled:opacity-60"
              placeholder="What needs more time?"
            />
            {modal.phase === 'failure' && (
              <p role="status" className="mt-2 text-xs leading-5 text-amber-100/70">
                Could not extend the meeting. Try again.
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={modal.phase === 'pending'}
                onClick={onCancel}
                className="min-h-11 rounded-md px-4 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b36d] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitDisabled}
                onClick={onSubmit}
                className="min-h-11 rounded-md bg-[#f1efe8] px-4 text-sm font-medium text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b36d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {modal.phase === 'pending' ? 'Extending…' : 'Extend and continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
