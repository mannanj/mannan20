import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MeetingTitleMutationCommand,
  MeetingTitleRevision,
} from '@/lib/meeting-title-revisions';
import {
  MeetingTitleControlView,
  initialMeetingTitleDialogState,
  meetingTitleDialogTransition,
  type MeetingTitleDialogState,
} from './meeting-title-control';
import {
  applyMeetingTitleWorkspaceChange,
  loadMeetingTitleConflictAuthority,
  meetingTitleControlProjection,
} from './meeting-room';

const meetingId = 'meeting_0123456789abcdef';
const currentParticipantId = 'account_0123456789abcdef';
const firstRevision: MeetingTitleRevision = {
  id: 'revision_abcdef0123456789',
  meetingId,
  previousTitle: 'Planning',
  title: 'Project review',
  editor: {
    participantId: currentParticipantId,
    identityKind: 'account',
  },
  reason: 'Agenda changed',
  resultingVersion: 5,
  createdAt: '2026-07-19T15:00:00.000Z',
};
const secondRevision: MeetingTitleRevision = {
  id: 'revision_0123456789abcdef',
  meetingId,
  previousTitle: null,
  title: 'Planning',
  editor: {
    participantId: 'guest_0123456789abcdef',
    identityKind: 'browser_guest',
    displayName: 'River',
  },
  resultingVersion: 4,
  createdAt: '2026-07-19T14:00:00.000Z',
};

function readyState(
  overrides: Partial<MeetingTitleDialogState> = {},
): MeetingTitleDialogState {
  return {
    ...initialMeetingTitleDialogState({
      title: 'Project review',
      titleEditPolicy: 'administrators',
      version: 5,
    }),
    open: true,
    historyPhase: 'ready',
    revisions: [firstRevision, secondRevision],
    nextCursor: secondRevision.id,
    ...overrides,
  };
}

function render(
  overrides: Partial<Parameters<typeof MeetingTitleControlView>[0]> = {},
): string {
  return renderToStaticMarkup(
    <MeetingTitleControlView
      state={readyState({ open: false })}
      canEdit
      canManagePolicy
      currentParticipantId={currentParticipantId}
      currentParticipantIds={[
        currentParticipantId,
        'guest_0123456789abcdef',
        'account_other',
      ]}
      onOpen={() => undefined}
      onClose={() => undefined}
      onTitleChange={() => undefined}
      onReasonChange={() => undefined}
      onPolicyChange={() => undefined}
      onSave={() => undefined}
      onRestore={() => undefined}
      onLoadEarlier={() => undefined}
      {...overrides}
    />,
  );
}

describe('meeting title control view', () => {
  test('uses restrained edit and read-only triggers with visible focus and 44-pixel targets', () => {
    const editable = render();
    expect(editable).toContain('Edit title and history');
    expect(editable).toContain('min-h-11');
    expect(editable).toContain('focus-visible:outline');
    expect(editable).not.toContain('<dialog');

    const readOnly = render({ canEdit: false, canManagePolicy: false });
    expect(readOnly).toContain('View title history');
    expect(readOnly).toContain('min-h-11');
  });

  test('renders one native open dialog with exact consumer editing controls', () => {
    const markup = render({ state: readyState() });
    expect(markup).toContain('<dialog');
    expect(markup).toContain('open=""');
    expect(markup).toContain('aria-labelledby="meeting-title-dialog-title"');
    expect(markup).toContain('Title &amp; history');
    expect(markup).toContain('Meeting title');
    expect(markup).toContain('value="Project review"');
    expect(markup).toContain('maxLength="200"');
    expect(markup).toContain('Reason for change');
    expect(markup).toContain('maxLength="500"');
    expect(markup).toContain('Save title');
    expect(markup).toContain('Who can edit');
    expect(markup).toContain('Owners and moderators');
    expect(markup).toContain('Everyone in this meeting');
    expect(markup).not.toContain('administrators</option>');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('focus-visible:outline');
  });

  test('represents an untitled meeting with an empty title input', () => {
    const markup = render({
      state: readyState({
        title: null,
        draftTitle: '',
      }),
    });
    expect(markup).toContain('value=""');
    expect(markup).toContain('placeholder="Untitled meeting"');
  });

  test('shows newest-first safe history labels, localized times, reasons, and restore actions', () => {
    const markup = render({ state: readyState() });
    expect(markup.indexOf('Project review')).toBeLessThan(
      markup.indexOf('Planning'),
    );
    expect(markup).toContain('You');
    expect(markup).toContain('River');
    expect(markup).toContain('Agenda changed');
    expect(markup).toContain('<time');
    expect(markup).toContain('dateTime="2026-07-19T15:00:00.000Z"');
    expect(markup).toContain(
      new Date('2026-07-19T15:00:00.000Z').toLocaleString(),
    );
    expect(markup.match(/Restore this title/gu)).toHaveLength(2);
    expect(markup).toContain('Show earlier changes');

    const accountAndFormer = render({
      state: readyState({
        revisions: [
          {
            ...firstRevision,
            editor: {
              participantId: 'account_other',
              identityKind: 'account',
            },
          },
          {
            ...secondRevision,
            editor: {
              participantId: 'account_removed',
              identityKind: 'account',
            },
          },
        ],
      }),
    });
    expect(accountAndFormer).toContain('Account participant');
    expect(accountAndFormer).toContain('Former participant');
  });

  test('keeps read-only history free of title, policy, and restore controls', () => {
    const markup = render({
      canEdit: false,
      canManagePolicy: false,
      state: readyState(),
    });
    expect(markup).toContain('Title &amp; history');
    expect(markup).toContain('Project review');
    expect(markup).not.toContain('Meeting title');
    expect(markup).not.toContain('Reason for change');
    expect(markup).not.toContain('Who can edit');
    expect(markup).not.toContain('Save title');
    expect(markup).not.toContain('Restore this title');
  });

  test('renders bounded loading, empty, retry, conflict, and page-loading states', () => {
    expect(render({
      state: readyState({ historyPhase: 'loading', revisions: [] }),
    })).toContain('Loading title history…');
    expect(render({
      state: readyState({ revisions: [], nextCursor: undefined }),
    })).toContain('No title changes yet.');
    expect(render({
      state: readyState({ historyPhase: 'error', revisions: [] }),
    })).toContain('Could not load title history. Try again.');
    expect(render({
      state: readyState({ feedback: 'failure' }),
    })).toContain('Could not update the title. Try again.');
    expect(render({
      state: readyState({ feedback: 'conflict' }),
    })).toContain('The meeting changed. Review and try again.');
    expect(render({
      state: readyState({ loadingEarlier: true }),
    })).toContain('Loading earlier changes…');
  });
});

