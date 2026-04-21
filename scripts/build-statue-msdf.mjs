import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { removeBackground } from "@imgly/background-removal-node";
import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from "@neplex/vectorizer";
import { Buffer as NodeBuffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_PATH = resolve(__dirname, "..", "public", "statue-source.jpg");
const OUT_PATH = resolve(__dirname, "..", "public", "human-msdf.png");
const MASK_PREVIEW_PATH = resolve(__dirname, "..", "public", "statue-mask.png");
const SVG_PREVIEW_PATH = resolve(__dirname, "..", "public", "human-silhouette.svg");
const SIZE = 1024;
const PX_RANGE = 12;
const ALPHA_THRESHOLD = 128;
const VECTORIZE_SIZE = 2048;

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

async function run() {
  console.log("stage 1/4: ML background removal (@imgly)...");
  const srcBuffer = readFileSync(SRC_PATH);
  const srcBlob = new Blob([srcBuffer], { type: "image/jpeg" });
  const cutoutBlob = await removeBackground(srcBlob, {
    output: { format: "image/png", quality: 1 },
  });
  const cutoutBuffer = Buffer.from(await cutoutBlob.arrayBuffer());

  console.log("stage 2/4: alpha threshold + largest-component cleanup...");
  const cutoutMeta = await sharp(cutoutBuffer).metadata();
  const srcW = cutoutMeta.width;
  const srcH = cutoutMeta.height;
  const alphaRaw = await sharp(cutoutBuffer)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer();

  const rawInside = new Uint8Array(srcW * srcH);
  for (let i = 0; i < alphaRaw.length; i++) {
    rawInside[i] = alphaRaw[i] >= ALPHA_THRESHOLD ? 1 : 0;
  }
  const cleaned = cleanMask(rawInside, srcW, srcH);

  const cleanedBytes = new Uint8Array(srcW * srcH);
  for (let i = 0; i < srcW * srcH; i++) cleanedBytes[i] = cleaned[i] ? 255 : 0;

  const cleanedMaskBuffer = await sharp(cleanedBytes, {
    raw: { width: srcW, height: srcH, channels: 1 },
  })
    .png()
    .toBuffer();

  console.log("stage 3/4: vectorize with VTracer for smooth curves...");
  const fitW = Math.round(srcW * Math.min(VECTORIZE_SIZE / srcW, VECTORIZE_SIZE / srcH));
  const fitH = Math.round(srcH * Math.min(VECTORIZE_SIZE / srcW, VECTORIZE_SIZE / srcH));

  const invertedBytes = new Uint8Array(srcW * srcH);
  for (let i = 0; i < srcW * srcH; i++) invertedBytes[i] = cleaned[i] ? 0 : 255;
  const invertedBuffer = await sharp(invertedBytes, {
    raw: { width: srcW, height: srcH, channels: 1 },
  })
    .png()
    .toBuffer();

  const vectorInput = await sharp(invertedBuffer)
    .resize(fitW, fitH, { kernel: "cubic" })
    .toFormat("png")
    .toBuffer();

  const rawSvg = await vectorize(vectorInput, {
    colorMode: ColorMode.Binary,
    hierarchical: Hierarchical.Stacked,
    filterSpeckle: 24,
    colorPrecision: 6,
    layerDifference: 16,
    mode: PathSimplifyMode.Spline,
    cornerThreshold: 60,
    lengthThreshold: 5,
    maxIterations: 10,
    spliceThreshold: 45,
    pathPrecision: 5,
  });

  const styledSvg = rawSvg.replace(
    /<svg([^>]*)>/,
    '<svg$1><rect width="100%" height="100%" fill="white"/><g fill="black">',
  ).replace(/<\/svg>/, '</g></svg>');

  writeFileSync(SVG_PREVIEW_PATH, styledSvg);

  console.log("stage 4/4: rasterize SVG to 1024 mask + EDT to MSDF...");
  const scale = Math.min(SIZE / fitW, SIZE / fitH) * 0.92;
  const fittedW = Math.round(fitW * scale);
  const fittedH = Math.round(fitH * scale);
  const padX = Math.round((SIZE - fittedW) / 2);
  const padY = Math.round((SIZE - fittedH) / 2);

  const rasterized = await sharp(NodeBuffer.from(styledSvg))
    .resize(fittedW, fittedH, { kernel: "lanczos3" })
    .extend({
      top: padY,
      bottom: SIZE - fittedH - padY,
      left: padX,
      right: SIZE - fittedW - padX,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .raw()
    .toBuffer();

  const finalInside = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < rasterized.length; i++) {
    finalInside[i] = rasterized[i] < 128 ? 1 : 0;
  }

  const maskView = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) maskView[i] = finalInside[i] ? 255 : 0;
  await sharp(maskView, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .png()
    .toFile(MASK_PREVIEW_PATH);

  const outside = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) outside[i] = 1 - finalInside[i];

  const distInside = edt2d(outside, SIZE, SIZE);
  const distOutside = edt2d(finalInside, SIZE, SIZE);

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
  console.log(`wrote SVG: ${SVG_PREVIEW_PATH}`);
  console.log(`wrote MSDF: ${OUT_PATH} (${SIZE}x${SIZE}, pxRange=${PX_RANGE})`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
