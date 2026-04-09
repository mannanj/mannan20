import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(import.meta.dir, '../public/data/audio/new-rich');
const FILES = [
  'chunk-1.wav',
];

async function upload() {
  for (const file of FILES) {
    const data = readFileSync(join(DIR, file));
    const remotePath = `audio/new-rich/${file}`;
    const blob = await put(remotePath, data, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(`${file} -> ${blob.url}`);
  }
}

upload().catch(console.error);
