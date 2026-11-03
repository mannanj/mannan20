import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW = path.join(HERE, 'raw');
const OUT = path.resolve(HERE, '../../public/game/fx');
const BUDGET = '/Users/manblack/Documents/mannan20/.worktrees/chicken-escape/scripts/birds/budget.json';
const MODEL = 'google/gemini-3.1-flash-image';
const SIZE = 768;
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPENROUTER_API_KEY missing');

const BASE = 'Real photograph, photorealistic, high speed camera, isolated on a completely pure black (#000000) background that fills the whole frame, no ground, no horizon, no objects, no text, no watermark, subject centered with empty black margin on every side, nothing cropped. ';
const JOBS = [
  { id: 'fireball', prompt: BASE + 'A real mid-air fuel explosion fireball: roiling orange, yellow and white-hot flames with a bright core, ragged tongues of fire and thin wisps of black soot at the edges, as in a stock explosion footage frame.' },
  { id: 'smoke', prompt: BASE + 'A thick billowing plume of dark grey and black smoke from a burning aircraft wreck, volumetric, lit faintly orange from underneath, rising and curling, realistic smoke physics.' },
  { id: 'embers', prompt: BASE + 'Hundreds of glowing orange sparks and embers and small burning debris streaks flying outward in all directions from the center, long-exposure motion blur trails, realistic fire sparks.' },
];

const budget = JSON.parse(await readFile(BUDGET, 'utf8'));
for (const job of JOBS) {
  const rawFile = path.join(RAW, `${job.id}.png`);
  if (!existsSync(rawFile)) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: job.prompt }], modalities: ['image', 'text'], image_config: { aspect_ratio: '1:1' }, usage: { include: true } }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(`${job.id}: ${JSON.stringify(json.error || json).slice(0, 200)}`);
    budget.calls.push({ at: new Date().toISOString(), id: `plane-explosion-${job.id}`, model: MODEL, purpose: 'photo-real plane explosion sprite on black (screen blend)', cost_usd: json.usage?.cost ?? null, gen_id: json.id });
    budget.spent_usd = Number(budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0).toFixed(6));
    await writeFile(BUDGET, JSON.stringify(budget, null, 2) + '\n');
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error(`${job.id}: no image`);
    await writeFile(rawFile, Buffer.from(url.split(',')[1], 'base64'));
    console.log('generated', job.id, json.usage?.cost);
  }
  const base = sharp(rawFile).resize(SIZE, SIZE, { fit: 'cover' });
  if (job.id === 'smoke') {
    const { data, info } = await base.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      const lum = Math.max(data[i], data[i + 1], data[i + 2]);
      const a = Math.min(235, Math.max(0, lum - 20) * 6);
      const k = 0.9;
      out[j] = Math.min(255, data[i] * k * 1.5 + 34);
      out[j + 1] = Math.min(255, data[i + 1] * k * 1.3 + 32);
      out[j + 2] = Math.min(255, data[i + 2] * k + 30);
      out[j + 3] = a;
    }
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 82 }).toFile(path.join(OUT, 'smoke.webp'));
  } else {
    const { data, info } = await base.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      const lum = Math.max(data[i], data[i + 1], data[i + 2]);
      const gain = lum > 0 ? 255 / lum : 0;
      out[j] = Math.min(255, data[i] * gain);
      out[j + 1] = Math.min(255, data[i + 1] * gain);
      out[j + 2] = Math.min(255, data[i + 2] * gain);
      out[j + 3] = Math.min(255, Math.max(0, lum - 10) * 1.5);
    }
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 85, alphaQuality: 90 }).toFile(path.join(OUT, `${job.id}.webp`));
  }
}
console.log('spent total', budget.spent_usd);
