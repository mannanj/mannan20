import { describe, expect, test } from 'bun:test';
import type { ContactStreamFrame } from './types';
import {
  buildOpenRouterRequest,
  consumeOpenRouterSseLine,
  MAX_FRAME_BYTES,
  MAX_HISTORY_ENTRIES,
  MAX_MESSAGE_LENGTH,
  MAX_MODEL_TEXT_LENGTH,
  MAX_STREAM_BUFFER_BYTES,
  encodeFrame,
  finalizeUpstreamSuffix,
  historyUsedQuestion,
  parseFrame,
  parseFrames,
  sanitizeHistory,
  takeCompleteSentences,
  validateModelSentence,
} from './contact-intent-logic';

describe('sanitizeHistory', () => {
  test('keeps only alternating user and assistant entries', () => {
    expect(sanitizeHistory([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'assistant', content: 'duplicate assistant' },
      { role: 'system', content: 'hostile' },
      { role: 'user', content: 'second' },
    ])).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ]);
  });

  test('keeps at most six entries and applies separate content caps', () => {
    const entries = Array.from({ length: MAX_HISTORY_ENTRIES + 2 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: i % 2 === 0 ? 'u'.repeat(MAX_MESSAGE_LENGTH + 10) : 'a'.repeat(MAX_MODEL_TEXT_LENGTH + 10),
    }));
    const result = sanitizeHistory(entries);
    expect(result).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(result.find(entry => entry.role === 'user')?.content).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(result.find(entry => entry.role === 'assistant')?.content).toHaveLength(MAX_MODEL_TEXT_LENGTH);
  });

  test('rejects malformed input without executing or preserving non-text values', () => {
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory([{ role: 'user', content: { toString: () => 'executed' } }, { role: 'assistant', content: 4 }])).toEqual([]);
  });

  test('truncates user and assistant content by Unicode code points', () => {
    const result = sanitizeHistory([
      { role: 'user', content: '🙂'.repeat(MAX_MESSAGE_LENGTH + 1) },
      { role: 'assistant', content: '🚀'.repeat(MAX_MODEL_TEXT_LENGTH + 1) },
    ]);
    expect([...result[0].content]).toHaveLength(MAX_MESSAGE_LENGTH);
    expect([...result[1].content]).toHaveLength(MAX_MODEL_TEXT_LENGTH);
    expect(result[0].content.endsWith('🙂')).toBe(true);
    expect(result[1].content.endsWith('🚀')).toBe(true);
  });
});

describe('historyUsedQuestion', () => {
  test('finds a question mark anywhere in an assistant entry', () => {
    expect(historyUsedQuestion([{ role: 'assistant', content: 'What? Then we can proceed.' }])).toBe(true);
  });

  test('ignores question marks in user entries', () => {
    expect(historyUsedQuestion([{ role: 'user', content: 'What?' }])).toBe(false);
  });
});

describe('validateModelSentence', () => {
  test('accepts a non-question sentence and counts no question', () => {
    expect(validateModelSentence('That sounds like a thoughtful project.', false, 0)).toEqual({ valid: true, questionCount: 0 });
  });

  test('rejects any question after the thread already asked one', () => {
    expect(validateModelSentence('What outcome matters most?', true, 0)).toEqual({ valid: false, questionCount: 1 });
  });

  test('rejects a second question in the same response', () => {
    expect(validateModelSentence('What matters most? And who decides?', false, 0)).toEqual({ valid: false, questionCount: 2 });
  });

  test('accounts for questions already emitted in this response', () => {
    expect(validateModelSentence('What matters most?', false, 1)).toEqual({ valid: false, questionCount: 2 });
  });
});

