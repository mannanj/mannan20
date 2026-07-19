import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createHash, createHmac } from 'node:crypto';
import {
  createMeetingAccountAssertion,
  meetingWorkerConfigured,
  meetingWorkerRequest,
} from './meeting-worker';

const originalFetch = globalThis.fetch;
const originalEnv = {
  url: process.env.MEETING_WORKER_URL,
  service: process.env.MEETING_SERVICE_SECRET,
  assertion: process.env.MEETING_ACCOUNT_ASSERTION_SECRET,
};
const SERVICE_SECRET = 'site-to-meeting-service-secret-at-least-32-bytes';
const ASSERTION_SECRET = 'site-account-assertion-secret-at-least-32-bytes';
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

function decodePayload(assertion: string): Record<string, unknown> {
  const [encoded] = assertion.split('.');
  return JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')) as Record<string, unknown>;
}

beforeEach(() => {
  process.env.MEETING_WORKER_URL = 'https://meeting-worker.example.workers.dev';
  process.env.MEETING_SERVICE_SECRET = SERVICE_SECRET;
  process.env.MEETING_ACCOUNT_ASSERTION_SECRET = ASSERTION_SECRET;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnv.url === undefined) delete process.env.MEETING_WORKER_URL;
  else process.env.MEETING_WORKER_URL = originalEnv.url;
  if (originalEnv.service === undefined) delete process.env.MEETING_SERVICE_SECRET;
  else process.env.MEETING_SERVICE_SECRET = originalEnv.service;
  if (originalEnv.assertion === undefined) delete process.env.MEETING_ACCOUNT_ASSERTION_SECRET;
  else process.env.MEETING_ACCOUNT_ASSERTION_SECRET = originalEnv.assertion;
});

describe('meeting Worker account assertions', () => {
  test('signs the exact account, request path, method, lifetime, and body digest', () => {
    const body = JSON.stringify({ title: 'Planning' });
    const assertion = createMeetingAccountAssertion({
      accountId: ACCOUNT_ID,
      method: 'POST',
      path: '/v1/meetings',
      body,
      nowSeconds: 2_000_000_000,
    });
    const [encoded, signature] = assertion.split('.');
    expect(signature).toBe(
      createHmac('sha256', ASSERTION_SECRET).update(encoded!).digest('base64url'),
    );
    expect(decodePayload(assertion)).toEqual({
      v: 1,
      accountId: ACCOUNT_ID,
      iat: 2_000_000_000,
      exp: 2_000_000_060,
      method: 'POST',
      path: '/v1/meetings',
      bodySha256: createHash('sha256').update(body).digest('base64url'),
    });
  });

  test.each([
    ['bad account', { accountId: 'person@example.com' }],
    ['lowercase method', { method: 'post' }],
    ['absolute path', { path: 'https://example.com/v1/meetings' }],
  ])('rejects %s before signing', (_label, override) => {
    expect(() =>
      createMeetingAccountAssertion({
        accountId: ACCOUNT_ID,
        method: 'POST',
        path: '/v1/meetings',
        body: '',
        ...override,
      }),
    ).toThrow();
  });
});

