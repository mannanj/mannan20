import Link from 'next/link';
import type {
  UpcomingMeeting,
  UpcomingMeetingPage,
} from '@/lib/meeting-directory';

export type MeetingUpcomingListState = {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly meetings: readonly UpcomingMeeting[];
  readonly nextCursor?: string;
  readonly refreshing: boolean;
  readonly paging: boolean;
  readonly issue: 'initial' | 'refresh' | 'page' | null;
};

export type MeetingUpcomingListEvent =
  | {
    readonly type: 'load_started';
    readonly kind: 'initial' | 'refresh' | 'page';
  }
  | {
    readonly type: 'load_succeeded';
    readonly kind: 'initial' | 'refresh' | 'page';
    readonly page: UpcomingMeetingPage;
  }
  | {
    readonly type: 'load_failed';
    readonly kind: 'initial' | 'refresh' | 'page';
  }
  | { readonly type: 'retry' };

function pageState(
  state: MeetingUpcomingListState,
  meetings: readonly UpcomingMeeting[],
  nextCursor: string | undefined,
): MeetingUpcomingListState {
  return {
    ...state,
    phase: 'ready',
    meetings,
    ...(nextCursor === undefined ? {} : { nextCursor }),
    refreshing: false,
    paging: false,
    issue: null,
  };
}

function withoutCursor(
  state: MeetingUpcomingListState,
): Omit<MeetingUpcomingListState, 'nextCursor'> {
  const { nextCursor: _nextCursor, ...rest } = state;
  return rest;
}

export function meetingUpcomingListTransition(
  state: MeetingUpcomingListState,
  event: MeetingUpcomingListEvent,
): MeetingUpcomingListState {
  if (event.type === 'retry') {
    if (state.issue === 'initial') {
      return {
        ...withoutCursor(state),
        phase: 'loading',
        refreshing: false,
        paging: false,
        issue: null,
      };
    }
    if (state.issue === 'refresh') {
      return { ...state, refreshing: true, paging: false, issue: null };
    }
    if (state.issue === 'page') {
      return { ...state, refreshing: false, paging: true, issue: null };
    }
    return state;
  }

  if (event.type === 'load_started') {
    if (event.kind === 'initial') {
      return {
        ...withoutCursor(state),
        phase: 'loading',
        meetings: [],
        refreshing: false,
        paging: false,
        issue: null,
      };
    }
    return {
      ...state,
      phase: 'ready',
      refreshing: event.kind === 'refresh',
      paging: event.kind === 'page',
      issue: null,
    };
  }

  if (event.type === 'load_failed') {
    return {
      ...state,
      phase: event.kind === 'initial' ? 'error' : 'ready',
      refreshing: false,
      paging: false,
      issue: event.kind,
    };
  }

  if (event.kind !== 'page') {
    return pageState(
      withoutCursor(state),
      event.page.meetings,
      event.page.nextCursor,
    );
  }

  const meetings = [...state.meetings];
  const seen = new Set(meetings.map(({ meetingId }) => meetingId));
  for (const meeting of event.page.meetings) {
    if (!seen.has(meeting.meetingId)) {
      meetings.push(meeting);
      seen.add(meeting.meetingId);
    }
  }
  return pageState(withoutCursor(state), meetings, event.page.nextCursor);
}

function roleLabel(role: UpcomingMeeting['role']): string {
  return `${role.slice(0, 1).toUpperCase()}${role.slice(1)}`;
}

function participantLabel(count: number): string {
  return `${count} ${count === 1 ? 'participant' : 'participants'}`;
}

function durationLabel(seconds: number): string {
  if (seconds % 3_600 === 0) {
    const hours = seconds / 3_600;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${seconds / 60} minutes`;
}

function Issue({
  issue,
  onRetry,
}: {
  readonly issue: NonNullable<MeetingUpcomingListState['issue']>;
  readonly onRetry: () => void;
}) {
  const copy = issue === 'initial'
    ? 'Could not load your meetings.'
    : issue === 'refresh'
      ? 'Could not refresh.'
      : 'Could not load more meetings.';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-red-100/65">
      <p>{copy}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-md px-2 text-[#f1efe8]/65 underline decoration-white/20 underline-offset-4 transition hover:text-[#f1efe8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
      >
        Try again
      </button>
    </div>
  );
}

function LoadingLedger() {
  return (
    <div aria-label="Loading meetings" className="divide-y divide-white/[0.07] border-y border-white/[0.09]">
      {[0, 1].map((row) => (
        <div key={row} className="grid min-h-28 animate-pulse content-center gap-3 py-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="h-3 w-20 rounded-full bg-white/[0.07]" />
            <div className="mt-4 h-5 w-48 max-w-2/3 rounded-full bg-white/[0.09]" />
          </div>
          <div className="h-11 w-28 rounded-md bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function MeetingUpcomingListView({
  state,
  onRetry,
  onShowMore,
}: {
  readonly state: MeetingUpcomingListState;
  readonly onRetry: () => void;
  readonly onShowMore: () => void;
}): React.ReactNode {
  const initialIssue = state.issue === 'initial';
  return (
    <section aria-labelledby="upcoming-meetings-heading">
      <div className="mb-5 flex min-h-11 items-center justify-between gap-4">
        <h2
          id="upcoming-meetings-heading"
          className="text-xs font-medium uppercase tracking-[0.18em] text-white/45"
        >
          Your meetings
        </h2>
        {state.refreshing && (
          <span className="text-[11px] text-white/30">Refreshing…</span>
        )}
      </div>

      {state.phase === 'loading' ? (
        <LoadingLedger />
      ) : initialIssue ? (
        <div className="border-y border-white/[0.09] py-7">
          <Issue issue="initial" onRetry={onRetry} />
        </div>
      ) : state.meetings.length === 0 ? (
        <p className="border-y border-white/[0.09] py-10 text-sm text-white/40">
          No upcoming meetings.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.07] border-y border-white/[0.09]">
          {state.meetings.map((meeting) => (
            <li
              key={meeting.meetingId}
              className="group grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.13em] text-white/35">
                  {meeting.status === 'live' ? (
                    <span className="text-emerald-200/70">Live now</span>
                  ) : (
                    <time dateTime={meeting.startsAt}>
                      {new Date(meeting.startsAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{durationLabel(meeting.durationSeconds)}</span>
                </div>
                <p className="mt-2 truncate font-[family-name:var(--font-caption)] text-2xl tracking-[-0.025em] text-[#f1efe8]">
                  {meeting.title ?? 'Untitled meeting'}
                </p>
                <p className="mt-2 text-xs text-white/35">
                  {roleLabel(meeting.role)} · {participantLabel(meeting.participantCount)}
                </p>
              </div>
              <Link
                href={meeting.canonicalPath}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/10 px-4 text-xs font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
              >
                Open meeting
              </Link>
            </li>
          ))}
        </ul>
      )}

      {state.issue !== null && state.issue !== 'initial' && (
        <div className="mt-3">
          <Issue issue={state.issue} onRetry={onRetry} />
        </div>
      )}
      {state.nextCursor !== undefined && (
        <div className="mt-4">
          {state.paging ? (
            <p className="flex min-h-11 items-center text-xs text-white/35">
              Loading more meetings…
            </p>
          ) : (
            <button
              type="button"
              onClick={onShowMore}
              className="min-h-11 rounded-md border border-white/10 px-4 text-xs text-white/55 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
            >
              Show more meetings
            </button>
          )}
        </div>
      )}
    </section>
  );
}
