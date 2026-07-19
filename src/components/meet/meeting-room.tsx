'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MeetingLiveSessionError,
  startMeetingLiveSession,
} from '@/lib/meeting-live-session';
import {
  meetingRoomLifecycle,
  serverClockNowMs,
} from '@/lib/meeting-room-lifecycle';
import {
  MeetingParticipantRemovalAttempts,
  applyMeetingParticipantRemoval,
} from '@/lib/meeting-participant-moderation';
import {
  MeetingParticipantRemovalError,
  removeMeetingParticipant,
} from '@/lib/meeting-participant-removal';
import { MeetingShell } from './meeting-shell';
import { MeetingInviteLink } from './meeting-invite-link';
import { MeetingLifecyclePanel } from './meeting-lifecycle-panel';
import {
  MeetingPeople,
  type MeetingParticipantRole,
  type MeetingRosterParticipant,
} from './meeting-people';
import { MeetingPreJoin } from './meeting-prejoin';
import { MeetingStage } from './meeting-stage';
import { useLocalMeetingMedia } from './use-local-meeting-media';
import { useMeetingMediaRoom } from './use-meeting-media-room';

interface Workspace {
  meetingId: string;
  version: number;
  serverNow: string;
  title?: string;
  status: string;
  schedule: { startsAt: string; endsAt: string; durationSeconds: number };
  session?: { state: string; actualStartedAt: string; effectiveEndsAt: string };
  currentParticipant: {
    participantId: string;
    role: MeetingParticipantRole;
  };
  participants: MeetingRosterParticipant[];
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
  const [serverClock, setServerClock] = useState<{
    serverNow: string;
    receivedAtMs: number;
  } | null>(null);
  const [monotonicNowMs, setMonotonicNowMs] = useState(0);
  const [startingEarly, setStartingEarly] = useState(false);
  const [startError, setStartError] = useState<string | undefined>();
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [removalIssue, setRemovalIssue] = useState<string | null>(null);
  const removalAttempts = useRef<MeetingParticipantRemovalAttempts | null>(null);
  if (removalAttempts.current === null) {
    removalAttempts.current = new MeetingParticipantRemovalAttempts();
  }
  const participantLabel = signedInEmail ?? 'Guest';

  const lifecycle = useMemo(() => {
    if (workspace === null || serverClock === null) return null;
    return meetingRoomLifecycle({
      nowMs: serverClockNowMs({
        serverNow: serverClock.serverNow,
        receivedAtMs: serverClock.receivedAtMs,
        currentClientMs: monotonicNowMs,
      }),
      role: workspace.currentParticipant.role,
      status: workspace.status,
      schedule: workspace.schedule,
      ...(workspace.session === undefined ? {} : { session: workspace.session }),
    });
  }, [monotonicNowMs, serverClock, workspace]);
  const media = useLocalMeetingMedia(Boolean(lifecycle?.canJoinMedia));
  const room = useMeetingMediaRoom({
    meetingId,
    enabled: Boolean(lifecycle?.canJoinMedia),
    media,
  });
  const stageVisible = [
    'connected',
    'reconnecting',
    'disconnected',
    'kicked',
    'ended',
  ].includes(room.snapshot.connection);
  const connectedParticipantIds = useMemo(
    () => new Set(
      room.snapshot.participants.map((participant) => participant.firstPartyParticipantId),
    ),
    [room.snapshot.participants],
  );

  const load = useCallback(async () => {
    const response = await fetch(`/meet/${meetingId}/api/workspace`, { cache: 'no-store' }).catch(() => null);
    if (response?.ok) {
      const body = (await response.json()) as { data: Workspace };
      setWorkspace(body.data);
      const receivedAtMs = performance.now();
      setServerClock({ serverNow: body.data.serverNow, receivedAtMs });
      setMonotonicNowMs(receivedAtMs);
      return;
    }
    setState(hasAdmission ? 'entry' : 'unavailable');
  }, [hasAdmission, meetingId]);

  const removeParticipant = useCallback(async (participantId: string) => {
    if (workspace === null || removingParticipantId !== null) return;
    const attempt = removalAttempts.current!;
    const idempotencyKey = attempt.begin(participantId);
    setRemovingParticipantId(participantId);
    setRemovalIssue(null);
    try {
      const result = await removeMeetingParticipant({
        meetingId: workspace.meetingId,
        participantId,
        version: workspace.version,
        idempotencyKey,
      });
      attempt.complete(participantId);
      setWorkspace((current) =>
        current === null
          ? current
          : applyMeetingParticipantRemoval(current, participantId, result.version),
      );
    } catch (error) {
      if (
        error instanceof MeetingParticipantRemovalError
        && error.code === 'meeting_conflict'
      ) {
        attempt.cancel(participantId);
        await load();
      } else {
        attempt.failed(participantId);
        setRemovalIssue('Could not finish removing this person. Try again.');
      }
    } finally {
      setRemovingParticipantId((current) =>
        current === participantId ? null : current,
      );
    }
  }, [load, removingParticipantId, workspace]);

