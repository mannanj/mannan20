import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW_DIR = path.join(HERE, 'raw');
const OUT_DIR = path.resolve(HERE, '../../public/game/birds');
const REVIEW_DIR = path.join(HERE, 'review');

const HARD_GREEN = 90;
const SOFT_GREEN = 25;
const FLOOD_GREEN = 45;
const DESPILL_SLACK = 8;
const MAX_SIDE = 1024;
const TALON_TOP_FADE = 0.3;

const SOURCE_FOR = { 'grab-body': 'grab-body-v2' };
const SKIP_RAW = new Set(['grab-body']);
const TRANSFORMS = {
  'hawk/grab-body': { flip: false, rotate: 20 },
  'eagle/grab-body': { flip: false, rotate: 14 },
  'phoenix/grab-body': { flip: false, rotate: 15 },
};
const BIRD_KEY = {
  phoenix: { soft: 0, hard: 60, ratio: 0.8 },
};
const ERASE = {
  'hawk/grab-body': { x0: 0, x1: 0.38, y0: 0.82, y1: 1 },
  'eagle/grab-body': { x0: 0.18, x1: 0.5, y0: 0.84, y1: 1 },
  'phoenix/grab-body': { x0: 0, x1: 0.38, y0: 0.65, y1: 0.81 },
};
const LEG_SPAN_FRAC = 0.4;
const LEG_FADE_PX = 70;

function cropToLeg(d, w, h) {
  const spans = new Array(h).fill(0);
  let maxSpan = 0;
  for (let y = 0; y < h; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (a < 0) a = x; b = x; }
    spans[y] = a < 0 ? 0 : b - a + 1;
    maxSpan = Math.max(maxSpan, spans[y]);
  }
  let cut = 0;
  for (let y = 0; y < h; y++) if (spans[y] > 0 && spans[y] < maxSpan * LEG_SPAN_FRAC) { cut = y; break; }
  for (let y = 0; y < cut; y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = 0;
  for (let y = cut; y < Math.min(h, cut + LEG_FADE_PX); y++) {
    const t = (y - cut) / LEG_FADE_PX;
    const k = t * t * (3 - 2 * t);
    for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = Math.round(d[(y * w + x) * 4 + 3] * k);
  }
}

async function eraseRegion(buf, r) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const feather = Math.round(h * 0.025);
  for (let y = Math.floor(r.y0 * h) - feather; y < Math.ceil(r.y1 * h); y++) {
    if (y < 0 || y >= h) continue;
    const edge = Math.min(1, Math.max(0, (y - (r.y0 * h - feather)) / feather));
    for (let x = Math.floor(r.x0 * w); x < Math.ceil(r.x1 * w) && x < w; x++) {
      const i = (y * w + x) * 4 + 3;
      data[i] = Math.round(data[i] * (1 - edge));
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

const only = new Set(process.argv.slice(2));

function greenness(d, i) {
  return d[i + 1] - Math.max(d[i], d[i + 2]);
}

function keyPixels(d, w, h, opts = {}) {
  const soft = opts.soft ?? SOFT_GREEN;
  const hard = opts.hard ?? HARD_GREEN;
  const ratio = opts.ratio ?? 1;
  const n = w * h;
  const bg = new Uint8Array(n);
  const stack = [];
  const push = (p) => {
    if (!bg[p] && greenness(d, p * 4) > FLOOD_GREEN) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < n - w) push(p + w);
  }
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const g = greenness(d, i);
    if (bg[p] || g > hard) {
      d[i + 3] = 0;
      continue;
    }
    if (g > soft) {
      const t = (g - soft) / (hard - soft);
      d[i + 3] = Math.round(255 * (1 - t));
    }
    const cap = Math.min(Math.max(d[i], d[i + 2]) + DESPILL_SLACK, ratio < 1 ? Math.max(d[i], d[i + 2]) * ratio : 255);
    if (d[i + 1] > cap) d[i + 1] = cap;
  }
}

function fadeTop(d, w, h, frac) {
  let top = h;
  for (let p = 0; p < w * h && top === h; p++) if (d[p * 4 + 3] > 0) top = Math.floor(p / w);
  let bottom = 0;
  for (let p = w * h - 1; p >= 0 && bottom === 0; p--) if (d[p * 4 + 3] > 0) bottom = Math.floor(p / w);
  const span = (bottom - top) * frac;
  for (let y = top; y < top + span; y++) {
    const t = (y - top) / span;
    const k = t * t * (3 - 2 * t);
    for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = Math.round(d[(y * w + x) * 4 + 3] * k);
  }
}

