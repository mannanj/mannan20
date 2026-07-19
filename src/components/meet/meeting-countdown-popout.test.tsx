import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MeetingCountdownPopoutView,
  initialMeetingCountdownPopoutState,
  meetingCountdownAckDecision,
  meetingCountdownLoadFailureIsTerminal,
  meetingCountdownPopoutTransition,
  meetingCountdownRefreshDecision,
  type MeetingCountdownPopoutState,
} from './meeting-countdown-popout';
import { meetingCountdownView } from '@/lib/meeting-countdown';
import { countdownFocusAck } from '@/lib/meeting-countdown-channel';
import type { MeetingCountdownSnapshot } from '@/lib/meeting-countdown-workspace';
import { MeetingCountdownLoadError } from '@/lib/meeting-countdown-workspace';
import { MeetingCountdownFocusAttempt } from '@/lib/meeting-countdown-window';

const meetingId = '0123456789abcdef0123456789abcdef';
const snapshot: MeetingCountdownSnapshot = {
  meetingId,
  title: 'Project review',
  status: 'scheduled',
  version: 4,
  serverNow: '2026-07-19T14:55:01.000Z',
  startsAt: '2026-07-19T15:00:00.000Z',
  endsAt: '2026-07-19T16:00:00.000Z',
  liveStartedAt: null,
};
const loaded = { snapshot, receivedAtMs: 100 };
const countdown = meetingCountdownView({
  serverNow: snapshot.serverNow,
  startsAt: snapshot.startsAt,
  receivedAtMs: loaded.receivedAtMs,
  currentClientMs: 100,
});

function render(
  state: MeetingCountdownPopoutState,
  view = countdown,
): string {
  return renderToStaticMarkup(
    <MeetingCountdownPopoutView
      state={state}
      countdown={state.phase === 'ready' ? view : null}
      onJoin={() => undefined}
      onAutoFocus={() => undefined}
    />,
  );
}

describe('meeting countdown popout view', () => {
  test('renders a minimal loading state without meeting chrome', () => {
    const markup = render(initialMeetingCountdownPopoutState(true));
    expect(markup).toContain('<main');
    expect(markup).toContain('Opening countdown…');
    expect(markup).not.toContain('Mannan Meetings');
    expect(markup).not.toContain('mannan.is');
  });

  test('renders the title, dominant accessible timer, join, and default preference', () => {
    const state = meetingCountdownPopoutTransition(
      initialMeetingCountdownPopoutState(true),
      { type: 'load-success', loaded },
    );
    const markup = render(state);
    expect(markup).toContain('Project review');
    expect(markup).toContain('04:59');
    expect(markup).toContain('role="timer"');
    expect(markup).toContain('aria-label="4 minutes 59 seconds until start"');
    expect(markup).toContain('tabular-nums');
    expect(markup).toContain('Join →');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('Auto-focus on start');
    expect(markup).toContain('checked=""');
    expect(markup).toContain('fixed bottom-0');
    expect(markup).not.toContain('Mannan Meetings');
    expect(markup).not.toContain('aria-live="polite"');
  });

  test('renders quiet synchronization and focus guidance without hiding time', () => {
    const state: MeetingCountdownPopoutState = {
      phase: 'ready',
      loaded,
      autoFocus: false,
      syncIssue: true,
      focusIssue: true,
    };
    const markup = render(state);
    expect(markup).toContain('04:59');
    expect(markup).toContain('Countdown could not be synchronized. Retrying…');
    expect(markup).toContain('Select the meeting window to continue.');
    expect(markup).not.toContain('checked=""');
  });

  test('renders a safe unavailable state without join or timer controls', () => {
    const state: MeetingCountdownPopoutState = {
      phase: 'unavailable',
      autoFocus: true,
    };
    const markup = render(state);
    expect(markup).toContain('Countdown unavailable');
    expect(markup).toContain('href="/meet"');
    expect(markup).not.toContain('Join →');
    expect(markup).not.toContain('role="timer"');
  });
});

