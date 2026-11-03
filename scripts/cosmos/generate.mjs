import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const BUDGET_FILE = path.resolve(HERE, '../birds/budget.json');
const RAW_DIR = path.join(HERE, 'raw');
const CAP_USD = 1.0;
const GREEN = 'on a perfectly flat solid chroma-key green #00FF00 background, no ground, no cast shadow, no gradient, full body visible from head to feet with margin all around';
const STYLE = 'Photorealistic, shot like a high-end film practical creature effect: real skin pores, real fabric weave and stitching, real glass, soft studio lighting, 85mm photograph. Not a cartoon, not an illustration, not 3D-rendered-looking.';

const JOBS = {
  pip: {
    model: 'google/gemini-2.5-flash-image',
    aspect: '3:4',
    prompt: `${STYLE} A small friendly alien explorer, a real-looking creature standing upright, three-quarter view facing slightly left: tall egg-shaped head with pale teal skin, large dark glossy eyes, two short flexible antennae with small bead tips, wearing a clear glass dome helmet with a metal rim and a faint reflection, and a mustard-yellow quilted puffy jumpsuit with a patched round belt buckle, grey rubber boots. Gentle shy smile, one hand raised in a small wave. ${GREEN}.`,
  },
  moss: {
    model: 'google/gemini-3.1-flash-image',
    aspect: '3:4',
    prompt: `${STYLE} A friendly alien gardener, a real-looking creature standing, three-quarter view: low wide bean-shaped body, lime-olive moist skin with fine texture, three eye stalks rising from the head each with a glossy eye, no helmet, a big leafy collar, a rust-orange wool poncho with a hanging leather tool belt, holding a small dented metal watering can. Warm kind expression. ${GREEN}.`,
  },
  zap: {
    model: 'google/gemini-3.1-flash-image',
    aspect: '3:4',
    prompt: `${STYLE} A friendly alien saucer pilot, a real-looking creature standing, three-quarter view: slim, lilac-lavender skin with fine texture, two coiled antennae, wearing a brushed-silver flight suit with a chunky back fin, small embroidered saucer badge, an orange tinted visor cap, leather gloves, holding a small retro bubble-blower toy in one hand. Cheerful confident grin, saluting with the other hand. ${GREEN}.`,
  },
  ground: {
    model: 'google/gemini-3.1-flash-image',
    aspect: '16:9',
    prompt: `Photorealistic wide landscape photograph of an imaginary alien rocky plain on a gas giant's floating cloud shelf, as if shot by a rover: foreground of butterscotch and rust-colored fractured stone slabs, fine gravel, scattered boulders, dark basalt ridges in the middle distance, hazy horizon, warm dusk light, no sky (the upper 45 percent of the frame is a plain flat solid black background), no creatures, no text, no vehicles, cinematic, real geology.`,
  },
};

const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPENROUTER_API_KEY missing');
const id = process.argv[2];
const job = JOBS[id];
if (!job) throw new Error(`unknown job ${id}`);
const budget = JSON.parse(await readFile(BUDGET_FILE, 'utf8'));
const mine = budget.calls.filter((c) => c.task === 310).reduce((s, c) => s + (c.cost_usd || 0), 0);
if (mine >= CAP_USD) throw new Error(`task 310 cap reached $${mine}`);
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: job.model,
    messages: [{ role: 'user', content: job.prompt }],
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: job.aspect },
    usage: { include: true },
  }),
});
const json = await res.json();
if (!res.ok || json.error) throw new Error(JSON.stringify(json.error || json).slice(0, 300));
const msg = json.choices?.[0]?.message;
const img = msg?.images?.[0]?.image_url?.url;
const cost = json.usage?.cost ?? null;
budget.calls.push({ at: new Date().toISOString(), task: 310, id: `cosmos-${id}-${process.argv[3] || 'v1'}`, model: job.model, purpose: `task 310 cosmos: ${id}`, cost_usd: cost, gen_id: json.id });
budget.spent_usd = Number(budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0).toFixed(6));
await writeFile(BUDGET_FILE, JSON.stringify(budget, null, 2) + '\n');
if (!img) throw new Error(`no image: ${(msg?.content || '').slice(0, 200)}`);
const out = path.join(RAW_DIR, `${id}${process.argv[3] ? '-' + process.argv[3] : ''}.png`);
await writeFile(out, Buffer.from(img.split(',')[1], 'base64'));
console.log(`ok ${id} cost ${cost} -> ${out}`);