describe('meeting title dialog transitions', () => {
  const authority = {
    title: 'Planning',
    titleEditPolicy: 'administrators' as const,
    version: 4,
  };
  const updateCommand: MeetingTitleMutationCommand = {
    idempotencyKey: 'browser_title_0123456789abcdef0123456789abcdef',
    version: 4,
    mutation: {
      kind: 'update_title',
      title: 'Project review',
      reason: 'Agenda changed',
    },
  };

  test('opens, loads, appends without duplicates, and updates drafts', () => {
    let state = meetingTitleDialogTransition(
      initialMeetingTitleDialogState(authority),
      { type: 'open' },
    );
    expect(state).toMatchObject({
      open: true,
      historyPhase: 'loading',
      draftTitle: 'Planning',
      reason: '',
      draftPolicy: 'administrators',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'history_loaded',
      page: {
        revisions: [firstRevision],
        nextCursor: firstRevision.id,
      },
      append: false,
    });
    state = meetingTitleDialogTransition(state, {
      type: 'history_loading_earlier',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'history_loaded',
      page: {
        revisions: [firstRevision, secondRevision],
      },
      append: true,
    });
    state = meetingTitleDialogTransition(state, {
      type: 'draft_title',
      title: '  Revised title  ',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'reason',
      reason: '  New agenda  ',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'policy',
      policy: 'any_participant',
    });
    expect(state).toMatchObject({
      historyPhase: 'ready',
      revisions: [firstRevision, secondRevision],
      nextCursor: undefined,
      loadingEarlier: false,
      draftTitle: '  Revised title  ',
      reason: '  New agenda  ',
      draftPolicy: 'any_participant',
    });
  });

  test('retains one pending mutation and applies its exact successful authority and revision', () => {
    let state = readyState({
      title: authority.title,
      titleEditPolicy: authority.titleEditPolicy,
      version: authority.version,
      draftTitle: 'Project review',
      reason: 'Agenda changed',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'mutation_started',
      command: updateCommand,
    });
    const pending = state;
    expect(state.pending).toBe(updateCommand);
    expect(meetingTitleDialogTransition(state, {
      type: 'mutation_started',
      command: {
        ...updateCommand,
        idempotencyKey: 'browser_title_abcdef0123456789abcdef0123456789',
      },
    })).toBe(state);

    state = meetingTitleDialogTransition(state, {
      type: 'mutation_succeeded',
      command: updateCommand,
      result: {
        meetingId,
        title: 'Project review',
        titleEditPolicy: 'administrators',
        revision: firstRevision,
        version: 5,
      },
    });
    expect(state).toMatchObject({
      title: 'Project review',
      titleEditPolicy: 'administrators',
      version: 5,
      draftTitle: 'Project review',
      reason: '',
      pending: null,
      feedback: 'success',
    });
    expect(state.revisions[0]).toEqual(firstRevision);

    expect(meetingTitleDialogTransition(pending, {
      type: 'mutation_succeeded',
      command: {
        ...updateCommand,
        idempotencyKey: 'browser_title_abcdef0123456789abcdef0123456789',
      },
      result: {
        meetingId,
        title: 'Stale',
        titleEditPolicy: 'administrators',
        revision: firstRevision,
        version: 5,
      },
    })).toBe(pending);
  });

  test('supports policy and restore pending commands, retry failure, and conflict draft retention', () => {
    const policyCommand: MeetingTitleMutationCommand = {
      ...updateCommand,
      mutation: {
        kind: 'update_policy',
        policy: 'any_participant',
      },
    };
    const restoreCommand: MeetingTitleMutationCommand = {
      ...updateCommand,
      mutation: {
        kind: 'restore_title',
        revisionId: secondRevision.id,
      },
    };
    let state = readyState({
      title: authority.title,
      titleEditPolicy: authority.titleEditPolicy,
      version: authority.version,
      draftTitle: 'Unsaved title',
      reason: 'Unsaved reason',
      draftPolicy: 'any_participant',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'mutation_started',
      command: policyCommand,
    });
    expect(state.pending?.mutation.kind).toBe('update_policy');
    state = meetingTitleDialogTransition(state, {
      type: 'mutation_failed',
      command: policyCommand,
    });
    expect(state).toMatchObject({
      pending: null,
      feedback: 'failure',
      draftTitle: 'Unsaved title',
      reason: 'Unsaved reason',
    });
    state = meetingTitleDialogTransition(state, {
      type: 'mutation_started',
      command: restoreCommand,
    });
    expect(state.pending?.mutation).toEqual(restoreCommand.mutation);
    state = meetingTitleDialogTransition(state, {
      type: 'mutation_conflict',
      command: restoreCommand,
      authority: {
        title: 'Server title',
        titleEditPolicy: 'administrators',
        version: 6,
      },
    });
    expect(state).toMatchObject({
      title: 'Server title',
      titleEditPolicy: 'administrators',
      version: 6,
      draftTitle: 'Unsaved title',
      reason: 'Unsaved reason',
      draftPolicy: 'any_participant',
      pending: null,
      feedback: 'conflict',
    });
  });

  test('closes to the latest authority and clears all transient state', () => {
    const state = readyState({
      title: 'Server title',
      titleEditPolicy: 'any_participant',
      version: 9,
      draftTitle: 'Unsaved title',
      reason: 'Unsaved reason',
      feedback: 'failure',
    });
    expect(meetingTitleDialogTransition(state, { type: 'close' })).toEqual(
      initialMeetingTitleDialogState({
        title: 'Server title',
        titleEditPolicy: 'any_participant',
        version: 9,
      }),
    );
  });
});

