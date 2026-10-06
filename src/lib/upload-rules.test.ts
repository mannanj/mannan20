import { describe, expect, test } from 'bun:test';
import {
  canShareRead,
  canShareWrite,
  groupFiles,
  groupStart,
  matchesFilter,
  searchTerms,
  shareStatus,
  type UploadShare,
} from './uploads-shared';

const NOW = new Date(2026, 9, 5, 12).getTime();
const HOUR = 60 * 60 * 1000;

function share(overrides: Partial<UploadShare> = {}): UploadShare {
  return {
    id: 's',
    token: 't',
    batchId: 'b',
    batchTitle: 'Page',
    fileId: null,
    fileTitle: null,
    label: '',
    canRead: false,
    canWrite: true,
    expiresAt: null,
    maxUploads: null,
    uploadCount: 0,
    maxDownloads: null,
    downloadCount: 0,
    maxBytes: null,
    usedBytes: 0,
    signInRead: false,
    signInWrite: false,
    createdAt: NOW,
    updatedAt: NOW,
    revokedAt: null,
    ...overrides,
  };
}

describe('shareStatus', () => {
  test('active with no limits', () => {
    expect(shareStatus(share(), NOW)).toBe('active');
  });

  test('revoked wins over everything', () => {
    expect(shareStatus(share({ revokedAt: NOW, expiresAt: NOW - HOUR }), NOW)).toBe('revoked');
  });

  test('expires at its time', () => {
    expect(shareStatus(share({ expiresAt: NOW }), NOW)).toBe('expired');
    expect(shareStatus(share({ expiresAt: NOW + 1 }), NOW)).toBe('active');
  });

  test('used up when the upload count is reached', () => {
    expect(shareStatus(share({ maxUploads: 2, uploadCount: 2 }), NOW)).toBe('used-up');
  });

  test('used up when capacity is full', () => {
    expect(shareStatus(share({ maxBytes: 100, usedBytes: 100 }), NOW)).toBe('used-up');
  });

  test('read + write stays active while either side has room', () => {
    const both = share({ canRead: true, maxUploads: 1, uploadCount: 1 });
    expect(shareStatus(both, NOW)).toBe('active');
    expect(canShareWrite(both, NOW)).toBe(false);
    expect(canShareRead(both, NOW)).toBe(true);
  });

  test('file share runs out of downloads', () => {
    const file = share({ fileId: 'f', canRead: true, canWrite: false, maxDownloads: 1, downloadCount: 1 });
    expect(shareStatus(file, NOW)).toBe('used-up');
    expect(canShareRead(file, NOW)).toBe(false);
  });
});

describe('groupFiles', () => {
  const at = (y: number, m: number, d: number) => ({ id: `${y}-${m}-${d}`, createdAt: new Date(y, m - 1, d, 10).getTime() });
  const files = [at(2026, 10, 5), at(2026, 9, 29), at(2026, 9, 28), at(2026, 10, 1), at(2025, 1, 2)];

  test('weeks start on Monday', () => {
    expect(groupStart(new Date(2026, 9, 5, 10).getTime(), 'week').getDay()).toBe(1);
    expect(groupStart(new Date(2026, 9, 4, 10).getTime(), 'week').getDate()).toBe(28);
  });

  test('default newest week first, newest file first', () => {
    const groups = groupFiles(files, 'week');
    expect(groups[0].files.map((file) => file.id)).toEqual(['2026-10-5']);
    expect(groups[1].files.map((file) => file.id)).toEqual(['2026-10-1', '2026-9-29', '2026-9-28']);
    expect(groups.at(-1)?.files[0].id).toBe('2025-1-2');
  });

  test('oldest order reverses groups and files', () => {
    const groups = groupFiles(files, 'year', 'oldest');
    expect(groups.map((group) => group.label)).toEqual(['2025', '2026']);
    expect(groups[1].files[0].id).toBe('2026-9-28');
  });

  test('day and month buckets', () => {
    expect(groupFiles(files, 'day')).toHaveLength(5);
    expect(groupFiles(files, 'month').map((group) => group.label)).toEqual([
      'October 2026',
      'September 2026',
      'January 2025',
    ]);
  });
});

describe('matchesFilter', () => {
  const file = { title: 'Trip Photos.zip', batchTitle: 'Japan', contentType: 'application/zip', createdAt: NOW };

  test('every term must match', () => {
    expect(matchesFilter(file, { terms: searchTerms('trip japan'), from: null, to: null })).toBe(true);
    expect(matchesFilter(file, { terms: searchTerms('trip paris'), from: null, to: null })).toBe(false);
  });

  test('matches the content type', () => {
    expect(matchesFilter(file, { terms: ['zip'], from: null, to: null })).toBe(true);
  });

  test('to includes the whole day', () => {
    const day = new Date(2026, 9, 5).getTime();
    expect(matchesFilter(file, { terms: [], from: day, to: day })).toBe(true);
    expect(matchesFilter(file, { terms: [], from: day + 24 * HOUR, to: null })).toBe(false);
    expect(matchesFilter(file, { terms: [], from: null, to: day - 24 * HOUR })).toBe(false);
  });
});
