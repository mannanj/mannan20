'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { meetingCountdownView, type MeetingCountdownView } from '@/lib/meeting-countdown';
import {
  countdownStateRequest,
  meetingCountdownChannelName,
  parseMeetingCountdownChannelMessage,
  type MeetingCountdownChannelMessage,
} from '@/lib/meeting-countdown-channel';
import {
  MeetingCountdownLoadError,
  loadMeetingCountdownSnapshot,
  preferMeetingCountdownSnapshot,
  type MeetingCountdownSnapshot,
} from '@/lib/meeting-countdown-workspace';
import {
  MeetingCountdownFocusAttempt,
  readMeetingCountdownAutoFocus,
  writeMeetingCountdownAutoFocus,
} from '@/lib/meeting-countdown-window';

export interface LoadedMeetingCountdown {
  readonly snapshot: MeetingCountdownSnapshot;
  readonly receivedAtMs: number;
}

export type MeetingCountdownPopoutState =
  | { readonly phase: 'loading'; readonly autoFocus: boolean }
  | {
      readonly phase: 'ready';
      readonly loaded: LoadedMeetingCountdown;
      readonly autoFocus: boolean;
      readonly syncIssue: boolean;
      readonly focusIssue: boolean;
    }
  | { readonly phase: 'unavailable'; readonly autoFocus: boolean };

type MeetingCountdownPopoutAction =
  | { readonly type: 'load-success'; readonly loaded: LoadedMeetingCountdown }
  | { readonly type: 'load-failure' }
  | { readonly type: 'channel-snapshot'; readonly loaded: LoadedMeetingCountdown }
  | { readonly type: 'preference'; readonly enabled: boolean }
  | { readonly type: 'focus-warning' }
  | { readonly type: 'unavailable' };

export function initialMeetingCountdownPopoutState(
  autoFocus: boolean,
): MeetingCountdownPopoutState {
  return { phase: 'loading', autoFocus };
}

export function meetingCountdownPopoutTransition(
  state: MeetingCountdownPopoutState,
  action: MeetingCountdownPopoutAction,
): MeetingCountdownPopoutState {
  if (action.type === 'preference') {
    return { ...state, autoFocus: action.enabled };
  }
  if (action.type === 'unavailable') {
    return { phase: 'unavailable', autoFocus: state.autoFocus };
  }
  if (action.type === 'load-failure') {
    return state.phase === 'ready'
      ? { ...state, syncIssue: true }
      : { phase: 'unavailable', autoFocus: state.autoFocus };
  }
  if (action.type === 'focus-warning') {
    return state.phase === 'ready'
      ? { ...state, focusIssue: true }
      : state;
  }
  if (action.type === 'load-success') {
    return {
      phase: 'ready',
      loaded: action.loaded,
      autoFocus: state.autoFocus,
      syncIssue: false,
      focusIssue: false,
    };
  }
  if (state.phase !== 'ready') return state;
  const preferred = preferMeetingCountdownSnapshot(
    state.loaded.snapshot,
    action.loaded.snapshot,
  );
  if (preferred === state.loaded.snapshot) return state;
  return {
    ...state,
    loaded: {
      snapshot: preferred,
      receivedAtMs: action.loaded.receivedAtMs,
    },
  };
}

export function meetingCountdownRefreshDecision(input: {
  readonly ready: boolean;
  readonly visible: boolean;
  readonly visibilityRestored: boolean;
  readonly loadInFlight: boolean;
}): { readonly delayMs: number } | null {
  if (!input.ready || !input.visible || input.loadInFlight) return null;
  return { delayMs: input.visibilityRestored ? 0 : 15_000 };
}

export function meetingCountdownAckDecision(
  attempt: MeetingCountdownFocusAttempt,
  message: MeetingCountdownChannelMessage,
): boolean {
  return attempt.ack(message);
}

export function meetingCountdownLoadFailureIsTerminal(error: unknown): boolean {
  return error instanceof MeetingCountdownLoadError && error.terminal;
}

