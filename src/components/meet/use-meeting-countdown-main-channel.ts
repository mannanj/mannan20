'use client';

import { useEffect, useRef } from 'react';
import {
  countdownFocusAck,
  countdownStateSnapshot,
  meetingCountdownChannelName,
  meetingCountdownFocusCanAcknowledge,
  parseMeetingCountdownChannelMessage,
  type MeetingCountdownChannelMessage,
} from '@/lib/meeting-countdown-channel';
import {
  advanceMeetingCountdownSnapshot,
  type MeetingCountdownSnapshot,
} from '@/lib/meeting-countdown-workspace';

export interface MeetingCountdownMainState {
  readonly snapshot: MeetingCountdownSnapshot | null;
  readonly receivedAtMs: number | null;
  readonly currentClientMs: number;
  readonly focused: boolean;
  readonly visible: boolean;
}

export type MeetingCountdownMainEffect =
  | { readonly type: 'post'; readonly message: MeetingCountdownChannelMessage }
  | { readonly type: 'focus-main-window' };

type FocusRequest = Extract<
  MeetingCountdownChannelMessage,
  { readonly type: 'focus-request' }
>;

export class MeetingCountdownMainCoordinator {
  readonly #meetingId: string;
  #pending: FocusRequest | null = null;

  constructor(meetingId: string) {
    meetingCountdownChannelName(meetingId);
    this.#meetingId = meetingId;
  }

  receive(
    value: unknown,
    state: MeetingCountdownMainState,
  ): readonly MeetingCountdownMainEffect[] {
    const message = parseMeetingCountdownChannelMessage(value, this.#meetingId);
    if (message?.type === 'state-request') {
      if (state.snapshot === null || state.receivedAtMs === null) return [];
      try {
        return [{
          type: 'post',
          message: countdownStateSnapshot(
            this.#meetingId,
            advanceMeetingCountdownSnapshot(
              state.snapshot,
              state.receivedAtMs,
              state.currentClientMs,
            ),
          ),
        }];
      } catch {
        return [];
      }
    }
    if (message?.type !== 'focus-request') return [];
    if (
      this.#pending !== null
      && message.requestId !== this.#pending.requestId
    ) return [];
    this.#pending = message;
    const effects: MeetingCountdownMainEffect[] = [
      { type: 'focus-main-window' },
    ];
    const ack = this.observeFocus({
      focused: state.focused,
      visible: state.visible,
    });
    effects.push(...ack);
    return effects;
  }

  observeFocus(state: {
    readonly focused: boolean;
    readonly visible: boolean;
  }): readonly MeetingCountdownMainEffect[] {
    if (
      this.#pending === null
      || !meetingCountdownFocusCanAcknowledge({
        hasFocus: state.focused,
        visibilityState: state.visible ? 'visible' : 'hidden',
      })
    ) return [];
    const message = countdownFocusAck(
      this.#meetingId,
      this.#pending.requestId,
    );
    this.#pending = null;
    return [{ type: 'post', message }];
  }
}

export function useMeetingCountdownMainChannel(input: {
  readonly meetingId: string;
  readonly snapshot: MeetingCountdownSnapshot | null;
  readonly receivedAtMs: number | null;
  readonly currentClientMs: number;
}): void {
  const latest = useRef(input);
  const channelRef = useRef<BroadcastChannel | null>(null);
  latest.current = input;

  useEffect(() => {
    const coordinator = new MeetingCountdownMainCoordinator(input.meetingId);
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(
        meetingCountdownChannelName(input.meetingId),
      );
    } catch {
      return;
    }
    channelRef.current = channel;
    const apply = (effects: readonly MeetingCountdownMainEffect[]) => {
      for (const effect of effects) {
        if (effect.type === 'post') {
          channel.postMessage(effect.message);
        } else {
          try {
            window.focus();
          } catch {
            // Focus is best effort; acknowledgement still requires observation.
          }
        }
      }
    };
    const focusState = () => ({
      focused: document.hasFocus(),
      visible: document.visibilityState === 'visible',
    });
    const mainState = (): MeetingCountdownMainState => ({
      snapshot: latest.current.snapshot,
      receivedAtMs: latest.current.receivedAtMs,
      currentClientMs: latest.current.currentClientMs,
      ...focusState(),
    });
    const message = (event: MessageEvent<unknown>) => {
      apply(coordinator.receive(event.data, mainState()));
    };
    const focus = () => apply(coordinator.observeFocus(focusState()));
    channel.addEventListener('message', message);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      channel.removeEventListener('message', message);
      channel.close();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [input.meetingId]);

  useEffect(() => {
    if (
      channelRef.current === null
      || input.snapshot === null
      || input.receivedAtMs === null
    ) return;
    try {
      channelRef.current.postMessage(countdownStateSnapshot(
        input.meetingId,
        advanceMeetingCountdownSnapshot(
          input.snapshot,
          input.receivedAtMs,
          latest.current.currentClientMs,
        ),
      ));
    } catch {
      // Server refresh remains authoritative when channel publication fails.
    }
  }, [input.meetingId, input.receivedAtMs, input.snapshot]);
}
