'use client';

import { useState } from 'react';
import type { MeetingParticipantRole } from './meeting-people';

export function MeetingEndControl({
  role,
  phase,
  pending,
  issue,
  onEnd,
  onCancel,
}: {
  role: MeetingParticipantRole;
  phase: 'before-start' | 'open' | 'live' | 'ended';
  pending: boolean;
  issue: boolean;
  onEnd(): void;
  onCancel(): void;
}) {
  const [confirming, setConfirming] = useState(false);
  if ((role !== 'owner' && role !== 'moderator') || phase !== 'live') return null;

  const showConfirmation = confirming || pending || issue;
  return (
    <section
      aria-label="End meeting"
      className="rounded-xl border border-red-200/10 bg-red-300/[0.025] p-4"
    >
      {showConfirmation ? (
        <div>
          <p className="text-sm leading-6 text-white/70">
            End the live meeting for everyone?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onEnd}
              className="min-h-11 rounded-md border border-red-200/15 bg-red-400/10 px-3.5 text-xs text-red-50/80 transition hover:bg-red-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:cursor-wait disabled:opacity-55"
            >
              {pending ? 'Ending…' : 'End for everyone'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                onCancel();
              }}
              className="min-h-11 rounded-md px-3.5 text-xs text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
          {issue && (
            <p role="status" className="mt-3 text-xs leading-5 text-amber-100/65">
              Could not finish ending the meeting. Try again.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 w-full rounded-md border border-red-200/10 px-3.5 text-xs text-red-50/55 transition hover:border-red-200/20 hover:bg-red-400/[0.08] hover:text-red-50/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
        >
          End meeting
        </button>
      )}
    </section>
  );
}
