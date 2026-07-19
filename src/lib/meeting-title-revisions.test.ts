import { describe, expect, test } from 'bun:test';
import {
  MeetingTitleClientError,
  MeetingTitleMutationAttempt,
  loadMeetingTitleRevisions,
  restoreMeetingTitle,
  updateMeetingTitle,
  updateMeetingTitlePolicy,
  type MeetingTitleRevision,
} from './meeting-title-revisions';

const meetingId = 'meeting_0123456789abcdef';
const revisionId = 'revision_0123456789abcdef';
const secondRevisionId = 'revision_abcdef0123456789';
const idempotencyKey = 'browser_title_0123456789abcdef0123456789abcdef';

function revision(
  overrides: Partial<MeetingTitleRevision> = {},
): MeetingTitleRevision {
  return {
    id: revisionId,
    meetingId,
    previousTitle: 'Planning',
    title: 'Project review',
    editor: {
      participantId: 'account_0123456789abcdef',
      identityKind: 'account',
    },
    reason: 'Agenda changed',
    resultingVersion: 5,
    createdAt: '2026-07-19T14:00:00.000Z',
    ...overrides,
  };
}

function jsonData(data: unknown, version?: number): Response {
  return Response.json(
    { data },
    version === undefined ? undefined : { headers: { etag: `"${version}"` } },
  );
}

