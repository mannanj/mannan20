export type SplitLevel = 0 | 1 | 2 | 3;
export type ChickPhase = 'free' | 'held' | 'tossed' | 'scatter' | 'returning';

export interface Wound {
  hp: number;
  open: boolean;
}

export interface ChickMotion {
  id: number;
  level: SplitLevel;
  groupId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rv: number;
  dir: number;
  phase: ChickPhase;
  phaseUntil: number;
  nextTurnAt: number;
  tossedAt: number;
  spawnedAt: number;
  squash: number;
  stretch: number;
  grabDx: number;
  grabDy: number;
  noSplit: boolean;
  breaking: boolean;
  leakUntil: number;
  nextLeakAt: number;
  targetVx: number;
  targetVy: number;
}

export interface ChickGroup {
  id: number;
  level: SplitLevel;
  parentGroupId: number;
  mergeAt: number;
  expected: number;
  members: Set<number>;
  returning: boolean;
  cx: number;
  cy: number;
}

export interface HoldState {
  id: number;
  ms: number;
  grabbed: boolean;
  outsideSince: number;
  anchorX: number;
  anchorY: number;
  driftX: number;
  driftY: number;
  driftTotal: number;
}

export const CHICK_W = 70;
export const CHICK_H = 140;
export const HOLD_MS = 1500;
export const HOLD_HUD_DELAY_MS = 180;
export const HOLD_SLACK_PX = 10;
export const HOLD_GRACE_MS = 120;
export const LEVEL_SCALE = [1, 0.65, 0.45, 0.32];
export const LEVEL_FREE_SPEED = [1, 0.8, 0.64, 0.5];
export const LEVEL_HELD_DRIFT = [0.25, 0.5, 0.9, 1.5];
export const LEVEL_MERGE_SCALE = [0, 1, 0.8, 0.6];
export const MIN_HIT_PX = 28;
export const SPLIT_COUNT = 3;
export const MAX_SPLIT_LEVEL = 3;
export const TOSS_SPEED_MAX = 38;
export const TOSS_MIN_SPEED = 6;
export const TOSS_LOB_VY = -14;
export const TOSS_LOB_VX = 6;
export const TOSS_GRAVITY = 0.9;
export const TOSS_DRAG = 0.995;
export const TOSS_BOUNCE_WALL = 0.55;
export const TOSS_BOUNCE_GROUND = 0.4;
export const TOSS_GROUND_FRICTION = 0.8;
export const TOSS_SPIN_FROM_VX = 0.05;
export const TOSS_SPIN_RANDOM = 4;
export const TOSS_SPLIT_IMPACT_MIN = 5;
export const TOSS_SPLIT_FALLBACK_MS = 900;
export const IMPACT_SPIN_KICK = 0.4;
export const IMPACT_SQUASH_PER_SPEED = 0.03;
export const IMPACT_SQUASH_MAX = 0.4;
export const SQUASH_DECAY = 0.9;
export const SCATTER_MS = 600;
export const SCATTER_SPEED_MIN = 7;
export const SCATTER_SPEED_SPREAD = 4;
export const SCATTER_SPEED_JITTER = 0.1;
export const SCATTER_FAN_DEG = 60;
export const WANDER_MERGE_MIN_MS = 14_000;
export const WANDER_MERGE_SPREAD_MS = 8_000;
export const REJOIN_DELAY_MS = 2500;
export const REGROUP_RETRY_MS = 3000;
export const RETURN_SPEED = 3.4;
export const FORCE_REFORM_BOOST = 8;
export const MERGE_PROXIMITY = 22;
export const BANDAID_HP = 3;
export const FRESH_PROTECT_MS = 1200;
export const RAINBOW_LEAK_MS = 2500;
export const RAINBOW_LEAK_INTERVAL_MS = 90;
export const RAINBOW_DROP_BURST = 28;
export const RAINBOW_DROP_SEEP = 6;
export const MAX_DROPS = 80;
export const MAX_POOLS = 24;
export const POOL_LIFE_MS = 9000;
export const POOL_FADE_MS = 2500;
export const DROP_GRAVITY = 0.35;
export const RAG_FOLLOW = 0.35;
export const RAG_GRAVITY = 0.9;
export const RAG_LENGTH = 70;
export const RAG_DAMP = 0.08;
export const RAG_MAX_DEG = 70;
export const RAG_STRETCH_MAX = 0.25;
export const RAG_STRETCH_PER_SPEED = 0.02;
export const POINTER_EMA = 0.3;
export const HELD_FLAP_MS = 90;
export const FREE_FLAP_MS = 220;
export const FREE_TURN_MIN_MS = 1500;
export const FREE_TURN_SPREAD_MS = 2200;
export const FREE_STEER = 0.03;
export const FREE_AVOID_RADIUS = 90;
export const FREE_AVOID_FORCE = 0.4;
export const FREE_ROT_SPRING = 0.02;
export const FREE_ROT_DAMP = 0.16;
export const FRAME_MS = 16.67;
export const RAD_TO_DEG = 180 / Math.PI;
export const FORCED_TOSS_VX = 6;
export const FORCED_TOSS_VY = -12;
export const RAINBOW_STOPS = ['#ff4d4d', '#ffb84d', '#f4ff4d', '#4dff88', '#4dc3ff', '#a64dff'];

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function heldDriftFor(level: number): number {
  return LEVEL_HELD_DRIFT[level];
}

