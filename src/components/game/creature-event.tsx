'use client';

import { scaledClicks } from './game-tuning';
import type { CSSProperties, RefObject } from 'react';
import type { GameItemId } from '@/components/inventory';
import type { CreatureSoundKey } from '@/lib/chicken-audio';
import { hudPushOut, hudZone } from './hud-safe-zone';

export type CreatureKind = 'kitty' | 'tiger' | 'lion' | 'cyclops' | 'hydra' | 'cerberus' | 'tree';
export type CreatureMode = 'grab' | 'miss' | 'spectacle' | 'bite';
export type CreaturePhase = 'idle' | 'enter' | 'act' | 'hold' | 'sit' | 'leave' | 'done';
type Pose = 'walk' | 'stalk' | 'pounce' | 'hold' | 'sit';
type HydraHeadState = 'empty' | 'ready' | 'strike' | 'bite' | 'knocked' | 'gone';

interface Rel {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PoseAsset {
  file: string;
  aspect: number;
  faces: 1 | -1;
  scale: number;
  head: Rel;
  extraHeads?: Record<string, Rel>;
  eye?: Rel;
  fadeBottom?: boolean;
}

export interface ClickTarget {
  id: string;
  label: string;
  clicks: number;
  raw: number;
}

interface CreatureBehaviour {
  chase: boolean;
  edgeStand: boolean;
  maxSwipes: number | null;
  swipeLift: number;
  clearsChicken: boolean;
  targetsIn: CreaturePhase;
  outerFirst: boolean;
  catchOnSwipe: number | null;
  holdAtHead: boolean;
  sinkFrac: number;
  holdX: number;
  holdY: number;
  pecksPerS: number;
}

export interface CreatureSpec extends CreatureBehaviour {
  kind: CreatureKind;
  mode: CreatureMode;
  label: string;
  banner: string;
  heightFrac: number;
  poses: Partial<Record<Pose, PoseAsset>>;
  targets: ClickTarget[];
  bodyTarget: boolean;
  enterMs: number;
  stalkMs: number;
  pounceMs: number;
  holdMs: [number, number] | null;
  stayMs: [number, number] | null;
  leaveMs: number;
  dropId: GameItemId | null;
  dropChance: number;
  sounds: { enter: CreatureSoundKey | null; act: CreatureSoundKey | null };
}

export const CREATURE_ORDER: CreatureKind[] = ['kitty', 'tiger', 'lion', 'cyclops', 'hydra', 'cerberus', 'tree'];
export const TREE_HP = 120;
export const TREE_BARK_RAW = 3;
export const TREE_PECK_PER_S = 2;
export const TREE_HOLD_MS = 60_000;
export const TREE_BARK_ID = 'bark';
export const TREE_SWORD_ID = 'sword';
export const SWORD_PULLS = 25;
const TREE_SINK_FRAC = 0.1;
const TREE_HOLD_X = 0.8;
const TREE_HOLD_Y = 0.6;
const TREE_HP_BAR_W_FRAC = 0.7;
const TREE_HP_BAR_H = 10;
const TREE_HP_BAR_GAP = 14;
const TREE_HP_BAR_BANNER_BOTTOM = 196;
const TREE_HP_BAR_FLOOR_PAD = 64;
const TREE_SWORD_ENTRY = { x: 0.5, y: 0.8 };
const TREE_SWORD_IMG = `${'/game/creatures'}/sword.webp`;
const TREE_SWORD_H_FRAC = 0.9;
const TREE_SWORD_ASPECT = 0.193;
const TREE_SWORD_TILT_DEG = -42;
const TREE_SWORD_BURIED_FRAC = 0.6;
const TREE_SWORD_SLIT_W = 0.75;
const TREE_SWORD_SLIT_H = 0.22;
const TREE_SWORD_HIT_FRAC = 0.7;
const TREE_SWORD_WOBBLE_DEG = 2.5;
export const CYCLOPS_STAY_MS: [number, number] = [10_000, 10_000];
export const HYDRA_HEADS_START = 3;
export const HYDRA_HEADS_MAX = 7;
export const HYDRA_HEAD_CLICKS = 5;
export const HYDRA_HEAD_RAW = 5;
export const HYDRA_STRIKE_EVERY_MS = 2500;
export const HYDRA_REGROW_MS = 4000;
export const HYDRA_KNOCKBACKS_TO_WIN = 12;
export const HYDRA_FIGHT_MS = 45_000;
export const CERBERUS_HEAD_CLICKS = 8;
export const CERBERUS_HEAD_RAW = 5;
export const CERBERUS_HOLD_MS = 40_000;
export const CERBERUS_SNAPS = 3;
export const CERBERUS_HEAD_IDS = ['left', 'right', 'middle'] as const;
const CERBERUS_MIDDLE = 'middle';
const HYDRA_STRIKE_MS = 480;
const HYDRA_STRIKE_HOLD_MS = 260;
const HYDRA_RETURN_MS = 420;
const HYDRA_RECOIL_MS = 600;
const HYDRA_REACH_FRAC = 1.0;
const HYDRA_HEAD_FRAC = 0.34;
const HYDRA_HEAD_ASPECT = 2.82;
const HYDRA_HEAD_PIVOT = 0.74;
const HYDRA_NECK_ROOT = 0.06;
const HYDRA_SPRITE_MIN_ASPECT = 2.0;
const HYDRA_SPRITE_MAX_ASPECT = 4.6;
const HYDRA_NECK_FRAC = 0.5;
const HYDRA_NECK_STAGGER_FRAC = 0.22;
const HYDRA_NECK_THICK_FRAC = 0.3;
const HYDRA_FAN_DEG = [-70, -47, -23, 0, 23, 47, 70];
const HYDRA_ANCHOR_SPREAD_FRAC = 0.05;
const HYDRA_ANCHOR_DROP_FRAC = 0.1;
const HYDRA_TARGET_DROP_FRAC = 0.35;
const HYDRA_NECK_BASE_FRAC = 0.8;
const HYDRA_NECK_TIP_FRAC = 0.5;
const HYDRA_NECK_SAMPLES = 14;
const HYDRA_NECK_RISE_FRAC = 0.5;
const HYDRA_HEAD_OVERLAP_FRAC = 0.58;
export const HYDRA_SCALES_PATTERN_ID = 'hydra-scales';
const HYDRA_SCALES_TILE_PX = 140;
const HYDRA_START_SLOTS = [1, 3, 5];
const HYDRA_SWAY_DEG = 6;
const HYDRA_SWAY_MS = 900;
const HYDRA_BITE_RADIUS_FRAC = 1.3;
const CYCLOPS_SWAT_MS = 1400;
const CYCLOPS_PUPIL_FRAC = 0.34;
const CYCLOPS_PUPIL_TRAVEL = 0.22;
const EDGE_STAND_FRAC = 0.42;
const CYCLOPS_SINK_FRAC = 0.26;
const CYCLOPS_FADE_MASK = 'linear-gradient(180deg, #000 72%, transparent 97%)';
const SLEEP_SINK_FRAC = 0.1;
export const KITTY_HOLD_MS: [number, number] = [4000, 6000];
export const KITTY_HOLD_FLOOR_MS = 2000;
export const KITTY_CLICKS_PER_SHORTEN = 3;
export const KITTY_SHORTEN_MS = 1000;
export const BIG_CAT_STAY_MS: [number, number] = [5000, 10_000];
export const LION_MANE_CLICKS = 15;
export const LION_MANE_RAW = 2;
export const CREATURE_HINT_DELAY_MS = 1500;
export const MIN_HIT_PX = 64;
const HIT_GROW = 1.3;
export const CLEARANCE_PX = 40;
const ASSET_BASE = '/game/creatures';
const STAND_DIST_FRAC = 0.32;
const EDGE_MARGIN = 20;
const GROUND_SINK_FRAC = 0.06;
const POUNCE_LIFT_FRAC = 0.55;
const SWIPE_EVERY_MS = 1800;
const SWIPE_MS = 700;
const CHASE_SPEED = 0.32;
const LEAVE_SPEED_BOOST = 1.6;
const SIT_MS = 1800;
const KITTY_STALK_MS = 1200;
const WALK_BOB_PX = 5;
const WALK_BOB_MS = 240;
const STALK_SQUASH = 0.9;
const XFADE_MS = 160;
const HOLD_WOBBLE_DEG = 9;
const HOLD_WOBBLE_MS = 180;
const HOLD_POINT_X = 0.78;
const HOLD_POINT_Y = 0.6;
const PAW_FRONT_CLIP = 'inset(60% 2% 0 66%)';
const SHADOW_W_FRAC = 0.62;
const SHADOW_H_FRAC = 0.13;
const SHADOW_MAX_OPACITY = 0.55;
const SHADOW_MIN_STRENGTH = 0.25;
const FEATHER_SLOTS = 6;
const FEATHER_EVERY_MS = 380;
const FEATHER_LIFE_MS = 1400;
const FEATHER_RISE = 0.09;
const FEATHER_DRIFT = 0.05;
const FEATHER_SPIN_DEG_MS = 0.3;
const HINT_GAP_PX = 10;
const HINT_EDGE_PAD = 12;
const SPAWN_OFFSET_FRAC = 0.6;
const PORTRAIT_SIZE_BASIS = 1.3;

export function scaledSpecs(sizes: Partial<Record<CreatureKind, number>>): Record<CreatureKind, CreatureSpec> {
  const out = { ...CREATURE_SPECS };
  for (const kind of CREATURE_ORDER) out[kind] = { ...CREATURE_SPECS[kind], heightFrac: CREATURE_SPECS[kind].heightFrac * (sizes[kind] ?? 1) };
  return out;
}

export function sizeBasis(vw: number, vh: number): number {
  return Math.min(vh, vw * PORTRAIT_SIZE_BASIS);
}

function pose(file: string, aspect: number, faces: 1 | -1, scale: number, head: Rel, extra: Pick<PoseAsset, 'extraHeads' | 'eye' | 'fadeBottom'> = {}): PoseAsset {
  return { file: `${ASSET_BASE}/${file}.webp`, aspect, faces, scale, head, ...extra };
}

const CAT_BEHAVIOUR: CreatureBehaviour = {
  chase: true,
  edgeStand: false,
  maxSwipes: null,
  swipeLift: POUNCE_LIFT_FRAC,
  clearsChicken: true,
  targetsIn: 'act',
  outerFirst: false,
  catchOnSwipe: null,
  holdAtHead: false,
  sinkFrac: GROUND_SINK_FRAC,
  holdX: HOLD_POINT_X,
  holdY: HOLD_POINT_Y,
  pecksPerS: 0,
};

const TREE_WALK_FACE: Rel = { x: 0.4, y: 0.33, w: 0.24, h: 0.18 };
const TREE_GRAB_FACE: Rel = { x: 0.42, y: 0.42, w: 0.22, h: 0.2 };
const TREE_CHIP_FACE: Rel = { x: 0.45, y: 0.42, w: 0.24, h: 0.2 };
const TREE_BARK: Record<string, Rel> = { bark: { x: 0.3, y: 0.56, w: 0.34, h: 0.36 } };

const CERBERUS_STAND_HEADS: Record<string, Rel> = { left: { x: 0.3, y: 0, w: 0.22, h: 0.3 }, right: { x: 0.74, y: 0.08, w: 0.26, h: 0.26 } };
const CERBERUS_STAND_MIDDLE: Rel = { x: 0.52, y: 0.02, w: 0.23, h: 0.3 };
const CERBERUS_LUNGE_HEADS: Record<string, Rel> = { left: { x: 0.38, y: 0.05, w: 0.21, h: 0.33 }, right: { x: 0.81, y: 0.16, w: 0.19, h: 0.26 } };
const CERBERUS_LUNGE_MIDDLE: Rel = { x: 0.61, y: 0, w: 0.24, h: 0.3 };
const CERBERUS_SLEEP_HEADS: Record<string, Rel> = { left: { x: 0.5, y: 0.1, w: 0.18, h: 0.6 }, right: { x: 0.82, y: 0.2, w: 0.18, h: 0.6 } };
const CERBERUS_SLEEP_MIDDLE: Rel = { x: 0.66, y: 0.1, w: 0.18, h: 0.6 };

export const CREATURE_SPECS: Record<CreatureKind, CreatureSpec> = {
  tree: {
    ...CAT_BEHAVIOUR,
    chase: false,
    targetsIn: 'hold',
    sinkFrac: TREE_SINK_FRAC,
    holdX: TREE_HOLD_X,
    holdY: TREE_HOLD_Y,
    pecksPerS: TREE_PECK_PER_S,
    kind: 'tree',
    mode: 'grab',
    label: 'tree',
    banner: 'the tree has the chicken! chip the bark',
    heightFrac: 0.62,
    poses: {
      walk: pose('tree-walk', 0.72, 1, 1, TREE_WALK_FACE, { extraHeads: TREE_BARK }),
      pounce: pose('tree-grab', 0.765, 1, 1.0, TREE_GRAB_FACE, { extraHeads: TREE_BARK }),
      hold: pose('tree-grab', 0.765, 1, 1.0, TREE_GRAB_FACE, { extraHeads: TREE_BARK }),
      sit: pose('tree-chipped', 0.645, 1, 1.0, TREE_CHIP_FACE, { extraHeads: TREE_BARK }),
    },
    targets: [{ id: TREE_BARK_ID, label: 'bark', clicks: TREE_HP, raw: TREE_BARK_RAW }],
    bodyTarget: false,
    enterMs: 3600,
    stalkMs: 0,
    pounceMs: 900,
    holdMs: [TREE_HOLD_MS, TREE_HOLD_MS],
    stayMs: null,
    leaveMs: 2600,
    dropId: null,
    dropChance: 0,
    sounds: { enter: 'creak', act: 'creak' },
  },
  cyclops: {
    ...CAT_BEHAVIOUR,
    chase: false,
    edgeStand: true,
    maxSwipes: 1,
    swipeLift: 0.06,
    clearsChicken: false,
    sinkFrac: CYCLOPS_SINK_FRAC,
    kind: 'cyclops',
    mode: 'spectacle',
    label: 'cyclops',
    banner: 'a cyclops looms over the temple',
    heightFrac: 0.92,
    poses: {
      walk: pose('cyclops', 0.63, -1, 1, { x: 0.45, y: 0.2, w: 0.45, h: 0.22 }, { eye: { x: 0.62, y: 0.32, w: 0.17, h: 0.075 }, fadeBottom: true }),
    },
    targets: [],
    bodyTarget: false,
    enterMs: 2600,
    stalkMs: 0,
    pounceMs: CYCLOPS_SWAT_MS,
    holdMs: null,
    stayMs: CYCLOPS_STAY_MS,
    leaveMs: 2200,
    dropId: null,
    dropChance: 0,
    sounds: { enter: 'rumble', act: null },
  },
  hydra: {
    ...CAT_BEHAVIOUR,
    clearsChicken: false,
    kind: 'hydra',
    mode: 'bite',
    label: 'hydra',
    banner: 'the hydra! knock its heads back',
    heightFrac: 0.3,
    poses: {
      walk: pose('hydra-body', 1.07, 1, 1, { x: 0.3, y: 0, w: 0.4, h: 0.3 }),
    },
    targets: [],
    bodyTarget: false,
    enterMs: 2200,
    stalkMs: 0,
    pounceMs: HYDRA_STRIKE_MS,
    holdMs: null,
    stayMs: null,
    leaveMs: 1800,
    dropId: 'hydra-scale',
    dropChance: 0.5,
    sounds: { enter: 'snake', act: 'snake' },
  },
  cerberus: {
    ...CAT_BEHAVIOUR,
    targetsIn: 'hold',
    outerFirst: true,
    catchOnSwipe: CERBERUS_SNAPS,
    holdAtHead: true,
    kind: 'cerberus',
    mode: 'grab',
    label: 'cerberus',
    banner: 'cerberus guards the gate! calm its heads',
    heightFrac: 0.34,
    poses: {
      walk: pose('cerberus-stand', 1.13, 1, 1, CERBERUS_STAND_MIDDLE, { extraHeads: CERBERUS_STAND_HEADS }),
      pounce: pose('cerberus-lunge', 1.2, 1, 1.1, CERBERUS_LUNGE_MIDDLE, { extraHeads: CERBERUS_LUNGE_HEADS }),
      hold: pose('cerberus-lunge', 1.2, 1, 1.1, CERBERUS_LUNGE_MIDDLE, { extraHeads: CERBERUS_LUNGE_HEADS }),
      sit: pose('cerberus-sleep', 2.67, 1, 0.55, CERBERUS_SLEEP_MIDDLE, { extraHeads: CERBERUS_SLEEP_HEADS }),
    },
    targets: CERBERUS_HEAD_IDS.map((id) => ({ id, label: `${id} head`, clicks: CERBERUS_HEAD_CLICKS, raw: CERBERUS_HEAD_RAW })),
    bodyTarget: false,
    enterMs: 1600,
    stalkMs: 0,
    pounceMs: SWIPE_MS,
    holdMs: [CERBERUS_HOLD_MS, CERBERUS_HOLD_MS],
    stayMs: [CERBERUS_HOLD_MS, CERBERUS_HOLD_MS],
    leaveMs: 1400,
    dropId: 'gate-key',
    dropChance: 1,
    sounds: { enter: 'bark', act: 'bark' },
  },
  kitty: {
    ...CAT_BEHAVIOUR,
    kind: 'kitty',
    mode: 'grab',
    label: 'kitty',
    banner: 'the kitty has the chicken! keep squeezing',
    heightFrac: 0.2,
    poses: {
      walk: pose('kitty-walk', 2.88, 1, 1, { x: 0.78, y: 0, w: 0.22, h: 0.6 }),
      stalk: pose('kitty-stalk', 0.81, 1, 1.3, { x: 0.2, y: 0, w: 0.6, h: 0.5 }),
      pounce: pose('kitty-pounce', 2.4, 1, 0.95, { x: 0.75, y: 0, w: 0.25, h: 0.7 }),
      hold: pose('kitty-hold', 2.39, 1, 1.2, { x: 0.68, y: 0, w: 0.32, h: 0.5 }),
    },
    targets: [],
    bodyTarget: true,
    enterMs: 2000,
    stalkMs: KITTY_STALK_MS,
    pounceMs: 600,
    holdMs: KITTY_HOLD_MS,
    stayMs: null,
    leaveMs: 1500,
    dropId: 'yarn-ball',
    dropChance: 0.35,
    sounds: { enter: 'meow', act: 'hiss' },
  },
  tiger: {
    ...CAT_BEHAVIOUR,
    kind: 'tiger',
    mode: 'spectacle',
    label: 'tiger',
    banner: 'a tiger! the chicken flies up and away',
    heightFrac: 0.3,
    poses: {
      walk: pose('tiger-walk', 2.0, -1, 1, { x: 0, y: 0, w: 0.3, h: 0.6 }),
      pounce: pose('tiger-pounce', 1.42, 1, 1.15, { x: 0.6, y: 0, w: 0.4, h: 0.5 }),
      sit: pose('tiger-run', 1.56, 1, 1.05, { x: 0.6, y: 0, w: 0.4, h: 0.5 }),
    },
    targets: [],
    bodyTarget: false,
    enterMs: 1500,
    stalkMs: 0,
    pounceMs: SWIPE_MS,
    holdMs: null,
    stayMs: BIG_CAT_STAY_MS,
    leaveMs: 1200,
    dropId: null,
    dropChance: 0,
    sounds: { enter: 'growl', act: null },
  },
  lion: {
    ...CAT_BEHAVIOUR,
    kind: 'lion',
    mode: 'miss',
    label: 'lion',
    banner: "click the lion's mane to tame it",
    heightFrac: 0.32,
    poses: {
      walk: pose('lion-walk', 1.43, -1, 1, { x: 0, y: 0, w: 0.42, h: 0.62 }),
      stalk: pose('lion-chase', 1.09, -1, 1.1, { x: 0.2, y: 0, w: 0.6, h: 0.55 }),
      pounce: pose('lion-pounce', 2.08, 1, 0.82, { x: 0.68, y: 0, w: 0.32, h: 0.62 }),
      sit: pose('lion-sit', 2.11, -1, 0.85, { x: 0, y: 0, w: 0.45, h: 0.9 }),
    },
    targets: [{ id: 'mane', label: 'mane', clicks: LION_MANE_CLICKS, raw: LION_MANE_RAW }],
    bodyTarget: false,
    enterMs: 1500,
    stalkMs: 0,
    pounceMs: SWIPE_MS,
    holdMs: null,
    stayMs: BIG_CAT_STAY_MS,
    leaveMs: 1200,
    dropId: 'golden-mane',
    dropChance: 0.6,
    sounds: { enter: 'roar', act: null },
  },
};

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Feather {
  born: number;
  x: number;
  y: number;
  vx: number;
  spin: number;
}

export interface HydraHead {
  state: HydraHeadState;
  at: number;
  clicks: number;
  target: Point;
  pos: Point;
}

export interface CreatureState {
  clickScale: number;
  banners: boolean;
  specs: Record<CreatureKind, CreatureSpec>;
  kind: CreatureKind | null;
  phase: CreaturePhase;
  phaseAt: number;
  enteredAt: number;
  leftAt: number;
  pos: Point;
  dir: 1 | -1;
  pose: Pose;
  prevPose: Pose | null;
  poseAt: number;
  standX: number;
  holdMs: number;
  stayMs: number;
  holdEndsAt: number;
  bodyClicks: number;
  targetClicks: number;
  tamed: boolean;
  misses: number;
  swipeAt: number;
  swipeFrom: Point;
  swiping: boolean;
  minClearance: number;
  feathers: Feather[];
  nextFeatherAt: number;
  dropRoll: number | null;
  durationScale: number;
  dropped: boolean;
  dropBonus: number;
  pending: CreatureKind | null;
  enterSoundDone: boolean;
  targetHits: Record<string, number>;
  heads: HydraHead[];
  knockbacks: number;
  bitingHead: number | null;
  releasePending: boolean;
  lastTs: number;
  nextStrikeAt: number;
  caught: boolean;
  swordIn: boolean;
  swordPulls: number;
  peckAcc: number;
}

function emptyHead(): HydraHead {
  return { state: 'empty', at: 0, clicks: 0, target: { x: 0, y: 0 }, pos: { x: 0, y: 0 } };
}

export function createCreatureState(): CreatureState {
  return {
    clickScale: 1,
    banners: true,
    specs: CREATURE_SPECS,
    kind: null,
    phase: 'idle',
    phaseAt: 0,
    enteredAt: 0,
    leftAt: 0,
    pos: { x: 0, y: 0 },
    dir: 1,
    pose: 'walk',
    prevPose: null,
    poseAt: 0,
    standX: 0,
    holdMs: 0,
    stayMs: 0,
    holdEndsAt: 0,
    bodyClicks: 0,
    targetClicks: 0,
    tamed: false,
    misses: 0,
    swipeAt: 0,
    swipeFrom: { x: 0, y: 0 },
    swiping: false,
    minClearance: Number.POSITIVE_INFINITY,
    feathers: [],
    nextFeatherAt: 0,
    dropRoll: null,
    durationScale: 1,
    dropped: false,
    dropBonus: 1,
    pending: null,
    enterSoundDone: false,
    targetHits: {},
    heads: Array.from({ length: HYDRA_HEADS_MAX }, emptyHead),
    knockbacks: 0,
    bitingHead: null,
    releasePending: false,
    lastTs: 0,
    nextStrikeAt: 0,
    caught: false,
    swordIn: false,
    swordPulls: 0,
    peckAcc: 0,
  };
}

export interface CreatureEls {
  root: HTMLDivElement | null;
  imgA: HTMLImageElement | null;
  imgB: HTMLImageElement | null;
  front: HTMLImageElement | null;
  shadow: HTMLDivElement | null;
  body: HTMLDivElement | null;
  targets: Record<string, HTMLDivElement | null>;
  hint: HTMLDivElement | null;
  banner: HTMLDivElement | null;
  feathers: (HTMLDivElement | null)[];
  eye: HTMLDivElement | null;
  heads: { img: HTMLImageElement | null; hit: HTMLDivElement | null }[];
  sword: HTMLImageElement | null;
  swordSlit: HTMLDivElement | null;
  swordHit: HTMLDivElement | null;
  hp: HTMLDivElement | null;
  hpFill: HTMLDivElement | null;
}

export function createCreatureEls(): CreatureEls {
  return {
    root: null,
    imgA: null,
    imgB: null,
    front: null,
    shadow: null,
    body: null,
    targets: {},
    hint: null,
    banner: null,
    feathers: Array.from({ length: FEATHER_SLOTS }, () => null),
    eye: null,
    heads: Array.from({ length: HYDRA_HEADS_MAX }, () => ({ img: null, hit: null })),
    sword: null,
    swordSlit: null,
    swordHit: null,
    hp: null,
    hpFill: null,
  };
}

export function isCreatureBusy(s: CreatureState): boolean {
  return (s.phase !== 'idle' && s.phase !== 'done') || s.pending !== null;
}

export function isCreatureHolding(s: CreatureState): boolean {
  return s.phase === 'hold' || s.bitingHead !== null;
}

export function hydraHeadsAlive(s: CreatureState): number {
  return s.heads.filter((h) => h.state === 'ready' || h.state === 'strike' || h.state === 'bite').length;
}

export function creatureOnScreen(s: CreatureState): boolean {
  return s.phase !== 'idle' && s.phase !== 'done';
}

export function queueCreature(s: CreatureState, kind: CreatureKind): boolean {
  if (isCreatureBusy(s)) return false;
  s.pending = kind;
  return true;
}

function rand(range: [number, number], rng: () => number): number {
  return range[0] + rng() * (range[1] - range[0]);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export interface CreatureStartCtx {
  ts: number;
  vw: number;
  vh: number;
  groundY: number;
  chickenCx: number;
  rng: () => number;
  dropBonus: number;
  sword?: boolean;
  durationScale?: number;
}

function setPose(s: CreatureState, next: Pose, ts: number): void {
  if (s.pose === next) return;
  s.prevPose = s.pose;
  s.pose = next;
  s.poseAt = ts;
}

function setPhase(s: CreatureState, phase: CreaturePhase, ts: number): void {
  s.phase = phase;
  s.phaseAt = ts;
}

function poseAsset(spec: CreatureSpec, p: Pose): PoseAsset {
  return spec.poses[p] ?? spec.poses.walk ?? Object.values(spec.poses)[0];
}

function sizeFor(spec: CreatureSpec, p: Pose, vh: number): { w: number; h: number } {
  const asset = poseAsset(spec, p);
  const h = spec.heightFrac * vh * asset.scale;
  return { w: h * asset.aspect, h };
}

export interface FighterSprite {
  file: string;
  w: number;
  h: number;
  faces: 1 | -1;
  sink: number;
  fade: boolean;
}

export function fighterSprites(spec: CreatureSpec, vw: number, vh: number): { walk: FighterSprite; strike: FighterSprite } {
  const basis = sizeBasis(vw, vh);
  const make = (p: Pose): FighterSprite => {
    const asset = poseAsset(spec, p);
    const { w, h } = sizeFor(spec, p, basis);
    return { file: asset.file, w, h, faces: asset.faces, sink: spec.sinkFrac, fade: asset.fadeBottom === true };
  };
  return { walk: make('walk'), strike: make(spec.poses.pounce ? 'pounce' : 'walk') };
}

function groundCenterY(spec: CreatureSpec, p: Pose, vh: number, groundY: number): number {
  const { h } = sizeFor(spec, p, vh);
  return groundY - h / 2 + h * spec.sinkFrac;
}

export function startCreature(s: CreatureState, kind: CreatureKind, ctx: CreatureStartCtx): void {
  const spec = s.specs[kind];
  const fresh = createCreatureState();
  Object.assign(s, fresh, { clickScale: s.clickScale, specs: s.specs, banners: s.banners });
  s.kind = kind;
  s.enteredAt = ctx.ts;
  s.dropBonus = ctx.dropBonus;
  s.durationScale = ctx.durationScale ?? 1;
  s.swordIn = kind === 'tree' && ctx.sword === true;
  const fromLeft = ctx.chickenCx >= ctx.vw / 2;
  s.dir = fromLeft ? 1 : -1;
  const vh = sizeBasis(ctx.vw, ctx.vh);
  const { w } = sizeFor(spec, 'walk', vh);
  s.pos = { x: fromLeft ? -w * SPAWN_OFFSET_FRAC : ctx.vw + w * SPAWN_OFFSET_FRAC, y: groundCenterY(spec, 'walk', vh, ctx.groundY) };
  const stand = spec.edgeStand ? (fromLeft ? w * EDGE_STAND_FRAC : ctx.vw - w * EDGE_STAND_FRAC) : ctx.chickenCx - s.dir * ctx.vw * STAND_DIST_FRAC;
  s.standX = spec.edgeStand ? stand : clamp(stand, w / 2 + EDGE_MARGIN, ctx.vw - w / 2 - EDGE_MARGIN);
  if (kind === 'hydra') for (const slot of HYDRA_START_SLOTS) s.heads[slot] = { ...emptyHead(), state: 'ready', at: ctx.ts };
  s.holdMs = spec.holdMs ? rand(spec.holdMs, ctx.rng) : 0;
  s.stayMs = spec.stayMs ? rand(spec.stayMs, ctx.rng) : 0;
  s.pose = 'walk';
  s.prevPose = null;
  s.poseAt = ctx.ts;
  setPhase(s, 'enter', ctx.ts);
  for (const asset of Object.values(spec.poses)) {
    const img = new Image();
    img.src = asset.file;
  }
}

export function shiftCreatureTime(s: CreatureState, ms: number): void {
  if (!creatureOnScreen(s)) return;
  s.phaseAt -= ms;
  s.poseAt -= ms;
  s.enteredAt -= ms;
  s.holdEndsAt -= ms;
  s.swipeAt -= ms;
  s.nextFeatherAt -= ms;
  s.nextStrikeAt -= ms;
  s.lastTs -= ms;
  for (const f of s.feathers) f.born -= ms;
  for (const h of s.heads) h.at -= ms;
}

export function tapCreatureBody(s: CreatureState): boolean {
  if (s.phase !== 'hold') return false;
  s.bodyClicks += 1;
  if (s.bodyClicks % scaledClicks(KITTY_CLICKS_PER_SHORTEN, s.clickScale) === 0) {
    const minEnd = s.phaseAt + KITTY_HOLD_FLOOR_MS;
    s.holdEndsAt = Math.max(minEnd, s.holdEndsAt - KITTY_SHORTEN_MS);
  }
  return true;
}

export interface TargetTap {
  raw: number;
  completed: boolean;
}

function targetDone(spec: CreatureSpec, s: CreatureState, id: string): boolean {
  const target = spec.targets.find((t) => t.id === id);
  return target !== undefined && (s.targetHits[id] ?? 0) >= scaledClicks(target.clicks, s.clickScale);
}

export function targetActive(spec: CreatureSpec, s: CreatureState, id: string): boolean {
  if (s.phase !== spec.targetsIn || s.tamed || targetDone(spec, s, id)) return false;
  if (!spec.outerFirst || id !== CERBERUS_MIDDLE) return true;
  return spec.targets.every((t) => t.id === CERBERUS_MIDDLE || targetDone(spec, s, t.id));
}

const HYDRA_TARGET_PREFIX = 'head-';

export function hydraTargetId(slot: number): string {
  return `${HYDRA_TARGET_PREFIX}${slot}`;
}

function tapHydraHead(s: CreatureState, targetId: string): TargetTap | null {
  if (s.phase !== 'act' || !targetId.startsWith(HYDRA_TARGET_PREFIX)) return null;
  const slot = Number(targetId.slice(HYDRA_TARGET_PREFIX.length));
  const head = s.heads[slot];
  if (!head || (head.state !== 'ready' && head.state !== 'strike' && head.state !== 'bite')) return null;
  head.clicks += 1;
  s.targetClicks += 1;
  if (head.clicks < scaledClicks(HYDRA_HEAD_CLICKS, s.clickScale)) return { raw: HYDRA_HEAD_RAW, completed: false };
  head.state = 'knocked';
  head.at = s.lastTs;
  s.knockbacks += 1;
  if (s.bitingHead === slot) {
    s.bitingHead = null;
    s.releasePending = true;
  }
  if (s.knockbacks >= HYDRA_KNOCKBACKS_TO_WIN) s.tamed = true;
  return { raw: HYDRA_HEAD_RAW, completed: s.tamed };
}

export function tapSword(s: CreatureState): TargetTap | null {
  if (!s.swordIn || !creatureOnScreen(s) || s.phase === 'leave') return null;
  s.swordPulls += 1;
  if (s.swordPulls < SWORD_PULLS) return { raw: 0, completed: false };
  s.swordIn = false;
  return { raw: 0, completed: true };
}

export function swordPoint(s: CreatureState, vw: number, vhRaw: number): Point {
  if (!s.kind) return { ...s.pos };
  const spec = s.specs[s.kind];
  const r = swordPose(spec, s, sizeBasis(vw, vhRaw)).hit;
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function tapCreatureTarget(s: CreatureState, targetId: string): TargetTap | null {
  if (!s.kind) return null;
  const spec = s.specs[s.kind];
  if (spec.mode === 'bite') return tapHydraHead(s, targetId);
  if (targetId === TREE_SWORD_ID) return tapSword(s);
  const target = spec.targets.find((t) => t.id === targetId);
  if (!target || !targetActive(spec, s, targetId)) return null;
  s.targetHits[targetId] = (s.targetHits[targetId] ?? 0) + 1;
  s.targetClicks += 1;
  if (spec.targets.every((t) => targetDone(spec, s, t.id))) {
    s.tamed = true;
    return { raw: target.raw, completed: true };
  }
  return { raw: target.raw, completed: false };
}

export interface CreatureTickCtx {
  ts: number;
  dtMs: number;
  vw: number;
  vh: number;
  groundY: number;
  chickenCx: number;
  chickenCy: number;
  chickenW: number;
  chickenH: number;
  rng: () => number;
}

export interface CreatureDrop {
  id: GameItemId;
  x: number;
  y: number;
}

export interface CreatureTickResult {
  hold: Point | null;
  flyUp: boolean;
  clearY: number | null;
  grabbed: boolean;
  released: boolean;
  drop: CreatureDrop | null;
  sound: CreatureSoundKey | null;
  done: boolean;
  chips: number;
}

function rollDrop(s: CreatureState, spec: CreatureSpec, at: Point, rng: () => number): CreatureDrop | null {
  if (!spec.dropId || s.dropped) return null;
  s.dropped = true;
  const roll = s.dropRoll ?? rng();
  if (roll >= spec.dropChance * s.dropBonus) return null;
  return { id: spec.dropId, x: at.x, y: at.y };
}

function nearestExitX(s: CreatureState, w: number, vw: number): number {
  return s.pos.x < vw / 2 ? -w * SPAWN_OFFSET_FRAC : vw + w * SPAWN_OFFSET_FRAC;
}

function headRect(spec: CreatureSpec, s: CreatureState, box: Rect, flipped: boolean): Rect {
  const head = poseAsset(spec, s.pose).head;
  const relX = flipped ? 1 - head.x - head.w : head.x;
  return { x: box.x + relX * box.w, y: box.y + head.y * box.h, w: head.w * box.w, h: head.h * box.h };
}

function hitRect(r: Rect): Rect {
  return atLeast({ x: r.x - (r.w * (HIT_GROW - 1)) / 2, y: r.y - (r.h * (HIT_GROW - 1)) / 2, w: r.w * HIT_GROW, h: r.h * HIT_GROW }, MIN_HIT_PX);
}

function nearestTarget(els: CreatureEls, x: number, y: number, fallback: string): string {
  const candidates: [string, HTMLElement | null][] = [
    ...Object.entries(els.targets),
    ...els.heads.map((h, i): [string, HTMLElement | null] => [hydraTargetId(i), h.hit]),
  ];
  let best = fallback;
  let bestD = Number.POSITIVE_INFINITY;
  for (const [id, el] of candidates) {
    if (!el || el.style.visibility !== 'visible') continue;
    const r = el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function atLeast(r: Rect, min: number): Rect {
  const w = Math.max(r.w, min);
  const h = Math.max(r.h, min);
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
}

function place(el: HTMLElement | null, r: Rect, extra = ''): void {
  if (!el) return;
  el.style.visibility = 'visible';
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
  el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0) ${extra}`.trim();
}

function hide(el: HTMLElement | null): void {
  if (el) el.style.visibility = 'hidden';
}

function tickFeathers(s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx, hold: Point | null): void {
  if (hold && ctx.ts >= s.nextFeatherAt && s.feathers.length < FEATHER_SLOTS) {
    s.nextFeatherAt = ctx.ts + FEATHER_EVERY_MS;
    s.feathers.push({ born: ctx.ts, x: hold.x + (ctx.rng() - 0.5) * ctx.chickenW, y: hold.y, vx: (ctx.rng() - 0.5) * FEATHER_DRIFT * 2, spin: ctx.rng() * 360 });
  }
  s.feathers = s.feathers.filter((f) => ctx.ts - f.born < FEATHER_LIFE_MS);
  els.feathers.forEach((el, i) => {
    const f = s.feathers[i];
    if (!el) return;
    if (!f) {
      hide(el);
      return;
    }
    const age = ctx.ts - f.born;
    const t = age / FEATHER_LIFE_MS;
    const x = f.x + f.vx * age;
    const y = f.y - FEATHER_RISE * age * (1 - t) + t * t * 60;
    el.style.visibility = 'visible';
    el.style.opacity = String(1 - t);
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${f.spin + age * FEATHER_SPIN_DEG_MS}deg)`;
  });
}

function holdPoint(spec: CreatureSpec, s: CreatureState, vh: number): Point {
  const { w, h } = sizeFor(spec, 'hold', vh);
  const flipped = s.dir !== poseAsset(spec, 'hold').faces;
  if (spec.holdAtHead) {
    const head = headRect(spec, s, { x: s.pos.x - w / 2, y: s.pos.y - h / 2, w, h }, flipped);
    return { x: head.x + head.w / 2, y: head.y + head.h * 0.7 };
  }
  const relX = flipped ? 1 - spec.holdX : spec.holdX;
  return { x: s.pos.x - w / 2 + w * relX, y: s.pos.y - h / 2 + h * spec.holdY };
}

interface SwordPose {
  rect: Rect;
  hit: Rect;
  entry: Point;
  tilt: number;
  buried: number;
}

function swordPose(spec: CreatureSpec, s: CreatureState, vh: number): SwordPose {
  const box = currentBox(spec, s, vh);
  const flipped = s.dir !== poseAsset(spec, s.pose).faces;
  const entry = { x: box.x + (flipped ? 1 - TREE_SWORD_ENTRY.x : TREE_SWORD_ENTRY.x) * box.w, y: box.y + TREE_SWORD_ENTRY.y * box.h };
  const tilt = flipped ? -TREE_SWORD_TILT_DEG : TREE_SWORD_TILT_DEG;
  const h = TREE_SWORD_H_FRAC * box.h;
  const w = h * TREE_SWORD_ASPECT;
  const buried = TREE_SWORD_BURIED_FRAC * (1 - s.swordPulls / SWORD_PULLS);
  const rad = (tilt * Math.PI) / 180;
  const entryLocal = (0.5 - buried) * h;
  const cx = entry.x + entryLocal * Math.sin(rad);
  const cy = entry.y - entryLocal * Math.cos(rad);
  const midLocal = ((1 - buried) / 2 - 0.5) * h;
  const hitSize = Math.max(MIN_HIT_PX, (1 - buried) * h * TREE_SWORD_HIT_FRAC);
  const hitCx = cx - midLocal * Math.sin(rad);
  const hitCy = cy + midLocal * Math.cos(rad);
  return {
    rect: { x: cx - w / 2, y: cy - h / 2, w, h },
    hit: { x: hitCx - hitSize / 2, y: hitCy - hitSize / 2, w: hitSize, h: hitSize },
    entry,
    tilt,
    buried,
  };
}

function renderTree(spec: CreatureSpec, s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx, vh: number, box: Rect): void {
  const visible = creatureOnScreen(s) && s.phase !== 'leave';
  if (els.sword && els.swordHit) {
    if (s.swordIn && visible) {
      const pose = swordPose(spec, s, vh);
      const wobble = Math.sin(ctx.ts / HOLD_WOBBLE_MS) * TREE_SWORD_WOBBLE_DEG * (s.swordPulls / SWORD_PULLS);
      place(els.sword, pose.rect, `rotate(${pose.tilt + wobble}deg)`);
      els.sword.style.clipPath = `inset(0 0 ${(pose.buried * 100).toFixed(2)}% 0)`;
      const slitW = pose.rect.w * TREE_SWORD_SLIT_W;
      const slitH = pose.rect.w * TREE_SWORD_SLIT_H;
      place(els.swordSlit, { x: pose.entry.x - slitW / 2, y: pose.entry.y - slitH / 2, w: slitW, h: slitH }, `rotate(${pose.tilt}deg)`);
      place(els.swordHit, pose.hit);
      els.swordHit.dataset.clicks = String(s.swordPulls);
    } else {
      hide(els.sword);
      hide(els.swordSlit);
      hide(els.swordHit);
    }
  }
  if (els.hp && els.hpFill) {
    if (s.phase === 'hold' && !s.tamed) {
      const w = box.w * TREE_HP_BAR_W_FRAC;
      const hits = s.targetHits[TREE_BARK_ID] ?? 0;
      const left = clamp(1 - hits / scaledClicks(TREE_HP, s.clickScale), 0, 1);
      const above = box.y - TREE_HP_BAR_GAP - TREE_HP_BAR_H;
      const below = Math.min(box.y + box.h + TREE_HP_BAR_GAP, window.innerHeight - TREE_HP_BAR_FLOOR_PAD);
      const bar = { x: box.x + box.w / 2 - w / 2, y: above < TREE_HP_BAR_BANNER_BOTTOM ? below : above, w, h: TREE_HP_BAR_H };
      const push = hudPushOut(hudZone(ctx.vw), bar.x + bar.w / 2, bar.y + bar.h / 2, bar.w / 2, bar.h / 2);
      place(els.hp, { ...bar, x: bar.x + push.dx, y: bar.y + push.dy });
      els.hpFill.style.width = `${left * 100}%`;
      els.hp.dataset.hp = String(Math.max(0, scaledClicks(TREE_HP, s.clickScale) - hits));
    } else {
      hide(els.hp);
    }
  }
}

function beginLeave(s: CreatureState, ts: number, vw: number, pose: Pose): void {
  setPhase(s, 'leave', ts);
  setPose(s, pose, ts);
  s.swipeFrom = { ...s.pos };
  s.dir = s.pos.x < vw / 2 ? -1 : 1;
  s.feathers = [];
}

function hydraNeck(spec: CreatureSpec, s: CreatureState, vh: number): Point {
  const box = currentBox(spec, s, vh);
  const head = headRect(spec, s, box, false);
  return { x: head.x + head.w / 2, y: head.y + head.h * 0.3 };
}

function hydraAnchor(neck: Point, slot: number, bodyW: number, bodyH: number): Point {
  return { x: neck.x + ((slot - (HYDRA_HEADS_MAX - 1) / 2) / 3) * bodyW * HYDRA_ANCHOR_SPREAD_FRAC, y: neck.y + bodyH * HYDRA_ANCHOR_DROP_FRAC };
}

function hydraRest(neck: Point, slot: number, bodyW: number, bodyH: number, ts: number): Point {
  const anchor = hydraAnchor(neck, slot, bodyW, bodyH);
  const sway = Math.sin(ts / HYDRA_SWAY_MS + slot) * HYDRA_SWAY_DEG;
  const rad = ((HYDRA_FAN_DEG[slot] + sway) * Math.PI) / 180;
  const len = bodyH * (HYDRA_NECK_FRAC + (slot % 2) * HYDRA_NECK_STAGGER_FRAC);
  return { x: anchor.x + Math.sin(rad) * len, y: anchor.y - Math.cos(rad) * len };
}

function regrowSlots(s: CreatureState, from: number): number[] {
  const free = s.heads.map((h, i) => (h.state === 'empty' || h.state === 'gone' ? i : -1)).filter((i) => i >= 0 && i !== from);
  free.sort((a, b) => Math.abs(a - from) - Math.abs(b - from));
  const room = HYDRA_HEADS_MAX - hydraHeadsAlive(s);
  return [from, ...free].slice(0, Math.min(2, room));
}

function tickHydra(spec: CreatureSpec, s: CreatureState, ctx: CreatureTickCtx, vh: number, result: CreatureTickResult): void {
  const { ts, vw, groundY } = ctx;
  const elapsed = ts - s.phaseAt;
  const { w: bodyW, h: bodyH } = sizeFor(spec, 'walk', vh);
  s.pos.y = groundCenterY(spec, 'walk', vh, groundY);
  if (s.bitingHead === null) {
    const dx = ctx.chickenCx - s.pos.x;
    const step = Math.min(Math.abs(dx), CHASE_SPEED * 0.5 * ctx.dtMs);
    s.pos.x += Math.sign(dx) * step;
  }
  const neck = hydraNeck(spec, s, vh);
  const reach = bodyH * HYDRA_REACH_FRAC;
  const chicken = { x: ctx.chickenCx, y: ctx.chickenCy };
  const aimAt = (): Point => {
    const dx = chicken.x - neck.x;
    const dy = chicken.y - neck.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, reach / d);
    return { x: neck.x + dx * k, y: Math.min(neck.y + dy * k, neck.y + bodyH * HYDRA_TARGET_DROP_FRAC) };
  };
  if (ts >= s.nextStrikeAt) {
    s.nextStrikeAt = ts + HYDRA_STRIKE_EVERY_MS;
    const ready = s.heads.map((h, i) => (h.state === 'ready' ? i : -1)).filter((i) => i >= 0);
    if (ready.length) {
      const slot = ready[Math.floor(ctx.rng() * ready.length)];
      s.heads[slot] = { ...s.heads[slot], state: 'strike', at: ts, target: aimAt() };
    }
  }
  s.heads.forEach((head, slot) => {
    const rest = hydraRest(neck, slot, bodyW, bodyH, ts);
    const age = ts - head.at;
    if (head.state === 'ready') {
      head.pos = rest;
    } else if (head.state === 'strike') {
      if (age < HYDRA_STRIKE_MS) {
        head.target = aimAt();
        const t = easeOut(age / HYDRA_STRIKE_MS);
        head.pos = { x: rest.x + (head.target.x - rest.x) * t, y: rest.y + (head.target.y - rest.y) * t };
      } else if (age < HYDRA_STRIKE_MS + HYDRA_STRIKE_HOLD_MS) {
        head.pos = head.target;
        const near = Math.hypot(chicken.x - head.target.x, chicken.y - head.target.y) <= ctx.chickenW * HYDRA_BITE_RADIUS_FRAC;
        if (near && s.bitingHead === null && !s.tamed) {
          head.state = 'bite';
          head.at = ts;
          s.bitingHead = slot;
          result.grabbed = true;
          result.sound = spec.sounds.act;
        }
      } else {
        const t = easeInOut(clamp((age - HYDRA_STRIKE_MS - HYDRA_STRIKE_HOLD_MS) / HYDRA_RETURN_MS, 0, 1));
        head.pos = { x: head.target.x + (rest.x - head.target.x) * t, y: head.target.y + (rest.y - head.target.y) * t };
        if (t >= 1) {
          head.state = 'ready';
          head.at = ts;
        }
      }
    } else if (head.state === 'bite') {
      head.pos = head.target;
      result.hold = { x: head.target.x, y: head.target.y };
    } else if (head.state === 'knocked') {
      const t = easeOut(clamp(age / HYDRA_RECOIL_MS, 0, 1));
      const away = { x: rest.x + (rest.x - neck.x) * 0.4, y: rest.y - bodyH * 0.25 };
      head.pos = { x: head.pos.x + (away.x - head.pos.x) * t, y: head.pos.y + (away.y - head.pos.y) * t };
      if (age >= HYDRA_RECOIL_MS) {
        head.state = 'gone';
      }
    } else if (head.state === 'gone' && age >= HYDRA_REGROW_MS && !s.tamed && s.phase === 'act') {
      for (const target of regrowSlots(s, slot)) s.heads[target] = { ...emptyHead(), state: 'ready', at: ts, pos: neck };
      if (s.heads[slot].state === 'gone') s.heads[slot] = emptyHead();
    }
  });
  if (s.releasePending) {
    s.releasePending = false;
    result.released = true;
  }
  if (s.tamed || elapsed >= HYDRA_FIGHT_MS) {
    if (s.bitingHead !== null) {
      s.heads[s.bitingHead].state = 'knocked';
      s.heads[s.bitingHead].at = ts;
      s.bitingHead = null;
      result.released = true;
      result.hold = null;
    }
    if (s.tamed) result.drop = rollDrop(s, spec, neck, ctx.rng);
    for (const head of s.heads) if (head.state !== 'empty' && head.state !== 'gone') head.state = 'knocked';
    beginLeave(s, ts, vw, 'walk');
  }
}

export function tickCreature(s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx): CreatureTickResult {
  const result: CreatureTickResult = { hold: null, flyUp: false, clearY: null, grabbed: false, released: false, drop: null, sound: null, done: false, chips: 0 };
  if (!s.kind || !creatureOnScreen(s)) return result;
  const spec = s.specs[s.kind];
  const { ts, vw, groundY } = ctx;
  const vh = sizeBasis(vw, ctx.vh);
  const elapsed = (ts - s.phaseAt) / s.durationScale;
  const chickenBottom = ctx.chickenCy + ctx.chickenH / 2;
  s.lastTs = ts;
  const pounceGrab = spec.mode === 'grab' && spec.catchOnSwipe === null;

  if (s.phase === 'enter') {
    if (!s.enterSoundDone) {
      s.enterSoundDone = true;
      result.sound = spec.sounds.enter;
    }
    const t = clamp(elapsed / spec.enterMs, 0, 1);
    const start = s.dir === 1 ? -sizeFor(spec, 'walk', vh).w * SPAWN_OFFSET_FRAC : vw + sizeFor(spec, 'walk', vh).w * SPAWN_OFFSET_FRAC;
    s.pos.x = start + (s.standX - start) * easeOut(t);
    s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
    if (spec.clearsChicken && !pounceGrab) result.clearY = reachTopFor(spec, vh, groundY) - CLEARANCE_PX;
    if (t >= 1) {
      if (spec.stalkMs > 0 && elapsed < spec.enterMs + spec.stalkMs) {
        setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
      } else {
        setPhase(s, 'act', ts);
        s.swipeAt = ts;
        s.swipeFrom = { ...s.pos };
        s.nextStrikeAt = ts + HYDRA_STRIKE_EVERY_MS / 2;
        if (pounceGrab) result.sound = spec.sounds.act;
        if (!pounceGrab) setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
      }
    }
  } else if (s.phase === 'act' && pounceGrab) {
    const t = clamp(elapsed / spec.pounceMs, 0, 1);
    setPose(s, 'pounce', ts);
    const { w, h } = sizeFor(spec, 'hold', vh);
    const targetX = clamp(ctx.chickenCx, w / 2 + EDGE_MARGIN, vw - w / 2 - EDGE_MARGIN);
    const targetY = groundCenterY(spec, 'hold', vh, groundY);
    s.pos.x = s.swipeFrom.x + (targetX - s.swipeFrom.x) * easeInOut(t);
    s.pos.y = s.swipeFrom.y + (targetY - s.swipeFrom.y) * easeInOut(t) - Math.sin(t * Math.PI) * h * 0.5;
    s.dir = targetX >= s.pos.x ? 1 : -1;
    if (t >= 1) {
      setPhase(s, 'hold', ts);
      setPose(s, 'hold', ts);
      s.holdEndsAt = ts + s.holdMs;
      s.nextFeatherAt = ts;
      result.grabbed = true;
    }
  } else if (s.phase === 'hold') {
    s.pos.y = groundCenterY(spec, 'hold', vh, groundY);
    result.hold = holdPoint(spec, s, vh);
    if (spec.pecksPerS > 0 && !s.tamed) {
      s.peckAcc += (spec.pecksPerS * ctx.dtMs) / 1000;
      const pecks = Math.floor(s.peckAcc);
      if (pecks > 0) {
        s.peckAcc -= pecks;
        result.chips = pecks;
        for (let i = 0; i < pecks; i++) tapCreatureTarget(s, spec.targets[0].id);
      }
    }
    if (s.tamed) {
      setPhase(s, 'sit', ts);
      setPose(s, 'sit', ts);
      s.feathers = [];
      result.released = true;
      result.drop = rollDrop(s, spec, result.hold, ctx.rng);
      result.hold = null;
    } else if (ts >= s.holdEndsAt) {
      const drop = spec.targets.length ? null : rollDrop(s, spec, result.hold, ctx.rng);
      beginLeave(s, ts, vw, 'pounce');
      result.released = true;
      result.drop = drop;
    }
  } else if (s.phase === 'act' && spec.mode === 'bite') {
    tickHydra(spec, s, ctx, vh, result);
  } else if (s.phase === 'act') {
    const actMs = Math.max(spec.pounceMs, s.stayMs - spec.enterMs - spec.leaveMs);
    const { h } = sizeFor(spec, 'pounce', vh);
    const since = (ts - s.swipeAt) / s.durationScale;
    const swipesLeft = spec.maxSwipes === null || s.misses < spec.maxSwipes;
    if (!s.swiping && swipesLeft && since >= SWIPE_EVERY_MS && elapsed + spec.pounceMs < actMs) {
      s.swiping = true;
      s.swipeAt = ts;
      s.swipeFrom = { ...s.pos };
      s.misses += 1;
      s.caught = spec.catchOnSwipe !== null && s.misses >= spec.catchOnSwipe;
      result.flyUp = !s.caught;
      if (s.caught) result.sound = spec.sounds.act;
      setPose(s, 'pounce', ts);
    }
    if (s.swiping) {
      const t = clamp((ts - s.swipeAt) / (spec.pounceMs * s.durationScale), 0, 1);
      const base = groundCenterY(spec, 'pounce', vh, groundY);
      s.pos.y = base - Math.sin(t * Math.PI) * h * spec.swipeLift;
      if (s.caught) {
        const { w } = sizeFor(spec, 'hold', vh);
        const targetX = clamp(ctx.chickenCx, w / 2 + EDGE_MARGIN, vw - w / 2 - EDGE_MARGIN);
        s.pos.x = s.swipeFrom.x + (targetX - s.swipeFrom.x) * easeInOut(t);
      }
      if (t >= 1) {
        s.swiping = false;
        s.swipeAt = ts;
        if (s.caught) {
          setPhase(s, 'hold', ts);
          setPose(s, 'hold', ts);
          s.holdEndsAt = ts + s.holdMs;
          s.nextFeatherAt = ts;
          result.grabbed = true;
        } else {
          setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
        }
      }
    } else if (spec.chase) {
      s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
      const dx = ctx.chickenCx - s.pos.x;
      const step = Math.min(Math.abs(dx), CHASE_SPEED * ctx.dtMs);
      s.pos.x += Math.sign(dx) * step;
      if (Math.abs(dx) > ctx.chickenW) s.dir = dx >= 0 ? 1 : -1;
    } else {
      s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
    }
    if (spec.clearsChicken) result.clearY = reachTopFor(spec, vh, groundY) - CLEARANCE_PX;
    if (s.swiping && !s.caught) s.minClearance = Math.min(s.minClearance, reachTopFor(spec, vh, groundY) - chickenBottom);
    if (s.phase === 'act' && s.tamed) {
      setPhase(s, 'sit', ts);
      setPose(s, 'sit', ts);
      s.swiping = false;
      const box = currentBox(spec, s, vh);
      const head = headRect(spec, s, box, s.dir !== poseAsset(spec, s.pose).faces);
      result.drop = rollDrop(s, spec, { x: head.x + head.w / 2, y: head.y + head.h / 2 }, ctx.rng);
    } else if (s.phase === 'act' && elapsed >= actMs) {
      beginLeave(s, ts, vw, 'walk');
    }
  } else if (s.phase === 'sit') {
    s.pos.y = groundCenterY(spec, 'sit', vh, groundY) + (spec.holdAtHead ? sizeFor(spec, 'sit', vh).h * SLEEP_SINK_FRAC : 0);
    if (elapsed >= SIT_MS * (spec.holdAtHead ? 2 : 1)) {
      beginLeave(s, ts, vw, 'walk');
    }
  } else if (s.phase === 'leave') {
    const { w } = sizeFor(spec, s.pose, vh);
    const exitX = nearestExitX(s, w, vw);
    const t = clamp(elapsed / (spec.leaveMs / LEAVE_SPEED_BOOST), 0, 1);
    s.pos.x = s.swipeFrom.x + (exitX - s.swipeFrom.x) * t;
    s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
    if (spec.mode === 'bite') {
      const neck = hydraNeck(spec, s, vh);
      s.heads.forEach((head, slot) => {
        if (head.state === 'empty') return;
        const fade = clamp((ts - head.at) / HYDRA_RECOIL_MS, 0, 1);
        const rest = hydraRest(neck, slot, sizeFor(spec, 'walk', vh).w, sizeFor(spec, 'walk', vh).h, ts);
        head.pos = { x: rest.x + (neck.x - rest.x) * fade, y: rest.y + (neck.y - rest.y) * fade };
      });
    }
    if (t >= 1) {
      setPhase(s, 'done', ts);
      s.leftAt = ts;
      result.done = true;
    }
  }

  render(spec, s, els, ctx);
  tickFeathers(s, els, ctx, result.hold);
  return result;
}

function reachTopFor(spec: CreatureSpec, vh: number, groundY: number): number {
  const { h } = sizeFor(spec, 'pounce', vh);
  return groundCenterY(spec, 'pounce', vh, groundY) - h / 2 - h * POUNCE_LIFT_FRAC;
}

function currentBox(spec: CreatureSpec, s: CreatureState, vh: number): Rect {
  const { w, h } = sizeFor(spec, s.pose, vh);
  return { x: s.pos.x - w / 2, y: s.pos.y - h / 2, w, h };
}

function walkBob(s: CreatureState, ts: number): number {
  const moving = s.phase === 'enter' || s.phase === 'leave' || (s.phase === 'act' && !s.swiping);
  return moving && s.pose !== 'stalk' ? Math.abs(Math.sin(ts / WALK_BOB_MS)) * WALK_BOB_PX : 0;
}

function targetRect(spec: CreatureSpec, s: CreatureState, box: Rect, flipped: boolean, id: string): Rect {
  const rel = poseAsset(spec, s.pose).extraHeads?.[id];
  if (!rel) return headRect(spec, s, box, flipped);
  const relX = flipped ? 1 - rel.x - rel.w : rel.x;
  return { x: box.x + relX * box.w, y: box.y + rel.y * box.h, w: rel.w * box.w, h: rel.h * box.h };
}

function hintSpot(anchor: Rect, w: number, hh: number, vw: number): Point {
  const zone = hudZone(vw);
  const cx = anchor.x + anchor.w / 2;
  const candidates: Point[] = [
    { x: cx - w / 2, y: anchor.y - hh - HINT_GAP_PX },
    { x: anchor.x + anchor.w + HINT_GAP_PX, y: anchor.y + anchor.h / 2 - hh / 2 },
    { x: anchor.x - w - HINT_GAP_PX, y: anchor.y + anchor.h / 2 - hh / 2 },
    { x: cx - w / 2, y: anchor.y + anchor.h + HINT_GAP_PX },
  ];
  for (const c of candidates) {
    const onScreen = c.x >= HINT_EDGE_PAD && c.x + w <= vw - HINT_EDGE_PAD && c.y >= HINT_EDGE_PAD;
    const push = hudPushOut(zone, c.x + w / 2, c.y + hh / 2, w / 2, hh / 2);
    if (onScreen && push.dx === 0 && push.dy === 0) return c;
  }
  const c = candidates[0];
  const x0 = clamp(c.x, HINT_EDGE_PAD, vw - w - HINT_EDGE_PAD);
  const y0 = Math.max(HINT_EDGE_PAD, c.y);
  const push = hudPushOut(zone, x0 + w / 2, y0 + hh / 2, w / 2, hh / 2);
  return { x: clamp(x0 + push.dx, HINT_EDGE_PAD, vw - w - HINT_EDGE_PAD), y: push.dy < 0 ? zone.bottom + HINT_GAP_PX : Math.max(HINT_EDGE_PAD, y0 + push.dy) };
}

function showHint(el: HTMLDivElement, text: string, anchor: Rect, vw: number): void {
  el.textContent = text;
  const w = el.offsetWidth || 160;
  const hh = el.offsetHeight || 28;
  const spot = hintSpot(anchor, w, hh, vw);
  el.style.visibility = 'visible';
  el.style.transform = `translate3d(${spot.x}px, ${spot.y}px, 0)`;
}

function renderHydraHeads(spec: CreatureSpec, s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx, vh: number): void {
  const { w: bodyW, h: bodyH } = sizeFor(spec, 'walk', vh);
  const neck = hydraNeck(spec, s, vh);
  const headH = bodyH * HYDRA_HEAD_FRAC;
  const headFile = `${ASSET_BASE}/snake-head.webp`;
  const span = HYDRA_HEAD_PIVOT - HYDRA_NECK_ROOT;
  s.heads.forEach((head, slot) => {
    const el = els.heads[slot];
    if (!el) return;
    const live = head.state !== 'empty' && head.state !== 'gone' && s.phase !== 'done';
    if (!live) {
      hide(el.img);
      hide(el.hit);
      return;
    }
    const anchor = hydraAnchor(neck, slot, bodyW, bodyH);
    const dx = head.pos.x - anchor.x;
    const dy = head.pos.y - anchor.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spriteW = clamp(dist / span, headH * HYDRA_SPRITE_MIN_ASPECT, headH * HYDRA_SPRITE_MAX_ASPECT);
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const faceLeft = dx < 0;
    const fade = head.state === 'knocked' ? 1 - clamp((ctx.ts - head.at) / HYDRA_RECOIL_MS, 0, 1) : clamp((ctx.ts - head.at) / XFADE_MS, 0.35, 1);
    const jaw = { x: anchor.x + (dx / dist) * spriteW * span, y: anchor.y + (dy / dist) * spriteW * span };
    if (el.img) {
      if (el.img.getAttribute('src') !== headFile) el.img.src = headFile;
      el.img.style.opacity = String(fade);
      el.img.style.transformOrigin = `${spriteW * HYDRA_NECK_ROOT}px 50%`;
      place(el.img, { x: anchor.x - spriteW * HYDRA_NECK_ROOT, y: anchor.y - headH / 2, w: spriteW, h: headH }, `rotate(${deg}deg) ${faceLeft ? 'scaleY(-1)' : ''}`);
      el.img.dataset.state = head.state;
    }
    if (el.hit) {
      if (head.state === 'knocked') hide(el.hit);
      else place(el.hit, hitRect({ x: jaw.x - headH * 0.7, y: jaw.y - headH / 2, w: headH * 1.4, h: headH }));
      el.hit.dataset.clicks = String(head.clicks);
      el.hit.dataset.state = head.state;
    }
  });
}

function render(spec: CreatureSpec, s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx): void {
  const { ts, vw } = ctx;
  const vh = sizeBasis(vw, ctx.vh);
  const box = currentBox(spec, s, vh);
  const asset = poseAsset(spec, s.pose);
  const flipped = s.dir !== asset.faces;
  const bob = walkBob(s, ts);
  const squash = s.pose === 'stalk' && s.phase === 'enter' ? STALK_SQUASH : 1;
  const wobble = s.phase === 'hold' ? Math.sin(ts / HOLD_WOBBLE_MS) * HOLD_WOBBLE_DEG * 0.3 : 0;
  const transform = `${flipped ? 'scaleX(-1)' : ''} scaleY(${squash}) rotate(${wobble}deg)`;
  const fade = clamp((ts - s.poseAt) / XFADE_MS, 0, 1);
  const cur = els.imgA;
  const prev = els.imgB;
  if (cur) {
    if (cur.getAttribute('src') !== asset.file) cur.src = asset.file;
    const mask = asset.fadeBottom ? CYCLOPS_FADE_MASK : '';
    cur.style.maskImage = mask;
    cur.style.webkitMaskImage = mask;
    cur.style.opacity = String(fade);
    place(cur, { ...box, y: box.y - bob }, transform);
    cur.dataset.pose = s.pose;
  }
  if (prev) {
    if (s.prevPose && fade < 1) {
      const prevAsset = poseAsset(spec, s.prevPose);
      if (prev.getAttribute('src') !== prevAsset.file) prev.src = prevAsset.file;
      const prevSize = sizeFor(spec, s.prevPose, vh);
      place(prev, { x: s.pos.x - prevSize.w / 2, y: s.pos.y - prevSize.h / 2 - bob, w: prevSize.w, h: prevSize.h }, `${s.dir !== prevAsset.faces ? 'scaleX(-1)' : ''}`);
      prev.style.opacity = String(1 - fade);
    } else {
      hide(prev);
    }
  }
  if (els.front) {
    if (s.phase === 'hold' && fade >= 1) {
      if (els.front.getAttribute('src') !== asset.file) els.front.src = asset.file;
      place(els.front, box, transform);
    } else {
      hide(els.front);
    }
  }
  if (els.shadow) {
    const lift = groundCenterY(spec, s.pose, vh, ctx.groundY) - s.pos.y;
    const strength = clamp(1 - lift / box.h, SHADOW_MIN_STRENGTH, 1);
    const sw = box.w * SHADOW_W_FRAC * strength;
    const sh = box.h * SHADOW_H_FRAC * strength;
    els.shadow.style.opacity = String(SHADOW_MAX_OPACITY * strength);
    place(els.shadow, { x: s.pos.x - sw / 2, y: ctx.groundY - sh / 2, w: sw, h: sh });
  }
  if (els.body) {
    if (spec.bodyTarget && s.phase === 'hold') place(els.body, hitRect(box));
    else hide(els.body);
  }
  if (els.eye && asset.eye) {
    const eyeRel = asset.eye;
    const relX = flipped ? 1 - eyeRel.x - eyeRel.w : eyeRel.x;
    const eye = { x: box.x + relX * box.w, y: box.y + eyeRel.y * box.h, w: eyeRel.w * box.w, h: eyeRel.h * box.h };
    const size = Math.min(eye.w, eye.h) * CYCLOPS_PUPIL_FRAC;
    const cx = eye.x + eye.w / 2;
    const cy = eye.y + eye.h / 2;
    const dx = ctx.chickenCx - cx;
    const dy = ctx.chickenCy - cy;
    const d = Math.hypot(dx, dy) || 1;
    const travel = Math.min(1, d / (vw / 2)) * CYCLOPS_PUPIL_TRAVEL;
    const px = cx + (dx / d) * eye.w * travel - size / 2;
    const py = cy + (dy / d) * eye.h * travel - size / 2;
    const visible = s.phase !== 'done' && fade >= 1;
    if (visible) place(els.eye, { x: px, y: py, w: size, h: size });
    else hide(els.eye);
  } else if (els.eye) {
    hide(els.eye);
  }
  const activeTargets = spec.targets.filter((t) => targetActive(spec, s, t.id));
  for (const target of spec.targets) {
    const el = els.targets[target.id];
    if (!el) continue;
    if (!activeTargets.includes(target)) {
      hide(el);
      continue;
    }
    const head = hitRect(targetRect(spec, s, box, flipped, target.id));
    place(el, head);
    el.dataset.clicks = String(s.targetHits[target.id] ?? 0);
  }
  if (spec.mode === 'bite') renderHydraHeads(spec, s, els, ctx, vh);
  if (s.kind === 'tree') renderTree(spec, s, els, ctx, vh, box);
  if (els.hint) {
    const target = activeTargets[0];
    const hintDue = ts - s.phaseAt >= CREATURE_HINT_DELAY_MS;
    if (s.swordIn && s.phase !== 'leave' && hintDue) {
      showHint(els.hint, `pull the sword ${s.swordPulls} / ${SWORD_PULLS}`, swordPose(spec, s, vh).hit, vw);
    } else if (spec.mode === 'bite' && s.phase === 'act' && hintDue) {
      const biting = s.bitingHead === null ? null : s.heads[s.bitingHead];
      const anchor = biting ? { x: biting.pos.x - MIN_HIT_PX / 2, y: biting.pos.y - MIN_HIT_PX / 2, w: MIN_HIT_PX, h: MIN_HIT_PX } : headRect(spec, s, box, flipped);
      showHint(els.hint, `heads knocked back ${s.knockbacks} / ${HYDRA_KNOCKBACKS_TO_WIN}`, anchor, vw);
    } else if (target && hintDue) {
      showHint(els.hint, `click the ${target.label} ${s.targetHits[target.id] ?? 0} / ${scaledClicks(target.clicks, s.clickScale)}`, targetRect(spec, s, box, flipped, target.id), vw);
    } else {
      hide(els.hint);
    }
  }
  if (els.banner) {
    const show = s.phase === 'hold' || (spec.mode !== 'grab' && (s.phase === 'act' || s.phase === 'enter')) || (spec.catchOnSwipe !== null && s.phase === 'act');
    els.banner.style.opacity = show && s.banners ? '1' : '0';
    const biting = spec.mode === 'bite' && s.bitingHead !== null;
    els.banner.textContent = s.tamed ? (s.kind === 'tree' ? 'the tree lets go' : `the ${spec.label} is ${spec.holdAtHead ? 'asleep' : 'tamed'}`) : biting ? 'a hydra head has the chicken! knock that head back' : spec.banner;
  }
  if (els.root) {
    els.root.dataset.phase = s.phase;
    els.root.dataset.pose = s.pose;
    els.root.dataset.misses = String(s.misses);
    els.root.dataset.tamed = s.tamed ? '1' : '0';
    els.root.dataset.heads = String(hydraHeadsAlive(s));
    els.root.dataset.knockbacks = String(s.knockbacks);
    els.root.dataset.biting = s.bitingHead === null ? '0' : '1';
  }
}

export function creatureStateView(s: CreatureState) {
  return {
    kind: s.kind,
    phase: s.phase,
    pending: s.pending,
    holdMs: s.holdMs,
    stayMs: s.stayMs,
    misses: s.misses,
    minClearance: Number.isFinite(s.minClearance) ? s.minClearance : null,
    bodyClicks: s.bodyClicks,
    targetClicks: s.targetClicks,
    targetHits: { ...s.targetHits },
    headsAlive: hydraHeadsAlive(s),
    knockbacks: s.knockbacks,
    biting: s.bitingHead,
    tamed: s.tamed,
    dropped: s.dropped,
    enteredAt: s.enteredAt,
    leftAt: s.leftAt,
    x: s.pos.x,
    y: s.pos.y,
    swordIn: s.swordIn,
    swordPulls: s.swordPulls,
    speed: 1 / s.durationScale,
    hp: s.kind === 'tree' ? Math.max(0, scaledClicks(TREE_HP, s.clickScale) - (s.targetHits[TREE_BARK_ID] ?? 0)) : null,
  };
}

const LAYER = 'pointer-events-none absolute top-0 left-0 max-w-none select-none object-contain will-change-transform [visibility:hidden]';
const IMG_STYLE: CSSProperties = { transformOrigin: '50% 50%' };
const HIT = 'absolute top-0 left-0 z-[10] cursor-pointer will-change-transform [visibility:hidden]';
const HIT_TOP = 'absolute top-0 left-0 z-[11] cursor-pointer will-change-transform [visibility:hidden]';
const FEATHER_SLOT_INDEXES = Array.from({ length: FEATHER_SLOTS }, (_, i) => i);
const HYDRA_SLOT_INDEXES = Array.from({ length: HYDRA_HEADS_MAX }, (_, i) => i);

interface CreatureLayerProps {
  kind: CreatureKind;
  els: RefObject<CreatureEls>;
  onBody: (x: number, y: number) => void;
  onTarget: (id: string, x: number, y: number) => void;
}

export function CreatureLayer({ kind, els, onBody, onTarget }: CreatureLayerProps) {
  const spec = CREATURE_SPECS[kind];
  const bind = <K extends 'root' | 'imgA' | 'imgB' | 'front' | 'shadow' | 'body' | 'hint' | 'banner' | 'eye'>(key: K) => (el: CreatureEls[K]) => {
    els.current[key] = el;
  };
  const hasEye = Object.values(spec.poses).some((p) => p.eye !== undefined);
  return (
    <div ref={bind('root')} data-testid="creature-root" data-kind={kind} data-mode={spec.mode} data-phase="idle" data-misses="0" data-tamed="0" data-heads="0" data-knockbacks="0" data-biting="0" className="contents">
      <div ref={bind('shadow')} data-testid="creature-shadow" className="pointer-events-none absolute top-0 left-0 z-[3] rounded-[50%] bg-black/60 blur-[6px] will-change-transform [visibility:hidden]" />
      <img ref={bind('imgB')} alt="" draggable={false} data-testid="creature-prev" className={`${LAYER} z-[8]`} style={IMG_STYLE} />
      <img ref={bind('imgA')} alt="" draggable={false} data-testid="creature-img" className={`${LAYER} z-[8] drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]`} style={IMG_STYLE} />
      {spec.bodyTarget && (
        <img ref={bind('front')} alt="" draggable={false} data-testid="creature-front" className={`${LAYER} z-[10]`} style={{ ...IMG_STYLE, clipPath: PAW_FRONT_CLIP }} />
      )}
      {spec.bodyTarget && <div ref={bind('body')} data-testid="creature-body" className={HIT} onClick={(e) => onBody(e.clientX, e.clientY)} />}
      {hasEye && (
        <div
          ref={bind('eye')}
          data-testid="creature-eye"
          className="pointer-events-none absolute top-0 left-0 z-[9] rounded-full bg-[radial-gradient(circle_at_35%_35%,#5a3a1a_0_18%,#120a04_45%,#000_100%)] shadow-[0_0_6px_rgba(0,0,0,0.6)] will-change-transform [visibility:hidden]"
        />
      )}
      {spec.mode === 'bite' &&
        HYDRA_SLOT_INDEXES.map((i) => (
          <div key={i} className="contents">
            <img
              ref={(el) => {
                els.current.heads[i].img = el;
              }}
              alt=""
              draggable={false}
              data-testid="hydra-head"
              className={`${LAYER} z-[9] drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]`}
            />
            <div
              ref={(el) => {
                els.current.heads[i].hit = el;
              }}
              data-testid={`creature-target-${hydraTargetId(i)}`}
              data-clicks="0"
              className={`${HIT} rounded-full`}
              onClick={(e) => onTarget(nearestTarget(els.current, e.clientX, e.clientY, hydraTargetId(i)), e.clientX, e.clientY)}
            />
          </div>
        ))}
      {kind === 'tree' && (
        <>
          <img
            ref={(el) => {
              els.current.sword = el;
            }}
            alt=""
            draggable={false}
            src={TREE_SWORD_IMG}
            data-testid="tree-sword"
            className={`${LAYER} z-[9] drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)]`}
            style={IMG_STYLE}
          />
          <div
            ref={(el) => {
              els.current.swordSlit = el;
            }}
            data-testid="tree-sword-slit"
            className={`${LAYER} z-[9] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_50%,rgba(0,0,0,0.92),rgba(20,10,4,0.75)_55%,transparent_100%)]`}
            style={IMG_STYLE}
          />
          <div
            ref={(el) => {
              els.current.swordHit = el;
            }}
            data-testid="creature-target-sword"
            data-clicks="0"
            className={`${HIT_TOP} rounded-full`}
            onClick={(e) => onTarget(TREE_SWORD_ID, e.clientX, e.clientY)}
          />
          <div
            ref={(el) => {
              els.current.hp = el;
            }}
            data-testid="tree-hp"
            data-hp={TREE_HP}
            className="pointer-events-none absolute top-0 left-0 z-30 overflow-hidden rounded-full border border-black/60 bg-black/55 [visibility:hidden]"
          >
            <div
              ref={(el) => {
                els.current.hpFill = el;
              }}
              className="h-full w-full bg-[linear-gradient(90deg,#7bd36b,#c9a24a_60%,#d2553c)] transition-[width] duration-150"
            />
          </div>
        </>
      )}
      {spec.targets.map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            els.current.targets[t.id] = el;
          }}
          data-testid={`creature-target-${t.id}`}
          data-clicks="0"
          className={`${HIT} rounded-full`}
          onClick={(e) => onTarget(nearestTarget(els.current, e.clientX, e.clientY, t.id), e.clientX, e.clientY)}
        />
      ))}
      <div
        ref={bind('hint')}
        data-testid="creature-hint"
        className="pointer-events-none absolute top-0 left-0 z-30 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-[#ffd84d] [visibility:hidden] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]"
      />
      <div
        ref={bind('banner')}
        data-testid="creature-banner"
        className="pointer-events-none absolute top-[150px] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold tracking-wide text-white opacity-0 transition-opacity duration-300"
      />
      {FEATHER_SLOT_INDEXES.map((i) => (
        <div
          key={i}
          ref={(el) => {
            els.current.feathers[i] = el;
          }}
          data-testid="creature-feather"
          className="pointer-events-none absolute top-0 left-0 z-[11] h-5 w-2.5 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.35)] [visibility:hidden]"
        />
      ))}
    </div>
  );
}
