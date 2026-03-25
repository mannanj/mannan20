import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(import.meta.dir, '../public/data/audio/manifesto');
const FILES = [
  'chunk-1.wav', 'chunk-1.json',
  'chunk-2.wav', 'chunk-2.json',
  'chunk-3.wav', 'chunk-3.json',
];

async function upload() {
  for (const file of FILES) {
    const data = readFileSync(join(DIR, file));
    const remotePath = `audio/manifesto/${file}`;
    const blob = await put(remotePath, data, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(`${file} -> ${blob.url}`);
  }
}

upload().catch(console.error);
