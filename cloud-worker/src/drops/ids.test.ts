import { describe, expect, test } from 'bun:test';
import { newId, newShareId } from './ids';

describe('drops ids', () => {
  test('newShareId is 16 chars of base62 and unguessable-distinct', () => {
    const a = newShareId();
    expect(a).toMatch(/^[0-9A-Za-z]{16}$/);
    expect(newShareId()).not.toBe(a);
  });
  test('newId is a 32-hex token', () => {
    expect(newId()).toMatch(/^[0-9a-f]{32}$/);
  });
});
