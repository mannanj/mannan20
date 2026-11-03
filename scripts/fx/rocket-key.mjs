import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW = path.join(HERE, 'raw');
const OUT = path.resolve(HERE, '../../public/game/rocket');
const HOLE_DIAMETER = 46;
const PORTHOLE_X = 35;
const PORTHOLE_Y = 23;
const PIXEL_DENSITY = 2;
const PLUME_CROP_TOP = 275;
const PLUME_CROP_X = 250;
const PLUME_CROP_W = 370;
const PLUME_DISPLAY_W = 100;
const HOLE_SIZE = 640;

async function rgba(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function keyRocket(name) {
  const { data, w, h } = await rgba(path.join(RAW, `${name}.png`));
  const out = Buffer.alloc(w * h * 4);
  let hx = 0, hy = 0, hn = 0, minx = w, maxx = 0, miny = h, maxy = 0;
  for (let p = 0; p < w * h; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    const greenness = g - Math.max(r, b);
    const magenta = Math.min(r, b) - g;
    let a = 255;
    if (greenness > 60) a = 0;
    else if (greenness > 20) a = Math.round(255 * (1 - (greenness - 20) / 40));
    let nr = r, ng = g, nb = b;
    if (magenta > 90) a = 0;
    if (a > 0 && greenness > 0) ng = Math.max(r, b);
    out[p * 4] = nr; out[p * 4 + 1] = ng; out[p * 4 + 2] = nb; out[p * 4 + 3] = a;
    const x = p % w, y = (p / w) | 0;
    if (magenta > 90) { hx += x; hy += y; hn++; }
    else if (a > 128) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  const cx = hx / hn, cy = hy / hn, hd = 2 * Math.sqrt(hn / Math.PI);
  const s = HOLE_DIAMETER / hd;
  const dw = Math.round((maxx - minx + 1) * s), dh = Math.round((maxy - miny + 1) * s);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minx, top: miny, width: maxx - minx + 1, height: maxy - miny + 1 })
    .resize(dw * PIXEL_DENSITY, dh * PIXEL_DENSITY)
    .webp({ quality: 86, alphaQuality: 95 })
    .toFile(path.join(OUT, `${name}.webp`));
  return { left: +(PORTHOLE_X - (cx - minx) * s).toFixed(1), top: +(PORTHOLE_Y - (cy - miny) * s).toFixed(1), width: dw, height: dh };
}

async function keyPlume() {
  const base = sharp(path.join(RAW, 'plume.png')).extract({ left: PLUME_CROP_X, top: PLUME_CROP_TOP, width: PLUME_CROP_W, height: 1264 - PLUME_CROP_TOP });
  const { data, info } = await base.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const lum = Math.max(data[i], data[i + 1], data[i + 2]);
    const gain = lum > 0 ? Math.min(3, 255 / lum) : 0;
    out[j] = Math.min(255, data[i] * gain); out[j + 1] = Math.min(255, data[i + 1] * gain); out[j + 2] = Math.min(255, data[i + 2] * gain);
    out[j + 3] = Math.min(255, Math.max(0, lum - 14) * 2.4);
  }
  const dh = Math.round((info.height / info.width) * PLUME_DISPLAY_W);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(PLUME_DISPLAY_W * PIXEL_DENSITY, dh * PIXEL_DENSITY).webp({ quality: 82 }).toFile(path.join(OUT, 'plume.webp'));
  return { width: PLUME_DISPLAY_W, height: dh };
}

const meta = { body: await keyRocket('body'), open: await keyRocket('open'), legs: await keyRocket('legs'), plume: await keyPlume() };
async function keyHole() {
  const { data, info } = await sharp(path.join(RAW, 'hole.png')).resize(HOLE_SIZE, HOLE_SIZE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const lum = Math.max(data[i], data[i + 1], data[i + 2]);
    const gain = lum > 0 ? Math.min(4, 255 / lum) : 0;
    out[j] = Math.min(255, data[i] * gain); out[j + 1] = Math.min(255, data[i + 1] * gain); out[j + 2] = Math.min(255, data[i + 2] * gain);
    out[j + 3] = Math.min(255, Math.max(0, lum - 6) * 1.8);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 84 }).toFile(path.resolve(HERE, '../../public/game/fx/blackhole.webp'));
}
await keyHole();
const lines = Object.entries(meta).map(([k, v]) => `  ${k}: ${JSON.stringify(v).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/^{/, '{ ').replace(/}$/, ' }')},`);
await writeFile(path.resolve(HERE, '../../src/components/game/rocket-art.ts'), `export interface ArtPlacement {\n  left?: number;\n  top?: number;\n  width: number;\n  height: number;\n}\n\nexport const ROCKET_ART = {\n${lines.join('\n')}\n} as const;\n`);
console.log(meta);
