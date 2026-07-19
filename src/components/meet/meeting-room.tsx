'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  meetingDurationExtensionOptions,
  meetingDurationRefreshDecision,
  meetingDurationView,
} from '@/lib/meeting-duration';
import {
  MeetingDurationExtensionAttempt,
  MeetingDurationExtensionError,
  requestMeetingDurationExtension,
} from '@/lib/meeting-duration-extension';
import { meetingCountdownSnapshotFromWorkspace } from '@/lib/meeting-countdown-workspace';
import { openMeetingCountdownPopout } from '@/lib/meeting-countdown-window';
import {
  MeetingLiveSessionEndAttempt,
  MeetingLiveSessionError,
  endMeetingLiveSession,
  startMeetingLiveSession,
} from '@/lib/meeting-live-session';
import {
  meetingRoomLifecycle,
  serverClockNowMs,
} from '@/lib/meeting-room-lifecycle';
import { meetingWorkspaceRefreshDecision } from '@/lib/meeting-workspace-refresh';
import {
  MeetingParticipantRemovalAttempts,
  applyMeetingParticipantRemoval,
} from '@/lib/meeting-participant-moderation';
import {
  MeetingParticipantRemovalError,
  removeMeetingParticipant,
} from '@/lib/meeting-participant-removal';
import { MeetingShell } from './meeting-shell';
import { MeetingEndControl } from './meeting-end-control';
import {
  MeetingDurationBar,
  initialMeetingDurationModalState,
  meetingDurationModalTransition,
} from './meeting-duration-bar';
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
import { useMeetingCountdownMainChannel } from './use-meeting-countdown-main-channel';
import {
  meetingConnectedRefreshDecision,
  useMeetingMediaRoom,
} from './use-meeting-media-room';

interface Workspace {
  meetingId: string;
  version: number;
  serverNow: string;
  title?: string;
  status: string;
  schedule: { startsAt: string; endsAt: string; durationSeconds: number };
  session?: {
    state: string;
    actualStartedAt: string;
    effectiveEndsAt: string;
    actualEndedAt?: string;
  };
  duration?: {
    maximumEndsAt: string;
    remainingAllowanceSeconds: number;
  };
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
  const [countdownPopoutIssue, setCountdownPopoutIssue] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [removalIssue, setRemovalIssue] = useState<string | null>(null);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const [endIssue, setEndIssue] = useState(false);
  const [durationSyncIssue, setDurationSyncIssue] = useState(false);
  const [checkingDuration, setCheckingDuration] = useState(false);
  const [workspaceLoadEpoch, setWorkspaceLoadEpoch] = useState(0);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [visibilityRestored, setVisibilityRestored] = useState(false);
  const [durationModal, dispatchDurationModal] = useReducer(
    meetingDurationModalTransition,
    initialMeetingDurationModalState,
  );
  const connectedRefreshVersion = useRef<number | null>(null);
  const workspaceLoad = useRef<Promise<Workspace | null> | null>(null);
  const activeMeetingId = useRef(meetingId);
  activeMeetingId.current = meetingId;
  const verifiedEffectiveEnd = useRef<string | null>(null);
  const zeroVerificationInFlight = useRef(false);
  const durationAttempt = useRef<MeetingDurationExtensionAttempt | null>(null);
  if (durationAttempt.current === null) {
    durationAttempt.current = new MeetingDurationExtensionAttempt();
  }
  const endAttempt = useRef<MeetingLiveSessionEndAttempt | null>(null);
  if (endAttempt.current === null) {
    endAttempt.current = new MeetingLiveSessionEndAttempt();
  }
  const removalAttempts = useRef<MeetingParticipantRemovalAttempts | null>(null);
  if (removalAttempts.current === null) {
    removalAttempts.current = new MeetingParticipantRemovalAttempts();
  }
  const participantLabel = signedInEmail ?? 'Guest';

  const countdownSnapshot = useMemo(() => {
    if (workspace === null) return null;
    try {
      return meetingCountdownSnapshotFromWorkspace(workspace, meetingId);
    } catch {
      return null;
    }
  }, [meetingId, workspace]);
  useMeetingCountdownMainChannel({
    meetingId,
    snapshot: countdownSnapshot,
    receivedAtMs: serverClock?.receivedAtMs ?? null,
    currentClientMs: monotonicNowMs,
  });