describe('server-only meeting Worker requests', () => {
  test('forwards only the private contract and preserves safe response metadata', async () => {
    globalThis.fetch = mock(async (input, init) => {
      expect(String(input)).toBe('https://meeting-worker.example.workers.dev/v1/meetings');
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe(`Bearer ${SERVICE_SECRET}`);
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('idempotency-key')).toBe('create_1');
      expect(headers.get('x-account-assertion')).toContain('.');
      expect(headers.has('cookie')).toBe(false);
      expect(init?.body).toBe('{"title":"Planning"}');
      return Response.json(
        { data: { meetingId: 'meeting_1', version: 1 } },
        { status: 201, headers: { etag: '"1"', location: '/meet/meeting_1' } },
      );
    }) as unknown as typeof fetch;

    const result = await meetingWorkerRequest({
      method: 'POST',
      path: '/v1/meetings',
      body: { title: 'Planning' },
      accountId: ACCOUNT_ID,
      idempotencyKey: 'create_1',
    });
    expect(result).toEqual({
      ok: true,
      status: 201,
      data: { meetingId: 'meeting_1', version: 1 },
      etag: '"1"',
      location: '/meet/meeting_1',
    });
  });

  test('fails closed without configuration and never calls fetch', async () => {
    delete process.env.MEETING_SERVICE_SECRET;
    const fetchMock = mock(async () => Response.json({ data: {} }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(meetingWorkerConfigured()).toBe(false);
    expect(
      await meetingWorkerRequest({ method: 'GET', path: '/v1/meetings/m_1/workspace' }),
    ).toEqual({ ok: false, status: 503, errorCode: 'dependency_unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns only a stable upstream error code and bounded response', async () => {
    globalThis.fetch = mock(async () =>
      Response.json(
        { error: { code: 'meeting_conflict', detail: 'private@example.com' }, requestId: 'worker_1' },
        { status: 409 },
      ),
    ) as unknown as typeof fetch;
    expect(
      await meetingWorkerRequest({ method: 'GET', path: '/v1/meetings/m_1/workspace' }),
    ).toEqual({ ok: false, status: 409, errorCode: 'meeting_conflict' });

    globalThis.fetch = mock(async () =>
      new Response(`{"data":"${'x'.repeat(70 * 1024)}"}`, { status: 200 }),
    ) as unknown as typeof fetch;
    expect(
      await meetingWorkerRequest({ method: 'GET', path: '/v1/meetings/m_1/workspace' }),
    ).toEqual({ ok: false, status: 503, errorCode: 'dependency_unavailable' });
  });

  test('forwards exact private title POST and cursor GET contracts', async () => {
    const restorePath =
      '/v1/meetings/meeting_0123456789abcdef/title-revisions/revision_1/restore';
    const historyPath =
      '/v1/meetings/meeting_0123456789abcdef/title-revisions/revision_1';
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push({ url: String(input), init });
      if (init?.method === 'POST') {
        return Response.json(
          { data: { meetingId: 'meeting_0123456789abcdef', version: 5 } },
          { headers: { etag: '"5"' } },
        );
      }
      return Response.json({ data: { revisions: [] } });
    }) as unknown as typeof fetch;

    expect(await meetingWorkerRequest({
      method: 'POST',
      path: restorePath,
      body: { reason: 'Return to planning' },
      idempotencyKey: 'browser_title_0123456789abcdef0123456789abcdef',
      ifMatch: 4,
      guest: {
        participantId: 'guest_0123456789abcdef',
        credential: 'guest:private-title-credential',
      },
    })).toEqual({
      ok: true,
      status: 200,
      data: { meetingId: 'meeting_0123456789abcdef', version: 5 },
      etag: '"5"',
    });
    expect(await meetingWorkerRequest({
      method: 'GET',
      path: historyPath,
      accountId: ACCOUNT_ID,
    })).toEqual({
      ok: true,
      status: 200,
      data: { revisions: [] },
    });

    const restore = requests[0]!;
    expect(restore.url).toBe(
      `https://meeting-worker.example.workers.dev${restorePath}`,
    );
    expect(restore.init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ reason: 'Return to planning' }),
      cache: 'no-store',
      redirect: 'error',
    });
    const restoreHeaders = new Headers(restore.init?.headers);
    expect(restoreHeaders.get('content-type')).toBe('application/json');
    expect(restoreHeaders.get('idempotency-key')).toBe(
      'browser_title_0123456789abcdef0123456789abcdef',
    );
    expect(restoreHeaders.get('if-match')).toBe('"4"');
    expect(restoreHeaders.has('x-account-assertion')).toBe(false);
    expect(restoreHeaders.get('x-guest-participant-id')).toBe(
      'guest_0123456789abcdef',
    );
    expect(restoreHeaders.get('x-guest-credential')).toBe(
      'guest:private-title-credential',
    );

    const history = requests[1]!;
    expect(history.url).toBe(
      `https://meeting-worker.example.workers.dev${historyPath}`,
    );
    expect(history.init).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
    });
    expect(history.init?.body).toBeUndefined();
    const historyHeaders = new Headers(history.init?.headers);
    expect(historyHeaders.get('x-account-assertion')).toContain('.');
    expect(historyHeaders.has('content-type')).toBe(false);
    expect(historyHeaders.has('idempotency-key')).toBe(false);
    expect(historyHeaders.has('if-match')).toBe(false);
    expect(historyHeaders.has('x-guest-credential')).toBe(false);
    expect(decodePayload(historyHeaders.get('x-account-assertion')!)).toMatchObject({
      method: 'GET',
      path: historyPath,
      bodySha256: createHash('sha256').update('').digest('base64url'),
    });
  });
});
