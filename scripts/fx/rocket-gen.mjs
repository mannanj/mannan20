import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW = path.join(HERE, 'raw');
const BUDGET = path.resolve(HERE, '../birds/budget.json');
const MODEL = 'google/gemini-3.1-flash-image';
const CAP_DELTA_USD = 0.6;
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPENROUTER_API_KEY missing');

const GREEN = 'isolated on a perfectly flat pure chroma-key green (#00FF00) background that fills the whole frame, no ground shadow, no gradient, no text, nothing cropped, centered with margin on all sides. ';
const BLACK = 'isolated on a completely pure black (#000000) background that fills the whole frame, no ground, no horizon, no text, no watermark, nothing cropped, centered. ';
const ROCKET = 'Real photograph, photorealistic product shot of a modern white orbital crew rocket standing upright, front view, orthographic and perfectly vertical: painted white metal fuselage with subtle panel seams, rivets and slight soot, a dark red nose cone, two swept fins at the base, a metal engine nozzle at the bottom, one very large round porthole in the upper third, its diameter half the width of the hull, whose glass is solid flat pure magenta (#FF00FF), and a tall arched hatch door in the lower third. The rocket is short and stubby: total height only 2.6 times its width, wide rounded fuselage. ';

const JOBS = [
  { id: 'body', aspect: '3:4', prompt: ROCKET + 'The hatch door is closed and flush with the hull. ' + GREEN },
  { id: 'open', aspect: '3:4', from: 'body', prompt: 'Edit this photo: keep the identical rocket, framing, lighting and magenta porthole, but swing the arched hatch door fully open so the doorway shows a dark empty interior with a metal frame. Keep the pure green background. No other changes.' },
  { id: 'legs', aspect: '3:4', from: 'body', prompt: 'Edit this photo: keep the identical rocket, framing, lighting and magenta porthole, but add four realistic metal landing legs with footpads splayed from the base, as on a rocket landed on the Moon. Keep the pure green background. No other changes.' },
  { id: 'plume', aspect: '2:3', prompt: 'Real photograph, photorealistic rocket engine exhaust plume shot at night, flame pointing straight down: a bright white-hot core fading to yellow and orange, with shock diamonds and a turbulent tapering tail of fire and thin wisps of smoke, the nozzle exit at the very top center of the frame. ' + BLACK },
  { id: 'hole', aspect: '1:1', prompt: 'Real astrophysics-grade photorealistic render of a black hole seen face-on, gravitational lensing: a perfectly black circular shadow, a thin bright photon ring, a glowing orange-white accretion disk swirling and warped around it, spiral light streaks, as in the Interstellar and EHT imagery. ' + BLACK },
];

const budget = JSON.parse(await readFile(BUDGET, 'utf8'));
const startSpent = budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0);
const only = new Set(process.argv.slice(2));
for (const job of JOBS) {
  const out = path.join(RAW, `${job.id}.png`);
  if (only.size ? !only.has(job.id) : existsSync(out)) continue;
  const spent = budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0) - startSpent;
  if (spent > CAP_DELTA_USD - 0.08) throw new Error(`budget stop at ${spent}`);
  const content = [{ type: 'text', text: job.prompt }];
  if (job.from) {
    const b64 = (await readFile(path.join(RAW, `${job.from}.png`))).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], modalities: ['image', 'text'], image_config: { aspect_ratio: job.aspect }, usage: { include: true } }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${job.id}: ${JSON.stringify(json.error || json).slice(0, 200)}`);
  budget.calls.push({ at: new Date().toISOString(), id: `polish-${job.id}`, model: MODEL, purpose: `photoreal polish: ${job.id}`, cost_usd: json.usage?.cost ?? null, gen_id: json.id });
  budget.spent_usd = Number(budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0).toFixed(6));
  await writeFile(BUDGET, JSON.stringify(budget, null, 2) + '\n');
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error(`${job.id}: no image`);
  await writeFile(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('generated', job.id, json.usage?.cost);
}