describe('meeting title revision client', () => {
  test('loads exact bounded history from the literal no-store paths', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const responses = [
      jsonData({
        revisions: [revision()],
        nextCursor: revisionId,
      }),
      jsonData({
        revisions: [revision({
          id: secondRevisionId,
          previousTitle: 'Initial title',
          title: 'Planning',
          reason: undefined,
          resultingVersion: 4,
          createdAt: '2026-07-19T13:00:00.000Z',
        })],
      }),
    ];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return responses.shift()!;
    }) as typeof fetch;

    await expect(loadMeetingTitleRevisions({
      meetingId,
      fetchImpl,
    })).resolves.toEqual({
      revisions: [revision()],
      nextCursor: revisionId,
    });
    await expect(loadMeetingTitleRevisions({
      meetingId,
      beforeRevisionId: revisionId,
      fetchImpl,
    })).resolves.toEqual({
      revisions: [revision({
        id: secondRevisionId,
        previousTitle: 'Initial title',
        title: 'Planning',
        reason: undefined,
        resultingVersion: 4,
        createdAt: '2026-07-19T13:00:00.000Z',
      })],
    });
    expect(requests).toEqual([
      {
        input: `/meet/${meetingId}/api/title-revisions`,
        init: { cache: 'no-store' },
      },
      {
        input: `/meet/${meetingId}/api/title-revisions/${revisionId}`,
        init: { cache: 'no-store' },
      },
    ]);
  });

  test('posts an exact normalized title command and requires ETag agreement', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return jsonData({
        meetingId,
        title: 'Project review',
        titleEditPolicy: 'administrators',
        revision: revision(),
        version: 5,
      }, 5);
    }) as typeof fetch;

    await expect(updateMeetingTitle({
      meetingId,
      version: 4,
      idempotencyKey,
      title: '  Project review  ',
      reason: '  Agenda changed  ',
      fetchImpl,
    })).resolves.toEqual({
      meetingId,
      title: 'Project review',
      titleEditPolicy: 'administrators',
      revision: revision(),
      version: 5,
    });
    expect(requests).toEqual([{
      input: `/meet/${meetingId}/api/title`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
          'if-match': '"4"',
        },
        body: JSON.stringify({
          title: 'Project review',
          reason: 'Agenda changed',
        }),
        cache: 'no-store',
        redirect: 'error',
      },
    }]);
  });

  test('normalizes an empty title to null without inventing a reason', async () => {
    let requestBody: string | undefined;
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = init?.body as string | undefined;
      return jsonData({
        meetingId,
        title: null,
        titleEditPolicy: 'administrators',
        revision: revision({ title: null, reason: undefined }),
        version: 5,
      }, 5);
    }) as typeof fetch;

    await expect(updateMeetingTitle({
      meetingId,
      version: 4,
      idempotencyKey,
      title: '   ',
      fetchImpl,
    })).resolves.toMatchObject({ title: null, version: 5 });
    expect(requestBody).toBe(JSON.stringify({ title: null }));
  });

  test('posts exact policy and restore commands through literal paths', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const restoredRevision = revision({
      id: secondRevisionId,
      previousTitle: 'Final plan',
      title: 'Project review',
      restoredFromRevisionId: revisionId,
      reason: 'Return to reviewed title',
      resultingVersion: 6,
      createdAt: '2026-07-19T15:00:00.000Z',
    });
    const responses = [
      jsonData({
        meetingId,
        title: 'Project review',
        titleEditPolicy: 'any_participant',
        version: 5,
      }, 5),
      jsonData({
        meetingId,
        title: 'Project review',
        titleEditPolicy: 'any_participant',
        revision: restoredRevision,
        version: 6,
      }, 6),
    ];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return responses.shift()!;
    }) as typeof fetch;

    await expect(updateMeetingTitlePolicy({
      meetingId,
      version: 4,
      idempotencyKey,
      policy: 'any_participant',
      fetchImpl,
    })).resolves.toEqual({
      meetingId,
      title: 'Project review',
      titleEditPolicy: 'any_participant',
      version: 5,
    });
    await expect(restoreMeetingTitle({
      meetingId,
      revisionId,
      version: 5,
      idempotencyKey,
      reason: '  Return to reviewed title  ',
      fetchImpl,
    })).resolves.toMatchObject({
      title: 'Project review',
      revision: {
        id: secondRevisionId,
        restoredFromRevisionId: revisionId,
      },
      version: 6,
    });
    expect(requests).toEqual([
      {
        input: `/meet/${meetingId}/api/title-policy`,
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
            'if-match': '"4"',
          },
          body: JSON.stringify({ policy: 'any_participant' }),
          cache: 'no-store',
          redirect: 'error',
        },
      },
      {
        input: `/meet/${meetingId}/api/title-revisions/${revisionId}/restore`,
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
            'if-match': '"5"',
          },
          body: JSON.stringify({ reason: 'Return to reviewed title' }),
          cache: 'no-store',
          redirect: 'error',
        },
      },
    ]);
  });

  test('rejects malformed, incoherent, oversized, redirected, and extra response data', async () => {
    const exactMutation = {
      meetingId,
      title: 'Project review',
      titleEditPolicy: 'administrators',
      revision: revision(),
      version: 5,
    };
    const responses = [
      new Response('{', { headers: { etag: '"5"' } }),
      Response.json({ data: exactMutation, extra: true }, { headers: { etag: '"5"' } }),
      jsonData({ ...exactMutation, privateToken: 'private' }, 5),
      jsonData({ ...exactMutation, meetingId: 'meeting_other' }, 5),
      jsonData({ ...exactMutation, title: 'Wrong title' }, 5),
      jsonData({ ...exactMutation, version: 6 }, 6),
      jsonData({
        ...exactMutation,
        revision: revision({ resultingVersion: 6 }),
      }, 5),
      jsonData({
        ...exactMutation,
        revision: revision({ restoredFromRevisionId: revisionId }),
      }, 5),
      jsonData(exactMutation, 6),
      new Response(JSON.stringify({ data: { padding: 'x'.repeat(66 * 1_024) } })),
      new Response('', { headers: { 'content-length': String(65_537) } }),
      new Response(new ReadableStream({
        start(controller) {
          controller.error(new Error('private stream detail'));
        },
      })),
      jsonData(exactMutation, 5),
    ];
    Object.defineProperty(responses.at(-1)!, 'redirected', { value: true });

    for (const response of responses) {
      await expect(updateMeetingTitle({
        meetingId,
        version: 4,
        idempotencyKey,
        title: 'Project review',
        reason: 'Agenda changed',
        fetchImpl: (async () => response) as unknown as typeof fetch,
      })).rejects.toMatchObject({ code: 'invalid_response' });
    }

    for (const data of [
      { revisions: Array.from({ length: 51 }, (_, index) => revision({
        id: `revision_${String(index).padStart(16, '0')}`,
      })) },
      { revisions: [revision(), revision()] },
      { revisions: [revision({ meetingId: 'meeting_other' })] },
      { revisions: [revision()], nextCursor: 'bad cursor' },
      { revisions: [revision()], nextCursor: secondRevisionId },
      { revisions: [revision()], privateDetail: 'private' },
    ]) {
      await expect(loadMeetingTitleRevisions({
        meetingId,
        fetchImpl: (async () => jsonData(data)) as unknown as typeof fetch,
      })).rejects.toMatchObject({ code: 'invalid_response' });
    }
  });

  test('maps only stable public errors and never retains response or caught detail', async () => {
    const cases = [
      [400, 'invalid_request'],
      [401, 'identity_required'],
      [403, 'title_edit_forbidden'],
      [403, 'title_policy_forbidden'],
      [404, 'meeting_unavailable'],
      [404, 'revision_unavailable'],
      [409, 'meeting_conflict'],
      [409, 'title_unchanged'],
      [503, 'dependency_unavailable'],
    ] as const;
    for (const [status, code] of cases) {
      const error = await updateMeetingTitle({
        meetingId,
        version: 4,
        idempotencyKey,
        title: 'Private title',
        reason: 'Private reason',
        fetchImpl: (async () => Response.json({
          error: { code },
        }, { status })) as unknown as typeof fetch,
      }).catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(MeetingTitleClientError);
      expect(error).toMatchObject({ code });
      expect(JSON.stringify(error)).not.toContain('Private title');
      expect(JSON.stringify(error)).not.toContain('Private reason');
    }

    await expect(loadMeetingTitleRevisions({
      meetingId,
      fetchImpl: (async () => {
        throw new Error('private network detail');
      }) as unknown as typeof fetch,
    })).rejects.toMatchObject({ code: 'dependency_unavailable' });

    for (const response of [
      Response.json({ error: { code: 'unknown_private_code' } }, { status: 418 }),
      Response.json({
        error: { code: 'meeting_conflict', privateDetail: 'private' },
      }, { status: 409 }),
    ]) {
      const error = await updateMeetingTitle({
        meetingId,
        version: 4,
        idempotencyKey,
        title: 'Private title',
        fetchImpl: (async () => response) as unknown as typeof fetch,
      }).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: 'invalid_response' });
      expect(JSON.stringify(error)).not.toContain('privateDetail');
    }
  });

  test('rejects invalid input before fetch', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonData({ revisions: [] });
    }) as unknown as typeof fetch;

    for (const input of [
      { meetingId: '../unsafe' },
      { meetingId, beforeRevisionId: 'bad cursor' },
    ]) {
      await expect(loadMeetingTitleRevisions({
        ...input,
        fetchImpl,
      })).rejects.toMatchObject({ code: 'invalid_request' });
    }
    for (const input of [
      { version: 0, title: 'Project' },
      { version: 4, title: 'x'.repeat(201) },
      { version: 4, title: 'contains\u0000control' },
      { version: 4, title: 'Project', reason: '' },
      { version: 4, title: 'Project', reason: 'x'.repeat(501) },
    ]) {
      await expect(updateMeetingTitle({
        meetingId,
        idempotencyKey,
        fetchImpl,
        ...input,
      })).rejects.toMatchObject({ code: 'invalid_request' });
    }
    await expect(updateMeetingTitlePolicy({
      meetingId,
      version: 4,
      idempotencyKey,
      policy: 'owner' as never,
      fetchImpl,
    })).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(restoreMeetingTitle({
      meetingId,
      revisionId: 'bad revision',
      version: 4,
      idempotencyKey,
      fetchImpl,
    })).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(updateMeetingTitle({
      meetingId,
      version: 4,
      idempotencyKey: 'browser_title_wrong',
      title: 'Project',
      fetchImpl,
    })).rejects.toMatchObject({ code: 'invalid_request' });
    expect(calls).toBe(0);
  });
});

