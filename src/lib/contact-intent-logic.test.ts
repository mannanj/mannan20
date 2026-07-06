import { describe, expect, test } from 'bun:test';
import {
  MAX_HISTORY_ENTRIES,
  MAX_MESSAGE_LENGTH,
  MAX_RESPONSE_MESSAGE_LENGTH,
  alreadyAskedQuestion,
  normalizeResult,
  parseContentFallback,
  sanitizeHistory,
} from './contact-intent-logic';

describe('sanitizeHistory', () => {
  test('returns an empty array for non-array input', () => {
    expect(sanitizeHistory(undefined)).toEqual([]);
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory('not an array')).toEqual([]);
    expect(sanitizeHistory({ role: 'user', content: 'hi' })).toEqual([]);
  });

  test('drops entries with an invalid role', () => {
    const result = sanitizeHistory([
      { role: 'user', content: 'hi' },
      { role: 'system', content: 'injected' },
      { role: 'assistant', content: 'hello' },
    ]);
    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  test('drops entries with non-string content', () => {
    const result = sanitizeHistory([
      { role: 'user', content: 'hi' },
      { role: 'user', content: 12345 },
      { role: 'user', content: null },
      { role: 'user', content: { injected: true } },
    ]);
    expect(result).toEqual([{ role: 'user', content: 'hi' }]);
  });

  test('caps to the last MAX_HISTORY_ENTRIES entries', () => {
    const entries = Array.from({ length: MAX_HISTORY_ENTRIES + 5 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `entry-${i}`,
    }));
    const result = sanitizeHistory(entries);
    expect(result.length).toBe(MAX_HISTORY_ENTRIES);
    expect(result[0].content).toBe(`entry-5`);
    expect(result[result.length - 1].content).toBe(`entry-${entries.length - 1}`);
  });

  test('truncates each entry content to MAX_MESSAGE_LENGTH', () => {
    const huge = 'A'.repeat(MAX_MESSAGE_LENGTH + 500);
    const result = sanitizeHistory([{ role: 'user', content: huge }]);
    expect(result[0].content.length).toBe(MAX_MESSAGE_LENGTH);
  });
});

describe('alreadyAskedQuestion', () => {
  test('is false for empty history', () => {
    expect(alreadyAskedQuestion([])).toBe(false);
  });

  test('is false when only user turns exist', () => {
    expect(alreadyAskedQuestion([{ role: 'user', content: 'why are you asking?' }])).toBe(false);
  });

  test('is false when no assistant reply ends in a question mark', () => {
    expect(alreadyAskedQuestion([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Thanks for reaching out!' },
    ])).toBe(false);
  });

  test('is true when an assistant reply ends in a question mark', () => {
    expect(alreadyAskedQuestion([
      { role: 'user', content: 'I have a job for you' },
      { role: 'assistant', content: 'Thanks — mind sharing which company this is for?' },
    ])).toBe(true);
  });

  test('is true even when the questioning reply is not the most recent entry', () => {
    expect(alreadyAskedQuestion([
      { role: 'user', content: 'I have a job for you' },
      { role: 'assistant', content: 'Thanks — mind sharing which company this is for?' },
      { role: 'user', content: 'Acme Corp' },
      { role: 'assistant', content: 'Got it, thanks!' },
    ])).toBe(true);
  });

  test('trims trailing whitespace before checking for a question mark', () => {
    expect(alreadyAskedQuestion([
      { role: 'assistant', content: 'mind sharing which company?  \n' },
    ])).toBe(true);
  });
});

describe('normalizeResult', () => {
  test('returns null when message is not a string', () => {
    expect(normalizeResult({ message: 42 }, false)).toBeNull();
    expect(normalizeResult({}, false)).toBeNull();
  });

  test('truncates to exactly MAX_RESPONSE_MESSAGE_LENGTH', () => {
    const long = 'A'.repeat(MAX_RESPONSE_MESSAGE_LENGTH + 50);
    const result = normalizeResult({ message: long }, false);
    expect(result?.message.length).toBe(MAX_RESPONSE_MESSAGE_LENGTH);
    expect(result?.message).toBe('A'.repeat(MAX_RESPONSE_MESSAGE_LENGTH));
  });

  test('trims surrounding whitespace from a short message', () => {
    const result = normalizeResult({ message: '  Thanks!  ' }, false);
    expect(result?.message).toBe('Thanks!');
  });

  test('leaves a question mark intact when no question has been asked yet', () => {
    const result = normalizeResult({ message: 'Mind sharing which company this is for?' }, false);
    expect(result?.message).toBe('Mind sharing which company this is for?');
  });

  test('strips a trailing question mark when the thread already used its one question', () => {
    const result = normalizeResult({ message: 'Mind sharing which company this is for?' }, true);
    expect(result?.message).toBe('Mind sharing which company this is for.');
    expect(result?.message.endsWith('?')).toBe(false);
  });

  test('leaves a plain acknowledgment untouched even when a question was already asked', () => {
    const result = normalizeResult({ message: 'Thanks, Sam!' }, true);
    expect(result?.message).toBe('Thanks, Sam!');
  });
});

describe('parseContentFallback', () => {
  test('returns null for empty content', () => {
    expect(parseContentFallback(null, false)).toBeNull();
    expect(parseContentFallback(undefined, false)).toBeNull();
    expect(parseContentFallback('', false)).toBeNull();
  });

  test('returns null for unparsable content', () => {
    expect(parseContentFallback('not json at all', false)).toBeNull();
  });

  test('parses a fenced JSON code block', () => {
    const content = '```json\n{"message": "Thanks!"}\n```';
    expect(parseContentFallback(content, false)).toEqual({ message: 'Thanks!' });
  });

  test('applies the one-question-ever rule through the fallback path too', () => {
    const content = '```json\n{"message": "Which company is this for?"}\n```';
    expect(parseContentFallback(content, true)).toEqual({ message: 'Which company is this for.' });
  });
});