describe('takeCompleteSentences', () => {
  test('returns completed sentences and retains an unfinished suffix', () => {
    expect(takeCompleteSentences('First point. Second point! Still typing', 480)).toEqual({
      complete: 'First point. Second point!',
      rest: ' Still typing',
    });
  });

  test('counts remaining space by code points', () => {
    const result = takeCompleteSentences('🙂'.repeat(479) + '.', MAX_MODEL_TEXT_LENGTH);
    expect([...result.complete]).toHaveLength(MAX_MODEL_TEXT_LENGTH);
    expect(result.rest).toBe('');
  });

  test('recognizes punctuation only when followed by whitespace or end', () => {
    expect(takeCompleteSentences('Use example.com carefully. Next?', 480)).toEqual({
      complete: 'Use example.com carefully. Next?',
      rest: '',
    });
    expect(takeCompleteSentences('A decimal 1.5 is unfinished', 480)).toEqual({ complete: '', rest: 'A decimal 1.5 is unfinished' });
  });

  test('never emits more than the remaining character budget', () => {
    const first = 'A'.repeat(20) + '.';
    const second = 'B'.repeat(20) + '.';
    const result = takeCompleteSentences(`${first} ${second}`, 25);
    expect(result.complete).toBe(first);
    expect(result.complete.length).toBeLessThanOrEqual(25);
    expect(result.rest).toContain(second);
  });
});

describe('NDJSON stream protocol', () => {
  test('encodes the exact meta, text, done, and safe error frames', () => {
    const frames: ContactStreamFrame[] = [
      { type: 'meta', version: 1 },
      { type: 'text', value: 'Café 日本語' },
      { type: 'done' },
      { type: 'error', code: 'upstream' },
    ];
    expect(frames.map(encodeFrame)).toEqual([
      '{"type":"meta","version":1}\n',
      '{"type":"text","value":"Café 日本語"}\n',
      '{"type":"done"}\n',
      '{"type":"error","code":"upstream"}\n',
    ]);
    expect(parseFrame(encodeFrame(frames[1]))).toEqual(frames[1]);
  });

  test('rejects unknown fields, types, oversized frames, and model text overflow', () => {
    expect(parseFrame('{"type":"done","extra":true}\n')).toBeNull();
    expect(parseFrame('{"type":"wat"}\n')).toBeNull();
    expect(parseFrame('{"type":"error","code":"provider-secret"}\n')).toBeNull();
    expect(parseFrame(`${' '.repeat(MAX_FRAME_BYTES)}\n`)).toBeNull();
    expect(encodeFrame({ type: 'text', value: 'x'.repeat(MAX_MODEL_TEXT_LENGTH + 1) })).toBe('');
    expect(encodeFrame({ type: 'text', value: '🙂'.repeat(MAX_MODEL_TEXT_LENGTH + 1) })).toBe('');
    expect(parseFrame(encodeFrame({ type: 'text', value: '🙂'.repeat(MAX_MODEL_TEXT_LENGTH) }))).toEqual({
      type: 'text',
      value: '🙂'.repeat(MAX_MODEL_TEXT_LENGTH),
    });
  });

  test('rejects duplicate meta, trailing frames, and a stream buffer over 8 KiB', () => {
    expect(parseFrames([
      encodeFrame({ type: 'meta', version: 1 }),
      encodeFrame({ type: 'meta', version: 1 }),
    ].join(''))).toBeNull();
    expect(parseFrames([
      encodeFrame({ type: 'meta', version: 1 }),
      encodeFrame({ type: 'done' }),
      encodeFrame({ type: 'text', value: 'late' }),
    ].join(''))).toBeNull();
    expect(parseFrames('x'.repeat(MAX_STREAM_BUFFER_BYTES + 1))).toBeNull();
  });

  test('accepts completed frames with an incomplete final line within the buffer cap', () => {
    const completed = [
      encodeFrame({ type: 'meta', version: 1 }),
      encodeFrame({ type: 'text', value: 'A complete sentence.' }),
    ].join('');
    expect(parseFrames(`${completed}{"type":"text","value":"unfinished`)).toEqual([
      { type: 'meta', version: 1 },
      { type: 'text', value: 'A complete sentence.' },
    ]);
    expect(parseFrames(`${completed}${'x'.repeat(MAX_STREAM_BUFFER_BYTES)}`)).toEqual([
      { type: 'meta', version: 1 },
      { type: 'text', value: 'A complete sentence.' },
    ]);
    expect(parseFrames(`${completed}${'x'.repeat(MAX_STREAM_BUFFER_BYTES + 1)}`)).toBeNull();
  });

  test('rejects aggregate model text over 480 code points across frames', () => {
    expect(parseFrames([
      encodeFrame({ type: 'meta', version: 1 }),
      encodeFrame({ type: 'text', value: '🙂'.repeat(240) }),
      encodeFrame({ type: 'text', value: '🚀'.repeat(241) }),
      encodeFrame({ type: 'done' }),
    ].join(''))).toBeNull();
  });

  test('keeps UTF-8 and hostile-looking text inert as JSON data', () => {
    const hostile = '<script>alert("x")</script> \u2028 Привет';
    const encoded = encodeFrame({ type: 'text', value: hostile });
    expect(encoded).not.toContain('<script>');
    expect(parseFrame(encoded)).toEqual({ type: 'text', value: hostile });
  });
});

