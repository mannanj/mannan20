import { describe, expect, test } from 'bun:test';
import { deriveConnection } from '../src/staleness';

describe('deriveConnection', () => {
  const seenAt = Date.parse('2026-07-18T22:00:00.000Z');

  test('is disconnected before the first heartbeat', () => {
    expect(deriveConnection(null, seenAt)).toBe('disconnected');
  });

  test('is live through the 45 second boundary', () => {
    expect(deriveConnection(new Date(seenAt).toISOString(), seenAt + 45_000)).toBe('live');
  });

  test('is stale after 45 seconds', () => {
    expect(deriveConnection(new Date(seenAt).toISOString(), seenAt + 45_001)).toBe('stale');
  });

  test('fails closed for an invalid timestamp', () => {
    expect(deriveConnection('not-a-date', seenAt)).toBe('disconnected');
  });
});
