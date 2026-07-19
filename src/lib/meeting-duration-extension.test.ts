import { describe, expect, test } from 'bun:test';
import {
  MeetingDurationExtensionAttempt,
  MeetingDurationExtensionError,
  requestMeetingDurationExtension,
} from './meeting-duration-extension';

const meetingId = 'meeting_0123456789abcdef';
const expectedVersion = 7;
const idempotencyKey = 'browser_extend_0123456789abcdef0123456789abcdef';

function exactResponse(overrides: Record<string, unknown> = {}): Response {
  return Response.json({
    data: {
      extensionId: 'extension_0123456789abcdef',
      sessionId: 'session_0123456789abcdef',
      requestedSeconds: 1800,
      appliedSeconds: 1800,
      oldEffectiveEndsAt: '2026-07-19T14:30:00.000Z',
      effectiveEndsAt: '2026-07-19T15:00:00.000Z',
      policyDecision: 'applied_full',
      version: 8,
      ...overrides,
    },
  }, { headers: { etag: '"8"' } });
}

describe('meeting duration extension client', () => {
  test('posts the exact normalized versioned command and accepts the exact result', async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input, init });
      return exactResponse();
    }) as typeof fetch;

    await expect(requestMeetingDurationExtension({
      meetingId,
      expectedVersion,
      requestedSeconds: 1800,
      reason: '  We need time for questions.  ',
      idempotencyKey,
      fetcher,
    })).resolves.toEqual({
      extensionId: 'extension_0123456789abcdef',
      sessionId: 'session_0123456789abcdef',
      requestedSeconds: 1800,
      appliedSeconds: 1800,
      oldEffectiveEndsAt: '2026-07-19T14:30:00.000Z',
      effectiveEndsAt: '2026-07-19T15:00:00.000Z',
      policyDecision: 'applied_full',
      version: 8,
    });
    expect(requests).toEqual([{
      input: `/meet/${meetingId}/api/live-session/extensions`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
          'if-match': '"7"',
        },
        body: JSON.stringify({
          requestedSeconds: 1800,
          reason: 'We need time for questions.',
        }),
        cache: 'no-store',
        redirect: 'error',
      },
    }]);
  });

  test('accepts only coherent full or truncated extension decisions', async () => {
    await expect(requestMeetingDurationExtension({
      meetingId,
      expectedVersion,
      requestedSeconds: 1800,
      reason: 'Use the final allowance.',
      idempotencyKey,
      fetcher: (async () => exactResponse({
        appliedSeconds: 600,
        effectiveEndsAt: '2026-07-19T14:40:00.000Z',
        policyDecision: 'applied_truncated',
      })) as unknown as typeof fetch,
    })).resolves.toMatchObject({
      requestedSeconds: 1800,
      appliedSeconds: 600,
      policyDecision: 'applied_truncated',
    });

    for (const overrides of [
      { requestedSeconds: 900 },
      { appliedSeconds: 0 },
      { appliedSeconds: 1801 },
      { oldEffectiveEndsAt: 'not-an-instant' },
      { effectiveEndsAt: '2026-07-19T14:29:59.000Z' },
      { effectiveEndsAt: '2026-07-19T14:40:00.000Z' },
      { policyDecision: 'applied_truncated' },
      { version: 7 },
      { providerToken: 'private' },
    ]) {
      await expect(requestMeetingDurationExtension({
        meetingId,
        expectedVersion,
        requestedSeconds: 1800,
        reason: 'Validate the result.',
        idempotencyKey,
        fetcher: (async () => exactResponse(overrides)) as unknown as typeof fetch,
      })).rejects.toMatchObject({ code: 'invalid_response' });
    }
  });

  test('rejects malformed, oversized, redirected, and ETag-mismatched responses', async () => {
    const responses = [
      new Response('{', { status: 200, headers: { etag: '"8"' } }),
      Response.json({ data: null }, { headers: { etag: '"8"' } }),
      Response.json({ data: exactResponse, extra: true }, { headers: { etag: '"8"' } }),
      new Response(JSON.stringify({ data: { padding: 'x'.repeat(17 * 1024) } }), {
        headers: { etag: '"8"' },
      }),
      new Response(new ReadableStream({
        start(controller) {
          controller.error(new Error('private stream failure'));
        },
      }), { headers: { etag: '"8"' } }),
      exactResponse(),
      exactResponse(),
    ];
    Object.defineProperty(responses[5]!, 'redirected', { value: true });
    responses[6]!.headers.set('etag', '"9"');

    for (const response of responses) {
      await expect(requestMeetingDurationExtension({
        meetingId,
        expectedVersion,
        requestedSeconds: 1800,
        reason: 'Validate the boundary.',
        idempotencyKey,
        fetcher: (async () => response) as unknown as typeof fetch,
      })).rejects.toMatchObject({ code: 'invalid_response' });
    }
  });

  test('maps only stable public errors without retaining private response fields', async () => {
    const cases = [
      [409, 'meeting_conflict', 'meeting_conflict'],
      [409, 'session_extension_unavailable', 'extension_unavailable'],
      [401, 'identity_required', 'identity_required'],
      [503, 'dependency_unavailable', 'dependency_unavailable'],
    ] as const;
    for (const [status, upstream, expected] of cases) {
      const error = await requestMeetingDurationExtension({
        meetingId,
        expectedVersion,
        requestedSeconds: 1800,
        reason: 'Private reason must not escape.',
        idempotencyKey,
        fetcher: (async () => Response.json({
          error: { code: upstream },
        }, { status })) as unknown as typeof fetch,
      }).catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(MeetingDurationExtensionError);
      expect(error).toMatchObject({ code: expected });
      expect(String(error)).not.toContain('Private reason must not escape.');
    }

    await expect(requestMeetingDurationExtension({
      meetingId,
      expectedVersion,
      requestedSeconds: 1800,
      reason: 'Private reason must not escape.',
      idempotencyKey,
      fetcher: (async () => {
        throw new Error('private network detail');
      }) as unknown as typeof fetch,
    })).rejects.toMatchObject({ code: 'dependency_unavailable' });

    for (const fetcher of [
      (async () => Response.json({ error: { code: 'unknown_private_code' } }, {
        status: 418,
      })) as unknown as typeof fetch,
      (async () => new Response('{', { status: 409 })) as unknown as typeof fetch,
      (async () => Response.json({
        error: { code: 'meeting_conflict', privateDetail: 'not exposed' },
      }, { status: 409 })) as unknown as typeof fetch,
    ]) {
      const error = await requestMeetingDurationExtension({
        meetingId,
        expectedVersion,
        requestedSeconds: 1800,
        reason: 'Private reason must not escape.',
        idempotencyKey,
        fetcher,
      }).catch((failure: unknown) => failure);
      expect(error).toMatchObject({ code: 'invalid_response' });
      expect(JSON.stringify(error)).not.toContain('privateDetail');
    }
  });

  test('rejects invalid commands before fetch or key generation', async () => {
    let called = false;
    const fetcher = (async () => {
      called = true;
      return exactResponse();
    }) as unknown as typeof fetch;
    for (const input of [
      { meetingId: '../unsafe', expectedVersion, requestedSeconds: 1800, reason: 'Valid' },
      { meetingId, expectedVersion: 0, requestedSeconds: 1800, reason: 'Valid' },
      { meetingId, expectedVersion, requestedSeconds: 901, reason: 'Valid' },
      { meetingId, expectedVersion, requestedSeconds: 1800, reason: '   ' },
      { meetingId, expectedVersion, requestedSeconds: 1800, reason: 'line\nbreak' },
      { meetingId, expectedVersion, requestedSeconds: 1800, reason: 'é'.repeat(251) },
    ]) {
      await expect(requestMeetingDurationExtension({
        ...input,
        idempotencyKey,
        fetcher,
      })).rejects.toMatchObject({ code: 'invalid_request' });
    }
    expect(called).toBe(false);
  });
});

