'use client';

import { useCallback, useEffect, useState } from 'react';
import { MeetingShell } from './meeting-shell';
import { MeetingInviteLink } from './meeting-invite-link';
import { MeetingPreJoin } from './meeting-prejoin';
import { MeetingStage } from './meeting-stage';
import { useLocalMeetingMedia } from './use-local-meeting-media';

interface Workspace {
  meetingId: string;
  version: number;
  title?: string;
  status: string;
  schedule: { startsAt: string; endsAt: string; durationSeconds: number };
  session?: { state: string; actualStartedAt: string; effectiveEndsAt: string };
  currentParticipant: { role: string };
}

export function MeetingRoom({
  meetingId,
  signedInEmail,
  hasAdmission,
  hasGuestCredential,
}: {
  meetingId: string;
  signedInEmail: string | null;
  hasAdmission: boolean;
  hasGuestCredential: boolean;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [state, setState] = useState<'loading' | 'entry' | 'working' | 'unavailable'>('loading');
  const [phase, setPhase] = useState<'prejoin' | 'joined'>('prejoin');
  const media = useLocalMeetingMedia(Boolean(workspace));
  const participantLabel = signedInEmail ?? 'Guest';

  const load = useCallback(async () => {
    const response = await fetch(`/meet/${meetingId}/api/workspace`, { cache: 'no-store' }).catch(() => null);
    if (response?.ok) {
      const body = (await response.json()) as { data: Workspace };
      setWorkspace(body.data);
      return;
    }
    setState(hasAdmission ? 'entry' : 'unavailable');
  }, [hasAdmission, meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enter = async () => {
    setState('working');
    if (!signedInEmail) {
      const candidate = await fetch(`/meet/${meetingId}/api/guest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName }),
      }).catch(() => null);
      if (!candidate?.ok) {
        setState('entry');
        return;
      }
    }
    const response = await fetch(`/meet/${meetingId}/api/entry`, {
      method: 'POST',
      headers: {
        'idempotency-key': `browser_entry_${crypto.randomUUID().replaceAll('-', '')}`,
      },
    }).catch(() => null);
    if (!response?.ok) {
      setState(response?.status === 404 ? 'unavailable' : 'entry');
      return;
    }
    setState('loading');
    await load();
  };

  return (
    <MeetingShell>
      <section className="py-12 sm:py-20">
        {workspace ? (
          <div>
            <div className="flex flex-col gap-6 border-b border-white/8 pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/55">{workspace.session?.state === 'live' ? 'Live now' : workspace.status}</p>
                <h1 className="mt-3 font-[family-name:var(--font-caption)] text-4xl tracking-[-0.04em] sm:text-5xl">{workspace.title ?? 'Untitled meeting'}</h1>
                <p className="mt-4 text-sm text-white/45">{new Date(workspace.schedule.startsAt).toLocaleString()} · {Math.round(workspace.schedule.durationSeconds / 60)} minutes</p>
              </div>
              {signedInEmail !== null &&
                (workspace.currentParticipant.role === 'owner' ||
                  workspace.currentParticipant.role === 'moderator') &&
                Number.isSafeInteger(workspace.version) && (
                  <MeetingInviteLink
                    meetingId={workspace.meetingId}
                    version={workspace.version}
                    expiresAt={workspace.schedule.endsAt}
                    onVersionChange={(version) => {
                      setWorkspace((current) =>
                        current ? { ...current, version } : current,
                      );
                    }}
                  />
                )}
            </div>
            {phase === 'prejoin' ? (
              <MeetingPreJoin
                participantLabel={participantLabel}
                role={workspace.currentParticipant.role}
                media={media}
                onJoin={() => setPhase('joined')}
              />
            ) : (
              <MeetingStage
                participantLabel={participantLabel}
                role={workspace.currentParticipant.role}
                media={media}
                onLeave={() => {
                  media.stop();
                  setPhase('prejoin');
                  void media.retry();
                }}
              />
            )}
          </div>
        ) : state === 'loading' ? (
          <p className="text-sm text-white/45">Opening meeting…</p>
        ) : state === 'entry' || state === 'working' ? (
          <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <h1 className="font-[family-name:var(--font-caption)] text-4xl tracking-[-0.035em]">Enter meeting</h1>
            {signedInEmail ? (
              <p className="mt-3 text-sm text-white/50">Continue as {signedInEmail}</p>
            ) : (
              <label className="mt-6 block text-xs text-white/55">Display name<input required maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/35" /></label>
            )}
            <button type="button" disabled={state === 'working' || (!signedInEmail && !displayName.trim())} onClick={enter} className="mt-6 w-full rounded-md bg-[#f1efe8] px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50">{state === 'working' ? 'Entering…' : 'Enter meeting'}</button>
          </div>
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="font-[family-name:var(--font-caption)] text-4xl">Meeting unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">Ask the organizer for a current private link.</p>
          </div>
        )}
        {!workspace && hasGuestCredential && state === 'unavailable' && <p className="sr-only">Guest access is no longer active.</p>}
      </section>
    </MeetingShell>
  );
}
