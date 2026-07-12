import { describe, expect, test } from 'bun:test';
import {
  objectKeyFor,
  parseRelativeObjectName,
  safeAttachmentDisposition,
  safeAttachmentFilename,
} from './storage';

describe('parseRelativeObjectName', () => {
  test.each([
    'report.pdf',
    'client/final deck.pdf',
    '文件/最終版.pdf',
  ])('accepts %s', (name) => {
    expect(parseRelativeObjectName(name)).toBe(name);
  });

  test.each([
    '',
    '/report.pdf',
    'report.pdf/',
    'client//report.pdf',
    './report.pdf',
    'client/../report.pdf',
    'client\\report.pdf',
    'bad\0name.pdf',
    'bad\u0007name.pdf',
    '%2Freport.pdf',
    'client%2Freport.pdf',
    '%2e/report.pdf',
    'client/%2e%2e/report.pdf',
    'client%5Creport.pdf',
    `${'a'.repeat(1021)}.pdf`,
  ])('rejects %s', (name) => {
    expect(parseRelativeObjectName(name)).toBeNull();
  });

  test('accepts an identifier exactly 1024 UTF-16 code units long', () => {
    const name = `${'a'.repeat(1020)}.pdf`;
    expect(parseRelativeObjectName(name)).toBe(name);
  });
});

describe('objectKeyFor', () => {
  test('prepends only the configured folder prefix', () => {
    expect(objectKeyFor('general', 'client/report.pdf')).toBe('general/client/report.pdf');
    expect(objectKeyFor('hans', 'client/report.pdf')).toBe('client/report.pdf');
  });

  test('does not construct a key for an invalid identifier', () => {
    expect(objectKeyFor('general', '../report.pdf')).toBeNull();
  });
});

describe('safeAttachmentFilename', () => {
  test('uses only the final path segment', () => {
    expect(safeAttachmentFilename('client/final deck.pdf')).toBe('final deck.pdf');
  });

  test('removes controls, quotes, and backslashes', () => {
    expect(safeAttachmentFilename('client/evil\"\\\r\nname.pdf')).toBe('evilname.pdf');
  });

  test('falls back when sanitization leaves no filename', () => {
    expect(safeAttachmentFilename('client/\"\u0007')).toBe('download');
  });
});

test('encodes Unicode attachment names without placing Unicode in the legacy filename', () => {
  expect(safeAttachmentDisposition('文件/最終版.pdf')).toBe(
    'attachment; filename="download"; filename*=UTF-8\'\'%E6%9C%80%E7%B5%82%E7%89%88.pdf',
  );
});
