import { afterEach, describe, expect, it } from 'bun:test';
import { callPortfolioState } from './portfolio-state-client';

const originalNodeEnv = process.env.NODE_ENV;
const originalSecret = process.env.STATE_SERVICE_SECRET;
const originalUrl = process.env.PORTFOLIO_STATE_WORKER_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
  else Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  if (originalSecret === undefined) delete process.env.STATE_SERVICE_SECRET;
  else process.env.STATE_SERVICE_SECRET = originalSecret;
  if (originalUrl === undefined) delete process.env.PORTFOLIO_STATE_WORKER_URL;
  else process.env.PORTFOLIO_STATE_WORKER_URL = originalUrl;
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch });
});

describe('portfolio state client fail-closed behavior', () => {
  it('rejects a production request when no state binding or authenticated URL exists', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.STATE_SERVICE_SECRET;
    delete process.env.PORTFOLIO_STATE_WORKER_URL;

    await expect(callPortfolioState('/v1/boards', {})).rejects.toThrow(
      'Portfolio state service is not configured',
    );
  });

  it('rejects an unauthorized state response instead of returning a memory fallback signal', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.STATE_SERVICE_SECRET = 'test-state-secret';
    process.env.PORTFOLIO_STATE_WORKER_URL = 'https://state.example.test';
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: async () => new Response('unauthorized', { status: 401 }),
    });

    await expect(callPortfolioState('/v1/boards', {})).rejects.toThrow(
      'Portfolio state request failed (401)',
    );
  });
});
