import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_MESSAGE_LENGTH,
  MAX_DECISION_LENGTH,
  MAX_STREAM_BUFFER_BYTES,
  buildOpenRouterRequest,
  consumeOpenRouterSseLine,
  encodeFrame,
  historyUsedQuestion,
  resolveAlignmentDecision,
  sanitizeHistory,
} from '@/lib/contact-intent-logic';
import { limitContactReflection } from '@/lib/rate-limit';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const encoder = new TextEncoder();

export type ContactIntentFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ContactIntentDependencies {
  apiKey: string | undefined;
  limit: typeof limitContactReflection;
  fetcher: ContactIntentFetcher;
}

function codePointLength(value: string): number {
  return [...value].length;
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

function errorResponse(status: number, error: string, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleContactIntent(request, {
    apiKey: process.env.OPENROUTER_API_KEY,
    limit: limitContactReflection,
    fetcher: fetch,
  });
}

export async function handleContactIntent(
  request: NextRequest,
  dependencies: ContactIntentDependencies,
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'Invalid request.');
  }

  if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
    return errorResponse(400, 'Invalid request.');
  }
  const body = rawBody as Record<string, unknown>;
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return errorResponse(400, 'A message is required.');
  }
  if (codePointLength(body.message) > MAX_MESSAGE_LENGTH) {
    return errorResponse(400, 'Message is too long.');
  }

  const limited = await dependencies.limit(clientIp(request));
  if (!limited.success) {
    const retryAfter = Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000));
    return errorResponse(
      429,
      'Too many requests. Please try again later.',
      { 'Retry-After': String(retryAfter) },
    );
  }

  const { apiKey } = dependencies;
  if (!apiKey || apiKey === 'your_key_here') {
    return errorResponse(503, 'Service temporarily unavailable.');
  }

  const history = sanitizeHistory(body.history);
  const questionUsed = historyUsedQuestion(history);
  const upstreamController = new AbortController();
  const abortForDisconnect = () => upstreamController.abort();
  request.signal.addEventListener('abort', abortForDisconnect, { once: true });

  let upstream: Response;
  try {
    upstream = await dependencies.fetcher(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenRouterRequest(body.message.trim(), history)),
      signal: upstreamController.signal,
    });
  } catch {
    request.signal.removeEventListener('abort', abortForDisconnect);
    return errorResponse(503, 'Service temporarily unavailable.');
  }

  if (!upstream.ok || !upstream.body) {
    upstreamController.abort();
    request.signal.removeEventListener('abort', abortForDisconnect);
    return errorResponse(503, 'Service temporarily unavailable.');
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let terminated = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let decisionBuffer = '';

      const close = () => {
        if (terminated) return;
        terminated = true;
        request.signal.removeEventListener('abort', abortForDisconnect);
        controller.close();
      };
      const emit = (frame: Parameters<typeof encodeFrame>[0]) => {
        const line = encodeFrame(frame);
        if (!line) throw new Error('invalid frame');
        controller.enqueue(encoder.encode(line));
      };
      const fail = () => {
        if (terminated) return;
        terminated = true;
        upstreamController.abort();
        void reader?.cancel();
        request.signal.removeEventListener('abort', abortForDisconnect);
        emit({ type: 'error', code: 'upstream' });
        controller.close();
      };
      const finishCleanly = () => {
        const reflectionChunks = resolveAlignmentDecision(decisionBuffer, questionUsed);
        if (!reflectionChunks) {
          fail();
          return;
        }
        for (const value of reflectionChunks) emit({ type: 'text', value });
        emit({ type: 'done' });
        close();
      };

      try {
        emit({ type: 'meta', version: 1 });
        while (!terminated) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = sseBuffer.indexOf('\n')) !== -1) {
            const line = sseBuffer.slice(0, newlineIndex);
            sseBuffer = sseBuffer.slice(newlineIndex + 1);
            const event = consumeOpenRouterSseLine(line);
            if (event.type === 'ignore') continue;
            if (event.type === 'error') {
              fail();
              return;
            }
            if (event.type === 'done') {
              finishCleanly();
              return;
            }

            decisionBuffer += event.value;
            if (codePointLength(decisionBuffer) > MAX_DECISION_LENGTH) {
              fail();
              return;
            }
          }
          if (encoder.encode(sseBuffer).byteLength > MAX_STREAM_BUFFER_BYTES) {
            fail();
            return;
          }
        }
        fail();
      } catch {
        fail();
      }
    },
    cancel(reason) {
      if (terminated) return;
      terminated = true;
      upstreamController.abort();
      request.signal.removeEventListener('abort', abortForDisconnect);
      return reader?.cancel(reason);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
