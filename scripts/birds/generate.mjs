import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RAW_DIR = path.join(HERE, 'raw');
const BUDGET_FILE = path.join(HERE, 'budget.json');
const CAP_USD = 3.0;
const STOP_AT_USD = CAP_USD * 0.85;
const DEFAULT_MODEL = 'google/gemini-3.1-flash-image';
const CONCURRENCY = 3;

const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPENROUTER_API_KEY missing (source .env.local without printing it)');

const only = new Set(process.argv.slice(2));
const { default: jobs } = await import('./jobs.mjs');
const budget = existsSync(BUDGET_FILE) ? JSON.parse(await readFile(BUDGET_FILE, 'utf8')) : { cap_usd: CAP_USD, stop_at_usd: STOP_AT_USD, spent_usd: 0, calls: [] };

function spent() {
  return budget.calls.reduce((s, c) => s + (c.cost_usd || 0), 0);
}

async function saveBudget() {
  budget.spent_usd = Number(spent().toFixed(6));
  await writeFile(BUDGET_FILE, JSON.stringify(budget, null, 2) + '\n');
}

async function generate(job) {
  const model = job.model || DEFAULT_MODEL;
  const body = {
    model,
    messages: [{ role: 'user', content: job.prompt }],
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: job.aspect || '1:1' },
    usage: { include: true },
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${job.id}: ${JSON.stringify(json.error || json).slice(0, 300)}`);
  const msg = json.choices?.[0]?.message;
  const img = msg?.images?.[0]?.image_url?.url;
  const cost = json.usage?.cost ?? null;
  budget.calls.push({ at: new Date().toISOString(), id: job.id, model, purpose: job.purpose, cost_usd: cost, gen_id: json.id });
  await saveBudget();
  if (!img) throw new Error(`${job.id}: no image returned (${(msg?.content || '').slice(0, 200)})`);
  const b64 = img.split(',')[1];
  const ext = img.startsWith('data:image/png') ? 'png' : img.startsWith('data:image/webp') ? 'webp' : 'jpg';
  const out = path.join(RAW_DIR, job.bird, `${job.name}.${ext}`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(b64, 'base64'));
  return { out, cost };
}

await mkdir(RAW_DIR, { recursive: true });
const queue = jobs.filter((j) => (only.size ? only.has(j.id) || only.has(j.bird) : true) && (only.size || !existsSync(path.join(RAW_DIR, j.bird, `${j.name}.png`))));
console.log(`queued ${queue.length} jobs, spent so far $${spent().toFixed(4)}`);

const results = [];
async function worker() {
  while (queue.length) {
    const stopAt = budget.stop_at_usd ?? STOP_AT_USD;
    if (spent() >= stopAt) {
      console.log(`STOP: spent $${spent().toFixed(4)} >= $${stopAt}`);
      queue.length = 0;
      return;
    }
    const job = queue.shift();
    try {
      const r = await generate(job);
      console.log(`ok ${job.id} $${r.cost} -> ${path.relative(HERE, r.out)}`);
      results.push({ id: job.id, ok: true });
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      results.push({ id: job.id, ok: false });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done. spent total $${spent().toFixed(4)}; failed: ${results.filter((r) => !r.ok).map((r) => r.id).join(', ') || 'none'}`);
