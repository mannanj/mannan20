import type { BirdKind } from './bird-event';
import type { CreatureKind } from './creature-event';
import type { EraCreature } from './endless-eras';

export type GameVariant = 2 | 3;

export interface GameTuning {
  variant: GameVariant;
  baseSpeed: number;
  clickScale: number;
  disabledBirds: BirdKind[];
  cosmicOpening: boolean;
  persistScore: boolean;
  monologueAtEnd: boolean;
  creatureSize: Partial<Record<CreatureKind, number>>;
  headlines: boolean;
  cannonDock: boolean;
  aimbot: boolean;
  chickenScale: number;
  eraCreatures: Record<string, EraCreature[]>;
  scenePicker: boolean;
  fieryPhoenix: boolean;
}

const V1_BASE_SPEED = 0.125;
const V3_SPEED_BOOST = 1.3;
const V3_CLICK_SCALE = 0.2;
const V3_CAT_SCALE = 1 / 3;
const V3_CHICKEN_SCALE = 1.3;
const V3_BOSS_SCALE = 1 / 5;
const V3_OLD_SMALL = 0.6;
const V3_KITTY_AT_MS = 8000;
const V3_BIG_CAT_DUEL_AT_MS = 30_000;
const V3_CYCLOPS_DUEL_AT_MS = 10_000;
const V3_GATE_DUEL_AT_MS = 12_000;

const V3_ERA_CREATURES: Record<string, EraCreature[]> = {
  'big-cats': [
    { kind: 'kitty', atMs: V3_KITTY_AT_MS },
    { kind: 'lion', atMs: V3_BIG_CAT_DUEL_AT_MS, rival: 'tiger', banner: 'the tiger and the lion collide!' },
  ],
  'myth-1': [{ kind: 'hydra', atMs: V3_CYCLOPS_DUEL_AT_MS, rival: 'cyclops', banner: 'the cyclops takes on the hydra' }],
  'myth-2': [{ kind: 'cerberus', atMs: V3_GATE_DUEL_AT_MS, rival: 'hydra', banner: 'the hydra meets cerberus at the gate' }],
};

export const V2_TUNING: GameTuning = {
  variant: 2,
  baseSpeed: 0.075,
  clickScale: 1,
  disabledBirds: [],
  cosmicOpening: false,
  persistScore: false,
  monologueAtEnd: false,
  creatureSize: {},
  headlines: true,
  cannonDock: true,
  aimbot: false,
  chickenScale: 1,
  eraCreatures: {},
  scenePicker: false,
  fieryPhoenix: false,
};

export const V3_TUNING: GameTuning = {
  variant: 3,
  baseSpeed: V1_BASE_SPEED * V3_SPEED_BOOST,
  clickScale: V3_CLICK_SCALE,
  disabledBirds: ['eagle'],
  cosmicOpening: false,
  persistScore: true,
  monologueAtEnd: true,
  creatureSize: {
    kitty: V3_OLD_SMALL * V3_CAT_SCALE,
    tiger: V3_CAT_SCALE,
    lion: V3_CAT_SCALE,
    cyclops: V3_OLD_SMALL * V3_BOSS_SCALE,
    hydra: V3_BOSS_SCALE,
    cerberus: V3_BOSS_SCALE,
  },
  headlines: false,
  cannonDock: false,
  aimbot: true,
  chickenScale: V3_CHICKEN_SCALE,
  eraCreatures: V3_ERA_CREATURES,
  scenePicker: true,
  fieryPhoenix: true,
};

export function tuningFor(variant: GameVariant): GameTuning {
  return variant === 3 ? V3_TUNING : V2_TUNING;
}

export function scaledClicks(clicks: number, scale: number): number {
  return Math.max(1, Math.round(clicks * scale));
}
