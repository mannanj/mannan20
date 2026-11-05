import { ORB_LABELS, ORB_LIFETIME_MS, ORB_THRESHOLDS, type OrbKind } from './chicken-orbs';

export interface PacePoint {
  minutes: number;
  score: number;
}

export const PACE_CURVE: PacePoint[] = [
  { minutes: 0, score: 0 },
  { minutes: 0.75, score: 125 },
  { minutes: 1.5, score: 400 },
  { minutes: 3, score: 1000 },
  { minutes: 4, score: 1500 },
  { minutes: 5.5, score: 2000 },
];

export const MS_PER_MINUTE = 60_000;
export const PACE_END_SCORE = 2000;
export const SCHEDULE_TICK_MS = 1000;

export const ORB_GAP_MS = 20_000;
export const ORB_GAP_JITTER_MS = 6000;
export const ORB_GAP_MIN_MS = 8000;
export const ORB_FIRST_GAP_MS = 8000;
export const AHEAD_RATIO = 1.25;
export const AHEAD_GAP_FACTOR = 1.3;
export const BEHIND_BOOST = 0.2;
export const BEHIND_FORCE = 0.4;
export const BEHIND_MAX_GAP_CUT = 0.7;
export const BEHIND_GAP_GAIN = 2;
export const EARLY_ACCESS_BEHIND = 0.3;
export const EARLY_ACCESS_FACTOR = 0.7;
export const BIG_MOMENT_COOLDOWN_MS = 150_000;
export const BIG_MOMENT_MAX_CLONES = 20;
export const BIG_ORB_LIFETIME_MS = 20_000;
export const RECENCY_PENALTIES = [0.1, 0.4];
export const ACTIVE_BUFF_PENALTY = 0.2;
export const GOLDEN_FULL_PENALTY = 0.3;
export const CHAIN_IDLE_PENALTY = 0.4;
export const CHAIN_SYNERGY_CLONES = 4;
export const CHAIN_SYNERGY_WINDOW_MS = 10_000;
export const BEHIND_WEIGHT_BOOST = 2;

export const FRENZY_FACTOR = 2;
export const FRENZY_DURATION_MS = 20_000;
export const FRENZY_EXTEND_PER_CLICK_MS = 50;
export const FRENZY_CAP_MS = 40_000;
export const FRENZY_BLINK_MS = 4000;

export const TALON_WEIGHTED_BIRDS: Record<string, boolean> = { hawk: false, eagle: true, phoenix: true };

export interface OrbDef {
  label: string;
  unlock: number;
  weight: number;
  strength: number;
  lifetimeMs: number;
  big: boolean;
  catchUp: boolean;
  fixedAt: number | null;
}

function def(kind: OrbKind, unlock: number, weight: number, strength: number, extra: Partial<OrbDef> = {}): OrbDef {
  const fixed = ORB_THRESHOLDS[kind];
  return {
    label: ORB_LABELS[kind],
    unlock,
    weight,
    strength,
    lifetimeMs: ORB_LIFETIME_MS,
    big: false,
    catchUp: false,
    fixedAt: Number.isFinite(fixed) ? fixed : null,
    ...extra,
  };
}

export const ORB_REGISTRY: Record<OrbKind, OrbDef> = {
  multiply: def('multiply', 175, 10, 1),
  cursor5: def('cursor5', 100, 10, 3),
  cursor3: def('cursor3', 250, 6, 2),
  frenzy: def('frenzy', 450, 8, 4, { catchUp: true }),
  eggs: def('eggs', 700, 9, 6, { catchUp: true }),
  multiply5: def('multiply5', 800, 8, 3, { catchUp: true }),
  chain: def('chain', 900, 8, 3),
  multiply10: def('multiply10', 1000, 5, 5, { catchUp: true }),
  multiply25: def('multiply25', 1500, 2, 7, { big: true, lifetimeMs: BIG_ORB_LIFETIME_MS, catchUp: true }),
  multiply100: def('multiply100', 2000, 1, 8, { big: true, lifetimeMs: BIG_ORB_LIFETIME_MS }),
  giant: def('giant', 2000, 8, 5, { catchUp: true }),
  magnet: def('magnet', 2000, 8, 3),
  mystery: def('mystery', 2000, 2, 4),
  jev: def('jev', 700, 6, 0),
};

export const ORB_REGISTRY_KINDS = Object.keys(ORB_REGISTRY) as OrbKind[];

export interface EraDef {
  id: string;
  from: number;
  scene: string;
  introduces: OrbKind[];
  event: string | null;
}

