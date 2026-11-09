export const CANNON_SCORE = 1200;
export const CANNON_POINTS = 100;
export const CANNON_COOLDOWN_MS = 5000;
export const CANNON_HIT_RADIUS = 120;
export const CANNON_DOCK_RADIUS = 130;
export const CANNON_BOTTOM_PX = 36;
export const CANNON_SIZE = 74;
export const CANNON_WAVES = 5;
export const CANNON_WAVE_MS = 420;
export const CANNON_WAVE_GAP_MS = 60;
export const CANNON_DOCKED_KEY = 'chicken-cannon-docked';
export const BOTTOM_ZONE_PX = 170;

export const CAST_KEYS = { jev: '1', monkey: '2', cannon: '3', mongoose: '4' } as const;
export type CastId = keyof typeof CAST_KEYS;
export const CAST_IDS = Object.keys(CAST_KEYS) as CastId[];

export const CANNON_COPY = {
  invite: 'Hold the chicken and drag it here',
  name: 'Cannon',
  burst: `+${CANNON_POINTS}`,
};

export const CAST_LABELS: Record<CastId, string> = { jev: 'Jev', monkey: 'Monkey', cannon: CANNON_COPY.name, mongoose: 'Mongoose' };

export interface CannonPoint {
  x: number;
  y: number;
}

export function cannonHome(vw: number, vh: number): CannonPoint {
  return { x: vw / 2, y: vh - CANNON_BOTTOM_PX - CANNON_SIZE / 2 };
}

export function canDock(at: CannonPoint, vw: number, vh: number): boolean {
  const home = cannonHome(vw, vh);
  return Math.hypot(at.x - home.x, at.y - home.y) <= CANNON_DOCK_RADIUS;
}

export function flatPoints(mult: number): number {
  return CANNON_POINTS / Math.max(1, mult);
}

export function zoneLimitY(vh: number, chickenH: number): number {
  return vh - BOTTOM_ZONE_PX - chickenH;
}

export function coolingSeconds(leftMs: number): number {
  return Math.max(0, Math.ceil(leftMs / 1000));
}
