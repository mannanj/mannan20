import sharp from 'sharp';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(HERE, '../../public/game/martians');
const MAX_SIDE = 720;
const GREEN_DOM = 38;
const GREEN_MIN = 120;
const SOFT = 22;
const POCKET_MIN = 250;
const GROUND_TOP_FRAC = 0.365;

function isBg(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return g - Math.max(r, b) > GREEN_DOM && g > GREEN_MIN;
}

async function key(name, source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p] || !isBg(data, p * 4)) return;
    bg[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  const drain = () => {
    let n = 0;
    const seen = [];
    while (stack.length) {
      const p = stack.pop();
      seen.push(p);
      n++;
      const x = p % w, y = (p - x) / w;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    return { n, seen };
  };
  drain();
  for (let p = 0; p < w * h; p++) {
    if (bg[p] || !isBg(data, p * 4)) continue;
    bg[p] = 1;
    stack.push(p);
    const { n, seen } = drain();
    if (n < POCKET_MIN) for (const q of seen) bg[q] = 0;
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (bg[p]) { data[i + 3] = 0; continue; }
    let near = false;
    const x = p % w, y = (p - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && bg[ny * w + nx]) near = true;
    }
    if (near) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const excess = g - Math.max(r, b);
      if (excess > 0) data[i + 1] = Math.max(r, b) + Math.max(0, excess - SOFT) * 0.2;
      data[i + 3] = 200;
    }
  }
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim()
    .resize({ height: MAX_SIDE, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log('keyed', name);
}

const RAW = path.join(HERE, 'raw');
await sharp({ create: { width: 1, height: 1, channels: 3, background: '#000' } }).toBuffer();
await import('node:fs/promises').then((fs) => fs.mkdir(OUT, { recursive: true }));
await key('pip', path.join(RAW, 'pip-draft.png'));
await key('moss', path.join(RAW, 'moss.png'));
await key('zap', path.join(RAW, 'zap.png'));
const g = sharp(path.join(RAW, 'ground.png'));
const meta = await g.metadata();
const top = Math.round(meta.height * GROUND_TOP_FRAC);
await sharp(path.join(RAW, 'ground.png'))
  .extract({ left: 0, top, width: meta.width, height: meta.height - top })
  .resize({ width: 1920, withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(path.join(OUT, 'ground.webp'));
console.log('ground', meta.width, meta.height);
