import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW = path.join(HERE, 'raw/jev');
const OUT = path.resolve(HERE, '../../public/game/jev');
const SOFT = 20;
const HARD = 70;

async function keyed(name) {
  const { data, info } = await sharp(path.join(RAW, `${name}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const excess = data[i + 1] - Math.max(data[i], data[i + 2]);
    if (excess <= SOFT) continue;
    data[i + 3] = Math.round(255 * Math.max(0, 1 - (excess - SOFT) / (HARD - SOFT)));
    data[i + 1] = Math.max(data[i], data[i + 2]);
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function write(buf, name, width) {
  await sharp(buf).trim({ threshold: 1 }).resize({ width, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(OUT, `${name}.webp`));
}

await mkdir(OUT, { recursive: true });
const bust = await keyed('bust');
await write(bust, 'bust', 420);
await write(await keyed('sleep'), 'sleep', 420);
await write(await keyed('arm-open'), 'arm-open', 640);
await write(await keyed('arm-fist'), 'arm-fist', 640);
const { width, height } = await sharp(bust).metadata();
const side = Math.round(width * 0.56);
await sharp(bust)
  .extract({ left: Math.round(width * 0.24), top: Math.round(height * 0.04), width: side, height: side })
  .resize(200)
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile(path.join(OUT, 'orb.webp'));
await write(await keyed('monkey-sit'), 'monkey-sit', 360);
await write(await keyed('monkey-shoot'), 'monkey-shoot', 360);
await sharp(path.join(RAW, 'jungle.png')).resize({ width: 1600 }).webp({ quality: 74 }).toFile(path.resolve(HERE, '../../public/game/scenes/jungle.webp'));
for (const name of ['mongoose-run', 'mongoose-bite', 'mound', 'mound-broken']) await write(await keyed(name), name, 320);
