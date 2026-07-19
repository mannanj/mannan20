'use client';

import { useEffect, useReducer, useRef } from 'react';
import {
  MeetingTitleClientError,
  MeetingTitleMutationAttempt,
  loadMeetingTitleRevisions,
  restoreMeetingTitle,
  updateMeetingTitle,
  updateMeetingTitlePolicy,
  type MeetingTitleMutation,
  MeetingTitleEditPolicy,
  MeetingTitleMutationCommand,
  MeetingTitlePolicyResult,
  MeetingTitleRevision,
  MeetingTitleRevisionPage,
  MeetingTitleMutationResult,
} from '@/lib/meeting-title-revisions';

interface Authority {
  readonly title: string | null;
  readonly titleEditPolicy: MeetingTitleEditPolicy;
  readonly version: number;
}

export interface MeetingTitleDialogState extends Authority {
  readonly open: boolean;
  readonly historyPhase: 'idle' | 'loading' | 'ready' | 'error';
  readonly revisions: readonly MeetingTitleRevision[];
  readonly nextCursor?: string;
  readonly loadingEarlier: boolean;
  readonly draftTitle: string;
  readonly reason: string;
  readonly draftPolicy: MeetingTitleEditPolicy;
  readonly pending: MeetingTitleMutationCommand | null;
  readonly feedback: 'success' | 'failure' | 'conflict' | null;
}

export function initialMeetingTitleDialogState(
  authority: Authority,
): MeetingTitleDialogState {
  return {
    title: authority.title,
    titleEditPolicy: authority.titleEditPolicy,
    version: authority.version,
    open: false,
    historyPhase: 'idle',
    revisions: [],
    loadingEarlier: false,
    draftTitle: authority.title ?? '',
    reason: '',
    draftPolicy: authority.titleEditPolicy,
    pending: null,
    feedback: null,
  };
}

type Action =
  | { readonly type: 'authority_changed'; readonly authority: Authority }
  | { readonly type: 'open' }
  | { readonly type: 'close' }
  | {
      readonly type: 'history_loaded';
      readonly page: MeetingTitleRevisionPage;
      readonly append: boolean;
    }
  | { readonly type: 'history_failed' }
  | { readonly type: 'history_loading_earlier' }
  | { readonly type: 'draft_title'; readonly title: string }
  | { readonly type: 'reason'; readonly reason: string }
  | { readonly type: 'policy'; readonly policy: MeetingTitleEditPolicy }
  | {
      readonly type: 'mutation_started';
      readonly command: MeetingTitleMutationCommand;
    }
  | {
      readonly type: 'mutation_succeeded';
      readonly command: MeetingTitleMutationCommand;
      readonly result: MeetingTitleMutationResult | MeetingTitlePolicyResult;
    }
  | {
      readonly type: 'mutation_failed';
      readonly command: MeetingTitleMutationCommand;
    }
  | {
      readonly type: 'mutation_conflict';
      readonly command: MeetingTitleMutationCommand;
      readonly authority: Authority;
    };

function sameCommand(
  pending: MeetingTitleMutationCommand | null,
  command: MeetingTitleMutationCommand,
): boolean {
  return pending === command
    || (
      pending?.idempotencyKey === command.idempotencyKey
      && pending.version === command.version
      && JSON.stringify(pending.mutation) === JSON.stringify(command.mutation)
    );
}

