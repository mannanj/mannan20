import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DurationExtensionOption, DurationView } from '@/lib/meeting-duration';
import {
  MeetingDurationBar,
  initialMeetingDurationModalState,
  meetingDurationModalTransition,
  type MeetingDurationModalState,
} from './meeting-duration-bar';

const view: DurationView = {
  effectiveEndsAt: '2026-07-19T15:00:00.000Z',
  maximumEndsAt: '2026-07-19T16:00:00.000Z',
  remainingAllowanceSeconds: 3600,
  remainingSeconds: 1439,
  severity: 'neutral',
  label: '23:59',
  requiresEndVerification: false,
};

const options: readonly DurationExtensionOption[] = [
  { requestedSeconds: 900, appliedSeconds: 900, truncated: false },
  { requestedSeconds: 1800, appliedSeconds: 1800, truncated: false },
  { requestedSeconds: 3600, appliedSeconds: 3600, truncated: false },
];

function render(overrides: Partial<Parameters<typeof MeetingDurationBar>[0]> = {}) {
  return renderToStaticMarkup(
    <MeetingDurationBar
      view={view}
      localizedEnd="3:00 PM"
      connected={false}
      checking={false}
      syncIssue={false}
      options={options}
      modal={initialMeetingDurationModalState}
      onOpen={() => undefined}
      onSelect={() => undefined}
      onReason={() => undefined}
      onSubmit={() => undefined}
      onCancel={() => undefined}
      {...overrides}
    />,
  );
}

describe('meeting duration bar', () => {
  test('shows restrained synchronized time and localized end while disconnected', () => {
    const markup = render();
    expect(markup).toContain('Time remaining');
    expect(markup).toContain('23:59');
    expect(markup).toContain('Ends at 3:00 PM');
    expect(markup).toContain('role="timer"');
    expect(markup).toContain('aria-label="Time remaining 23 minutes 59 seconds"');
    expect(markup).not.toContain('Extend meeting');
    expect(markup).not.toContain('role="dialog"');
  });

  test('offers extension only to a connected participant with allowance', () => {
    expect(render({ connected: true })).toContain('Extend meeting');
    expect(render({ connected: true, options: [] })).not.toContain('Extend meeting');
  });

  test('uses prominent stable final-minute digits and threshold-only live copy', () => {
    const markup = render({
      view: {
        ...view,
        remainingSeconds: 59,
        severity: 'final-minute',
        label: '0:59',
      },
    });
    expect(markup).toContain('border-amber-300/45');
    expect(markup).toContain('tabular-nums');
    expect(markup).toContain('aria-label="Time remaining 59 seconds"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Less than one minute remains.');
    expect(markup.match(/aria-live="polite"/gu)).toHaveLength(1);
  });

  test('renders checking, synchronization failure, and concise success copy', () => {
    expect(render({ checking: true })).toContain('Checking meeting time…');
    expect(render({ syncIssue: true })).toContain(
      'Meeting time could not be synchronized. Try again.',
    );
    expect(render({
      modal: {
        ...initialMeetingDurationModalState,
        feedback: 'success',
      },
    })).toContain('Meeting time extended.');
  });

  test('renders an accessible bounded extension dialog with truncated choices', () => {
    const modal: MeetingDurationModalState = {
      open: true,
      selectedSeconds: 900,
      reason: 'Questions remain',
      phase: 'idle',
      feedback: null,
    };
    const markup = render({
      connected: true,
      modal,
      options: [
        { requestedSeconds: 900, appliedSeconds: 600, truncated: true },
      ],
    });
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="meeting-duration-dialog-title"');
    expect(markup).toContain('aria-describedby="meeting-duration-dialog-description"');
    expect(markup).toContain('Extend this meeting');
    expect(markup).toContain('15 minutes (adds 10 minutes)');
    expect(markup).toContain('Reason');
    expect(markup).toContain('required=""');
    expect(markup).toContain('maxLength="500"');
    expect(markup).toContain('Questions remain');
    expect(markup).toContain('Cancel');
    expect(markup).toContain('Extend and continue');
  });

  test('disables blank and pending submission and keeps transient failure visible', () => {
    const blank = render({
      connected: true,
      modal: {
        open: true,
        selectedSeconds: 900,
        reason: '   ',
        phase: 'idle',
        feedback: null,
      },
    });
    expect(blank).toContain('Extend and continue');
    expect(blank).toContain('disabled=""');

    const pending = render({
      connected: true,
      modal: {
        open: true,
        selectedSeconds: 900,
        reason: 'Questions remain',
        phase: 'pending',
        feedback: null,
      },
    });
    expect(pending).toContain('Extending…');
    expect(pending.match(/disabled=""/gu)?.length).toBeGreaterThanOrEqual(2);

    const failed = render({
      connected: true,
      modal: {
        open: true,
        selectedSeconds: 900,
        reason: 'Questions remain',
        phase: 'failure',
        feedback: null,
      },
    });
    expect(failed).toContain('Could not extend the meeting. Try again.');
    expect(failed).toContain('Questions remain');
  });

  test('disables an already-open extension dialog after disconnection', () => {
    const markup = render({
      connected: false,
      modal: {
        open: true,
        selectedSeconds: 900,
        reason: 'Questions remain',
        phase: 'idle',
        feedback: null,
      },
    });
    expect(markup).toContain('Extend and continue');
    expect(markup).toContain('disabled=""');
  });
});

describe('meeting duration modal transitions', () => {
  test('opens, selects, types, and submits only a complete command', () => {
    let state = meetingDurationModalTransition(initialMeetingDurationModalState, {
      type: 'open',
    });
    state = meetingDurationModalTransition(state, {
      type: 'select',
      requestedSeconds: 1800,
    });
    state = meetingDurationModalTransition(state, {
      type: 'reason',
      reason: '  Discuss the final decision.  ',
    });
    expect(state).toEqual({
      open: true,
      selectedSeconds: 1800,
      reason: '  Discuss the final decision.  ',
      phase: 'idle',
      feedback: null,
    });
    expect(meetingDurationModalTransition(state, { type: 'submit' })).toEqual({
      ...state,
      phase: 'pending',
    });
    expect(meetingDurationModalTransition({
      ...state,
      reason: '   ',
    }, { type: 'submit' })).toEqual({ ...state, reason: '   ' });
  });

  test('retains selection and reason on failure and blocks edits while pending', () => {
    const pending: MeetingDurationModalState = {
      open: true,
      selectedSeconds: 900,
      reason: 'Questions remain',
      phase: 'pending',
      feedback: null,
    };
    expect(meetingDurationModalTransition(pending, { type: 'fail' })).toEqual({
      ...pending,
      phase: 'failure',
    });
    expect(meetingDurationModalTransition(pending, {
      type: 'reason',
      reason: 'Changed while pending',
    })).toBe(pending);
    expect(meetingDurationModalTransition(pending, { type: 'cancel' })).toBe(pending);
  });

  test('resets after success, conflict, or cancellation', () => {
    const active: MeetingDurationModalState = {
      open: true,
      selectedSeconds: 900,
      reason: 'Questions remain',
      phase: 'idle',
      feedback: null,
    };
    expect(meetingDurationModalTransition(active, { type: 'succeed' })).toEqual({
      ...initialMeetingDurationModalState,
      feedback: 'success',
    });
    expect(meetingDurationModalTransition(active, { type: 'conflict' })).toEqual(
      initialMeetingDurationModalState,
    );
    expect(meetingDurationModalTransition(active, { type: 'cancel' })).toEqual(
      initialMeetingDurationModalState,
    );
  });
});