  const clockNowMs = useMemo(() => {
    if (serverClock === null) return Number.NaN;
    return serverClockNowMs({
      serverNow: serverClock.serverNow,
      receivedAtMs: serverClock.receivedAtMs,
      currentClientMs: monotonicNowMs,
    });
  }, [monotonicNowMs, serverClock]);
  const durationView = useMemo(() => {
    if (
      workspace?.session?.state !== 'live'
      || workspace.duration === undefined
      || serverClock === null
    ) return null;
    try {
      return meetingDurationView({
        serverNow: serverClock.serverNow,
        receivedAtMs: serverClock.receivedAtMs,
        currentClientMs: monotonicNowMs,
        effectiveEndsAt: workspace.session.effectiveEndsAt,
        maximumEndsAt: workspace.duration.maximumEndsAt,
        remainingAllowanceSeconds: workspace.duration.remainingAllowanceSeconds,
      });
    } catch {
      return null;
    }
  }, [monotonicNowMs, serverClock, workspace]);
  const durationOptions = useMemo(
    () => durationView === null
      ? []
      : meetingDurationExtensionOptions(durationView.remainingAllowanceSeconds),
    [durationView],
  );
  const durationProjectionInvalid =
    workspace?.session?.state === 'live'
    && workspace.duration !== undefined
    && serverClock !== null
    && durationView === null;
  const lifecycle = useMemo(() => {
    if (workspace === null || !Number.isFinite(clockNowMs)) return null;
    const holdLiveAtZero =
      workspace.session?.state === 'live'
      && durationView?.remainingSeconds === 0
      && verifiedEffectiveEnd.current !== workspace.session.effectiveEndsAt;
    return meetingRoomLifecycle({
      nowMs: holdLiveAtZero
        ? Date.parse(workspace.session!.effectiveEndsAt) - 1
        : clockNowMs,
      role: workspace.currentParticipant.role,
      status: workspace.status,
      schedule: workspace.schedule,
      ...(workspace.session === undefined ? {} : { session: workspace.session }),
    });
  }, [checkingDuration, clockNowMs, durationView, workspace]);
  const media = useLocalMeetingMedia(Boolean(lifecycle?.canJoinMedia));