describe('meeting room title-control boundary', () => {
  const roomWorkspace = {
    meetingId,
    version: 5,
    serverNow: '2026-07-19T15:00:00.000Z',
    title: 'Project review',
    status: 'scheduled',
    schedule: {
      startsAt: '2026-07-19T15:30:00.000Z',
      endsAt: '2026-07-19T16:30:00.000Z',
      durationSeconds: 3600,
    },
    currentParticipant: {
      participantId: currentParticipantId,
      role: 'owner' as const,
    },
    titleEditing: {
      policy: 'administrators' as const,
      canEdit: true,
      canManagePolicy: true,
    },
    participants: [
      {
        participantId: currentParticipantId,
        role: 'owner' as const,
        identityKind: 'account' as const,
      },
      {
        participantId: 'guest_0123456789abcdef',
        role: 'participant' as const,
        identityKind: 'browser_guest' as const,
        displayName: 'River',
      },
    ],
  };

  test('projects exact authority, capabilities, and current roster identities', () => {
    expect(meetingTitleControlProjection(roomWorkspace)).toEqual({
      meetingId,
      title: 'Project review',
      titleEditPolicy: 'administrators',
      version: 5,
      canEdit: true,
      canManagePolicy: true,
      currentParticipantId,
      currentParticipantIds: [
        currentParticipantId,
        'guest_0123456789abcdef',
      ],
    });
    expect(meetingTitleControlProjection({
      ...roomWorkspace,
      titleEditing: undefined,
    })).toBeNull();
  });

  test('applies only exact title authority and reuses the shared conflict load', async () => {
    const updated = applyMeetingTitleWorkspaceChange(roomWorkspace, {
      title: null,
      titleEditPolicy: 'any_participant',
      version: 6,
    });
    expect(updated).toEqual({
      ...roomWorkspace,
      title: null,
      version: 6,
      titleEditing: {
        ...roomWorkspace.titleEditing,
        policy: 'any_participant',
      },
    });
    expect(updated.schedule).toBe(roomWorkspace.schedule);
    expect(updated.participants).toBe(roomWorkspace.participants);

    let loads = 0;
    await expect(loadMeetingTitleConflictAuthority(async () => {
      loads += 1;
      return updated;
    })).resolves.toEqual({
      title: null,
      titleEditPolicy: 'any_participant',
      version: 6,
    });
    expect(loads).toBe(1);
  });
});
