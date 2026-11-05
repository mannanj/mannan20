import sharp from 'sharp';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIR = path.resolve(HERE, '../../public/game/birds/hawk');
const HEADS = {
  'grab-body': { x: 0.13, y: 0.46, r: 0.14 },
  'fly-level': { x: 0.5, y: 0.31, r: 0.16 },
  'fly-up': { x: 0.53, y: 0.53, r: 0.12 },
  'fly-down': { x: 0.51, y: 0.1, r: 0.13 },
  bank: { x: 0.2, y: 0.47, r: 0.12 },
  'away-3q': { x: 0.75, y: 0.42, r: 0.13 },
  'away-far': { x: 0.47, y: 0.45, r: 0.075 },
};

for (const [name, head] of Object.entries(HEADS)) {
  const src = path.join(DIR, `${name}.webp`);
  const { width, height } = await sharp(src).metadata();
  const r = Math.round(height * head.r);
  const cx = Math.round(width * head.x);
  const cy = Math.round(height * head.y);
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#fff" stop-opacity="0.2"/><stop offset="55%" stop-color="#bfe0ff" stop-opacity="0.06"/><stop offset="100%" stop-color="#bfe0ff" stop-opacity="0.2"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)" stroke="#e8f4ff" stroke-opacity="0.42" stroke-width="${Math.max(3, r * 0.04)}"/>
    <path d="M ${cx - r * 0.62} ${cy - r * 0.42} A ${r * 0.8} ${r * 0.8} 0 0 1 ${cx - r * 0.05} ${cy - r * 0.78}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="${Math.max(3, r * 0.06)}" stroke-linecap="round"/>
    <rect x="${cx - r * 0.8}" y="${cy + r * 0.86}" width="${r * 1.6}" height="${r * 0.2}" rx="${r * 0.1}" fill="#dfe6ee" fill-opacity="0.35"/>
  </svg>`;
  await sharp(src).composite([{ input: Buffer.from(svg) }]).webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(DIR, `${name}-helmet.webp`));
}
