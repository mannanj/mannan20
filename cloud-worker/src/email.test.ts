import { afterEach, expect, mock, test } from 'bun:test';
import { sendSiteContinueLink } from './email';
import type { Env } from './types';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const env = {
  RESEND_API_KEY: 'test-key',
  RESEND_FROM: 'Mannan <hello@mannan.is>',
  PUBLIC_BASE_URL: 'https://auth.example.com',
} as Env;

test('sends matching text/html with a hashed idempotency key', async () => {
  const calls: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
  globalThis.fetch = mock(async (_input, init) => {
    calls.push({
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Response.json({ id: 'email_1' });
  }) as unknown as typeof fetch;

  await sendSiteContinueLink(env, 'person@example.com', 'raw-bearer-token');

  expect(calls).toHaveLength(1);
  expect(calls[0]!.headers.get('idempotency-key')).toMatch(
    /^site-magic\/[a-f0-9]{32}$/,
  );
  expect(calls[0]!.headers.get('idempotency-key')).not.toContain(
    'raw-bearer-token',
  );
  expect(calls[0]!.body.text).toContain('This link expires in 15 minutes.');
  expect(calls[0]!.body.html).toContain('Continue with email');
});

test('retries only transient responses with the same idempotency key', async () => {
  const keys: string[] = [];
  let attempt = 0;
  globalThis.fetch = mock(async (_input, init) => {
    keys.push(new Headers(init?.headers).get('idempotency-key') ?? '');
    attempt += 1;
    return attempt < 3
      ? new Response(null, { status: 429 })
      : Response.json({ id: 'email_1' });
  }) as unknown as typeof fetch;

  await sendSiteContinueLink(env, 'person@example.com', 'retry-token', {
    wait: async () => undefined,
  });

  expect(keys).toHaveLength(3);
  expect(new Set(keys).size).toBe(1);
});

test('does not retry or expose provider bodies for a validation failure', async () => {
  let calls = 0;
  globalThis.fetch = mock(async () => {
    calls += 1;
    return new Response('contains-person@example.com', { status: 422 });
  }) as unknown as typeof fetch;

  await expect(
    sendSiteContinueLink(env, 'person@example.com', 'bad-token'),
  ).rejects.toMatchObject({
    name: 'ResendSendError',
    status: 422,
    message: 'Resend email request failed with status 422',
  });
  expect(calls).toBe(1);
});
