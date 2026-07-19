import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingLifecyclePanel } from './meeting-lifecycle-panel';

const schedule = {
  startsAt: '2026-07-19T14:00:00.000Z',
  endsAt: '2026-07-19T15:00:00.000Z',
};

describe('meeting lifecycle panel', () => {
  test('offers explicit early start only to the owner', () => {
    const ownerMarkup = renderToStaticMarkup(
      <MeetingLifecyclePanel
        lifecycle={{
          phase: 'before-start',
          canStartEarly: true,
          canJoinMedia: false,
          secondsUntilStart: 1800,
        }}
        schedule={schedule}
        onStartEarly={() => undefined}
        onOpenCountdown={() => undefined}
      />,
    );
    const participantMarkup = renderToStaticMarkup(
      <MeetingLifecyclePanel
        lifecycle={{
          phase: 'before-start',
          canStartEarly: false,
          canJoinMedia: false,
          secondsUntilStart: 1800,
        }}
        schedule={schedule}
        onOpenCountdown={() => undefined}
      />,
    );

    expect(ownerMarkup).toContain('Start meeting early');
    expect(ownerMarkup).toContain('Scheduled to start');
    expect(ownerMarkup).toContain('Starts in 30 min');
    expect(ownerMarkup).toContain('aria-label="Open countdown in pop-out"');
    expect(ownerMarkup).toContain('Open countdown');
    expect(participantMarkup).toContain('Live meeting has not started');
    expect(participantMarkup).toContain('aria-label="Open countdown in pop-out"');
    expect(participantMarkup).toContain('Open countdown');
    expect(participantMarkup).not.toContain('Start meeting early');
    expect(participantMarkup).not.toContain('Join meeting');
  });

  test('uses a second-precise final countdown and exposes pending status', () => {
    const markup = renderToStaticMarkup(
      <MeetingLifecyclePanel
        lifecycle={{
          phase: 'before-start',
          canStartEarly: true,
          canJoinMedia: false,
          secondsUntilStart: 299,
        }}
        schedule={schedule}
        starting
        errorMessage="Could not start the meeting. Try again."
        onStartEarly={() => undefined}
      />,
    );

    expect(markup).toContain('04:59');
    expect(markup).toContain('Starting…');
    expect(markup).toContain('Could not start the meeting. Try again.');
  });

  test('renders a terminal workspace state without media entry', () => {
    const markup = renderToStaticMarkup(
      <MeetingLifecyclePanel
        lifecycle={{
          phase: 'ended',
          canStartEarly: false,
          canJoinMedia: false,
        }}
        schedule={schedule}
        onOpenCountdown={() => undefined}
      />,
    );

    expect(markup).toContain('Meeting ended');
    expect(markup).toContain('Scheduled');
    expect(markup).not.toContain('Join meeting');
    expect(markup).not.toContain('Start meeting early');
    expect(markup).not.toContain('Open countdown');
  });

  test('shows one quiet blocked-popup issue without replacing early-start errors', () => {
    const markup = renderToStaticMarkup(
      <MeetingLifecyclePanel
        lifecycle={{
          phase: 'before-start',
          canStartEarly: true,
          canJoinMedia: false,
          secondsUntilStart: 1_800,
        }}
        schedule={schedule}
        countdownPopoutIssue
        errorMessage="Could not start the meeting. Try again."
        onStartEarly={() => undefined}
        onOpenCountdown={() => undefined}
      />,
    );
    expect(markup).toContain(
      'Could not open the countdown window. Allow pop-ups and try again.',
    );
    expect(markup).toContain('Could not start the meeting. Try again.');
    expect(markup.match(/role="status"/gu)).toHaveLength(2);
  });
});
