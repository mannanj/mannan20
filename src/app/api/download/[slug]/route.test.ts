import { afterEach, describe, expect, test } from 'bun:test';
import * as route from './route';

const originalFetch = globalThis.fetch;
let ipSequence = 0;

function request(method = 'GET') {
  ipSequence += 1;
  return new Request('https://mannan.is/api/download/resume', {
    method,
    headers: { 'x-forwarded-for': `198.51.100.${ipSequence}` },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function useFetchDouble(implementation: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  globalThis.fetch = implementation as typeof fetch;
}

describe('public download route', () => {
  test('GET streams an allowlisted object with hardened attachment headers', async () => {
    useFetchDouble(async () =>
      new Response('pdf-bytes', { headers: { 'content-length': '9' } }));

    const response = await route.GET(request(), { params: Promise.resolve({ slug: 'resume' }) });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('pdf-bytes');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="Mannan_Javid_Resume.pdf"',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  test('HEAD checks the upstream object and returns an empty body', async () => {
    useFetchDouble(async (_input, init) => {
      if (init?.method !== 'HEAD') return new Response(null, { status: 405 });
      return new Response(null, { headers: { 'content-length': '1234' } });
    });

    const response = await route.HEAD(request('HEAD'), {
      params: Promise.resolve({ slug: 'resume' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('1234');
    expect(await response.text()).toBe('');
  });

  test.each(['Resume', 'resume/extra', '-resume', 'resume-', 'resume_']) (
    'rejects malformed slug %s',
    async (slug) => {
      useFetchDouble(async () => {
        throw new Error('malformed slugs must not reach R2');
      });
      const response = await route.GET(request(), { params: Promise.resolve({ slug }) });
      expect(response.status).toBe(404);
    },
  );

  test('returns 404 for a valid but unknown slug', async () => {
    const response = await route.GET(request(), {
      params: Promise.resolve({ slug: 'not-a-real-file' }),
    });
    expect(response.status).toBe(404);
  });

  test('returns 502 when the public object is missing', async () => {
    useFetchDouble(async () => new Response(null, { status: 404 }));
    const response = await route.GET(request(), { params: Promise.resolve({ slug: 'resume' }) });
    expect(response.status).toBe(502);
  });

  test('unsupported methods return 405 with the exact Allow header', async () => {
    expect(typeof route.POST).toBe('function');
    const response = await route.POST!();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });
});
