export type MeetingRoomLifecycle =
  | {
      phase: 'before-start';
      canStartEarly: boolean;
      canJoinMedia: false;
      secondsUntilStart: number;
    }
  | {
      phase: 'open' | 'live';
      canStartEarly: false;
      canJoinMedia: true;
    }
  | {
      phase: 'ended';
      canStartEarly: false;
      canJoinMedia: false;
    };

interface LifecycleInput {
  nowMs: number;
  role: string;
  status: string;
  schedule: { startsAt: string; endsAt: string };
  session?: {
    state: string;
    actualStartedAt: string;
    effectiveEndsAt: string;
    actualEndedAt?: string;
  };
}

const ENDED: MeetingRoomLifecycle = {
  phase: 'ended',
  canStartEarly: false,
  canJoinMedia: false,
};

function instant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serverClockNowMs(input: {
  serverNow: string;
  receivedAtMs: number;
  currentClientMs: number;
}): number {
  const serverNowMs = instant(input.serverNow);
  if (
    serverNowMs === null ||
    !Number.isFinite(input.receivedAtMs) ||
    !Number.isFinite(input.currentClientMs)
  ) {
    return Number.NaN;
  }
  return serverNowMs + Math.max(0, input.currentClientMs - input.receivedAtMs);
}

export function meetingRoomLifecycle(input: LifecycleInput): MeetingRoomLifecycle {
  const startsAtMs = instant(input.schedule.startsAt);
  const endsAtMs = instant(input.schedule.endsAt);
  if (
    !Number.isFinite(input.nowMs) ||
    startsAtMs === null ||
    endsAtMs === null ||
    startsAtMs >= endsAtMs ||
    input.status !== 'scheduled'
  ) {
    return ENDED;
  }

  if (input.session !== undefined) {
    const actualStartedAtMs = instant(input.session.actualStartedAt);
    const effectiveEndsAtMs = instant(input.session.effectiveEndsAt);
    if (
      actualStartedAtMs === null ||
      effectiveEndsAtMs === null ||
      actualStartedAtMs >= effectiveEndsAtMs
    ) {
      return ENDED;
    }
    if (input.session.state === 'ended') {
      return ENDED;
    }
    if (
      input.session.state !== 'live' ||
      input.nowMs < actualStartedAtMs ||
      input.nowMs >= effectiveEndsAtMs
    ) {
      return ENDED;
    }
    return {
      phase: 'live',
      canStartEarly: false,
      canJoinMedia: true,
    };
  }

  if (input.nowMs < startsAtMs) {
    return {
      phase: 'before-start',
      canStartEarly: input.role === 'owner',
      canJoinMedia: false,
      secondsUntilStart: Math.max(0, Math.ceil((startsAtMs - input.nowMs) / 1000)),
    };
  }

  if (input.nowMs >= endsAtMs) return ENDED;

  return {
    phase: 'open',
    canStartEarly: false,
    canJoinMedia: true,
  };
}
