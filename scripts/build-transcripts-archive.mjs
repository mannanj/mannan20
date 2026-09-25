#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const SOURCE = 'videos/sun-signal-light/transcripts/transcripts.zip';

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

if (!existsSync(SOURCE)) fail(`missing source archive: ${SOURCE}`);

const work = mkdtempSync(join(tmpdir(), 'transcripts-'));
try {
  execFileSync('unzip', ['-q', '-P', password, resolve(SOURCE), '-d', work], { stdio: ['ignore', 'inherit', 'inherit'] });
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  execFileSync('zip', ['-q', '-r', '-X', out, '.', '-x', '.*', '__MACOSX/*'], { cwd: work, stdio: ['ignore', 'inherit', 'inherit'] });
  execFileSync('unzip', ['-qq', '-t', out], { stdio: ['ignore', 'inherit', 'inherit'] });
  console.log(`build-transcripts-archive: wrote ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
