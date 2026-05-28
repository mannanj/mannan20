import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');

const file = await readFile('/Users/manblack/Downloads/ChatGPT Image Apr 30, 2026 at 07_16_37 PM.png');
const blob = await put('images/garden/camping-mountains-engraved.png', file, {
  access: 'public',
  contentType: 'image/png',
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});
console.log('Uploaded:', blob.url);
console.log('Pathname:', blob.pathname);
console.log('Size:', file.length);
