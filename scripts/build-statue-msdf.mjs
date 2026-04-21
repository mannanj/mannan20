import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_PATH = resolve(__dirname, "..", "public", "statue-source.jpg");
const OUT_PATH = resolve(__dirname, "..", "public", "human-msdf.png");
const MASK_PREVIEW_PATH = resolve(__dirname, "..", "public", "statue-mask.png");
const SIZE = 1024;
const PX_RANGE = 12;
const THRESHOLD = 140;

function edt1d(f, n) {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
  return d;
}

function cleanMask(mask, w, h) {
  const n = w * h;
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);

  let qTail = 0;
  const enqueue = (idx) => {
    if (!visited[idx]) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    if (!mask[x]) enqueue(x);
    if (!mask[(h - 1) * w + x]) enqueue((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    if (!mask[y * w]) enqueue(y * w);
    if (!mask[y * w + w - 1]) enqueue(y * w + w - 1);
  }

  let qHead = 0;
  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0 && !mask[idx - 1]) enqueue(idx - 1);
    if (x < w - 1 && !mask[idx + 1]) enqueue(idx + 1);
    if (y > 0 && !mask[idx - w]) enqueue(idx - w);
    if (y < h - 1 && !mask[idx + w]) enqueue(idx + w);
  }

  const holesFilled = new Uint8Array(n);
  for (let i = 0; i < n; i++) holesFilled[i] = visited[i] ? 0 : 1;

  const label = new Int32Array(n);
  let nextLabel = 0;
  const sizes = [];
  for (let i = 0; i < n; i++) {
    if (!holesFilled[i] || label[i]) continue;
    nextLabel++;
    label[i] = nextLabel;
    let size = 0;
    qTail = 0;
    queue[qTail++] = i;
    qHead = 0;
    while (qHead < qTail) {
      const idx = queue[qHead++];
      size++;
      const x = idx % w;
      const y = (idx / w) | 0;
      const neighbors = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < w - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - w);
      if (y < h - 1) neighbors.push(idx + w);
      for (const nb of neighbors) {
        if (holesFilled[nb] && !label[nb]) {
          label[nb] = nextLabel;
          queue[qTail++] = nb;
        }
      }
    }
    sizes[nextLabel] = size;
  }

  let biggest = 0;
  for (let l = 1; l <= nextLabel; l++) {
    if (sizes[l] > (sizes[biggest] || 0)) biggest = l;
  }

  const cleaned = new Uint8Array(n);
  for (let i = 0; i < n; i++) cleaned[i] = label[i] === biggest ? 1 : 0;
  return cleaned;
}

function edt2d(binary, w, h) {
  const INF = 1e20;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = binary[i] ? 0 : INF;

  const colBuf = new Float64Array(h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) colBuf[y] = grid[y * w + x];
    const dt = edt1d(colBuf, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = dt[y];
  }

  const rowBuf = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) rowBuf[x] = grid[y * w + x];
    const dt = edt1d(rowBuf, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(dt[x]);
  }

  return grid;
}

async function run() {
  const meta = await sharp(SRC_PATH).metadata();
  console.log(`source: ${meta.width}x${meta.height}`);

  const scale = Math.min(SIZE / meta.width, SIZE / meta.height) * 0.92;
  const fittedW = Math.round(meta.width * scale);
  const fittedH = Math.round(meta.height * scale);
  const padX = Math.round((SIZE - fittedW) / 2);
  const padY = Math.round((SIZE - fittedH) / 2);

  const grey = await sharp(SRC_PATH)
    .resize(fittedW, fittedH)
    .greyscale()
    .extend({
      top: padY,
      bottom: SIZE - fittedH - padY,
      left: padX,
      right: SIZE - fittedW - padX,
      background: { r: 200, g: 200, b: 200 },
    })
    .raw()
    .toBuffer();

  const rawInside = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < grey.length; i++) {
    rawInside[i] = grey[i] < THRESHOLD ? 1 : 0;
  }

  const inside = cleanMask(rawInside, SIZE, SIZE);

  const maskView = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    maskView[i] = inside[i] ? 255 : 0;
  }

  await sharp(maskView, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .png()
    .toFile(MASK_PREVIEW_PATH);

  const outside = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) outside[i] = 1 - inside[i];

  const distInside = edt2d(outside, SIZE, SIZE);
  const distOutside = edt2d(inside, SIZE, SIZE);

  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const signed = distInside[i] - distOutside[i];
    let u = 0.5 + signed / (2 * PX_RANGE);
    if (u < 0) u = 0;
    if (u > 1) u = 1;
    const byte = Math.round(u * 255);
    const o = i * 4;
    out[o] = byte;
    out[o + 1] = byte;
    out[o + 2] = byte;
    out[o + 3] = byte;
  }

  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png()
    .toFile(OUT_PATH);

  console.log(`wrote mask preview: ${MASK_PREVIEW_PATH}`);
  console.log(`wrote MSDF: ${OUT_PATH} (${SIZE}x${SIZE}, pxRange=${PX_RANGE}, threshold=${THRESHOLD})`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
