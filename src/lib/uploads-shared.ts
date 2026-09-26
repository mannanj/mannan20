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
