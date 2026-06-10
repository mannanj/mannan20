import { R2_PUBLIC_BASE } from '@/lib/r2';

export interface AudioChunk {
  url: string;
  key: string;
  label: string;
}

const AUDIO_BASE = `${R2_PUBLIC_BASE}/portfolio/audio`;

export const MANIFESTO_CHUNKS: AudioChunk[] = [
  { url: `${AUDIO_BASE}/manifesto/chunk-1.wav`, key: 'manifesto/chunk-1', label: 'Part 1' },
  { url: `${AUDIO_BASE}/manifesto/chunk-2.wav`, key: 'manifesto/chunk-2', label: 'Part 2' },
  { url: `${AUDIO_BASE}/manifesto/chunk-3.wav`, key: 'manifesto/chunk-3', label: 'Part 3' },
];

export const AFFILIATE_LEADS_CHUNKS: AudioChunk[] = [
  { url: `${AUDIO_BASE}/affiliate-leads/chunk-1.wav`, key: 'affiliate-leads/chunk-1', label: 'Part 1' },
  { url: `${AUDIO_BASE}/affiliate-leads/chunk-2.wav`, key: 'affiliate-leads/chunk-2', label: 'Part 2' },
  { url: `${AUDIO_BASE}/affiliate-leads/chunk-3.wav`, key: 'affiliate-leads/chunk-3', label: 'Part 3' },
  { url: `${AUDIO_BASE}/affiliate-leads/chunk-4.wav`, key: 'affiliate-leads/chunk-4', label: 'Summary' },
];
