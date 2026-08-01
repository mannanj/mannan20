import { afterEach, describe, expect, test } from 'bun:test';
import { verifyTurnstileToken } from './turnstile-verification';

const workerUrl = 'https://turnstile.example/verify';
const originalWorkerUrl = process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL;

afterEach(() => {
  if (originalWorkerUrl === undefined) {
    delete process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL;
  } else {
    process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL = originalWorkerUrl;
  }
});

function fetchResponse(response: Response): typeof fetch {
  return (() => Promise.resolve(response)) as unknown as typeof fetch;
}

describe('verifyTurnstileToken', () => {
  test('fails closed for blank tokens and does not call the worker', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL = workerUrl;
    const fetcher = (() => {
      throw new Error('should not fetch');
    }) as unknown as typeof fetch;

    expect(await verifyTurnstileToken('   ', fetcher)).toBe(false);
  });

  test('fails closed when the worker URL is unavailable', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL;

    expect(await verifyTurnstileToken('proof', fetchResponse(new Response('{"success":true}')))).toBe(false);
  });

  test('fails closed for non-OK, invalid JSON, and unsuccessful worker responses', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL = workerUrl;

    expect(await verifyTurnstileToken('proof', fetchResponse(new Response('', { status: 500 })))).toBe(false);
    expect(await verifyTurnstileToken('proof', fetchResponse(new Response('not json')))).toBe(false);
    expect(await verifyTurnstileToken('proof', fetchResponse(new Response('{"success":false}')))).toBe(false);
  });

  test('fails closed when the request throws', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL = workerUrl;
    const fetcher = (() => Promise.reject(new Error('network detail must not escape'))) as unknown as typeof fetch;

    expect(await verifyTurnstileToken('proof', fetcher)).toBe(false);
  });

  test('returns true only for a successful worker response', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL = workerUrl;
    let request: RequestInit | undefined;
    const fetcher = ((_: RequestInfo | URL, init?: RequestInit) => {
      request = init;
      return Promise.resolve(new Response('{"success":true}'));
    }) as unknown as typeof fetch;

    expect(await verifyTurnstileToken('proof', fetcher)).toBe(true);
    expect(request).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"token":"proof"}',
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
  });
});
