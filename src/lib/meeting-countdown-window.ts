import {
  countdownFocusRequest,
  type MeetingCountdownChannelMessage,
} from './meeting-countdown-channel';
import { validMeetingIdentifier } from './meeting-identifier';

export const MEETING_COUNTDOWN_AUTO_FOCUS_KEY =
  'mannan.meet.countdown.auto-focus.v1';

const POPOUT_FEATURES =
  'popup=yes,width=460,height=360,resizable=yes,scrollbars=no';

type FocusRequest = Extract<
  MeetingCountdownChannelMessage,
  { readonly type: 'focus-request' }
>;

function requireMeetingId(meetingId: string): void {
  if (!validMeetingIdentifier(meetingId)) {
    throw new Error('Invalid meeting identifier.');
  }
}

function canonicalInstant(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

export function openMeetingCountdownPopout(input: {
  readonly meetingId: string;
  readonly window?: Pick<Window, 'open'>;
}): boolean {
  requireMeetingId(input.meetingId);
  const browserWindow = input.window ?? window;
  const opened = browserWindow.open(
    `/meet/${input.meetingId}/countdown`,
    `meeting-countdown-${input.meetingId}`,
    POPOUT_FEATURES,
  );
  if (opened === null) return false;
  try {
    opened.focus();
  } catch {
    // The popup exists even when the browser refuses this best-effort focus.
  }
  return true;
}

export function readMeetingCountdownAutoFocus(
  storage: Pick<Storage, 'getItem'>,
): boolean {
  try {
    const value = storage.getItem(MEETING_COUNTDOWN_AUTO_FOCUS_KEY);
    if (value === '0') return false;
    return true;
  } catch {
    return true;
  }
}

export function writeMeetingCountdownAutoFocus(
  storage: Pick<Storage, 'setItem'>,
  enabled: boolean,
): void {
  try {
    storage.setItem(MEETING_COUNTDOWN_AUTO_FOCUS_KEY, enabled ? '1' : '0');
  } catch {
    // Preference persistence is optional and never affects meeting access.
  }
}

export class MeetingCountdownFocusAttempt {
  readonly #requestId: () => string;
  #pending: FocusRequest | null = null;
  #lastLiveStartedAt: string | null = null;

  constructor(requestId: () => string = () =>
    crypto.randomUUID().replaceAll('-', '')) {
    this.#requestId = requestId;
  }

  beginManual(
    openerAvailable: boolean,
    meetingId: string,
  ):
    | { readonly kind: 'navigate'; readonly href: string }
    | { readonly kind: 'request'; readonly message: FocusRequest } {
    requireMeetingId(meetingId);
    if (!openerAvailable) {
      return { kind: 'navigate', href: `/meet/${meetingId}` };
    }
    if (this.#pending !== null) {
      return { kind: 'request', message: this.#pending };
    }
    const message = countdownFocusRequest(
      meetingId,
      this.#requestId(),
      'manual',
    ) as FocusRequest;
    this.#pending = message;
    return { kind: 'request', message };
  }

  observeLiveStart(
    meetingId: string,
    liveStartedAt: string,
    enabled: boolean,
  ): FocusRequest | null {
    requireMeetingId(meetingId);
    if (!canonicalInstant(liveStartedAt)) throw new Error('Invalid live start.');
    if (liveStartedAt === this.#lastLiveStartedAt) return null;
    this.#lastLiveStartedAt = liveStartedAt;
    if (!enabled || this.#pending !== null) return null;
    const message = countdownFocusRequest(
      meetingId,
      this.#requestId(),
      'auto',
    ) as FocusRequest;
    this.#pending = message;
    return message;
  }

  ack(message: MeetingCountdownChannelMessage): boolean {
    if (
      message.type !== 'focus-ack'
      || this.#pending === null
      || message.meetingId !== this.#pending.meetingId
      || message.requestId !== this.#pending.requestId
    ) return false;
    this.#pending = null;
    return true;
  }

  pendingRequestId(): string | null {
    return this.#pending?.requestId ?? null;
  }
}
