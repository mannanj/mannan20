import type { BirdKind } from './bird-event';

export type GameVariant = 2 | 3;

export interface GameTuning {
  variant: GameVariant;
  baseSpeed: number;
  clickScale: number;
  disabledBirds: BirdKind[];
  cosmicOpening: boolean;
  persistScore: boolean;
  monologueAt: number | null;
}

const V1_BASE_SPEED = 0.125;
const V3_SPEED_BOOST = 1.3;
const V3_CLICK_SCALE = 0.2;
const V3_MONOLOGUE_SCORE = 600;

export const V2_TUNING: GameTuning = {
  variant: 2,
  baseSpeed: 0.075,
  clickScale: 1,
  disabledBirds: [],
  cosmicOpening: false,
  persistScore: false,
  monologueAt: null,
};

export const V3_TUNING: GameTuning = {
  variant: 3,
  baseSpeed: V1_BASE_SPEED * V3_SPEED_BOOST,
  clickScale: V3_CLICK_SCALE,
  disabledBirds: ['eagle'],
  cosmicOpening: true,
  persistScore: true,
  monologueAt: V3_MONOLOGUE_SCORE,
};

export function tuningFor(variant: GameVariant): GameTuning {
  return variant === 3 ? V3_TUNING : V2_TUNING;
}

export function scaledClicks(clicks: number, scale: number): number {
  return Math.max(1, Math.round(clicks * scale));
}