describe('finalizeUpstreamSuffix', () => {
  test('trims a non-empty suffix and appends a period when room remains', () => {
    expect(finalizeUpstreamSuffix('  Needs a next step  ', 30, false, 0)).toEqual({
      text: 'Needs a next step.',
      questionCount: 0,
    });
  });

  test('respects aggregate room and question validation', () => {
    expect(finalizeUpstreamSuffix('Still unfinished', 5, false, 0)).toBeNull();
    expect(finalizeUpstreamSuffix('What now?', 30, true, 0)).toBeNull();
    expect(finalizeUpstreamSuffix('What now?', 30, false, 1)).toBeNull();
  });
});

describe('OpenRouter SSE normalization', () => {
  test('ignores keep-alive comments and normal stop events', () => {
    expect(consumeOpenRouterSseLine(': OPENROUTER PROCESSING')).toEqual({ type: 'ignore' });
    expect(consumeOpenRouterSseLine('data: {"choices":[],"usage":{"total_tokens":12}}')).toEqual({ type: 'ignore' });
    expect(consumeOpenRouterSseLine('data: {"choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}')).toEqual({ type: 'ignore' });
    expect(consumeOpenRouterSseLine('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}')).toEqual({ type: 'ignore' });
  });

  test('extracts only text content from a delta after chunks are reassembled into lines', () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"First',
      ' sentence."},"finish_reason":null}]}\n',
    ];
    const line = chunks.join('').trimEnd();
    expect(consumeOpenRouterSseLine(line)).toEqual({ type: 'content', value: 'First sentence.' });
    expect(consumeOpenRouterSseLine('data: {"choices":[{"delta":{"reasoning":"hidden","content":"Visible."}}]}')).toEqual({
      type: 'content',
      value: 'Visible.',
    });
  });

  test('recognizes a clean completion marker without emitting provider text', () => {
    expect(consumeOpenRouterSseLine('data: [DONE]')).toEqual({ type: 'done' });
  });

  test('fails closed for in-band provider errors, error finishes, and malformed JSON', () => {
    expect(consumeOpenRouterSseLine('data: {"error":{"message":"provider detail"}}')).toEqual({ type: 'error' });
    expect(consumeOpenRouterSseLine('data: {"choices":[{"delta":{},"finish_reason":"error"}]}')).toEqual({ type: 'error' });
    expect(consumeOpenRouterSseLine('data: {not-json}')).toEqual({ type: 'error' });
  });
});

describe('buildOpenRouterRequest', () => {
  test('uses the exact low-latency request with bounded history and a no-second-question prompt', () => {
    const rawHistory = Array.from({ length: MAX_HISTORY_ENTRIES + 2 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: index % 2 === 0
        ? 'u'.repeat(MAX_MESSAGE_LENGTH + 1)
        : index === 3 ? 'Have you considered the audience?' : 'a'.repeat(MAX_MODEL_TEXT_LENGTH + 1),
    }));

    const request = buildOpenRouterRequest('A possible collaboration.', rawHistory);

    expect(request.model).toBe('deepseek/deepseek-v4-flash');
    expect(request.stream).toBe(true);
    expect(request.reasoning).toEqual({ enabled: false });
    expect(request).not.toHaveProperty('tools');
    expect(request.messages).toHaveLength(MAX_HISTORY_ENTRIES + 2);
    expect(request.messages.slice(1, -1)).toEqual(sanitizeHistory(rawHistory));
    expect(request.messages.at(-1)).toEqual({ role: 'user', content: 'A possible collaboration.' });
    expect(request.messages[0].content).toContain('Do not ask a question');
  });
});