export function chickSize(level: number): { w: number; h: number } {
  return { w: CHICK_W * LEVEL_SCALE[level], h: CHICK_H * LEVEL_SCALE[level] };
}

export function hitPadFor(level: number): number {
  const { w } = chickSize(level);
  return Math.max(0, (MIN_HIT_PX - w) / 2 / LEVEL_SCALE[level]);
}

export function splitFan(count: number): number[] {
  if (count <= 1) return [0];
  const step = (SCATTER_FAN_DEG * 2) / (count - 1);
  return Array.from({ length: count }, (_, i) => -SCATTER_FAN_DEG + i * step);
}

export function peelStage(hp: number): number {
  return clamp(hp, 0, BANDAID_HP);
}

export function groupCentroid(members: ChickMotion[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const m of members) {
    x += m.x;
    y += m.y;
  }
  const n = Math.max(1, members.length);
  return { x: x / n, y: y / n };
}

export function mergeDelayFor(level: SplitLevel): number {
  return (WANDER_MERGE_MIN_MS + Math.random() * WANDER_MERGE_SPREAD_MS) * LEVEL_MERGE_SCALE[level];
}

export function tossVelocity(vx: number, vy: number): { vx: number; vy: number } {
  const speed = Math.hypot(vx, vy);
  if (speed < TOSS_MIN_SPEED) {
    return { vx: (Math.random() < 0.5 ? -1 : 1) * Math.random() * TOSS_LOB_VX, vy: TOSS_LOB_VY };
  }
  if (speed > TOSS_SPEED_MAX) {
    const k = TOSS_SPEED_MAX / speed;
    return { vx: vx * k, vy: vy * k };
  }
  return { vx, vy };
}

export function ragdollStep(m: ChickMotion, pointerAx: number, dt: number): void {
  const a = (m.rot / RAD_TO_DEG) as number;
  const accel =
    (-RAG_GRAVITY * Math.sin(a) - pointerAx * Math.cos(a)) / RAG_LENGTH - RAG_DAMP * (m.rv / RAD_TO_DEG);
  const rvRad = m.rv / RAD_TO_DEG + accel * dt;
  m.rv = rvRad * RAD_TO_DEG;
  m.rot = clamp(m.rot + m.rv * dt, -RAG_MAX_DEG, RAG_MAX_DEG);
}

export interface TossBounds {
  w: number;
  h: number;
  vw: number;
  vh: number;
  groundY: number;
}

export function tossStep(m: ChickMotion, b: TossBounds, dt: number): number {
  m.vy += TOSS_GRAVITY * dt;
  const drag = Math.pow(TOSS_DRAG, dt);
  m.vx *= drag;
  m.vy *= drag;
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  m.rot += m.rv * dt;
  let impact = 0;
  const halfW = b.w / 2;
  const halfH = b.h / 2;
  if (m.x < halfW) {
    m.x = halfW;
    impact = Math.max(impact, Math.abs(m.vx));
    m.vx = Math.abs(m.vx) * TOSS_BOUNCE_WALL;
  } else if (m.x > b.vw - halfW) {
    m.x = b.vw - halfW;
    impact = Math.max(impact, Math.abs(m.vx));
    m.vx = -Math.abs(m.vx) * TOSS_BOUNCE_WALL;
  }
  if (m.y < halfH) {
    m.y = halfH;
    impact = Math.max(impact, Math.abs(m.vy));
    m.vy = Math.abs(m.vy) * TOSS_BOUNCE_WALL;
  }
  if (m.y > b.groundY - halfH) {
    m.y = b.groundY - halfH;
    impact = Math.max(impact, Math.abs(m.vy));
    m.vy = -Math.abs(m.vy) * TOSS_BOUNCE_GROUND;
    m.vx *= TOSS_GROUND_FRICTION;
    if (Math.abs(m.vy) < 1) m.vy = 0;
  }
  if (impact > 0) {
    m.rv += impact * IMPACT_SPIN_KICK * (m.vx >= 0 ? 1 : -1) * 0.25;
    m.squash = Math.min(IMPACT_SQUASH_MAX, impact * IMPACT_SQUASH_PER_SPEED);
  }
  return impact;
}