export function meetingTitleDialogTransition(
  state: MeetingTitleDialogState,
  action: Action,
): MeetingTitleDialogState {
  if (action.type === 'authority_changed') {
    if (state.pending !== null) return state;
    if (!state.open) return initialMeetingTitleDialogState(action.authority);
    return {
      ...state,
      ...action.authority,
      draftTitle: state.draftTitle === (state.title ?? '')
        ? action.authority.title ?? ''
        : state.draftTitle,
      draftPolicy: state.draftPolicy === state.titleEditPolicy
        ? action.authority.titleEditPolicy
        : state.draftPolicy,
    };
  }
  if (action.type === 'open') {
    return state.open ? state : {
      ...state,
      open: true,
      historyPhase: 'loading',
      feedback: null,
    };
  }
  if (action.type === 'close') {
    if (state.pending !== null) return state;
    return initialMeetingTitleDialogState(state);
  }
  if (action.type === 'history_loaded') {
    if (!state.open) return state;
    const revisions = action.append
      ? [...state.revisions, ...action.page.revisions.filter(
          (candidate) => !state.revisions.some(
            (existing) => existing.id === candidate.id,
          ),
        )]
      : [...action.page.revisions];
    return {
      ...state,
      historyPhase: 'ready',
      revisions,
      ...(action.page.nextCursor === undefined
        ? { nextCursor: undefined }
        : { nextCursor: action.page.nextCursor }),
      loadingEarlier: false,
    };
  }
  if (action.type === 'history_failed') {
    return state.open ? {
      ...state,
      historyPhase: state.revisions.length === 0 ? 'error' : 'ready',
      loadingEarlier: false,
    } : state;
  }
  if (action.type === 'history_loading_earlier') {
    return state.open && state.historyPhase === 'ready'
      && !state.loadingEarlier && state.nextCursor !== undefined
      ? { ...state, loadingEarlier: true }
      : state;
  }
  if (action.type === 'draft_title') {
    return state.pending === null ? {
      ...state,
      draftTitle: action.title,
      feedback: null,
    } : state;
  }
  if (action.type === 'reason') {
    return state.pending === null ? {
      ...state,
      reason: action.reason,
      feedback: null,
    } : state;
  }
  if (action.type === 'policy') {
    return state.pending === null ? {
      ...state,
      draftPolicy: action.policy,
      feedback: null,
    } : state;
  }
  if (action.type === 'mutation_started') {
    return state.pending === null
      ? { ...state, pending: action.command, feedback: null }
      : state;
  }
  if (!sameCommand(state.pending, action.command)) return state;
  if (action.type === 'mutation_failed') {
    return { ...state, pending: null, feedback: 'failure' };
  }
  if (action.type === 'mutation_conflict') {
    return {
      ...state,
      ...action.authority,
      pending: null,
      feedback: 'conflict',
    };
  }
  const revision = 'revision' in action.result
    ? action.result.revision
    : undefined;
  return {
    ...state,
    title: action.result.title,
    titleEditPolicy: action.result.titleEditPolicy,
    version: action.result.version,
    draftTitle: action.result.title ?? '',
    draftPolicy: action.result.titleEditPolicy,
    reason: '',
    pending: null,
    feedback: 'success',
    ...(revision === undefined
      ? {}
      : {
          revisions: [
            revision,
            ...state.revisions.filter((item) => item.id !== revision.id),
          ],
        }),
  };
}

