import { describe, expect, test } from 'bun:test';
import { canCompleteLegalReview } from './legal-review-state';

describe('legal review usability gate', () => {
  test.each([
    [{ reachedEnd: false, agreed: false }, false],
    [{ reachedEnd: true, agreed: false }, false],
    [{ reachedEnd: false, agreed: true }, false],
    [{ reachedEnd: true, agreed: true }, true],
  ] as const)('allows completion only after review and explicit agreement', (state, expected) => {
    expect(canCompleteLegalReview(state)).toBe(expected);
  });
});
