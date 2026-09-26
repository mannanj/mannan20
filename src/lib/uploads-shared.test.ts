import { describe, expect, test } from 'bun:test';
import { ZIP_PART_MAX_BYTES, planDownload, previewableImageType } from './uploads-shared';

const MB = 1024 * 1024;

function file(id: string, sizeMb: number) {
  return { id, size: sizeMb * MB };
}

describe('planDownload', () => {
  test('keeps everything in one part when it fits under the cap', () => {
    const plan = planDownload([file('a', 10), file('b', 20)], 100 * MB);
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe('zip');
    expect(plan[0].ids.sort()).toEqual(['a', 'b']);
  });

  test('a file at or over the cap goes out on its own', () => {
    const plan = planDownload([file('big', 100), file('a', 10)], 100 * MB);
    const solo = plan.filter((part) => part.kind === 'file');
    expect(solo).toHaveLength(1);
    expect(solo[0].ids).toEqual(['big']);
    expect(solo[0].bytes).toBe(100 * MB);
  });

  test('every part stays within the cap', () => {
    const files = Array.from({ length: 40 }, (_, i) => file(`f${i}`, 30));
    for (const part of planDownload(files, 100 * MB)) {
      expect(part.bytes).toBeLessThanOrEqual(100 * MB);
    }
  });

  test('packs close to the cap rather than spreading thin', () => {
    const files = Array.from({ length: 10 }, (_, i) => file(`f${i}`, 30));
    const plan = planDownload(files, 100 * MB);
    expect(plan).toHaveLength(4);
    const full = plan.filter((part) => part.ids.length === 3);
    expect(full).toHaveLength(3);
  });

  test('no file is dropped or duplicated', () => {
    const files = Array.from({ length: 57 }, (_, i) => file(`f${i}`, (i % 7) + 1));
    const plan = planDownload(files, 10 * MB);
    const ids = plan.flatMap((part) => part.ids).sort();
    expect(ids).toHaveLength(57);
    expect(new Set(ids).size).toBe(57);
  });

  test('is deterministic, so part N means the same thing on every request', () => {
    const files = Array.from({ length: 30 }, (_, i) => file(`f${i}`, (i % 5) + 1));
    const once = planDownload(files, 10 * MB);
    const twice = planDownload([...files].reverse(), 10 * MB);
    expect(twice.map((p) => p.ids)).toEqual(once.map((p) => p.ids));
  });

  test('respects the per-part entry ceiling', () => {
    const files = Array.from({ length: 1200 }, (_, i) => ({ id: `f${i}`, size: 1024 }));
    for (const part of planDownload(files, ZIP_PART_MAX_BYTES, 500)) {
      expect(part.ids.length).toBeLessThanOrEqual(500);
    }
  });

  test('handles an empty selection', () => {
    expect(planDownload([], 10 * MB)).toEqual([]);
  });
});

describe('previewableImageType', () => {
  test('accepts image types, with parameters stripped', () => {
    expect(previewableImageType('image/png')).toBe('image/png');
    expect(previewableImageType('IMAGE/JPEG; charset=binary')).toBe('image/jpeg');
  });

  test('refuses anything that is not an allowlisted image', () => {
    expect(previewableImageType('text/html')).toBeNull();
    expect(previewableImageType('image/svg+xml')).toBeNull();
    expect(previewableImageType('application/octet-stream')).toBeNull();
  });
});
