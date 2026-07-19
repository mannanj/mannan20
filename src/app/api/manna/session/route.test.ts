import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSiteSessionCookie } from '@/lib/site-session';
import * as route from './route';

const originalFetch = globalThis.fetch;
const originalSessionSecret = process.env.MANNAN_SESSION_SECRET;
const originalWorkerUrl = process.env.MANNA_WORKER_URL;
const originalServiceSecret = process.env.MANNA_SERVICE_AUTH_SECRET;

beforeEach(() => {
  process.env.MANNAN_SESSION_SECRET = 'site-session-test-secret';
  process.env.MANNA_WORKER_URL = 'https://manna-worker.test';
  process.env.MANNA_SERVICE_AUTH_SECRET = 'service-test-secret';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  restoreEnv('MANNAN_SESSION_SECRET', originalSessionSecret);
  restoreEnv('MANNA_WORKER_URL', originalWorkerUrl);
  restoreEnv('MANNA_SERVICE_AUTH_SECRET', originalServiceSecret);
});

describe('/api/manna/session', () => {
  test('rejects a missing site session without calling the Worker', async () => {
    useFetchDouble(async () => {
      throw new Error('unauthenticated requests must not reach Manna');
    });

    const response = await route.POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
  });

  test('rejects a signed non-admin session without disclosing telemetry', async () => {
    const cookie = await createSiteSessionCookie({ email: 'reader@example.com', role: 'user' });
    useFetchDouble(async () => {
      throw new Error('non-admin requests must not reach Manna');
    });

    const response = await route.POST(request(cookie));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'unavailable' });
  });

  test('exchanges an admin session server-to-server and returns only safe token fields', async () => {
    const cookie = await createSiteSessionCookie({
      email: 'Hello@Mannan.is',
      role: 'admin',
    });
    useFetchDouble(async (input, init) => {
      expect(input).toBe('https://manna-worker.test/v1/viewer-token');
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer service-test-secret');
      expect(JSON.parse(String(init?.body))).toEqual({
        email: 'hello@mannan.is',
        projectId: 'meet',
      });
      return Response.json({
        token: 'mnv1.safe-token',
        expiresAt: '2027-01-15T08:05:00.000Z',
        workerUrl: 'https://manna-worker.test',
      });
    });

    const response = await route.POST(request(cookie));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({
      token: 'mnv1.safe-token',
      expiresAt: '2027-01-15T08:05:00.000Z',
      workerUrl: 'https://manna-worker.test',
    });
  });

  test('sanitizes upstream failures and never reflects an upstream body', async () => {
    const cookie = await createSiteSessionCookie({
      email: 'hello@mannan.is',
      role: 'admin',
    });
    useFetchDouble(async () =>
      Response.json(
        { error: 'internal', secret: 'VIEWER_TOKEN_SECRET=do-not-reflect' },
        { status: 500 },
      ));

    const response = await route.POST(request(cookie));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).toBe('{"error":"manna_unavailable"}');
    expect(text).not.toContain('do-not-reflect');
  });
});

function request(cookie?: string): Request {
  return new Request('https://mannan.is/api/manna/session', {
    method: 'POST',
    headers: cookie ? { cookie } : undefined,
  });
}

function useFetchDouble(
  implementation: (...args: Parameters<typeof fetch>) => Promise<Response>,
): void {
  globalThis.fetch = implementation as typeof fetch;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