export function MeetingCountdownPopoutView({
  state,
  countdown,
  onJoin,
  onAutoFocus,
}: {
  readonly state: MeetingCountdownPopoutState;
  readonly countdown: MeetingCountdownView | null;
  readonly onJoin: () => void;
  readonly onAutoFocus: (enabled: boolean) => void;
}) {
  if (state.phase === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0b0b0a] px-6 text-[#f1efe8]">
        <p className="text-sm text-white/55">Opening countdown…</p>
      </main>
    );
  }

  if (state.phase === 'unavailable' || countdown === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0b0b0a] px-6 text-center text-[#f1efe8]">
        <div>
          <h1 className="font-[family-name:var(--font-caption)] text-3xl tracking-[-0.03em]">
            Countdown unavailable
          </h1>
          <p className="mt-3 text-sm text-white/50">
            This meeting may have ended or your access may have changed.
          </p>
          <a
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm text-white/80 outline-none transition hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f1efe8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0a]"
            href="/meet"
          >
            Back to meetings
          </a>
        </div>
      </main>
    );
  }

  const title = state.loaded.snapshot.title ?? 'Untitled meeting';
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0b0b0a] px-6 pb-24 pt-8 text-[#f1efe8]">
      <h1
        className="mx-auto max-w-full truncate text-center text-sm font-medium text-white/55"
        title={title}
      >
        {title}
      </h1>
      <div className="flex flex-1 flex-col items-center justify-center pb-5 text-center">
        <time
          className="font-[family-name:var(--font-caption)] text-[clamp(4.5rem,24vw,8.5rem)] leading-none tabular-nums tracking-[-0.065em]"
          dateTime={state.loaded.snapshot.startsAt}
          role="timer"
          aria-label={countdown.accessibleLabel}
          suppressHydrationWarning
        >
          {countdown.label}
        </time>
        <button
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 text-sm text-white/85 outline-none transition hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f1efe8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0a]"
          type="button"
          onClick={onJoin}
        >
          Join →
        </button>
        {state.syncIssue ? (
          <p className="mt-4 text-xs text-[#c9aa89]" role="status">
            Countdown could not be synchronized. Retrying…
          </p>
        ) : null}
        {state.focusIssue ? (
          <p className="mt-2 text-xs text-[#c9aa89]" role="status">
            Select the meeting window to continue.
          </p>
        ) : null}
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0b0b0a] px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <label className="mx-auto flex min-h-11 max-w-sm cursor-pointer items-center justify-between gap-4 text-sm text-white/65">
          <span>Auto-focus on start</span>
          <input
            className="h-5 w-5 accent-[#f1efe8] outline-none focus-visible:ring-2 focus-visible:ring-[#f1efe8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0a]"
            type="checkbox"
            checked={state.autoFocus}
            onChange={(event) => onAutoFocus(event.currentTarget.checked)}
          />
        </label>
      </div>
    </main>
  );
}

function safeOpener(): Window | null {
  try {
    return window.opener !== null && !window.opener.closed
      ? window.opener as Window
      : null;
  } catch {
    return null;
  }
}

function boundedDocumentTitle(title: string | null): string {
  const value = title?.trim() || 'Meeting';
  return `${value.slice(0, 80)} · Countdown`;
}

