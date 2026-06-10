import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const BUN = '/opt/homebrew/bin/bun';
const BUCKET = 'portfolio-files';
const R2_PUBLIC_BASE = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev';
const BLOB_BASE = 'https://hq19kliyhzkpvads.public.blob.vercel-storage.com';
const GARDEN_SOURCE_BUCKET = 'thebeingman-assets';
const BLOB_PREFIXES = ['audio/', 'images/', 'video/'];
const TMP = '/tmp/blob-migration';
const MANIFEST_PATH = 'scripts/blob-to-r2-manifest.json';

const CONTENT_TYPES = {
  wav: 'audio/wav',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  md: 'text/markdown',
};

function contentTypeFor(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function wrangler(args) {
  return execFileSync(BUN, ['x', 'wrangler', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

async function headR2(key) {
  const res = await fetch(`${R2_PUBLIC_BASE}/${key}`, { method: 'HEAD' });
  return { ok: res.ok, size: Number(res.headers.get('content-length') ?? -1) };
}

async function verifyR2(key, expectedSize, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const { ok, size } = await headR2(key);
    if (ok && size === expectedSize) return true;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function putFile(key, localPath, expectedSize) {
  const existing = await headR2(key);
  if (existing.ok && existing.size === expectedSize) {
    console.log(`skip (exists) ${key}`);
    return true;
  }
  wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', localPath, '--content-type', contentTypeFor(key), '--remote']);
  const verified = await verifyR2(key, expectedSize);
  console.log(`${verified ? 'ok' : 'FAILED VERIFY'} ${key} (${expectedSize} bytes)`);
  return verified;
}

mkdirSync(TMP, { recursive: true });
const manifest = [];
let failures = 0;

async function record(key, size, source) {
  manifest.push({ key, size, contentType: contentTypeFor(key), source, r2Url: `${R2_PUBLIC_BASE}/${key}` });
}

const env = readFileSync('.env.local', 'utf8');
const token = env.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not found in .env.local');

const { list } = await import('@vercel/blob');
let cursor;
const blobs = [];
do {
  const res = await list({ token, cursor, limit: 1000 });
  blobs.push(...res.blobs);
  cursor = res.cursor;
} while (cursor);

const toMigrate = blobs.filter((b) => BLOB_PREFIXES.some((p) => b.pathname.startsWith(p)));
console.log(`migrating ${toMigrate.length} blob objects under ${BLOB_PREFIXES.join(', ')}`);

for (const blob of toMigrate) {
  const key = `portfolio/${blob.pathname}`;
  const tmpFile = join(TMP, basename(blob.pathname));
  const existing = await headR2(key);
  if (existing.ok && existing.size === blob.size) {
    console.log(`skip (exists) ${key}`);
    await record(key, blob.size, `blob:${blob.pathname}`);
    continue;
  }
  const res = await fetch(`${BLOB_BASE}/${blob.pathname}`);
  if (!res.ok) {
    console.log(`FAILED DOWNLOAD ${blob.pathname} (${res.status})`);
    failures++;
    continue;
  }
  writeFileSync(tmpFile, Buffer.from(await res.arrayBuffer()));
  if (!(await putFile(key, tmpFile, blob.size))) failures++;
  await record(key, blob.size, `blob:${blob.pathname}`);
}

const LOCAL_DOCS = [
  'Mannan_Javid_Resume.pdf',
  'mannan-javid-cover-letter.pdf',
  'GMU-ARCHR.pdf',
  'OMF-DR.pdf',
  'immortalism-manifesto.pdf',
  'affiliate-leads-redesign.md',
];

for (const name of LOCAL_DOCS) {
  const localPath = `public/data/documents/${name}`;
  const key = name === 'Mannan_Javid_Resume.pdf' ? `portfolio/resume/${name}` : `portfolio/documents/${name}`;
  const size = statSync(localPath).size;
  if (!(await putFile(key, localPath, size))) failures++;
  await record(key, size, `local:${localPath}`);
}

const GARDEN_KEYS = [
  'garden/ai-false-positives/opus-47-chat-paused.png',
  'garden/ai-false-positives/opus-47-novel-ways.png',
];

for (const key of GARDEN_KEYS) {
  const tmpFile = join(TMP, basename(key));
  const existing = await headR2(key);
  if (!existing.ok) {
    wrangler(['r2', 'object', 'get', `${GARDEN_SOURCE_BUCKET}/${key}`, '--file', tmpFile, '--remote']);
  } else {
    const res = await fetch(`${R2_PUBLIC_BASE}/${key}`);
    writeFileSync(tmpFile, Buffer.from(await res.arrayBuffer()));
  }
  const size = statSync(tmpFile).size;
  if (!(await putFile(key, tmpFile, size))) failures++;
  await record(key, size, `r2:${GARDEN_SOURCE_BUCKET}/${key}`);
}

writeFileSync(MANIFEST_PATH, JSON.stringify({ r2PublicBase: R2_PUBLIC_BASE, bucket: BUCKET, migratedAt: new Date().toISOString(), objects: manifest }, null, 2) + '\n');
console.log(`\nmanifest written to ${MANIFEST_PATH}`);
console.log(`done: ${manifest.length} objects, ${failures} failures`);
if (failures > 0) process.exit(1);