  const load = useCallback((mode: 'initial' | 'refresh' = 'refresh') => {
    if (workspaceLoad.current !== null) return workspaceLoad.current;
    const request = (async (): Promise<Workspace | null> => {
      try {
        const response = await fetch(`/meet/${meetingId}/api/workspace`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('workspace_load_failed');
        const body = (await response.json()) as { data: Workspace };
        if (activeMeetingId.current !== meetingId) return null;
        setWorkspace(body.data);
        const receivedAtMs = performance.now();
        setServerClock({ serverNow: body.data.serverNow, receivedAtMs });
        setMonotonicNowMs(receivedAtMs);
        setDurationSyncIssue(false);
        return body.data;
      } catch {
        if (activeMeetingId.current !== meetingId) return null;
        if (mode === 'refresh') {
          setDurationSyncIssue(true);
        } else {
          setState(hasAdmission ? 'entry' : 'unavailable');
        }
        return null;
      }
    })();
    workspaceLoad.current = request;
    void request.finally(() => {
      if (workspaceLoad.current === request) workspaceLoad.current = null;
      if (activeMeetingId.current === meetingId) {
        setWorkspaceLoadEpoch((current) => current + 1);
      }
    });
    return request;
  }, [hasAdmission, meetingId]);
  const room = useMeetingMediaRoom({
    meetingId,
    enabled: Boolean(lifecycle?.canJoinMedia),
    media,
    version: workspace?.version ?? null,
    reloadWorkspace: async () => {
      await load('refresh');
    },
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
        await load('refresh');
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
    connectedRefreshVersion.current = null;
    workspaceLoad.current = null;
    verifiedEffectiveEnd.current = null;
    zeroVerificationInFlight.current = false;
    durationAttempt.current?.cancel();
    dispatchDurationModal({ type: 'conflict' });
    setDurationSyncIssue(false);
    setCheckingDuration(false);
    setWorkspaceLoadEpoch(0);
    setCountdownPopoutIssue(false);
  }, [meetingId]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  useEffect(() => {
    const decision = meetingConnectedRefreshDecision({
      connection: room.snapshot.connection,
      workspace,
      lastVersion: connectedRefreshVersion.current,
    });
    connectedRefreshVersion.current = decision.lastVersion;
    if (decision.shouldRefresh) void load('refresh');
  }, [load, room.snapshot.connection, workspace]);

  useEffect(() => {
    const visibilityChanged = () => {
      const visible = document.visibilityState === 'visible';
      setDocumentVisible(visible);
      if (visible) setVisibilityRestored(true);
    };
    setDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, [meetingId]);

  useEffect(() => {
    if (workspace === null) return;
    const update = () => setMonotonicNowMs(performance.now());
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [workspace]);

  useEffect(() => {
    if (workspace === null) return;
    const decision = meetingWorkspaceRefreshDecision({
      live: workspace.session?.state === 'live',
      visible: documentVisible,
      visibilityRestored,
      loadInFlight: workspaceLoad.current !== null,
    });
    if (decision === null) return;
    const timer = window.setTimeout(() => {
      setVisibilityRestored(false);
      void load('refresh');
    }, decision.delayMs);
    return () => window.clearTimeout(timer);
  }, [
    documentVisible,
    lifecycle?.phase,
    load,
    visibilityRestored,
    workspace?.meetingId,
    workspace?.session?.state,
    workspaceLoadEpoch,
  ]);

  useEffect(() => {
    if (
      durationView === null
      || workspace?.session?.state !== 'live'
    ) return;
    const decision = meetingDurationRefreshDecision({
      live: true,
      visible: documentVisible,
      visibilityRestored,
      loadInFlight: workspaceLoad.current !== null,
      remainingSeconds: durationView.remainingSeconds,
      effectiveEndsAt: workspace.session.effectiveEndsAt,
      ...(verifiedEffectiveEnd.current === null
        ? {}
        : { verifiedEffectiveEndsAt: verifiedEffectiveEnd.current }),
    });
    if (decision.delayMs === null) return;
    const run = async () => {
      setVisibilityRestored(false);
      if (!decision.verifyEnd) {
        await load('refresh');
        return;
      }
      if (zeroVerificationInFlight.current) return;
      zeroVerificationInFlight.current = true;
      setCheckingDuration(true);
      const effectiveEnd = workspace.session!.effectiveEndsAt;
      const verifyingMeetingId = workspace.meetingId;
      try {
        const refreshed = await load('refresh');
        if (activeMeetingId.current !== verifyingMeetingId) return;
        const movedLater =
          refreshed?.session?.state === 'live'
          && refreshed.session.effectiveEndsAt !== effectiveEnd;
        if (movedLater) {
          verifiedEffectiveEnd.current = null;
        } else {
          verifiedEffectiveEnd.current = effectiveEnd;
          await room.leaveForEndedMeeting();
          setWorkspace((current) => {
            if (current?.session === undefined) return current;
            if (current.session.effectiveEndsAt !== effectiveEnd) return current;
            return {
              ...current,
              status: 'ended',
              session: {
                ...current.session,
                state: 'ended',
                actualEndedAt: current.session.actualEndedAt ?? effectiveEnd,
              },
            };
          });
        }
      } finally {
        zeroVerificationInFlight.current = false;
        if (activeMeetingId.current === verifyingMeetingId) {
          setCheckingDuration(false);
        }
      }
    };
    const timer = window.setTimeout(() => void run(), decision.delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    documentVisible,
    workspaceLoadEpoch,
    durationView?.requiresEndVerification,
    durationView?.severity,
    load,
    room.leaveForEndedMeeting,
    serverClock?.receivedAtMs,
    visibilityRestored,
    workspace?.meetingId,
    workspace?.session?.effectiveEndsAt,
    workspace?.session?.state,
  ]);

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
        await load('refresh');
      } else {
        setStartError('Could not start the meeting. Try again.');
      }
    } finally {
      setStartingEarly(false);
    }
  };

  const openCountdownPopout = useCallback(() => {
    const opened = openMeetingCountdownPopout({ meetingId });
    setCountdownPopoutIssue(!opened);
  }, [meetingId]);

  const openDurationModal = useCallback(() => {
    const first = durationOptions[0];
    if (first === undefined) return;
    dispatchDurationModal({ type: 'open' });
    dispatchDurationModal({
      type: 'select',
      requestedSeconds: first.requestedSeconds,
    });
  }, [durationOptions]);

  const cancelDurationModal = useCallback(() => {
    if (durationModal.phase === 'pending') return;
    durationAttempt.current?.cancel();
    dispatchDurationModal({ type: 'cancel' });
  }, [durationModal.phase]);

  const extendDuration = useCallback(async () => {
    if (
      workspace?.session?.state !== 'live'
      || workspace.duration === undefined
      || room.snapshot.connection !== 'connected'
      || durationModal.selectedSeconds === null
      || durationModal.phase === 'pending'
      || durationModal.reason.trim().length === 0
    ) return;
    dispatchDurationModal({ type: 'submit' });
    const attempt = durationAttempt.current!;
    try {
      const command = attempt.begin(
        workspace.version,
        durationModal.selectedSeconds,
        durationModal.reason,
      );
      const result = await requestMeetingDurationExtension({
        meetingId: workspace.meetingId,
        expectedVersion: command.expectedVersion,
        requestedSeconds: command.requestedSeconds,
        reason: command.reason,
        idempotencyKey: command.idempotencyKey,
      });
      attempt.complete();
      verifiedEffectiveEnd.current = null;
      setWorkspace((current) => {
        if (
          current?.session?.state !== 'live'
          || current.duration === undefined
          || current.version !== command.expectedVersion
          || current.session.effectiveEndsAt !== result.oldEffectiveEndsAt
        ) return current;
        return {
          ...current,
          version: result.version,
          session: {
            ...current.session,
            effectiveEndsAt: result.effectiveEndsAt,
          },
          duration: {
            ...current.duration,
            remainingAllowanceSeconds: Math.max(
              0,
              current.duration.remainingAllowanceSeconds - result.appliedSeconds,
            ),
          },
        };
      });
      dispatchDurationModal({ type: 'succeed' });
      await load('refresh');
    } catch (error) {
      if (
        error instanceof MeetingDurationExtensionError
        && error.code === 'meeting_conflict'
      ) {
        attempt.conflict();
        dispatchDurationModal({ type: 'conflict' });
        await load('refresh');
      } else if (
        error instanceof MeetingDurationExtensionError
        && error.code === 'extension_unavailable'
      ) {
        attempt.cancel();
        dispatchDurationModal({ type: 'cancel' });
        await load('refresh');
      } else {
        attempt.failed();
        dispatchDurationModal({ type: 'fail' });
      }
    }
  }, [durationModal, load, room.snapshot.connection, workspace]);

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
    await load('initial');
  };

  const endMeeting = useCallback(async () => {
    if (
      workspace === null
      || lifecycle?.phase !== 'live'
      || endingMeeting
    ) return;
    const attempt = endAttempt.current!;
    const idempotencyKey = attempt.begin();
    setEndingMeeting(true);
    setEndIssue(false);
    try {
      const result = await endMeetingLiveSession({
        meetingId: workspace.meetingId,
        version: workspace.version,
        idempotencyKey,
      });
      attempt.complete();
      await room.leaveForEndedMeeting();
      setWorkspace((current) => {
        if (current === null || current.session === undefined) return current;
        return {
          ...current,
          version: result.version,
          status: 'ended',
          session: {
            ...current.session,
            state: 'ended',
            actualEndedAt: result.actualEndedAt,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof MeetingLiveSessionError
        && error.code === 'meeting_conflict'
      ) {
        attempt.cancel();
        await load('refresh');
      } else {
        attempt.failed();
        setEndIssue(true);
      }
    } finally {
      setEndingMeeting(false);
    }
  }, [endingMeeting, lifecycle?.phase, load, room, workspace]);

  const cancelMeetingEnd = useCallback(() => {
    if (endingMeeting) return;
    endAttempt.current?.cancel();
    setEndIssue(false);
  }, [endingMeeting]);

  const peoplePanel = workspace === null ? null : (
    <div className="space-y-4">
      <MeetingPeople
        participants={workspace.participants}
        currentParticipantId={workspace.currentParticipant.participantId}
        currentRole={workspace.currentParticipant.role}
        moderationEnabled={lifecycle?.phase !== 'ended'}
        connectedParticipantIds={connectedParticipantIds}
        removingParticipantId={removingParticipantId}
        issue={removalIssue}
        onRemove={removeParticipant}
        onCancel={cancelParticipantRemoval}
      />
      {lifecycle !== null && (
        <MeetingEndControl
          key={`meeting-end-${workspace.version}`}
          role={workspace.currentParticipant.role}
          phase={lifecycle.phase}
          pending={endingMeeting}
          issue={endIssue}
          onEnd={() => void endMeeting()}
          onCancel={cancelMeetingEnd}
        />
      )}
    </div>
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
            {durationView !== null && workspace.session?.state === 'live' && (
              <MeetingDurationBar
                view={durationView}
                localizedEnd={new Date(
                  workspace.session.effectiveEndsAt,
                ).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                connected={room.snapshot.connection === 'connected'}
                checking={checkingDuration}
                syncIssue={durationSyncIssue || durationProjectionInvalid}
                options={durationOptions}
                modal={durationModal}
                onOpen={openDurationModal}
                onSelect={(requestedSeconds) => dispatchDurationModal({
                  type: 'select',
                  requestedSeconds,
                })}
                onReason={(reason) => dispatchDurationModal({
                  type: 'reason',
                  reason,
                })}
                onSubmit={() => void extendDuration()}
                onCancel={cancelDurationModal}
              />
            )}
            {(durationSyncIssue || durationProjectionInvalid) && durationView === null && (
              <p role="status" className="mt-5 text-xs leading-5 text-amber-100/70">
                Meeting time could not be synchronized. Try again.
              </p>
            )}
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
                      countdownPopoutIssue={countdownPopoutIssue}
                      onOpenCountdown={openCountdownPopout}
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
