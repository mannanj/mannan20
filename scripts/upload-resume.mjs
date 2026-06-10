import { copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { uploadToR2 } from './upload-to-r2.mjs';

const RESUME_KEY = 'portfolio/resume/Mannan_Javid_Resume.pdf';
const LOCAL_COPY = join(import.meta.dirname, '../public/data/documents/Mannan_Javid_Resume.pdf');

const source = process.argv[2] ?? '/Users/manblack/Desktop/Resume-1-Page.pdf';
const size = statSync(source).size;

copyFileSync(source, LOCAL_COPY);
console.log(`copied ${source} -> public/data/documents/Mannan_Javid_Resume.pdf`);

const url = uploadToR2(source, RESUME_KEY, 'application/pdf');
console.log(`uploaded -> ${url} (${size} bytes)`);
