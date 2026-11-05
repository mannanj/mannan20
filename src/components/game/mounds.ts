export const MOUND_SCORE = 800;
export const MOUND_COUNT = 7;
export const MOUND_ENTER_MS = 2500;
export const MOUND_SCENE_MS = 45_000;
export const MOUND_MONGOOSE_AT_MS = 34_000;
export const MOUND_BREAK_GAP_MS = 1300;
export const MOUND_SPLIT_AT_MS = 12_000;
export const MOUND_SPLIT_ORB_MS = 9000;
export const MOUND_SPLIT_MS = 12_000;
export const MOUND_POP_MS = 950;
export const MOUND_POP_GAP_MIN_MS = 450;
export const MOUND_POP_GAP_SPREAD_MS = 650;
export const MOUND_SWARM_MS = 2600;
export const MOUND_SWARM_CHANCE = 0.06;
export const MOUND_SWARM_COOLDOWN_MS = 8000;
export const MOUND_HEAD_POINTS = 2;
export const MOUND_HIT_RADIUS = 50;
export const MOUND_ART_W = 120;
export const MOUND_ART_H = 120;
export const MOUND_ITEM_ID = 'mongoose';
export const MOUND_X_FRACS = [0.07, 0.18, 0.29, 0.4, 0.63, 0.77, 0.91];
export const MOUND_FRONT_FRAC = 0.95;
export const MOUND_BACK_FRAC = 0.9;

export const MOUND_ART = {
  whole: '/game/jev/mound.webp',
  broken: '/game/jev/mound-broken.webp',
};

export const MONGOOSE_ART = {
  run: '/game/jev/mongoose-run.webp',
  bite: '/game/jev/mongoose-bite.webp',
};

export const MONGOOSE_READY_KEY = 'chicken-mongoose-ready-at';
export const MONGOOSE_STAY_MS = 30_000;
export const MONGOOSE_COOLDOWN_MS = 120_000;
export const MONGOOSE_POINTS_PER_SECOND = 3;
export const MONGOOSE_WANDER_MS = 30_000;
export const MONGOOSE_SIZE = 84;
export const MONGOOSE_RUN_PX_PER_MS = 0.45;
export const MONGOOSE_GRAVITY = 0.0018;
export const MONGOOSE_TOSS_MIN_SPEED = 0.25;
export const MONGOOSE_TOSS_AIM_RAD = Math.PI / 5;
export const MONGOOSE_TOSS_NEAR_PX = 150;

export const MOUND_COPY = {
  split: 'Split',
  resting: (left: string) => `Mongoose back in ${left}`,
};

export type MoundPhase = 'idle' | 'enter' | 'whack' | 'mongoose' | 'gone';

export interface MoundPoint {
  x: number;
  y: number;
}

export function moundLayout(vw: number, vh: number): MoundPoint[] {
  return MOUND_X_FRACS.map((frac, i) => ({
    x: vw * frac,
    y: vh * (i % 2 === 0 ? MOUND_FRONT_FRAC : MOUND_BACK_FRAC),
  }));
}

export function moundPhaseAt(elapsedMs: number): MoundPhase {
  if (elapsedMs < MOUND_ENTER_MS) return 'enter';
  if (elapsedMs < MOUND_MONGOOSE_AT_MS) return 'whack';
  return elapsedMs < MOUND_SCENE_MS ? 'mongoose' : 'gone';
}

export function splitShape(mounds: MoundPoint[]): { dx: number; dy: number }[] {
  const anchor = mounds[Math.floor(mounds.length / 2)];
  return mounds.map((m) => ({ dx: Math.round(m.x - anchor.x), dy: Math.round(m.y - anchor.y) }));
}

export function tossHitsChicken(from: MoundPoint, velocity: MoundPoint, chicken: MoundPoint): boolean {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (Math.hypot(chicken.x - from.x, chicken.y - from.y) <= MONGOOSE_TOSS_NEAR_PX) return true;
  if (speed < MONGOOSE_TOSS_MIN_SPEED) return false;
  const aim = Math.atan2(chicken.y - from.y, chicken.x - from.x);
  const thrown = Math.atan2(velocity.y, velocity.x);
  return Math.abs(Math.atan2(Math.sin(aim - thrown), Math.cos(aim - thrown))) <= MONGOOSE_TOSS_AIM_RAD;
}
