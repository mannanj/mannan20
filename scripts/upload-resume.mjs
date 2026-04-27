import { put, list } from '@vercel/blob';
import { readFile } from 'node:fs/promises';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');

const existing = await list({ prefix: 'resume/', token });
console.log('Existing resume blobs:', existing.blobs.map(b => ({ url: b.url, pathname: b.pathname, size: b.size })));

const file = await readFile('/Users/manblack/Downloads/Javid_Mannan_Res_final-2.pdf');
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