async function processOne(bird, file) {
  const rawName = file.replace(/\.(png|jpg|webp)$/, '');
  if (SKIP_RAW.has(rawName)) return null;
  const name = Object.entries(SOURCE_FOR).find(([, src]) => src === rawName)?.[0] ?? rawName;
  const id = `${bird}/${name}`;
  const src = sharp(path.join(RAW_DIR, bird, file)).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  keyPixels(data, info.width, info.height, BIRD_KEY[bird]);
  if (name.startsWith('talon')) cropToLeg(data, info.width, info.height);
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
  const t = TRANSFORMS[id];
  if (t?.flip) img = sharp(await img.flop().toBuffer());
  let { data: b1, info: i1 } = await img.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  let anchor = null;
  if (ERASE[id]) {
    const e = ERASE[id];
    anchor = { x: ((e.x0 + e.x1) / 2) * i1.width, y: (e.y0 + 0.65 * (e.y1 - e.y0)) * i1.height };
    b1 = await eraseRegion(b1, e);
  }
  let stage = sharp(b1);
  if (t?.rotate) {
    const rad = (t.rotate * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const W = i1.width * Math.abs(cos) + i1.height * Math.abs(sin);
    const H = i1.width * Math.abs(sin) + i1.height * Math.abs(cos);
    if (anchor) {
      const rx = anchor.x - i1.width / 2, ry = anchor.y - i1.height / 2;
      anchor = { x: W / 2 + rx * cos - ry * sin, y: H / 2 + rx * sin + ry * cos };
    }
    stage = sharp(await stage.rotate(t.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer());
  }
  const { data: trimmed, info: i2 } = await stage.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  if (anchor) anchor = { x: (anchor.x + (i2.trimOffsetLeft || 0)) / i2.width, y: (anchor.y + (i2.trimOffsetTop || 0)) / i2.height };
  const scale = Math.min(1, MAX_SIDE / Math.max(i2.width, i2.height));
  const out = path.join(OUT_DIR, bird, `${name}.webp`);
  await mkdir(path.dirname(out), { recursive: true });
  const finalBuf = await sharp(trimmed).resize(Math.round(i2.width * scale), Math.round(i2.height * scale)).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  await writeFile(out, finalBuf);
  const m = await sharp(finalBuf).metadata();
  return { id, name, width: m.width, height: m.height, bytes: finalBuf.length, transform: t || null, anchor: anchor && { x: Number(anchor.x.toFixed(3)), y: Number(anchor.y.toFixed(3)) }, out };
}

async function reviewSheet(bird, items) {
  const cell = 300;
  const cols = Math.min(items.length, 5);
  const rows = Math.ceil(items.length / cols);
  const stripes = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><defs><pattern id="s" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" fill="#d81b1b"/><rect x="12" width="12" height="24" fill="#ffffff"/></pattern></defs><rect width="100%" height="100%" fill="url(#s)"/></svg>`,
  );
  const comps = [];
  for (let i = 0; i < items.length; i++) {
    const buf = await sharp(items[i].out).resize(cell - 20, cell - 20, { fit: 'inside' }).toBuffer();
    comps.push({ input: buf, left: (i % cols) * cell + 10, top: Math.floor(i / cols) * cell + 10 });
    comps.push({
      input: Buffer.from(`<svg width="${cell}" height="24"><text x="6" y="18" font-family="Helvetica" font-size="16" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">${items[i].name} ${items[i].width}x${items[i].height}</text></svg>`),
      left: (i % cols) * cell,
      top: Math.floor(i / cols) * cell + cell - 26,
    });
  }
  await mkdir(REVIEW_DIR, { recursive: true });
  await sharp(stripes).composite(comps).png().toFile(path.join(REVIEW_DIR, `${bird}.png`));
}

const manifest = {};
for (const bird of await readdir(RAW_DIR)) {
  if (only.size && !only.has(bird)) continue;
  const files = (await readdir(path.join(RAW_DIR, bird))).filter((f) => /\.(png|jpg|webp)$/.test(f)).sort();
  const items = [];
  for (const f of files) {
    const r = await processOne(bird, f);
    if (!r) continue;
    items.push(r);
    console.log(`${r.id} ${r.width}x${r.height} ${(r.bytes / 1024).toFixed(0)}kB${r.transform ? ' ' + JSON.stringify(r.transform) : ''}`);
  }
  manifest[bird] = Object.fromEntries(items.map((r) => [r.name, { width: r.width, height: r.height, file: `/game/birds/${bird}/${r.name}.webp`, ...(r.anchor ? { anchor: r.anchor } : {}) }]));
  await reviewSheet(bird, items);
}
async function bodiesSheet() {
  const cell = 500;
  const birds = Object.keys(manifest);
  const comps = [];
  for (let i = 0; i < birds.length; i++) {
    const a = manifest[birds[i]]['grab-body'];
    if (!a) continue;
    const buf = await sharp(path.join(OUT_DIR, birds[i], 'grab-body.webp')).resize(cell, cell, { fit: 'fill' }).toBuffer();
    comps.push({ input: buf, left: i * cell, top: 0 });
    const lines = [];
    for (let k = 0; k <= 10; k++) {
      lines.push(`<line x1="${k * cell / 10}" y1="0" x2="${k * cell / 10}" y2="${cell}" stroke="#0af" stroke-width="1"/><line x1="0" y1="${k * cell / 10}" x2="${cell}" y2="${k * cell / 10}" stroke="#0af" stroke-width="1"/>`);
      lines.push(`<text x="${k * cell / 10 + 2}" y="12" font-size="11" fill="#fff">${k / 10}</text><text x="2" y="${k * cell / 10 - 2}" font-size="11" fill="#fff">${k / 10}</text>`);
    }
    comps.push({ input: Buffer.from(`<svg width="${cell}" height="${cell}">${lines.join('')}<text x="${cell / 2}" y="${cell - 6}" text-anchor="middle" font-size="18" fill="#fff">${birds[i]} ${a.width}x${a.height} (stretched to square)</text></svg>`), left: i * cell, top: 0 });
  }
  await sharp({ create: { width: cell * birds.length, height: cell, channels: 4, background: '#444' } }).composite(comps).png().toFile(path.join(REVIEW_DIR, 'bodies.png'));
}
await bodiesSheet();
await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest written');