  const cancelParticipantRemoval = useCallback((participantId: string) => {
    if (removingParticipantId === participantId) return;
    removalAttempts.current?.cancel(participantId);
    setRemovalIssue(null);
  }, [removingParticipantId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (workspace === null) return;
    const update = () => setMonotonicNowMs(performance.now());
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [workspace]);

  const startEarly = async () => {
    if (workspace === null || !lifecycle?.canStartEarly || startingEarly) return;
    setStartingEarly(true);
    setStartError(undefined);
    try {
      const result = await startMeetingLiveSession({
        meetingId: workspace.meetingId,
        version: workspace.version,
      });
      setWorkspace((current) =>
        current === null
          ? current
          : {
              ...current,
              version: result.version,
              session: {
                state: 'live',
                actualStartedAt: result.actualStartedAt,
                effectiveEndsAt: result.effectiveEndsAt,
              },
            },
      );
    } catch (error) {
      if (
        error instanceof MeetingLiveSessionError
        && error.code === 'meeting_conflict'
      ) {
        await load();
      } else {
        setStartError('Could not start the meeting. Try again.');
      }
    } finally {
      setStartingEarly(false);
    }
  };

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

  const peoplePanel = workspace === null ? null : (
    <MeetingPeople
      participants={workspace.participants}
      currentParticipantId={workspace.currentParticipant.participantId}
      currentRole={workspace.currentParticipant.role}
      connectedParticipantIds={connectedParticipantIds}
      removingParticipantId={removingParticipantId}
      issue={removalIssue}
      onRemove={removeParticipant}
      onCancel={cancelParticipantRemoval}
    />
  );

  return (
    <MeetingShell>
      <section className="py-12 sm:py-20">
        {workspace ? (
          <div>
            <div className="flex flex-col gap-6 border-b border-white/8 pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200/55">{lifecycle?.phase === 'live' ? 'Live now' : workspace.status}</p>
                <h1 className="mt-3 font-[family-name:var(--font-caption)] text-4xl tracking-[-0.04em] sm:text-5xl">{workspace.title ?? 'Untitled meeting'}</h1>
                <p className="mt-4 text-sm text-white/45">{new Date(workspace.schedule.startsAt).toLocaleString()} · {Math.round(workspace.schedule.durationSeconds / 60)} minutes</p>
              </div>
              {lifecycle !== null &&
                lifecycle.phase !== 'ended' &&
                signedInEmail !== null &&
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
            {stageVisible ? (
              <MeetingStage
                people={peoplePanel}
                snapshot={room.snapshot}
                microphones={media.microphones}
                cameras={media.cameras}
                selectedMicrophoneId={room.selectedMicrophoneId || media.selectedMicrophoneId}
                selectedCameraId={room.selectedCameraId || media.selectedCameraId}
                onToggleMicrophone={room.toggleMicrophone}
                onToggleCamera={room.toggleCamera}
                onSelectMicrophone={room.selectMicrophone}
                onSelectCamera={room.selectCamera}
                onLeave={() => void room.leave()}
              />
            ) : (
              <div className="grid gap-5 py-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  {lifecycle === null ? (
                    <p className="py-12 text-sm text-white/45">Checking meeting time…</p>
                  ) : lifecycle.phase === 'before-start' || lifecycle.phase === 'ended' ? (
                    <MeetingLifecyclePanel
                      lifecycle={lifecycle}
                      schedule={workspace.schedule}
                      starting={startingEarly}
                      {...(startError === undefined ? {} : { errorMessage: startError })}
                      {...(lifecycle.canStartEarly
                        ? { onStartEarly: () => void startEarly() }
                        : {})}
                    />
                  ) : (
                    <MeetingPreJoin
                      participantLabel={participantLabel}
                      role={workspace.currentParticipant.role}
                      media={media}
                      joining={room.joining}
                      connectionIssue={room.snapshot.issue}
                      onJoin={() => void room.join()}
                    />
                  )}
                </div>
                <aside>{peoplePanel}</aside>
              </div>
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
