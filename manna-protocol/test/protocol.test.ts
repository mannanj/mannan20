import { describe, expect, test } from 'bun:test';
import { parseMannaEvent, type MannaEvent } from '../src/protocol';

const validEvent: MannaEvent = {
  eventId: 'codex:session-1:42:test.finished',
  projectId: 'meet',
  source: 'codex',
  sourceSessionId: 'session-1',
  sourceCursor: 42,
  kind: 'test.finished',
  occurredAt: '2026-07-18T22:00:00.000Z',
  summary: '194 tests passed',
  payload: { status: 'passed', commandClass: 'unit', count: 194 },
};

describe('parseMannaEvent', () => {
  test('accepts a field-for-field valid event', () => {
    expect(parseMannaEvent(validEvent)).toEqual(validEvent);
  });

  test.each([
    ['unknown kind', { ...validEvent, kind: 'assistant.said' }],
    ['raw output', { ...validEvent, rawOutput: 'SECRET=abc' }],
    ['unrelated project', { ...validEvent, projectId: 'unrelated' }],
    ['invalid timestamp', { ...validEvent, occurredAt: 'yesterday' }],
    ['oversized summary', { ...validEvent, summary: 'x'.repeat(181) }],
    [
      'kind-specific extra payload key',
      { ...validEvent, payload: { ...validEvent.payload, command: 'bun test' } },
    ],
  ])('rejects %s', (_label, candidate) => {
    expect(parseMannaEvent(candidate)).toBeNull();
  });

  test('rejects payload fields belonging to a different event kind', () => {
    expect(
      parseMannaEvent({
        ...validEvent,
        kind: 'collector.heartbeat',
        payload: { status: 'passed' },
      }),
    ).toBeNull();
  });

  test('rejects control characters in summaries', () => {
    expect(parseMannaEvent({ ...validEvent, summary: 'passed\u0000SECRET' })).toBeNull();
  });
});
