import { describe, expect, test } from 'bun:test';
import { constantTimeEqual, fromHex, toHex } from './util';

describe('drops util', () => {
  test('toHex/fromHex round-trip', () => {
    const bytes = new Uint8Array([0, 15, 16, 255]);
    expect(toHex(bytes.buffer)).toBe('000f10ff');
    expect([...fromHex('000f10ff')]).toEqual([0, 15, 16, 255]);
  });
  test('constantTimeEqual: equal strings true, any difference false', () => {
    expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true);
    expect(constantTimeEqual('abcdef', 'abcdeg')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
