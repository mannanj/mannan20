import type { OrbKind } from './chicken-orbs';

export interface PacePoint {
  minutes: number;
  score: number;
}

export const PACE_CURVE: PacePoint[] = [
  { minutes: 0, score: 0 },
  { minutes: 0.5, score: 250 },
  { minutes: 2.5, score: 2000 },
  { minutes: 6.5, score: 10_000 },
  { minutes: 9.5, score: 17_000 },
  { minutes: 12, score: 25_000 },
];

export const MS_PER_MINUTE = 60_000;
export const PACE_END_SCORE = 25_000;
export const CATCHUP_CHECK_MS = 30_000;
export const CATCHUP_BEHIND_MIN = 0.1;
export const CATCHUP_COOLDOWN_MS = 45_000;

export const FRENZY_FACTOR = 2;
export const FRENZY_DURATION_MS = 20_000;
export const FRENZY_EXTEND_PER_CLICK_MS = 100;
export const FRENZY_CAP_MS = 40_000;
export const FRENZY_BLINK_MS = 4000;

export const TALON_WEIGHTED_BIRDS: Record<string, boolean> = { hawk: false, eagle: true, phoenix: true };

export function paceTarget(playMs: number): number {
  const minutes = playMs / MS_PER_MINUTE;
  const last = PACE_CURVE[PACE_CURVE.length - 1];
  if (minutes >= last.minutes) return last.score;
  for (let i = 1; i < PACE_CURVE.length; i++) {
    const a = PACE_CURVE[i - 1];
    const b = PACE_CURVE[i];
    if (minutes <= b.minutes) return a.score + ((minutes - a.minutes) / (b.minutes - a.minutes)) * (b.score - a.score);
  }
  return last.score;
}

export function behindFraction(target: number, actual: number): number {
  return target <= 0 ? 0 : Math.max(0, (target - actual) / target);
}

export interface CatchUpTier {
  minBehind: number;
  kinds: OrbKind[];
}

export const CATCHUP_LADDER: CatchUpTier[] = [
  { minBehind: 0.1, kinds: ['cursor5', 'cursor3'] },
  { minBehind: 0.25, kinds: ['multiply'] },
  { minBehind: 0.45, kinds: ['frenzy'] },
];

export function catchUpKind(behind: number, spawnCount: number): OrbKind | null {
  if (behind <= CATCHUP_BEHIND_MIN) return null;
  let tier: CatchUpTier | null = null;
  for (const t of CATCHUP_LADDER) if (behind >= t.minBehind) tier = t;
  return tier ? tier.kinds[spawnCount % tier.kinds.length] : null;
}

export function talonNeed(clicks: number, weight: number): number {
  return Math.max(1, Math.ceil(clicks / Math.max(1, weight)));
}

export function talonWeightFor(kind: string, mult: number): number {
  return TALON_WEIGHTED_BIRDS[kind] ? mult : 1;
}
