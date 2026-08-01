import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { handleContactIntent } from './route';

const encoder = new TextEncoder();

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/contact-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function responseFromChunks(chunks: Uint8Array[], onCancel?: () => void): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel: onCancel,
  }));
}

function successLimit() {
  return Promise.resolve({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 });
}

describe('contact intent streaming route', () => {
  test('emits meta, normalized text, and done after split UTF-8, usage, and DONE events', async () => {
    const source = 'data: {"choices":[{"delta":{"content":"Café reflection."},"finish_reason":null}]}\n'
      + 'data: {"choices":[],"usage":{"total_tokens":8}}\n'
      + 'data: [DONE]\n';
    const bytes = encoder.encode(source);
    const accentStart = bytes.findIndex((value) => value === 0xc3);
    const response = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([bytes.slice(0, accentStart + 1), bytes.slice(accentStart + 1)]),
    });

    expect(await response.text()).toBe(
      '{"type":"meta","version":1}\n'
      + '{"type":"text","value":"Café reflection."}\n'
      + '{"type":"done"}\n',
    );
  });

  test('drains more than 8 KiB of complete records from one upstream chunk', async () => {
    const emptyDelta = 'data: {"choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}\n';
    const source = `${emptyDelta.repeat(150)}data: [DONE]\n`;
    expect(encoder.encode(source).byteLength).toBeGreaterThan(8192);
    const response = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([encoder.encode(source)]),
    });

    expect(await response.text()).toBe('{"type":"meta","version":1}\n{"type":"done"}\n');
  });

  test('emits only a safe error after an in-band provider error', async () => {
    const response = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([encoder.encode('data: {"error":{"message":"private provider detail"}}\n')]),
    });

    const output = await response.text();
    expect(output).toBe('{"type":"meta","version":1}\n{"type":"error","code":"upstream"}\n');
    expect(output).not.toContain('private provider detail');
  });

  test('fails closed for an oversized unfinished SSE line', async () => {
    const response = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([encoder.encode(`data: ${'x'.repeat(8193)}`)]),
    });

    expect(await response.text()).toBe('{"type":"meta","version":1}\n{"type":"error","code":"upstream"}\n');
  });

  test('fails closed for output overflow and a disallowed second question', async () => {
    const overflow = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([encoder.encode(`data: {"choices":[{"delta":{"content":"${'x'.repeat(481)}"}}]}\n`)]),
    });
    expect(await overflow.text()).toBe('{"type":"meta","version":1}\n{"type":"error","code":"upstream"}\n');

    const question = await handleContactIntent(request({
      message: 'A project idea.',
      history: [
        { role: 'user', content: 'Earlier idea.' },
        { role: 'assistant', content: 'What is the audience?' },
      ],
    }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => responseFromChunks([encoder.encode('data: {"choices":[{"delta":{"content":"What outcome matters?"}}]}\n')]),
    });
    expect(await question.text()).toBe('{"type":"meta","version":1}\n{"type":"error","code":"upstream"}\n');
  });

  test('aborts the upstream request when the client cancels the stream', async () => {
    let upstreamSignal: AbortSignal | undefined;
    const response = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async (_input, init) => {
        upstreamSignal = init?.signal ?? undefined;
        return new Response(new ReadableStream<Uint8Array>({ start() {} }));
      },
    });

    await response.body!.cancel();
    expect(upstreamSignal?.aborted).toBe(true);
  });

  test('returns safe rate-limit and pre-stream failure responses', async () => {
    const rateLimited = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: async () => ({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60_000 }),
      fetcher: async () => {
        throw new Error('must not run');
      },
    });
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get('retry-after')).toBeTruthy();
    expect(await rateLimited.json()).toEqual({ error: 'Too many requests. Please try again later.' });

    const unavailable = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: undefined,
      limit: successLimit,
      fetcher: async () => {
        throw new Error('must not run');
      },
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: 'Service temporarily unavailable.' });

    const upstreamFailure = await handleContactIntent(request({ message: 'A project idea.' }), {
      apiKey: 'test-key',
      limit: successLimit,
      fetcher: async () => new Response('provider body must stay private', { status: 500 }),
    });
    expect(upstreamFailure.status).toBe(503);
    expect(await upstreamFailure.json()).toEqual({ error: 'Service temporarily unavailable.' });
  });
});
