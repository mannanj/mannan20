'use client';

import { useState } from 'react';

export type MeetingParticipantRole = 'owner' | 'moderator' | 'participant';

export interface MeetingRosterParticipant {
  participantId: string;
  role: MeetingParticipantRole;
  identityKind: 'account' | 'browser_guest';
  displayName?: string;
}

export interface MeetingPeopleProps {
  participants: readonly MeetingRosterParticipant[];
  currentParticipantId: string;
  currentRole: MeetingParticipantRole;
  connectedParticipantIds: ReadonlySet<string>;
  removingParticipantId: string | null;
  issue: string | null;
  onRemove(participantId: string): Promise<void>;
  onCancel?(participantId: string): void;
}

function participantLabel(
  participant: MeetingRosterParticipant,
  currentParticipantId: string,
) {
  if (participant.participantId === currentParticipantId) return 'You';
  if (participant.identityKind === 'browser_guest') {
    return participant.displayName?.trim() || 'Guest';
  }
  return 'Account participant';
}

function roleLabel(role: MeetingParticipantRole) {
  if (role === 'owner') return 'Owner';
  if (role === 'moderator') return 'Moderator';
  return 'Participant';
}

export function MeetingPeople({
  participants,
  currentParticipantId,
  currentRole,
  connectedParticipantIds,
  removingParticipantId,
  issue,
  onRemove,
  onCancel,
}: MeetingPeopleProps) {
  const [confirmingParticipantId, setConfirmingParticipantId] = useState<string | null>(null);
  const canModerate = currentRole === 'owner' || currentRole === 'moderator';
  const connectedCount = participants.reduce(
    (count, participant) =>
      count + (connectedParticipantIds.has(participant.participantId) ? 1 : 0),
    0,
  );

  return (
    <section aria-label="People" className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-normal uppercase tracking-[0.14em] text-white/40">People</h2>
        <span className="rounded-full border border-emerald-200/10 bg-emerald-200/[0.04] px-2.5 py-1 text-[10px] text-emerald-100/60">
          {connectedCount} connected
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {participants.map((participant) => {
          const label = participantLabel(participant, currentParticipantId);
          const connected = connectedParticipantIds.has(participant.participantId);
          const pending = removingParticipantId === participant.participantId;
          const confirming = confirmingParticipantId === participant.participantId;
          const removable = canModerate
            && participant.participantId !== currentParticipantId
            && participant.role !== 'owner';

          return (
            <div
              key={participant.participantId}
              className="rounded-lg border border-white/8 bg-black/15 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] font-[family-name:var(--font-caption)] text-lg text-white/75"
                >
                  {label.charAt(0).toUpperCase() || 'G'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/85">{label}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
                    <span>{roleLabel(participant.role)}</span>
                    <span aria-hidden="true">·</span>
                    <span className={connected ? 'text-emerald-100/55' : undefined}>
                      {connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>
              </div>

              {removable && !confirming && (
                <div className="mt-2 flex justify-end border-t border-white/8 pt-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmingParticipantId(participant.participantId)}
                    className="min-h-11 rounded-md px-3 text-xs text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:cursor-wait disabled:text-white/30"
                  >
                    {pending ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              )}

              {removable && confirming && (
                <div className="mt-3 border-t border-white/8 pt-3">
                  <p className="text-xs leading-5 text-white/55">Remove {label} from this meeting?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onRemove(participant.participantId)}
                      className="min-h-11 rounded-md border border-red-200/15 bg-red-400/10 px-3 text-xs text-red-50/80 transition hover:bg-red-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:cursor-wait disabled:opacity-55"
                    >
                      {pending ? 'Removing…' : 'Remove from meeting'}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setConfirmingParticipantId(null);
                        onCancel?.(participant.participantId);
                      }}
                      className="min-h-11 rounded-md px-3 text-xs text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {issue && (
        <p role="status" className="mt-4 text-xs leading-5 text-amber-100/65">
          {issue}
        </p>
      )}
    </section>
  );
}
