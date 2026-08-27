import { afterEach, describe, expect, test } from 'bun:test';
import * as route from './route';

const originalFetch = globalThis.fetch;
const originalSecret = process.env.STATE_SERVICE_SECRET;
const originalUrl = process.env.PORTFOLIO_STATE_WORKER_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.STATE_SERVICE_SECRET;
  else process.env.STATE_SERVICE_SECRET = originalSecret;
  if (originalUrl === undefined) delete process.env.PORTFOLIO_STATE_WORKER_URL;
  else process.env.PORTFOLIO_STATE_WORKER_URL = originalUrl;
});

describe('garden article metrics route', () => {
  test('GET reads both counters while POST changes only browser views', async () => {
    process.env.STATE_SERVICE_SECRET = 'test-state-secret';
    process.env.PORTFOLIO_STATE_WORKER_URL = 'https://state.example.test';
    let views = 12;
    const mcpFetches = 24;
    const paths: string[] = [];
    globalThis.fetch = (async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (path === '/v1/rate/check') {
        return Response.json({ success: true, limit: 20, remaining: 19, reset: Date.now() + 60_000 });
      }
      if (path === '/v1/garden/views/increment') views += 1;
      return Response.json({ slug: 'health-longevity', views, mcpFetches });
    }) as typeof fetch;

    const params = { params: Promise.resolve({ slug: 'health-longevity' }) };
    const get = await route.GET(new Request('https://mannan.is/api/garden/views/health-longevity'), params);
    expect(await get.json()).toEqual({ views: 12, mcpFetches: 24 });

    const post = await route.POST(
      new Request('https://mannan.is/api/garden/views/health-longevity', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.9' },
      }),
      params,
    );
    expect(await post.json()).toEqual({ views: 13, mcpFetches: 24 });
    expect(paths).toEqual([
      '/v1/garden/views/get',
      '/v1/rate/check',
      '/v1/garden/views/increment',
    ]);
    expect(paths.some((path) => path.includes('mcp-fetches'))).toBe(false);
  });
});
