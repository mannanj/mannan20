import { afterEach, describe, expect, it } from 'bun:test';
import { verifyTurnstileToken } from './turnstile-verify';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('verifyTurnstileToken', () => {
  it('rejects a malformed token without calling siteverify', async () => {
    globalThis.fetch = (() => {
      throw new Error('siteverify should not be called');
    }) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['invalid-input-response']);
  });

  it('passes a valid token through', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true }), { status: 200 })) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('token', 'secret');
    expect(result.success).toBe(true);
    expect(result.errorCodes).toEqual([]);
  });

  it('reports a rejection with its codes, distinct from an outage', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
        status: 200,
      })) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['invalid-input-response']);
    expect(result.errorCodes).not.toContain('internal-error');
  });

  it('reports internal-error when siteverify throws', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['internal-error']);
  });

  it('reports internal-error on a non-2xx siteverify response', async () => {
    globalThis.fetch = (async () => new Response('gateway', { status: 502 })) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['internal-error']);
  });

  it('reports internal-error on a non-JSON siteverify response', async () => {
    globalThis.fetch = (async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    const result = await verifyTurnstileToken('token', 'secret');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['internal-error']);
  });
});