describe('meeting countdown popout state', () => {
  test('loads authoritative state and retains it through a later load failure', () => {
    const initial = initialMeetingCountdownPopoutState(true);
    expect(initial).toEqual({ phase: 'loading', autoFocus: true });
    const ready = meetingCountdownPopoutTransition(initial, {
      type: 'load-success',
      loaded,
    });
    expect(ready).toEqual({
      phase: 'ready',
      loaded,
      autoFocus: true,
      syncIssue: false,
      focusIssue: false,
    });
    if (ready.phase !== 'ready') throw new Error('Expected ready state.');
    expect(meetingCountdownPopoutTransition(ready, {
      type: 'load-failure',
    })).toEqual({
      ...ready,
      syncIssue: true,
    });
    expect(meetingCountdownPopoutTransition(initial, {
      type: 'load-failure',
    })).toEqual({ phase: 'unavailable', autoFocus: true });
  });

  test('accepts only a fresher channel sample and records its receipt time', () => {
    const ready = meetingCountdownPopoutTransition(
      initialMeetingCountdownPopoutState(true),
      { type: 'load-success', loaded },
    );
    if (ready.phase !== 'ready') throw new Error('Expected ready state.');
    const older = {
      ...snapshot,
      serverNow: '2026-07-19T14:55:00.000Z',
    };
    expect(meetingCountdownPopoutTransition(ready, {
      type: 'channel-snapshot',
      loaded: { snapshot: older, receivedAtMs: 200 },
    })).toBe(ready);
    const fresher = {
      ...snapshot,
      version: 5,
      serverNow: '2026-07-19T14:55:02.000Z',
    };
    expect(meetingCountdownPopoutTransition(ready, {
      type: 'channel-snapshot',
      loaded: { snapshot: fresher, receivedAtMs: 200 },
    })).toEqual({
      ...ready,
      loaded: { snapshot: fresher, receivedAtMs: 200 },
    });
  });

  test('updates preference, clears issues on success, warns on focus timeout, and closes terminal state', () => {
    let state = meetingCountdownPopoutTransition(
      initialMeetingCountdownPopoutState(true),
      { type: 'load-success', loaded },
    );
    state = meetingCountdownPopoutTransition(state, {
      type: 'focus-warning',
    });
    expect(state).toMatchObject({ phase: 'ready', focusIssue: true });
    state = meetingCountdownPopoutTransition(state, {
      type: 'preference',
      enabled: false,
    });
    expect(state).toMatchObject({ autoFocus: false });
    state = meetingCountdownPopoutTransition(state, {
      type: 'load-success',
      loaded: {
        snapshot: {
          ...snapshot,
          serverNow: '2026-07-19T14:55:03.000Z',
        },
        receivedAtMs: 300,
      },
    });
    expect(state).toMatchObject({
      phase: 'ready',
      syncIssue: false,
      focusIssue: false,
      autoFocus: false,
    });
    expect(meetingCountdownPopoutTransition(state, {
      type: 'unavailable',
    })).toEqual({ phase: 'unavailable', autoFocus: false });
  });
});

describe('meeting countdown popout decisions', () => {
  test('refreshes every fifteen seconds, immediately on restore, and never overlaps', () => {
    expect(meetingCountdownRefreshDecision({
      ready: true,
      visible: true,
      visibilityRestored: false,
      loadInFlight: false,
    })).toEqual({ delayMs: 15_000 });
    expect(meetingCountdownRefreshDecision({
      ready: true,
      visible: true,
      visibilityRestored: true,
      loadInFlight: false,
    })).toEqual({ delayMs: 0 });
    for (const input of [
      { ready: false, visible: true, visibilityRestored: false, loadInFlight: false },
      { ready: true, visible: false, visibilityRestored: false, loadInFlight: false },
      { ready: true, visible: true, visibilityRestored: false, loadInFlight: true },
    ]) {
      expect(meetingCountdownRefreshDecision(input)).toBeNull();
    }
  });

  test('closes only when the retained attempt accepts a matching focus ack', () => {
    const attempt = new MeetingCountdownFocusAttempt(() => 'a'.repeat(32));
    attempt.beginManual(true, meetingId);
    expect(meetingCountdownAckDecision(
      attempt,
      countdownFocusAck(meetingId, 'b'.repeat(32)),
    )).toBe(false);
    expect(meetingCountdownAckDecision(
      attempt,
      countdownFocusAck(meetingId, 'a'.repeat(32)),
    )).toBe(true);
    expect(meetingCountdownAckDecision(
      attempt,
      countdownFocusAck(meetingId, 'a'.repeat(32)),
    )).toBe(false);
  });

  test('closes for an access-ending load error but retains retryable state', () => {
    expect(meetingCountdownLoadFailureIsTerminal(
      new MeetingCountdownLoadError('unavailable', true),
    )).toBe(true);
    expect(meetingCountdownLoadFailureIsTerminal(
      new MeetingCountdownLoadError('unavailable'),
    )).toBe(false);
    expect(meetingCountdownLoadFailureIsTerminal(new Error('private'))).toBe(false);
  });
});
