#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const BUCKET = 'mannan20-gated';
const ENCRYPTED_KEY = 'sun-signal/transcripts-encrypted.zip';

function fail(message) {
  console.error(`build-transcripts-archive: ${message}`);
  process.exit(1);
}

const out = resolve(process.argv[2] ?? process.env.TRANSCRIPTS_LOCAL_FILE ?? '');
if (!out) fail('pass an output path, or set TRANSCRIPTS_LOCAL_FILE');

if (out.includes(`${resolve('.')}/`) && !out.includes('node_modules')) {
  fail(`refusing to write the decrypted archive inside the repo: ${out}`);
}

const password = process.env.TRANSCRIPTS_ZIP_PASSWORD;
if (!password) fail('set TRANSCRIPTS_ZIP_PASSWORD');

const work = mkdtempSync(join(tmpdir(), 'transcripts-'));
try {
  const source = process.env.TRANSCRIPTS_SOURCE_ZIP
    ? resolve(process.env.TRANSCRIPTS_SOURCE_ZIP)
    : join(work, 'source.zip');

  if (process.env.TRANSCRIPTS_SOURCE_ZIP) {
    if (!existsSync(source)) fail(`missing source archive: ${source}`);
  } else {
    console.log(`build-transcripts-archive: fetching ${BUCKET}/${ENCRYPTED_KEY}`);
    execFileSync(
      'bunx',
      ['wrangler', 'r2', 'object', 'get', `${BUCKET}/${ENCRYPTED_KEY}`, '--remote', '--file', source],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    if (!existsSync(source)) fail('wrangler did not produce the source archive');
  }

  const extracted = join(work, 'extracted');
  mkdirSync(extracted, { recursive: true });
  execFileSync('unzip', ['-q', '-P', password, source, '-d', extracted], { stdio: ['ignore', 'inherit', 'inherit'] });

  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  execFileSync('zip', ['-q', '-r', '-X', out, '.', '-x', '.*', '__MACOSX/*'], { cwd: extracted, stdio: ['ignore', 'inherit', 'inherit'] });
  execFileSync('unzip', ['-qq', '-t', out], { stdio: ['ignore', 'inherit', 'inherit'] });
  console.log(`build-transcripts-archive: wrote ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
