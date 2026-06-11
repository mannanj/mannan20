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

export function morphForScore(score: number): number {
  if (tierForScore(score) === FINAL_TIER) return 0;
  return tierProgress(score);
}

export function mixHex(from: string, to: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * clamped);
  const r = channel((a >> 16) & 255, (b >> 16) & 255);
  const g = channel((a >> 8) & 255, (b >> 8) & 255);
  const bl = channel(a & 255, b & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

export const MERCY_DELAY_MS = 5000;
export const MERCY_RAMP_MS = 10000;
export const MERCY_FLOOR = 0.4;
export const MERCY_RECOVERY_PER_MS = 0.000085;
export const MERCY_FOLLOW_PER_MS = 0.0004;
