import { describe, expect, test } from 'bun:test';
import { formatSignInCodeInput, normalizeSignInCode } from './sign-in-code';

describe('sign-in code input', () => {
  test('formats progressively as NN-NNN-NNN', () => {
    expect(formatSignInCodeInput('2')).toBe('2');
    expect(formatSignInCodeInput('211')).toBe('21-1');
    expect(formatSignInCodeInput('211231')).toBe('21-123-1');
    expect(formatSignInCodeInput('21123123')).toBe('21-123-123');
    expect(formatSignInCodeInput('21-123-1234')).toBe('21-123-123');
    expect(formatSignInCodeInput(' 21 123 123 ')).toBe('21-123-123');
  });

  test('normalizes to exactly 8 digits', () => {
    expect(normalizeSignInCode('21-123-123')).toBe('21123123');
    expect(normalizeSignInCode('00000000')).toBe('00000000');
    expect(normalizeSignInCode('2112312')).toBeNull();
    expect(normalizeSignInCode(null)).toBeNull();
  });
});
