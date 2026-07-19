import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  UpcomingMeeting,
  UpcomingMeetingPage,
} from '@/lib/meeting-directory';
import {
  MeetingUpcomingListView,
  meetingUpcomingListTransition,
  type MeetingUpcomingListState,
} from './meeting-upcoming-list';

const MEETING_ID = 'meeting_0123456789abcdef';
const SECOND_MEETING_ID = 'meeting_abcdef0123456789';

function meeting(
  overrides: Partial<UpcomingMeeting> = {},
): UpcomingMeeting {
  return {
    meetingId: MEETING_ID,
    title: 'Planning review',
    status: 'scheduled',
    role: 'owner',
    startsAt: '2026-07-20T14:00:00.000Z',
    endsAt: '2026-07-20T15:00:00.000Z',
    durationSeconds: 3600,
    participantCount: 2,
    version: 3,
    canonicalPath: `/meet/${MEETING_ID}`,
    ...overrides,
  };
}

function page(
  meetings: readonly UpcomingMeeting[],
  nextCursor?: string,
): UpcomingMeetingPage {
  return {
    serverNow: '2026-07-19T12:00:00.000Z',
    meetings,
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

function state(
  overrides: Partial<MeetingUpcomingListState> = {},
): MeetingUpcomingListState {
  return {
    phase: 'idle',
    meetings: [],
    refreshing: false,
    paging: false,
    issue: null,
    ...overrides,
  };
}

function render(value: MeetingUpcomingListState): string {
  return renderToStaticMarkup(
    <MeetingUpcomingListView
      state={value}
      onRetry={() => undefined}
      onShowMore={() => undefined}
    />,
  );
}

describe('meeting upcoming list transitions', () => {
  test('moves through initial loading, ready, and empty states', () => {
    let current = meetingUpcomingListTransition(state(), {
      type: 'load_started',
      kind: 'initial',
    });
    expect(current).toEqual(state({ phase: 'loading' }));
    current = meetingUpcomingListTransition(current, {
      type: 'load_succeeded',
      kind: 'initial',
      page: page([meeting()], 'cursor_1'),
    });
    expect(current).toEqual(state({
      phase: 'ready',
      meetings: [meeting()],
      nextCursor: 'cursor_1',
    }));

    const empty = meetingUpcomingListTransition(state({ phase: 'loading' }), {
      type: 'load_succeeded',
      kind: 'initial',
      page: page([]),
    });
    expect(empty).toEqual(state({ phase: 'ready' }));
  });

  test('retains rows through refresh failure, retry, and cursor replacement', () => {
    const original = state({
      phase: 'ready',
      meetings: [meeting()],
      nextCursor: 'cursor_1',
    });
    let current = meetingUpcomingListTransition(original, {
      type: 'load_started',
      kind: 'refresh',
    });
    expect(current).toMatchObject({
      meetings: original.meetings,
      refreshing: true,
      issue: null,
    });
    current = meetingUpcomingListTransition(current, {
      type: 'load_failed',
      kind: 'refresh',
    });
    expect(current).toEqual({
      ...original,
      issue: 'refresh',
    });
    current = meetingUpcomingListTransition(current, { type: 'retry' });
    expect(current).toMatchObject({ refreshing: true, issue: null });
    const replacement = meeting({ title: 'Updated planning review', version: 4 });
    current = meetingUpcomingListTransition(current, {
      type: 'load_succeeded',
      kind: 'refresh',
      page: page([replacement], 'cursor_2'),
    });
    expect(current).toEqual(state({
      phase: 'ready',
      meetings: [replacement],
      nextCursor: 'cursor_2',
    }));
  });

  test('appends a page without duplicates and replaces its cursor', () => {
    const first = meeting();
    const second = meeting({
      meetingId: SECOND_MEETING_ID,
      title: null,
      role: 'participant',
      startsAt: '2026-07-21T14:00:00.000Z',
      endsAt: '2026-07-21T15:00:00.000Z',
      canonicalPath: `/meet/${SECOND_MEETING_ID}`,
    });
    let current = meetingUpcomingListTransition(state({
      phase: 'ready',
      meetings: [first],
      nextCursor: 'cursor_1',
    }), {
      type: 'load_started',
      kind: 'page',
    });
    expect(current).toMatchObject({ paging: true, issue: null });
    current = meetingUpcomingListTransition(current, {
      type: 'load_succeeded',
      kind: 'page',
      page: page([first, second], 'cursor_2'),
    });
    expect(current).toEqual(state({
      phase: 'ready',
      meetings: [first, second],
      nextCursor: 'cursor_2',
    }));
  });

  test('represents initial and page errors with exact retry targets', () => {
    const initial = meetingUpcomingListTransition(
      state({ phase: 'loading' }),
      { type: 'load_failed', kind: 'initial' },
    );
    expect(initial).toEqual(state({ phase: 'error', issue: 'initial' }));
    expect(meetingUpcomingListTransition(initial, { type: 'retry' }))
      .toEqual(state({ phase: 'loading' }));

    const ready = state({
      phase: 'ready',
      meetings: [meeting()],
      nextCursor: 'cursor_1',
    });
    const pageError = meetingUpcomingListTransition(
      { ...ready, paging: true },
      { type: 'load_failed', kind: 'page' },
    );
    expect(pageError).toEqual({ ...ready, issue: 'page' });
    expect(meetingUpcomingListTransition(pageError, { type: 'retry' }))
      .toEqual({ ...ready, paging: true, issue: null });
  });
});

describe('meeting upcoming list view', () => {
  test('renders a semantic restrained meeting ledger with safe consumer labels', () => {
    const live = meeting({
      status: 'live',
      role: 'moderator',
      participantCount: 1,
    });
    const scheduled = meeting({
      meetingId: SECOND_MEETING_ID,
      title: null,
      role: 'participant',
      startsAt: '2026-07-21T14:00:00.000Z',
      endsAt: '2026-07-21T15:30:00.000Z',
      durationSeconds: 5400,
      participantCount: 3,
      canonicalPath: `/meet/${SECOND_MEETING_ID}`,
    });
    const markup = render(state({
      phase: 'ready',
      meetings: [live, scheduled],
    }));
    expect(markup).toContain('Your meetings');
    expect(markup).toContain('<ul');
    expect(markup).toContain('<li');
    expect(markup).toContain('Planning review');
    expect(markup).toContain('Untitled meeting');
    expect(markup).toContain('Live now');
    expect(markup).toContain('<time');
    expect(markup).toContain('dateTime="2026-07-21T14:00:00.000Z"');
    expect(markup).toContain(
      new Date('2026-07-21T14:00:00.000Z').toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    );
    expect(markup).toContain('Moderator');
    expect(markup).toContain('Participant');
    expect(markup).toContain('1 participant');
    expect(markup).toContain('3 participants');
    expect(markup).toContain('1 hour');
    expect(markup).toContain('90 minutes');
    expect(markup.match(/Open meeting/gu)).toHaveLength(2);
    expect(markup).toContain(`href="/meet/${MEETING_ID}"`);
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('focus-visible:outline');
    expect(markup).not.toMatch(/person@example\.com|attendee|avatar/i);
  });

  test('renders quiet loading, empty, and initial failure states', () => {
    const loading = render(state({ phase: 'loading' }));
    expect(loading).toContain('Your meetings');
    expect(loading).toContain('aria-label="Loading meetings"');
    expect(loading).not.toContain('Open meeting');

    expect(render(state({ phase: 'ready' }))).toContain(
      'No upcoming meetings.',
    );
    const failed = render(state({ phase: 'error', issue: 'initial' }));
    expect(failed).toContain('Could not load your meetings.');
    expect(failed).toContain('Try again');
    expect(failed).toContain('min-h-11');
  });

  test('retains rows with refresh/page errors and exposes bounded paging states', () => {
    const base = state({
      phase: 'ready',
      meetings: [meeting()],
      nextCursor: 'cursor_1',
    });
    const refresh = render({ ...base, issue: 'refresh' });
    expect(refresh).toContain('Planning review');
    expect(refresh).toContain('Could not refresh.');
    expect(refresh).toContain('Try again');

    const pageError = render({ ...base, issue: 'page' });
    expect(pageError).toContain('Could not load more meetings.');
    expect(pageError).toContain('Show more meetings');

    const paging = render({ ...base, paging: true });
    expect(paging).toContain('Loading more meetings…');
    expect(paging).not.toContain('Show more meetings');
  });
});
