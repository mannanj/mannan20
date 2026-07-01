import { describe, expect, test } from 'bun:test';
import { extOf, formatBytes } from './drops-format';

describe('drops-format', () => {
  test('formatBytes scales B/KB/MB/GB to one decimal', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2 * 1024 ** 3)).toBe('2.0 GB');
  });
  test('extOf lowercases the extension and tolerates no-dot names', () => {
    expect(extOf('Photo.JPG')).toBe('jpg');
    expect(extOf('archive.tar.gz')).toBe('gz');
    expect(extOf('noext')).toBe('');
  });
});
