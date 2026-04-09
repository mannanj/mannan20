export interface AudioChunk {
  url: string;
  key: string;
  label: string;
}

const BLOB_BASE = 'https://hq19kliyhzkpvads.public.blob.vercel-storage.com/audio';

export const MANIFESTO_CHUNKS: AudioChunk[] = [
  { url: `${BLOB_BASE}/manifesto/chunk-1.wav`, key: 'manifesto/chunk-1', label: 'Part 1' },
  { url: `${BLOB_BASE}/manifesto/chunk-2.wav`, key: 'manifesto/chunk-2', label: 'Part 2' },
  { url: `${BLOB_BASE}/manifesto/chunk-3.wav`, key: 'manifesto/chunk-3', label: 'Part 3' },
];

export const NEW_RICH_CHUNKS: AudioChunk[] = [
  { url: `${BLOB_BASE}/new-rich/chunk-1.wav`, key: 'new-rich/chunk-1', label: 'Full' },
];
