export const UPLOAD_PART_SIZE = 50 * 1024 * 1024;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;

export const MAX_UPLOAD_PARTS = Math.ceil(MAX_UPLOAD_BYTES / UPLOAD_PART_SIZE);

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
