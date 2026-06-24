import { uploadToR2 } from './upload-to-r2.mjs';

const ASSETS = [
  ['public/data/documents/health-longevity.pdf', 'portfolio/documents/health-longevity.pdf', 'application/pdf'],
  ['public/data/documents/seeking-community.pdf', 'portfolio/documents/seeking-community.pdf', 'application/pdf'],
  ['public/data/documents/self-parenting.pdf', 'portfolio/documents/self-parenting.pdf', 'application/pdf'],
  ['public/data/documents/ai-false-positives.pdf', 'portfolio/documents/ai-false-positives.pdf', 'application/pdf'],
  ['public/data/audio/health-longevity/chunk-1.wav', 'portfolio/audio/health-longevity/chunk-1.wav', 'audio/wav'],
  ['public/data/audio/health-longevity/chunk-2.wav', 'portfolio/audio/health-longevity/chunk-2.wav', 'audio/wav'],
  ['public/data/audio/seeking-community/chunk-1.wav', 'portfolio/audio/seeking-community/chunk-1.wav', 'audio/wav'],
  ['public/data/audio/seeking-community/chunk-2.wav', 'portfolio/audio/seeking-community/chunk-2.wav', 'audio/wav'],
  ['public/data/audio/seeking-community/chunk-3.wav', 'portfolio/audio/seeking-community/chunk-3.wav', 'audio/wav'],
  ['public/data/audio/seeking-community/chunk-4.wav', 'portfolio/audio/seeking-community/chunk-4.wav', 'audio/wav'],
  ['public/data/audio/self-parenting/chunk-1.wav', 'portfolio/audio/self-parenting/chunk-1.wav', 'audio/wav'],
  ['public/data/audio/self-parenting/chunk-2.wav', 'portfolio/audio/self-parenting/chunk-2.wav', 'audio/wav'],
  ['public/data/audio/ai-false-positives/chunk-1.wav', 'portfolio/audio/ai-false-positives/chunk-1.wav', 'audio/wav'],
];

for (const [localPath, key, contentType] of ASSETS) {
  console.log(`uploading ${localPath} -> ${key}`);
  uploadToR2(localPath, key, contentType);
}