export function MeetingCountdownPopout({ meetingId }: { readonly meetingId: string }) {
  const [state, dispatch] = useReducer(
    meetingCountdownPopoutTransition,
    true,
    initialMeetingCountdownPopoutState,
  );
  const [visible, setVisible] = useState(true);
  const [currentClientMs, setCurrentClientMs] = useState(0);
  const [refreshEpoch, advanceRefreshEpoch] = useReducer(
    (value: number) => value + 1,
    0,
  );
  const stateRef = useRef(state);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const focusWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAttemptRef = useRef<MeetingCountdownFocusAttempt | null>(null);
  if (focusAttemptRef.current === null) {
    focusAttemptRef.current = new MeetingCountdownFocusAttempt();
  }

  const transition = useCallback((action: MeetingCountdownPopoutAction) => {
    stateRef.current = meetingCountdownPopoutTransition(
      stateRef.current,
      action,
    );
    dispatch(action);
  }, []);

  const markUnavailable = useCallback(() => {
    try {
      window.close();
    } catch {
      // The safe unavailable surface remains when script-close is refused.
    }
    transition({ type: 'unavailable' });
  }, [transition]);

  const acceptLoaded = useCallback((loaded: LoadedMeetingCountdown) => {
    if (!mountedRef.current) return;
    if (loaded.snapshot.status !== 'scheduled') {
      markUnavailable();
      return;
    }
    transition({ type: 'load-success', loaded });
  }, [markUnavailable, transition]);

  const load = useCallback((): Promise<void> => {
    if (loadInFlightRef.current !== null) return loadInFlightRef.current;
    const request = loadMeetingCountdownSnapshot({ meetingId })
      .then(acceptLoaded)
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        if (meetingCountdownLoadFailureIsTerminal(error)) {
          markUnavailable();
          return;
        }
        transition({ type: 'load-failure' });
      })
      .finally(() => {
        if (loadInFlightRef.current === request) {
          loadInFlightRef.current = null;
          if (mountedRef.current) advanceRefreshEpoch();
        }
      });
    loadInFlightRef.current = request;
    return request;
  }, [acceptLoaded, markUnavailable, meetingId, transition]);

  const showFocusWarning = useCallback(() => {
    if (focusWarningRef.current !== null) clearTimeout(focusWarningRef.current);
    focusWarningRef.current = setTimeout(() => {
      focusWarningRef.current = null;
      transition({ type: 'focus-warning' });
    }, 5_000);
  }, [transition]);

  const requestFocus = useCallback((
    message: Extract<MeetingCountdownChannelMessage, { type: 'focus-request' }>,
  ) => {
    let posted = false;
    try {
      channelRef.current?.postMessage(message);
      posted = channelRef.current !== null;
    } catch {
      posted = false;
    }
    const opener = safeOpener();
    if (opener !== null) {
      try {
        opener.focus();
      } catch {
        // Verification comes only from the matching focused-visible ack.
      }
    }
    if (posted) showFocusWarning();
    else transition({ type: 'focus-warning' });
  }, [showFocusWarning, transition]);

  const onJoin = useCallback(() => {
    const opener = safeOpener();
    const decision = focusAttemptRef.current!.beginManual(
      opener !== null,
      meetingId,
    );
    if (decision.kind === 'navigate') {
      window.location.assign(decision.href);
      return;
    }
    requestFocus(decision.message);
  }, [meetingId, requestFocus]);

  const onAutoFocus = useCallback((enabled: boolean) => {
    writeMeetingCountdownAutoFocus(window.localStorage, enabled);
    transition({ type: 'preference', enabled });
  }, [transition]);

  useEffect(() => {
    mountedRef.current = true;
    const enabled = readMeetingCountdownAutoFocus(window.localStorage);
    transition({ type: 'preference', enabled });
    setVisible(document.visibilityState === 'visible');
    setCurrentClientMs(performance.now());
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load, transition]);

  useEffect(() => {
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(meetingCountdownChannelName(meetingId));
    } catch {
      return;
    }
    channelRef.current = channel;
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = parseMeetingCountdownChannelMessage(event.data, meetingId);
      if (message === null) return;
      if (message.type === 'state-snapshot') {
        if (message.snapshot.status !== 'scheduled') {
          markUnavailable();
          return;
        }
        transition({
          type: 'channel-snapshot',
          loaded: { snapshot: message.snapshot, receivedAtMs: performance.now() },
        });
        return;
      }
      if (
        message.type === 'focus-ack'
        && meetingCountdownAckDecision(focusAttemptRef.current!, message)
      ) {
        if (focusWarningRef.current !== null) {
          clearTimeout(focusWarningRef.current);
          focusWarningRef.current = null;
        }
        window.close();
      }
    };
    channel.addEventListener('message', onMessage);
    try {
      channel.postMessage(countdownStateRequest(meetingId));
    } catch {
      channel.removeEventListener('message', onMessage);
      channel.close();
      channelRef.current = null;
      return;
    }
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [markUnavailable, meetingId, transition]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState === 'visible';
      const restored = !visible && nextVisible;
      setVisible(nextVisible);
      if (restored && meetingCountdownRefreshDecision({
        ready: stateRef.current.phase === 'ready',
        visible: true,
        visibilityRestored: true,
        loadInFlight: loadInFlightRef.current !== null,
      }) !== null) void load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [load, visible]);

  useEffect(() => {
    if (state.phase !== 'ready' || !visible) return;
    const tick = () => setCurrentClientMs(performance.now());
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [state.phase, visible]);

  useEffect(() => {
    const decision = meetingCountdownRefreshDecision({
      ready: state.phase === 'ready',
      visible,
      visibilityRestored: false,
      loadInFlight: loadInFlightRef.current !== null,
    });
    if (decision === null) return;
    const timer = setTimeout(() => void load(), decision.delayMs);
    return () => clearTimeout(timer);
  }, [load, refreshEpoch, state.phase, visible]);

  useEffect(() => {
    if (state.phase !== 'ready' || state.loaded.snapshot.liveStartedAt === null) {
      return;
    }
    const message = focusAttemptRef.current!.observeLiveStart(
      meetingId,
      state.loaded.snapshot.liveStartedAt,
      state.autoFocus,
    );
    if (message !== null) requestFocus(message);
  }, [meetingId, requestFocus, state]);

  useEffect(() => {
    document.title = state.phase === 'ready'
      ? boundedDocumentTitle(state.loaded.snapshot.title)
      : state.phase === 'loading'
        ? 'Opening countdown…'
        : 'Countdown unavailable';
  }, [state]);

  useEffect(() => () => {
    if (focusWarningRef.current !== null) clearTimeout(focusWarningRef.current);
  }, []);

  const countdown = useMemo(() => {
    if (state.phase !== 'ready') return null;
    try {
      return meetingCountdownView({
        serverNow: state.loaded.snapshot.serverNow,
        startsAt: state.loaded.snapshot.startsAt,
        receivedAtMs: state.loaded.receivedAtMs,
        currentClientMs,
      });
    } catch {
      return null;
    }
  }, [currentClientMs, state]);

  return (
    <MeetingCountdownPopoutView
      state={state}
      countdown={countdown}
      onJoin={onJoin}
      onAutoFocus={onAutoFocus}
    />
  );
}
