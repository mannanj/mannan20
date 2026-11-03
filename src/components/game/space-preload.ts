export interface SpaceBlobs {
  earthDay: Blob;
  earthNight: Blob;
  moon: Blob;
}

export interface SpaceProgress {
  pct: number;
  etaSec: number | null;
  done: boolean;
}

export const SPACE_URLS = {
  earthDay: '/game/space/earth-day-4k.webp',
  earthNight: '/game/space/earth-night-2k.webp',
  moon: '/game/space/moon-lroc-1k.webp',
} as const;

type SpaceKey = keyof typeof SPACE_URLS;

const EXPECTED_BYTES: Record<SpaceKey, number> = {
  earthDay: 556_412,
  earthNight: 94_912,
  moon: 101_178,
};
const CHUNK_WEIGHT_BYTES = 700_000;
const SPEED_SMOOTHING = 0.2;
const MIN_SPEED_SAMPLE_MS = 120;
const KEYS = Object.keys(SPACE_URLS) as SpaceKey[];

const loaded: Record<SpaceKey, number> = { earthDay: 0, earthNight: 0, moon: 0 };
const totals: Record<SpaceKey, number> = { ...EXPECTED_BYTES };
let chunkDone = false;
let started: Promise<SpaceBlobs> | null = null;
let speed = 0;
let lastSampleAt = 0;
let lastSampleBytes = 0;
let finished = false;
let startedAt = 0;

function totalBytes(): number {
  return CHUNK_WEIGHT_BYTES + KEYS.reduce((s, k) => s + totals[k], 0);
}

function loadedBytes(): number {
  return (chunkDone ? CHUNK_WEIGHT_BYTES : 0) + KEYS.reduce((s, k) => s + Math.min(loaded[k], totals[k]), 0);
}

function sampleSpeed() {
  const now = performance.now();
  const bytes = loadedBytes();
  if (!lastSampleAt) {
    lastSampleAt = now;
    lastSampleBytes = bytes;
    return;
  }
  const dt = now - lastSampleAt;
  if (dt < MIN_SPEED_SAMPLE_MS) return;
  const inst = ((bytes - lastSampleBytes) / dt) * 1000;
  speed = speed ? speed + (inst - speed) * SPEED_SMOOTHING : inst;
  lastSampleAt = now;
  lastSampleBytes = bytes;
}

async function fetchBlob(key: SpaceKey): Promise<Blob> {
  const res = await fetch(SPACE_URLS[key]);
  if (!res.ok || !res.body) throw new Error(`space asset ${key} failed`);
  const header = Number(res.headers.get('content-length') || 0);
  if (header > 0) totals[key] = header;
  const reader = res.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as Uint8Array<ArrayBuffer>);
    loaded[key] += value.length;
    sampleSpeed();
  }
  totals[key] = loaded[key];
  return new Blob(chunks, { type: res.headers.get('content-type') ?? 'image/webp' });
}

export function startSpacePreload(loadChunk: () => Promise<unknown>): Promise<SpaceBlobs> {
  if (!started) {
    startedAt = performance.now();
    const chunk = loadChunk().then(() => {
      chunkDone = true;
      sampleSpeed();
    });
    const blobs = Promise.all(KEYS.map(fetchBlob));
    started = Promise.all([chunk, blobs])
      .then(([, [earthDay, earthNight, moon]]) => {
        finished = true;
        return { earthDay, earthNight, moon };
      })
      .catch((err: unknown) => {
        started = null;
        throw err;
      });
    started.catch(() => {});
  }
  return started;
}

export function getSpaceBlobs(): Promise<SpaceBlobs> {
  if (!started) throw new Error('space preload not started');
  return started;
}

export function getSpaceProgress(): SpaceProgress {
  if (finished) return { pct: 100, etaSec: 0, done: true };
  const total = totalBytes();
  const got = loadedBytes();
  const remaining = Math.max(0, total - got);
  const average = got > 0 ? (got / (performance.now() - startedAt)) * 1000 : 0;
  const rate = speed > 0 ? speed : average;
  const etaSec = rate > 0 ? remaining / rate : null;
  return { pct: Math.min(99, Math.floor((got / total) * 100)), etaSec, done: false };
}