describe('meeting duration extension attempt', () => {
  test('rejects invalid input before generating or retaining a command key', () => {
    let generated = false;
    const attempt = new MeetingDurationExtensionAttempt(() => {
      generated = true;
      return idempotencyKey;
    });

    expect(() => attempt.begin(0, 1800, 'Valid reason')).toThrow(
      'invalid_meeting_duration_extension_attempt',
    );
    expect(generated).toBe(false);
    expect(attempt.current()).toBeNull();
  });

  test('retains one frozen normalized command through transient failures', () => {
    const attempt = new MeetingDurationExtensionAttempt(() => idempotencyKey);
    const first = attempt.begin(7, 1800, '  We need more time.  ');
    expect(first).toEqual({
      idempotencyKey,
      expectedVersion: 7,
      requestedSeconds: 1800,
      reason: 'We need more time.',
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(attempt.begin(7, 1800, 'We need more time.')).toBe(first);
    attempt.failed();
    expect(attempt.current()).toBe(first);
    expect(attempt.begin(7, 1800, 'We need more time.')).toBe(first);
  });

  test('rejects changed active input and clears only on terminal controls', () => {
    let generated = 0;
    const attempt = new MeetingDurationExtensionAttempt(
      () => `browser_extend_${String(generated += 1).padStart(32, '0')}`,
    );
    const first = attempt.begin(7, 1800, 'Original reason');
    for (const input of [
      [8, 1800, 'Original reason'],
      [7, 900, 'Original reason'],
      [7, 1800, 'Changed reason'],
    ] as const) {
      expect(() => attempt.begin(input[0], input[1], input[2])).toThrow(
        'invalid_meeting_duration_extension_attempt',
      );
      expect(attempt.current()).toBe(first);
    }
    attempt.conflict();
    expect(attempt.current()).toBeNull();
    expect(attempt.begin(8, 900, 'Fresh reason').idempotencyKey).not.toBe(
      first.idempotencyKey,
    );
    attempt.complete();
    expect(attempt.current()).toBeNull();
    attempt.begin(9, 900, 'Another reason');
    attempt.cancel();
    expect(attempt.current()).toBeNull();
  });
});
