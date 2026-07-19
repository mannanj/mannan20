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
import * as meetingUpcomingListModule from './meeting-upcoming-list';

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

type ControllerFactory = (dependencies: {
  readonly document: {
    readonly visibilityState: 'visible' | 'hidden';
    addEventListener(type: 'visibilitychange', listener: () => void): void;
    removeEventListener(type: 'visibilitychange', listener: () => void): void;
  };
  readonly inFlight: { current: Promise<void> | null };
  readonly load: (cursor?: string) => Promise<UpcomingMeetingPage>;
  readonly dispatch: (
    event: Parameters<typeof meetingUpcomingListTransition>[1],
  ) => void;
  readonly setTimeout: (callback: () => void, delayMs: number) => number;
  readonly clearTimeout: (handle: number) => void;
}) => {
  readonly start: () => void;
  readonly stop: () => void;
  readonly refresh: () => Promise<void>;
  readonly retry: (
    issue: NonNullable<MeetingUpcomingListState['issue']>,
    nextCursor?: string,
  ) => Promise<void>;
  readonly showMore: (cursor: string) => Promise<void>;
};

const createController = (
  meetingUpcomingListModule as typeof meetingUpcomingListModule & {
    createMeetingUpcomingListController?: ControllerFactory;
  }
).createMeetingUpcomingListController;

class ControlledDocument {
  visibilityState: 'visible' | 'hidden' = 'visible';
  readonly #listeners = new Set<() => void>();

  addEventListener(type: 'visibilitychange', listener: () => void): void {
    if (type === 'visibilitychange') this.#listeners.add(listener);
  }

  removeEventListener(type: 'visibilitychange', listener: () => void): void {
    if (type === 'visibilitychange') this.#listeners.delete(listener);
  }

  setVisibility(visibilityState: 'visible' | 'hidden'): void {
    this.visibilityState = visibilityState;
    for (const listener of this.#listeners) listener();
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }
}

class ControlledTimers {
  #nextHandle = 1;
  readonly scheduled = new Map<number, { callback: () => void; delayMs: number }>();

  setTimeout = (callback: () => void, delayMs: number): number => {
    const handle = this.#nextHandle++;
    this.scheduled.set(handle, { callback, delayMs });
    return handle;
  };

  clearTimeout = (handle: number): void => {
    this.scheduled.delete(handle);
  };

  run(delayMs: number): void {
    const entry = [...this.scheduled.entries()]
      .find(([, scheduled]) => scheduled.delayMs === delayMs);
    if (entry === undefined) throw new Error(`missing_timer_${delayMs}`);
    this.scheduled.delete(entry[0]);
    entry[1].callback();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('meeting upcoming list controller', () => {
  test('loads once on mount and shares one in-flight promise', async () => {
    expect(createController).toBeFunction();
    const document = new ControlledDocument();
    const timers = new ControlledTimers();
    const first = deferred<UpcomingMeetingPage>();
    const cursors: Array<string | undefined> = [];
    const events: Array<Parameters<typeof meetingUpcomingListTransition>[1]> = [];
    const inFlight = { current: null as Promise<void> | null };
    const controller = createController!({
      document,
      inFlight,
      load: (cursor) => {
        cursors.push(cursor);
        return first.promise;
      },
      dispatch: (event) => events.push(event),
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    });

    controller.start();
    controller.start();
    const refresh = controller.refresh();
    const retry = controller.retry('refresh');
    expect(refresh).toBe(retry);
    controller.stop();
    controller.start();
    expect(cursors).toEqual([undefined]);
    expect(events).toEqual([{ type: 'load_started', kind: 'initial' }]);

    first.resolve(page([meeting()], 'cursor_1'));
    await refresh;
    expect(inFlight.current).toBeNull();
    expect(events.at(-1)).toEqual({
      type: 'load_succeeded',
      kind: 'initial',
      page: page([meeting()], 'cursor_1'),
    });
    expect([...timers.scheduled.values()].map(({ delayMs }) => delayMs))
      .toEqual([30_000]);
  });

  test('schedules only while visible and refreshes once when visibility returns', async () => {
    expect(createController).toBeFunction();
    const document = new ControlledDocument();
    const timers = new ControlledTimers();
    const loads: Array<ReturnType<typeof deferred<UpcomingMeetingPage>>> = [];
    let stateValue = state();
    const controller = createController!({
      document,
      inFlight: { current: null },
      load: () => {
        const load = deferred<UpcomingMeetingPage>();
        loads.push(load);
        return load.promise;
      },
      dispatch: (event) => {
        stateValue = meetingUpcomingListTransition(stateValue, event);
      },
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    });

    controller.start();
    loads[0]!.resolve(page([meeting()], 'cursor_1'));
    await settle();
    expect(timers.scheduled.size).toBe(1);
    document.setVisibility('hidden');
    expect(timers.scheduled.size).toBe(0);
    document.setVisibility('visible');
    document.setVisibility('visible');
    expect([...timers.scheduled.values()].map(({ delayMs }) => delayMs))
      .toEqual([0]);
    timers.run(0);
    expect(loads).toHaveLength(2);
    expect(stateValue.refreshing).toBeTrue();
    loads[1]!.resolve(page([meeting({ version: 4 })], 'cursor_2'));
    await settle();
    expect(stateValue).toEqual(state({
      phase: 'ready',
      meetings: [meeting({ version: 4 })],
      nextCursor: 'cursor_2',
    }));
    expect([...timers.scheduled.values()].map(({ delayMs }) => delayMs))
      .toEqual([30_000]);
  });

  test('retains rows after refresh failure and pages through the exact cursor', async () => {
    expect(createController).toBeFunction();
    const document = new ControlledDocument();
    const timers = new ControlledTimers();
    const calls: Array<string | undefined> = [];
    let stateValue = state({
      phase: 'ready',
      meetings: [meeting()],
      nextCursor: 'cursor_1',
    });
    const controller = createController!({
      document,
      inFlight: { current: null },
      load: async (cursor) => {
        calls.push(cursor);
        if (calls.length === 1) throw new Error('private dependency detail');
        return page([
          meeting(),
          meeting({
            meetingId: SECOND_MEETING_ID,
            canonicalPath: `/meet/${SECOND_MEETING_ID}`,
          }),
        ]);
      },
      dispatch: (event) => {
        stateValue = meetingUpcomingListTransition(stateValue, event);
      },
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    });

    await controller.refresh();
    expect(stateValue.meetings).toEqual([meeting()]);
    expect(stateValue.issue).toBe('refresh');
    await controller.showMore('cursor_1');
    expect(calls).toEqual([undefined, 'cursor_1']);
    expect(stateValue.meetings.map(({ meetingId }) => meetingId))
      .toEqual([MEETING_ID, SECOND_MEETING_ID]);
    expect(stateValue.nextCursor).toBeUndefined();
  });

  test('cleans up its one listener and timer', async () => {
    expect(createController).toBeFunction();
    const document = new ControlledDocument();
    const timers = new ControlledTimers();
    const controller = createController!({
      document,
      inFlight: { current: null },
      load: async () => page([]),
      dispatch: () => undefined,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    });
    controller.start();
    await settle();
    expect(document.listenerCount).toBe(1);
    expect(timers.scheduled.size).toBe(1);
    controller.stop();
    expect(document.listenerCount).toBe(0);
    expect(timers.scheduled.size).toBe(0);
  });
});
