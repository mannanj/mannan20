export interface ChickenTier {
  name: string;
  threshold: number;
  body: string;
  bodyDark: string;
  belly: string;
  hair: 'none' | 'dark' | 'gold';
  eyes: 'calm' | 'determined' | 'angry' | 'furious' | 'ascended';
  aura: { r: number; g: number; b: number } | null;
  particleHue: number;
  screamRate: number;
  electricityMs: number | null;
}

export const TIERS: ChickenTier[] = [
  {
    name: 'Yard Bird',
    threshold: 0,
    body: '#FFD700',
    bodyDark: '#E6C200',
    belly: '#FFE44D',
    hair: 'none',
    eyes: 'calm',
    aura: null,
    particleHue: 45,
    screamRate: 1,
    electricityMs: null,
  },
  {
    name: 'Azure Comet',
    threshold: 20,
    body: '#4FC3F7',
    bodyDark: '#2BA8E0',
    belly: '#9BE1FF',
    hair: 'dark',
    eyes: 'determined',
    aura: { r: 79, g: 195, b: 247 },
    particleHue: 199,
    screamRate: 0.92,
    electricityMs: null,
  },
  {
    name: 'Jade Tempest',
    threshold: 45,
    body: '#66BB6A',
    bodyDark: '#43A047',
    belly: '#A5D6A7',
    hair: 'dark',
    eyes: 'angry',
    aura: { r: 105, g: 230, b: 120 },
    particleHue: 122,
    screamRate: 0.84,
    electricityMs: null,
  },
  {
    name: 'Crimson Fury',
    threshold: 75,
    body: '#EF5350',
    bodyDark: '#C62828',
    belly: '#FF8A80',
    hair: 'dark',
    eyes: 'furious',
    aura: { r: 255, g: 96, b: 56 },
    particleHue: 8,
    screamRate: 0.76,
    electricityMs: 2200,
  },
  {
    name: 'Golden God',
    threshold: 110,
    body: '#FFC107',
    bodyDark: '#FF8F00',
    belly: '#FFF8E1',
    hair: 'gold',
    eyes: 'ascended',
    aura: { r: 255, g: 226, b: 140 },
    particleHue: 48,
    screamRate: 0.68,
    electricityMs: 700,
  },
];

export const FINAL_TIER = TIERS.length - 1;

export const SHARD_PATCHES: string[] = [
  'M20 90 L38 84 L34 104 L18 106 Z',
  'M40 86 L58 92 L54 110 L40 102 Z',
  'M26 112 L42 108 L46 126 L24 128 Z',
  'M44 116 L60 112 L58 132 L46 134 Z',
  'M22 130 L40 132 L36 146 L24 142 Z',
  'M30 70 L48 72 L44 86 L28 84 Z',
  'M34 44 L50 48 L46 64 L32 60 Z',
  'M33 30 L44 27 L46 40 L36 42 Z',
  'M26 18 L38 14 L36 30 L24 30 Z',
  'M50 100 L62 96 L62 116 L52 118 Z',
  'M16 96 L24 88 L28 102 L18 110 Z',
  'M36 134 L52 136 L48 150 L38 148 Z',
];

const SHARD_ORDER_STEP = 5;
const SHARD_ORDER_TIER_OFFSET = 7;

export function shardOrderForTier(tier: number): number[] {
  const n = SHARD_PATCHES.length;
  return Array.from({ length: n }, (_, k) => (k * SHARD_ORDER_STEP + tier * SHARD_ORDER_TIER_OFFSET) % n);
}

export function tierForScore(score: number): number {
  let tier = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (score >= TIERS[i].threshold) tier = i;
  }
  return tier;
}

export function tierProgress(score: number): number {
  const tier = tierForScore(score);
  if (tier === FINAL_TIER) return 1;
  const current = TIERS[tier].threshold;
  const next = TIERS[tier + 1].threshold;
  return (score - current) / (next - current);
}

export function shardsRevealedForScore(score: number): number {
  if (tierForScore(score) === FINAL_TIER) return 0;
  return Math.floor(tierProgress(score) * SHARD_PATCHES.length);
}

export const MERCY_DELAY_MS = 6000;
export const MERCY_RAMP_MS = 14000;
export const MERCY_FLOOR = 0.45;