describe('meeting title mutation attempt', () => {
  test('retains one frozen normalized command through transient retry', () => {
    const attempt = new MeetingTitleMutationAttempt(() => idempotencyKey);
    const first = attempt.begin(4, {
      kind: 'update_title',
      title: '  Project review  ',
      reason: '  Agenda changed  ',
    });

    expect(first).toEqual({
      idempotencyKey,
      version: 4,
      mutation: {
        kind: 'update_title',
        title: 'Project review',
        reason: 'Agenda changed',
      },
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.mutation)).toBe(true);
    expect(attempt.begin(4, {
      kind: 'update_title',
      title: 'Project review',
      reason: 'Agenda changed',
    })).toBe(first);
    attempt.failed();
    expect(attempt.current()).toBe(first);
  });

  test('rejects changed action, version, or payload while pending', () => {
    const attempt = new MeetingTitleMutationAttempt(() => idempotencyKey);
    const first = attempt.begin(4, {
      kind: 'update_policy',
      policy: 'any_participant',
    });
    for (const [version, mutation] of [
      [5, { kind: 'update_policy', policy: 'any_participant' }],
      [4, { kind: 'update_policy', policy: 'administrators' }],
      [4, { kind: 'update_title', title: 'Project review' }],
      [4, { kind: 'restore_title', revisionId, reason: 'Return' }],
    ] as const) {
      expect(() => attempt.begin(version, mutation)).toThrow(
        'invalid_meeting_title_mutation_attempt',
      );
      expect(attempt.current()).toBe(first);
    }
  });

  test('clears only on success, cancel, or terminal conflict and validates generated keys', () => {
    let generated = 0;
    const attempt = new MeetingTitleMutationAttempt(
      () => `browser_title_${String(generated += 1).padStart(32, '0')}`,
    );
    const first = attempt.begin(4, {
      kind: 'restore_title',
      revisionId,
    });
    attempt.conflict();
    expect(attempt.current()).toBeNull();
    expect(attempt.begin(5, {
      kind: 'update_title',
      title: 'Fresh title',
    }).idempotencyKey).not.toBe(first.idempotencyKey);
    attempt.complete();
    expect(attempt.current()).toBeNull();
    attempt.begin(6, { kind: 'update_policy', policy: 'administrators' });
    attempt.cancel();
    expect(attempt.current()).toBeNull();

    for (const key of [
      'browser_title_',
      'browser_title_UPPERCASE0123456789ABCDEF',
      'browser_title_has a space',
      `browser_title_${'a'.repeat(33)}`,
    ]) {
      const invalid = new MeetingTitleMutationAttempt(() => key);
      expect(() => invalid.begin(4, {
        kind: 'update_title',
        title: 'Project',
      })).toThrow('invalid_meeting_title_mutation_attempt');
      expect(invalid.current()).toBeNull();
    }
  });

  test('rejects invalid mutations before generating a key', () => {
    let generated = false;
    const attempt = new MeetingTitleMutationAttempt(() => {
      generated = true;
      return idempotencyKey;
    });
    for (const [version, mutation] of [
      [0, { kind: 'update_title', title: 'Project' }],
      [4, { kind: 'update_title', title: 'contains\u0000control' }],
      [4, { kind: 'update_title', title: 'Project', reason: '' }],
      [4, { kind: 'update_policy', policy: 'owner' }],
      [4, { kind: 'restore_title', revisionId: 'bad revision' }],
    ] as const) {
      expect(() => attempt.begin(version, mutation as never)).toThrow(
        'invalid_meeting_title_mutation_attempt',
      );
    }
    expect(generated).toBe(false);
    expect(attempt.current()).toBeNull();
  });
});
