export const GEAR_ITEMS = ['ray-gun', 'thunder-gun', 'freeze-gun', 'cannon'] as const;
export type GunId = (typeof GEAR_ITEMS)[number];
export const PETS = ['jev', 'monkey'] as const;
export type PetId = (typeof PETS)[number];
export const PET_GUNS_KEY = 'chicken-pet-guns';

export const GEAR_FROM_SCORE = 1000;
export const GEAR_SPAWN_CHECK_MS = 40_000;
export const GEAR_SPAWN_CHANCE = 0.4;
export const GEAR_LIFE_MS = 20_000;
export const GEAR_SPAWN_MARGIN = 120;
export const GEAR_TICK_MS = 60;

export const GUN_SHOT_MS = 125;
export const GUN_HIT_RADIUS = 110;
export const RAY_POINTS = 5;
export const THUNDER_POINTS = 7;
export const THUNDER_CHAIN = 2;
export const THUNDER_CHAIN_RADIUS = 260;
export const CANNONBALL_POINTS = 8;
export const CANNON_SHOT_MS = 700;
export const CANNON_FLIGHT_MS = 280;
export const CANNON_SPLASH_RADIUS = 140;
export const CANNON_SPLASH_POINTS = 6;
export const AUTO_SHOT_MS: Record<GunId, number> = { 'ray-gun': 300, 'thunder-gun': 450, 'freeze-gun': 400, cannon: 900 };
export const GEAR_MULT: Record<GunId, number> = { 'ray-gun': 2.5, 'thunder-gun': 3.5, 'freeze-gun': 1.5, cannon: 4 };
export const GEAR_HOLDER_ATTR = 'data-gear-holder';

export function multLabel(mult: number): string {
  return `x${mult} points`;
}

export function multBadge(mult: number): string {
  return `x${mult}`;
}

export type PetGuns = Partial<Record<PetId, GunId>>;

export function isPetId(id: string): id is PetId {
  return (PETS as readonly string[]).includes(id);
}

export function readPetGuns(): PetGuns {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PET_GUNS_KEY) ?? '{}');
    if (typeof raw !== 'object' || raw === null) return {};
    const guns: PetGuns = {};
    for (const [pet, gun] of Object.entries(raw)) if (isPetId(pet) && typeof gun === 'string' && isGearItem(gun)) guns[pet] = gun;
    return guns;
  } catch {
    return {};
  }
}

export function writePetGuns(guns: PetGuns): void {
  try {
    localStorage.setItem(PET_GUNS_KEY, JSON.stringify(guns));
  } catch {}
}

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
  pick: (pet: string) => `Pick a gun for ${pet}`,
  none: 'No gun',
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

export function isGearItem(id: string): id is GunId {
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
