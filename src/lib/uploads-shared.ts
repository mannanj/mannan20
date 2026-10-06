export const UPLOAD_PART_SIZE = 50 * 1024 * 1024;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;

export const MAX_UPLOAD_PARTS = Math.ceil(MAX_UPLOAD_BYTES / UPLOAD_PART_SIZE);

export const ZIP_PART_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export const ZIP_PART_MAX_ENTRIES = 500;

const ZIP_ENTRY_OVERHEAD = 256;

export interface DownloadPart {
  kind: 'file' | 'zip';
  ids: string[];
  bytes: number;
}

export function planDownload(
  files: { id: string; size: number }[],
  cap = ZIP_PART_MAX_BYTES,
  maxEntries = ZIP_PART_MAX_ENTRIES,
): DownloadPart[] {
  const solo: DownloadPart[] = [];
  const packable: { id: string; size: number }[] = [];

  for (const file of files) {
    if (file.size + ZIP_ENTRY_OVERHEAD >= cap) solo.push({ kind: 'file', ids: [file.id], bytes: file.size });
    else packable.push(file);
  }

  packable.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));

  const bins: { ids: string[]; bytes: number }[] = [];
  for (const file of packable) {
    const weight = file.size + ZIP_ENTRY_OVERHEAD;
    const bin = bins.find(
      (candidate) => candidate.bytes + weight <= cap && candidate.ids.length < maxEntries,
    );
    if (bin) {
      bin.ids.push(file.id);
      bin.bytes += weight;
    } else {
      bins.push({ ids: [file.id], bytes: weight });
    }
  }

  return [...solo, ...bins.map((bin) => ({ kind: 'zip' as const, ids: bin.ids, bytes: bin.bytes }))];
}

export interface UploadBatch {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
  totalSize: number;
}

export interface UploadFile {
  id: string;
  title: string;
  description: string;
  contentType: string;
  size: number;
  createdAt: number;
  modifiedAt: number | null;
  uploadedBy?: string | null;
}

export const MAX_UPLOADER_NAME = 80;

export function cleanNamePart(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_UPLOADER_NAME / 2) : '';
}

