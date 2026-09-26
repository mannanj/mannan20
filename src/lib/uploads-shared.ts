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