export const ERA_REGISTRY: EraDef[] = [
  { id: 'backyard', from: 0, scene: 'yard', introduces: ['cursor5'], event: null },
  { id: 'escape', from: 125, scene: 'surf-plane-rocket', introduces: ['multiply', 'cursor3'], event: 'rocket' },
  { id: 'moon', from: 400, scene: 'moon', introduces: ['frenzy'], event: null },
  { id: 'hawk', from: 500, scene: 'moon', introduces: ['eggs', 'multiply5'], event: 'hawk' },
  { id: 'eagle', from: 600, scene: 'moon', introduces: ['chain'], event: 'eagle' },
  { id: 'cosmos', from: 1000, scene: 'cosmos', introduces: ['multiply10'], event: null },
  { id: 'jupiter', from: 1500, scene: 'jupiter', introduces: ['multiply25'], event: 'martians' },
  { id: 'phoenix', from: 2000, scene: 'fire-sky', introduces: ['multiply100', 'giant', 'magnet', 'mystery'], event: 'phoenix' },
  { id: 'big-cats', from: 8000, scene: 'night-yard', introduces: [], event: 'kitty' },
];

export function eraForScore(score: number): EraDef {
  let era = ERA_REGISTRY[0];
  for (const e of ERA_REGISTRY) if (score >= e.from) era = e;
  return era;
}

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

export function isAhead(target: number, actual: number): boolean {
  return target > 0 && actual > target * AHEAD_RATIO;
}

export function unlockedKinds(score: number, behind: number): OrbKind[] {
  const early = behind >= EARLY_ACCESS_BEHIND;
  return ORB_REGISTRY_KINDS.filter((k) => {
    const d = ORB_REGISTRY[k];
    if (score >= d.unlock) return true;
    return early && !d.big && score >= d.unlock * EARLY_ACCESS_FACTOR;
  });
}

export interface SchedulerContext {
  score: number;
  behind: number;
  ahead: boolean;
  lastKinds: OrbKind[];
  jevHeld?: boolean;
  activeKinds: OrbKind[];
  clones: number;
  goldens: number;
  sinceBigMs: number;
  sinceMultiplyEndMs: number;
  rng: () => number;
  pool?: OrbKind[];
}

export function orbWeight(kind: OrbKind, ctx: SchedulerContext): number {
  const d = ORB_REGISTRY[kind];
  if (kind === 'jev' && ctx.jevHeld) return 0;
  let w = d.weight;
  const recent = ctx.lastKinds.indexOf(kind);
  if (recent >= 0 && recent < RECENCY_PENALTIES.length) w *= RECENCY_PENALTIES[recent];
  if (ctx.behind >= BEHIND_BOOST && d.catchUp) w *= BEHIND_WEIGHT_BOOST;
  if (kind === 'eggs' && ctx.goldens >= 3) w *= GOLDEN_FULL_PENALTY;
  if (kind === 'chain' && ctx.clones < CHAIN_SYNERGY_CLONES && ctx.sinceMultiplyEndMs >= CHAIN_SYNERGY_WINDOW_MS) w *= CHAIN_IDLE_PENALTY;
  if (ctx.activeKinds.includes(kind)) w *= ACTIVE_BUFF_PENALTY;
  if (d.big) {
    if (ctx.ahead || ctx.sinceBigMs < BIG_MOMENT_COOLDOWN_MS || ctx.clones > BIG_MOMENT_MAX_CLONES) return 0;
    if (ctx.lastKinds[0] && ORB_REGISTRY[ctx.lastKinds[0]].big) return 0;
  }
  return w;
}

export function pickOrbKind(ctx: SchedulerContext): OrbKind | null {
  const unlocked = unlockedKinds(ctx.score, ctx.behind);
  const pool = ctx.pool ? unlocked.filter((k) => ctx.pool?.includes(k)) : unlocked;
  if (pool.length === 0) return null;
  if (ctx.behind >= BEHIND_FORCE) {
    const strong = pool.filter((k) => orbWeight(k, ctx) > 0 || !ORB_REGISTRY[k].big);
    const eligible = strong.filter((k) => !ORB_REGISTRY[k].big || orbWeight(k, ctx) > 0);
    const candidates = eligible.filter((k) => k !== ctx.lastKinds[0]);
    const list = candidates.length > 0 ? candidates : eligible;
    return list.reduce((best, k) => (ORB_REGISTRY[k].strength > ORB_REGISTRY[best].strength ? k : best), list[0]);
  }
  const weights = pool.map((k) => orbWeight(k, ctx));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let roll = ctx.rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function orbGapMs(behind: number, ahead: boolean, rng: () => number): number {
  const base = ORB_GAP_MS + (rng() * 2 - 1) * ORB_GAP_JITTER_MS;
  if (behind > 0) return Math.max(ORB_GAP_MIN_MS, base * (1 - Math.min(behind * BEHIND_GAP_GAIN, BEHIND_MAX_GAP_CUT)));
  return ahead ? base * AHEAD_GAP_FACTOR : base;
}

export function talonNeed(clicks: number, weight: number): number {
  return Math.max(1, Math.ceil(clicks / Math.max(1, weight)));
}

export function talonWeightFor(kind: string, mult: number): number {
  return TALON_WEIGHTED_BIRDS[kind] ? mult : 1;
}