export function MeetingTitleControlView({
  state,
  canEdit,
  canManagePolicy,
  currentParticipantId,
  currentParticipantIds,
  onOpen,
  onClose,
  onTitleChange,
  onReasonChange,
  onPolicyChange,
  onSave,
  onRestore,
  onLoadEarlier,
}: {
  state: MeetingTitleDialogState;
  canEdit: boolean;
  canManagePolicy: boolean;
  currentParticipantId: string;
  currentParticipantIds: readonly string[];
  onOpen(): void;
  onClose(): void;
  onTitleChange(value: string): void;
  onReasonChange(value: string): void;
  onPolicyChange(value: MeetingTitleEditPolicy): void;
  onSave(): void;
  onRestore(revisionId: string): void;
  onLoadEarlier(): void;
}) {
  const pending = state.pending !== null;
  const editorLabel = (revision: MeetingTitleRevision): string => {
    if (revision.editor.participantId === currentParticipantId) return 'You';
    if (revision.editor.identityKind === 'browser_guest') {
      return revision.editor.displayName ?? 'Former participant';
    }
    return currentParticipantIds.includes(revision.editor.participantId)
      ? 'Account participant'
      : 'Former participant';
  };
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-11 items-center rounded-md border border-white/10 px-3.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
      >
        {canEdit ? 'Edit title and history' : 'View title history'}
      </button>
      {state.open && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="meeting-title-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            onClose();
          }}
          className="fixed inset-0 z-50 m-auto max-h-[min(760px,calc(100vh-2rem))] w-[min(680px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/12 bg-[#121210] p-0 text-white shadow-2xl backdrop:bg-black/75"
        >
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="meeting-title-dialog-title" className="font-[family-name:var(--font-caption)] text-3xl tracking-[-0.03em]">
                  Title &amp; history
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Current participants can review how this title changed.
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                aria-label="Close title and history"
                className="min-h-11 min-w-11 rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-40"
              >
                Close
              </button>
            </div>

            {canEdit && (
              <section aria-label="Edit meeting title" className="mt-7 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <label htmlFor="meeting-title-draft" className="block text-xs font-medium uppercase tracking-[0.13em] text-white/45">
                  Meeting title
                </label>
                <input
                  id="meeting-title-draft"
                  value={state.draftTitle}
                  maxLength={200}
                  disabled={pending}
                  placeholder="Untitled meeting"
                  onChange={(event) => onTitleChange(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-55"
                />
                <label htmlFor="meeting-title-reason" className="mt-4 block text-xs font-medium uppercase tracking-[0.13em] text-white/45">
                  Reason for change <span className="normal-case tracking-normal text-white/25">(optional)</span>
                </label>
                <textarea
                  id="meeting-title-reason"
                  value={state.reason}
                  maxLength={500}
                  rows={2}
                  disabled={pending}
                  onChange={(event) => onReasonChange(event.target.value)}
                  className="mt-2 w-full resize-none rounded-md border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-55"
                />
                {canManagePolicy && (
                  <label className="mt-4 block text-xs font-medium uppercase tracking-[0.13em] text-white/45">
                    Who can edit
                    <select
                      value={state.draftPolicy}
                      disabled={pending}
                      onChange={(event) => onPolicyChange(event.target.value as MeetingTitleEditPolicy)}
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#191916] px-3 text-sm normal-case tracking-normal text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-55"
                    >
                      <option value="administrators">Owners and moderators</option>
                      <option value="any_participant">Everyone in this meeting</option>
                    </select>
                  </label>
                )}
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onSave}
                    className="min-h-11 rounded-md bg-[#f1efe8] px-4 text-sm font-medium text-black hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:cursor-wait disabled:opacity-50"
                  >
                    {pending ? 'Saving…' : 'Save title'}
                  </button>
                </div>
              </section>
            )}

            <div aria-live="polite" className="mt-4 min-h-5 text-xs text-amber-100/70">
              {state.feedback === 'failure'
                ? 'Could not update the title. Try again.'
                : state.feedback === 'conflict'
                  ? 'The meeting changed. Review and try again.'
                  : state.feedback === 'success'
                    ? 'Title updated.'
                    : ''}
            </div>

            <section aria-label="Title history" className="mt-5 border-t border-white/8 pt-5">
              {state.historyPhase === 'loading' ? (
                <p className="text-sm text-white/45">Loading title history…</p>
              ) : state.historyPhase === 'error' ? (
                <p role="status" className="text-sm text-amber-100/70">Could not load title history. Try again.</p>
              ) : state.revisions.length === 0 ? (
                <p className="text-sm text-white/45">No title changes yet.</p>
              ) : (
                <ol className="space-y-3">
                  {state.revisions.map((revision) => (
                    <li key={revision.id} className="rounded-xl border border-white/8 p-4">
                      <p className="text-sm font-medium text-white/85">{revision.title ?? 'Untitled meeting'}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {editorLabel(revision)} ·{' '}
                        <time dateTime={revision.createdAt}>
                          {new Date(revision.createdAt).toLocaleString()}
                        </time>
                      </p>
                      {revision.reason && <p className="mt-2 text-xs leading-5 text-white/50">{revision.reason}</p>}
                      {canEdit && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRestore(revision.id)}
                          className="mt-3 min-h-11 rounded-md border border-white/10 px-3 text-xs text-white/60 hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-45"
                        >
                          Restore this title
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {state.nextCursor !== undefined && state.historyPhase === 'ready' && (
                <button
                  type="button"
                  disabled={state.loadingEarlier}
                  onClick={onLoadEarlier}
                  className="mt-4 min-h-11 rounded-md px-3 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:opacity-50"
                >
                  {state.loadingEarlier ? 'Loading earlier changes…' : 'Show earlier changes'}
                </button>
              )}
            </section>
          </div>
        </dialog>
      )}
    </>
  );
}

export interface MeetingTitleControlProps extends Authority {
  readonly meetingId: string;
  readonly canEdit: boolean;
  readonly canManagePolicy: boolean;
  readonly currentParticipantId: string;
  readonly currentParticipantIds: readonly string[];
  onWorkspaceChange(update: Authority): void;
  onConflict(): Promise<Authority>;
}

export function MeetingTitleControl(props: MeetingTitleControlProps) {
  const [state, dispatch] = useReducer(
    meetingTitleDialogTransition,
    props,
    initialMeetingTitleDialogState,
  );
  const attempt = useRef<MeetingTitleMutationAttempt | null>(null);
  if (attempt.current === null) attempt.current = new MeetingTitleMutationAttempt();
  const historyLoad = useRef<Promise<void> | null>(null);

  useEffect(() => {
    dispatch({
      type: 'authority_changed',
      authority: {
        title: props.title,
        titleEditPolicy: props.titleEditPolicy,
        version: props.version,
      },
    });
  }, [props.title, props.titleEditPolicy, props.version]);

  const loadHistory = (
    beforeRevisionId?: string,
  ): Promise<void> => {
    if (historyLoad.current !== null) return historyLoad.current;
    const request = (async () => {
      try {
        const page = await loadMeetingTitleRevisions({
          meetingId: props.meetingId,
          ...(beforeRevisionId === undefined ? {} : { beforeRevisionId }),
        });
        dispatch({
          type: 'history_loaded',
          page,
          append: beforeRevisionId !== undefined,
        });
      } catch {
        dispatch({ type: 'history_failed' });
      }
    })();
    historyLoad.current = request;
    void request.finally(() => {
      if (historyLoad.current === request) historyLoad.current = null;
    });
    return request;
  };

  const refreshHistory = async (): Promise<void> => {
    if (historyLoad.current !== null) await historyLoad.current;
    await loadHistory();
  };

  const handleFailure = async (
    command: MeetingTitleMutationCommand,
    error: unknown,
  ): Promise<void> => {
    if (
      error instanceof MeetingTitleClientError
      && (error.code === 'meeting_conflict' || error.code === 'title_unchanged')
    ) {
      attempt.current!.conflict();
      try {
        const authority = await props.onConflict();
        dispatch({ type: 'mutation_conflict', command, authority });
        await refreshHistory();
      } catch {
        dispatch({ type: 'mutation_failed', command });
      }
      return;
    }
    attempt.current!.failed();
    dispatch({ type: 'mutation_failed', command });
  };

  const execute = async (
    version: number,
    mutation: MeetingTitleMutation,
  ): Promise<MeetingTitleMutationResult | MeetingTitlePolicyResult | null> => {
    let command: MeetingTitleMutationCommand;
    try {
      command = attempt.current!.begin(version, mutation);
    } catch {
      return null;
    }
    dispatch({ type: 'mutation_started', command });
    try {
      const result = command.mutation.kind === 'update_title'
        ? await updateMeetingTitle({
            meetingId: props.meetingId,
            version: command.version,
            idempotencyKey: command.idempotencyKey,
            title: command.mutation.title,
            ...(command.mutation.reason === undefined
              ? {}
              : { reason: command.mutation.reason }),
          })
        : command.mutation.kind === 'update_policy'
          ? await updateMeetingTitlePolicy({
              meetingId: props.meetingId,
              version: command.version,
              idempotencyKey: command.idempotencyKey,
              policy: command.mutation.policy,
            })
          : await restoreMeetingTitle({
              meetingId: props.meetingId,
              revisionId: command.mutation.revisionId,
              version: command.version,
              idempotencyKey: command.idempotencyKey,
              ...(command.mutation.reason === undefined
                ? {}
                : { reason: command.mutation.reason }),
            });
      attempt.current!.complete();
      dispatch({ type: 'mutation_succeeded', command, result });
      const authority = {
        title: result.title,
        titleEditPolicy: result.titleEditPolicy,
        version: result.version,
      };
      props.onWorkspaceChange(authority);
      await refreshHistory();
      return result;
    } catch (error) {
      await handleFailure(command, error);
      return null;
    }
  };

  const save = async () => {
    if (!props.canEdit || state.pending !== null) return;
    const title = state.draftTitle.trim() || null;
    const reason = state.reason.trim() || undefined;
    const desiredPolicy = state.draftPolicy;
    const titleChanged = title !== state.title;
    const policyChanged = props.canManagePolicy
      && desiredPolicy !== state.titleEditPolicy;
    let version = state.version;
    if (titleChanged) {
      const result = await execute(version, {
        kind: 'update_title',
        title,
        ...(reason === undefined ? {} : { reason }),
      });
      if (result === null) return;
      version = result.version;
    }
    if (policyChanged) {
      await execute(version, {
        kind: 'update_policy',
        policy: desiredPolicy,
      });
    }
  };

  return (
    <MeetingTitleControlView
      state={state}
      canEdit={props.canEdit}
      canManagePolicy={props.canManagePolicy}
      currentParticipantId={props.currentParticipantId}
      currentParticipantIds={props.currentParticipantIds}
      onOpen={() => {
        dispatch({ type: 'open' });
        void loadHistory();
      }}
      onClose={() => {
        if (state.pending !== null) return;
        attempt.current?.cancel();
        dispatch({ type: 'close' });
      }}
      onTitleChange={(title) => {
        attempt.current?.cancel();
        dispatch({ type: 'draft_title', title });
      }}
      onReasonChange={(reason) => {
        attempt.current?.cancel();
        dispatch({ type: 'reason', reason });
      }}
      onPolicyChange={(policy) => {
        attempt.current?.cancel();
        dispatch({ type: 'policy', policy });
      }}
      onSave={() => void save()}
      onRestore={(revisionId) => {
        if (!props.canEdit || state.pending !== null) return;
        const reason = state.reason.trim() || undefined;
        void execute(state.version, {
          kind: 'restore_title',
          revisionId,
          ...(reason === undefined ? {} : { reason }),
        });
      }}
      onLoadEarlier={() => {
        if (state.nextCursor === undefined || state.loadingEarlier) return;
        dispatch({ type: 'history_loading_earlier' });
        void loadHistory(state.nextCursor);
      }}
    />
  );
}
