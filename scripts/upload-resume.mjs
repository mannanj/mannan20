import { put, list } from '@vercel/blob';
import { readFile } from 'node:fs/promises';

let token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
  token = env.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
}
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');

const source = process.argv[2] ?? '/Users/manblack/Desktop/Resume-1-Page.pdf';

const existing = await list({ prefix: 'resume/', token });
console.log('Existing resume blobs:', existing.blobs.map(b => ({ url: b.url, pathname: b.pathname, size: b.size })));

const file = await readFile(source);
const blob = await put('resume/Mannan_Javid_Resume.pdf', file, {
  access: 'public',
  contentType: 'application/pdf',
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});
console.log('Uploaded:', blob.url);
console.log('Pathname:', blob.pathname);
console.log('Size:', file.length);