export function uploaderFirstName(uploadedBy: string | null | undefined): string {
  if (!uploadedBy) return '';
  return uploadedBy.includes('@') ? uploadedBy : uploadedBy.split(' ')[0];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function defaultBatchTitle(now = new Date()): string {
  const stamp = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Uploads on ${stamp}`;
}

const PREVIEWABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
]);

export function previewableImageType(contentType: string): string | null {
  const bare = contentType.split(';')[0].trim().toLowerCase();
  return PREVIEWABLE_IMAGE_TYPES.has(bare) ? bare : null;
}

export interface UploadFileEntry extends UploadFile {
  batchId: string;
  batchTitle: string;
  viaShare: boolean;
}

export type ShareAccess = 'read' | 'write' | 'both';

export interface UploadShare {
  id: string;
  token: string;
  batchId: string;
  batchTitle: string;
  fileId: string | null;
  fileTitle: string | null;
  label: string;
  canRead: boolean;
  canWrite: boolean;
  expiresAt: number | null;
  maxUploads: number | null;
  uploadCount: number;
  maxDownloads: number | null;
  downloadCount: number;
  maxBytes: number | null;
  usedBytes: number;
  signInRead: boolean;
  signInWrite: boolean;
  createdAt: number;
  updatedAt: number;
  revokedAt: number | null;
}

export type ShareStatus = 'active' | 'expired' | 'revoked' | 'used-up';

export function shareStatus(
  share: Pick<
    UploadShare,
    | 'revokedAt'
    | 'expiresAt'
    | 'canRead'
    | 'canWrite'
    | 'maxUploads'
    | 'uploadCount'
    | 'maxDownloads'
    | 'downloadCount'
    | 'maxBytes'
    | 'usedBytes'
  >,
  now = Date.now(),
): ShareStatus {
  if (share.revokedAt !== null) return 'revoked';
  if (share.expiresAt !== null && share.expiresAt <= now) return 'expired';
  const writeLeft =
    share.canWrite &&
    (share.maxUploads === null || share.uploadCount < share.maxUploads) &&
    (share.maxBytes === null || share.usedBytes < share.maxBytes);
  const readLeft =
    share.canRead && (share.maxDownloads === null || share.downloadCount < share.maxDownloads);
  return writeLeft || readLeft ? 'active' : 'used-up';
}

export function canShareWrite(share: UploadShare, now = Date.now()): boolean {
  return shareStatus(share, now) === 'active' && share.canWrite &&
    (share.maxUploads === null || share.uploadCount < share.maxUploads) &&
    (share.maxBytes === null || share.usedBytes < share.maxBytes);
}

export function canShareRead(share: UploadShare, now = Date.now()): boolean {
  return shareStatus(share, now) === 'active' && share.canRead &&
    (share.maxDownloads === null || share.downloadCount < share.maxDownloads);
}

export const DURATION_UNITS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;

export type DurationUnit = keyof typeof DURATION_UNITS;

export const MAX_SHARE_DURATION_MS = 366 * DURATION_UNITS.days;

export interface ShareSettings {
  label?: string;
  canRead?: boolean;
  canWrite?: boolean;
  expiresInMs?: number | null;
  maxUploads?: number | null;
  maxDownloads?: number | null;
  maxBytes?: number | null;
}

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/upload/s/${token}`;
}

export type GroupBy = 'day' | 'week' | 'month' | 'year';

export interface FileGroup<T> {
  key: string;
  label: string;
  start: number;
  files: T[];
}

const DAY_MS = DURATION_UNITS.days;

export function groupStart(timestamp: number, by: GroupBy): Date {
  const date = new Date(timestamp);
  if (by === 'year') return new Date(date.getFullYear(), 0, 1);
  if (by === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (by === 'day') return day;
  const mondayOffset = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - mondayOffset);
}

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

export function groupLabel(start: Date, by: GroupBy): string {
  if (by === 'year') return String(start.getFullYear());
  if (by === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (by === 'day') {
    return start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return `Week of ${start.toLocaleDateString('en-US', SHORT_DATE)} – ${end.toLocaleDateString('en-US', { ...SHORT_DATE, year: 'numeric' })}`;
}

export function groupFiles<T extends { createdAt: number }>(
  files: T[],
  by: GroupBy,
  order: 'newest' | 'oldest' = 'newest',
): FileGroup<T>[] {
  const sign = order === 'newest' ? -1 : 1;
  const sorted = [...files].sort((a, b) => sign * (a.createdAt - b.createdAt));
  const groups = new Map<number, FileGroup<T>>();
  for (const file of sorted) {
    const start = groupStart(file.createdAt, by);
    const key = start.getTime();
    let group = groups.get(key);
    if (!group) {
      group = { key: `${by}-${key}`, label: groupLabel(start, by), start: key, files: [] };
      groups.set(key, group);
    }
    group.files.push(file);
  }
  return [...groups.values()].sort((a, b) => sign * (a.start - b.start));
}

export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export interface FileFilter {
  terms: string[];
  from: number | null;
  to: number | null;
}

export interface BrowsableFile {
  id: string;
  title: string;
  batchTitle: string;
  contentType: string;
  size: number;
  createdAt: number;
  uploadedBy?: string | null;
}

export function matchesFilter(
  file: Pick<BrowsableFile, 'title' | 'batchTitle' | 'contentType' | 'createdAt' | 'uploadedBy'>,
  filter: FileFilter,
): boolean {
  if (filter.from !== null && file.createdAt < filter.from) return false;
  if (filter.to !== null && file.createdAt >= filter.to + DAY_MS) return false;
  if (!filter.terms.length) return true;
  const haystack = `${file.title} ${file.batchTitle} ${file.contentType} ${file.uploadedBy ?? ''}`.toLowerCase();
  return filter.terms.every((term) => haystack.includes(term));
}
