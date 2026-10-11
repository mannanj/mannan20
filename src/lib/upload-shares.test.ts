import { describe, expect, test } from 'bun:test';
import { parseShareSettings } from './upload-shares';

describe('parseShareSettings allowedEmails', () => {
  test('normalizes and dedupes the list', () => {
    const parsed = parseShareSettings({ allowedEmails: [' A@Example.com', 'a@example.com', 'b@example.org'] });
    expect(parsed).toEqual({ ok: true, value: { allowedEmails: ['a@example.com', 'b@example.org'] } });
  });

  test('accepts an empty list to reopen a link', () => {
    expect(parseShareSettings({ allowedEmails: [] })).toEqual({ ok: true, value: { allowedEmails: [] } });
  });

  test('rejects anything that is not a list of emails', () => {
    for (const allowedEmails of ['a@example.com', ['not-an-email'], [42], Array(51).fill('a@example.com')]) {
      expect(parseShareSettings({ allowedEmails }).ok).toBe(false);
    }
  });

  test('leaves the list untouched when omitted', () => {
    expect(parseShareSettings({ label: 'x' })).toEqual({ ok: true, value: { label: 'x' } });
  });
});
