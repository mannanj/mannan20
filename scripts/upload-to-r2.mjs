import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const BUN = '/opt/homebrew/bin/bun';
const BUCKET = 'portfolio-files';

export const R2_PUBLIC_BASE = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev';

const CONTENT_TYPES = {
  wav: 'audio/wav',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  md: 'text/markdown',
};

export function uploadToR2(localPath, key, contentType) {
  statSync(localPath);
  const ext = key.split('.').pop()?.toLowerCase();
  const ct = contentType ?? CONTENT_TYPES[ext] ?? 'application/octet-stream';
  execFileSync(
    BUN,
    ['x', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', localPath, '--content-type', ct, '--remote'],
    { stdio: 'inherit' },
  );
  return `${R2_PUBLIC_BASE}/${key}`;
}

if (process.argv[1]?.endsWith('upload-to-r2.mjs')) {
  const [file, key, contentType] = process.argv.slice(2);
  if (!file || !key) {
    console.error('usage: node scripts/upload-to-r2.mjs <local-file> <r2-key> [content-type]');
    process.exit(1);
  }
  const url = uploadToR2(file, key, contentType);
  console.log(`uploaded -> ${url} (${statSync(file).size} bytes)`);
}
