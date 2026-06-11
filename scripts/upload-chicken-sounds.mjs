import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { uploadToR2 } from './upload-to-r2.mjs';

const dir = fileURLToPath(new URL('../public/sounds/chicken/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.mp3'));

if (files.length === 0) {
  console.error('no mp3 files found in public/sounds/chicken');
  process.exit(1);
}

for (const file of files) {
  const url = uploadToR2(`${dir}${file}`, `sounds/chicken/${file}`, 'audio/mpeg');
  console.log(`uploaded -> ${url}`);
}
