export const GEAR_ITEMS = ['laser', 'ray-gun', 'freeze-gun'] as const;
export type GearId = (typeof GEAR_ITEMS)[number];
export type GunId = Exclude<GearId, 'laser'>;
export type GunHolder = 'you' | 'jev' | 'monkey';

export const GEAR_FROM_SCORE = 1000;
export const GEAR_SPAWN_CHECK_MS = 40_000;
export const GEAR_SPAWN_CHANCE = 0.4;
export const GEAR_LIFE_MS = 20_000;
export const GEAR_SPAWN_MARGIN = 120;
export const GEAR_TICK_MS = 60;

export const GUN_HOLD_MS = 15_000;
export const GUN_COOLDOWN_MS = 300_000;
export const GUN_SHOT_MS = 125;
export const GUN_HIT_RADIUS = 110;
export const GUN_MUZZLE = { x: 34, y: 28 };
export const GUN_READY_KEY = 'chicken-gun-ready-';
export const RAY_POINTS = 5;
export const LASER_POINTS = 3;

export const FREEZE_SLOW_PER_SECOND = 3;
export const ICE_SLOW_FACTOR = 0.35;
export const ICE_BLOCK_AT_MS = 4000;
export const ICE_BLOCK_MIN_MS = 10_000;
export const ICE_BLOCK_SPREAD_MS = 10_000;
export const ICE_CRACK_LEFT_MS = 6000;
export const ICE_HEAT_LEFT_MS = 3500;
export const ICE_COLORS = ['#dff4ff', '#a6e0ff', '#6cc6ff', '#ffffff'];

export const GEAR_COPY = {
  pickup: (label: string) => `Pick up ${label}`,
  cooling: (label: string, left: string) => `${label} ready in ${left}`,
  needMonkey: 'Get the monkey first',
  inUse: (label: string) => `${label} is already in use`,
};

export type IcePhase = 'none' | 'chilled' | 'solid' | 'cracking' | 'heating';

export interface IceState {
  slowUntil: number;
  iceMs: number;
  blockUntil: number;
}

export function createIce(): IceState {
  return { slowUntil: 0, iceMs: 0, blockUntil: 0 };
}

export function isGearItem(id: string): id is GearId {
  return (GEAR_ITEMS as readonly string[]).includes(id);
}

export function addFreezeShot(ice: IceState, now: number, rng: () => number): void {
  if (ice.blockUntil > now) return;
  ice.slowUntil = Math.max(now, ice.slowUntil) + GUN_SHOT_MS * FREEZE_SLOW_PER_SECOND;
  ice.iceMs += GUN_SHOT_MS;
  if (ice.iceMs >= ICE_BLOCK_AT_MS) ice.blockUntil = now + ICE_BLOCK_MIN_MS + rng() * ICE_BLOCK_SPREAD_MS;
}

export function icePhase(ice: IceState, now: number): IcePhase {
  if (ice.blockUntil > now) {
    const left = ice.blockUntil - now;
    if (left <= ICE_HEAT_LEFT_MS) return 'heating';
    return left <= ICE_CRACK_LEFT_MS ? 'cracking' : 'solid';
  }
  return now < ice.slowUntil ? 'chilled' : 'none';
}

export function iceSpeedFactor(ice: IceState, now: number): number {
  if (ice.blockUntil > now) return 0;
  return now < ice.slowUntil ? ICE_SLOW_FACTOR : 1;
}
