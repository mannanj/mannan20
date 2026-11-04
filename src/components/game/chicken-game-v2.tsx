'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChickenSvg } from './chicken-svg';
import { HoldTossHud } from './hold-toss-hud';
import { GameScenery } from './game-scenery';
import { EscapeScenery } from './escape-scenery';
import { orbFont } from './orb-font';
import { EscapeGiggle, EscapeVehicleBack, EscapeVehicleFront, ParkedRocket, type StagePhase } from './escape-vehicle';
import { BackgroundRocket, DetachedPlane, Explosion } from './escape-sequence-visuals';
import {
  APPROACH_MS,
  APPROACH_SWAY_CYCLES,
  APPROACH_SWAY_PX,
  BOARDING_MS,
  BOARD_CHICKEN_SCALE,
  BOARD_INSIDE_SCALE,
  CANVAS_FADE_OUT_MS,
  CLIMB_END_MS,
  CLIMB_START_MS,
  DRIFT_MS,
  EXPLODE_CLICKS,
  EXPLODE_FALLBACK_MS,
  EXPLODE_MS,
  EXPLODE_SCALE,
  FLIGHT_MS,
  FLIGHT_SKIP_MS,
  GATE_COUNT_FROM,
  GATE_COUNT_TICK_MS,
  FLIGHT_PX_PER_MS,
  PLANE_HALF_W,
  FLIGHT_SWAY_ROT,
  FLIGHT_SWAY_X,
  FLIGHT_SWAY_Y,
  FLIGHT_TARGET_X_FRAC,
  FLIGHT_TARGET_Y_FRAC,
  INSIDE_FADE_MS,
  LIFTOFF_HOLD_MS,
  LIFTOFF_RISE_MS,
  LIFTOFF_SHAKE_PX,
  PLANE_BODY_SCALE,
  PLANE_EXIT_MS,
  PLANE_EXIT_SCALE,
  PUSH_DECAY_PER_MS,
  PUSH_PX_PER_MS,
  PUSH_RADIUS,
  ROCKET_BG_MAX_SCALE,
  ROCKET_BG_X_FRAC,
  ROCKET_BG_Y_FRAC,
  ROCKET_DOOR_OFFSET_Y,
  createFlight,
  doorOpenAt,
  driftSpeedScale,
  rocketLook,
  smooth01,
  stepFlight,
  type FlightKind,
  type PlaneFlight,
  type RocketSeq,
  PILOT_SPEED_SCALE,
  PILOT_TELEPORT_AFTER_MS,
  PILOT_TELEPORT_MIN_DIST_FRAC,
  PILOT_TELEPORT_OUT_MS,
} from './escape-sequence';
import { playBoom } from './escape-boom';
import dynamic from 'next/dynamic';
import { hudZone, keepOutOfHud } from './hud-safe-zone';
import { SpaceGate, type SpaceGateState } from './space-gate';
import { getSpaceProgress, startSpacePreload } from './space-preload';
import {
  GOGGLE_PHASE_FRAC,
  MOON_DESCENT_FRAC,
  ROCKET_LEG_BOTTOM,
  ROCKET_MIN_SCALE,
  SURF_BOARD_BOTTOM,
  SURF_PULL,
  SURF_TILT,
  drawSurf,
  introMsFor,
  COSMOS_FORCE_SCORE,
  LIFTOFF_MS,
  cosmosProgress,
  isSpaceStage,
  stageForScore,
  stageRank,
  surfSlopeDeg,
  surfSurfaceY,
  type EscapeStage,
} from './escape-stages';
import { MartianLayer, type MartianSpot } from './martian-layer';
import {
  MARTIAN_ITEM_ID,
  MARTIAN_SKIN_ID,
  MARTIAN_KINDS,
  readMartianClicks,
  spawnMartianNow,
  type MartianKind,
} from './martians';
import { LeaderboardPanel } from './leaderboard-panel';
import { SoundLoader } from './sound-loader';
import {
  addPool,
  drawDrops,
  drawPools,
  makeDrop,
  makePool,
  updateDrop,
  drawFeather,
  drawBlackHoles,
  drawPortals,
  drawStreaks,
  makeFeather,
  makeTeleportStreaks,
  updateFeather,
  type BlackHole,
  type Feather,
  type Pool,
  type Portal,
  type PortalSide,
  type RainbowDrop,
  type Streak,
} from './chicken-effects';
import {
  BLACK_HOLE_LIFE_MS,
  BLACK_HOLE_RADIUS,
  CLONE_DRIFT_SPEED,
  CLONE_SPAWN_SPREAD,
  CURSOR_BUFF_MS,
  CURSOR_EXTEND_PER_CLICK_MS,
  CURSOR_HAND_HOT_X,
  CURSOR_HAND_HOT_Y,
  CURSOR_HAND_SIZE,
  MAX_CHICKENS_ON_SCREEN,
  MULTIPLY_BLINK_START_MS,
  MULTIPLY_DURATION_MS,
  MULTIPLY_FACTOR,
  MULTIPLY_VANISH_EARLIEST_MS,
  ORB_COLLECT_SHARDS,
  ORB_DRIFT_SPEED,
  ORB_FADE_MS,
  ORB_LABELS,
  ORB_LIFETIME_MS,
  ORB_RADIUS,
  ORB_LABEL_PX,
  ORB_SHARD_COLORS,
  ORB_SPAWN_MARGIN,
  ORB_THRESHOLDS,
  ORB_WOBBLE_AMPLITUDE,
  ORB_WOBBLE_FREQUENCY,
  VANISH_FEATHERS,
  buildCursorOffsets,
  crossedOrbs,
  pointInCircle,
  pointInRect,
  type CursorOffset,
  type OrbKind,
} from './chicken-orbs';
import {
  CATCHUP_CHECK_MS,
  CATCHUP_COOLDOWN_MS,
  FRENZY_BLINK_MS,
  FRENZY_CAP_MS,
  FRENZY_DURATION_MS,
  FRENZY_EXTEND_PER_CLICK_MS,
  FRENZY_FACTOR,
  PACE_END_SCORE,
  behindFraction,
  catchUpKind,
  paceTarget,
  talonWeightFor,
} from './chicken-pacing';
import {
  BANDAID_HP,
  CHICK_H,
  CHICK_W,
  FORCED_TOSS_VX,
  FORCED_TOSS_VY,
  FORCE_REFORM_BOOST,
  FRAME_MS,
  FREE_AVOID_FORCE,
  FREE_AVOID_RADIUS,
  FREE_FLAP_MS,
  FREE_ROT_DAMP,
  FREE_ROT_SPRING,
  FREE_STEER,
  FREE_TURN_MIN_MS,
  FREE_TURN_SPREAD_MS,
  FRESH_PROTECT_MS,
  HELD_FLAP_MS,
  HOLD_GRACE_MS,
  HOLD_HUD_DELAY_MS,
  HOLD_MS,
  HOLD_SLACK_PX,
  LEVEL_FREE_SPEED,
  LEVEL_SCALE,
  MAX_DROPS,
  MAX_SPLIT_LEVEL,
  MERGE_PROXIMITY,
  MIN_HIT_PX,
  POINTER_EMA,
  POOL_LIFE_MS,
  RAG_FOLLOW,
  RAG_STRETCH_MAX,
  RAG_STRETCH_PER_SPEED,
  RAINBOW_DROP_BURST,
  RAINBOW_DROP_SEEP,
  RAINBOW_LEAK_INTERVAL_MS,
  RAINBOW_LEAK_MS,
  RAD_TO_DEG,
  REGROUP_RETRY_MS,
  REJOIN_DELAY_MS,
  RETURN_SPEED,
  SCATTER_MS,
  SCATTER_SPEED_JITTER,
  SCATTER_SPEED_MIN,
  SCATTER_SPEED_SPREAD,
  SPLIT_COUNT,
  SQUASH_DECAY,
  TOSS_SPIN_FROM_VX,
  TOSS_SPIN_RANDOM,
  TOSS_SPLIT_FALLBACK_MS,
  TOSS_SPLIT_IMPACT_MIN,
  chickSize,
  clamp,
  groupCentroid,
  heldDriftFor,
  hitPadFor,
  mergeDelayFor,
  ragdollStep,
  splitFan,
  tossStep,
  tossVelocity,
  type ChickGroup,
  type ChickMotion,
  type HoldState,
  type SplitLevel,
  type Wound,
} from './chicken-split';
import { BURN_SPOT, DEFAULT_SKIN_ID, SKINS, SKIN_STORAGE_KEY, UNLOCKABLE_SKINS, readCharSpots, readUnlockedSkins, recordChar, skinById, skinMultiplier, unlockSkin, type CharSpot } from './chicken-skins';
import {
  BIRD_SPECS,
  BirdLayer,
  REGROW_MS,
  TOASTED_MAX,
  collectToasted,
  nextBird,
  queueBird,
  queueBirdsForScore,
  type HeatLevel,
  birdStateView,
  createBirdEls,
  createBirdState,
  isBirdBusy,
  isGripping,
  noteCalmClick,
  shiftBirdTime,
  startBird,
  takeFeather,
  tapRecedingBird,
  tapTalon,
  tickBird,
  type BirdKind,
  type BirdSnapshot,
  type HudRect,
  type TalonSide,
} from './bird-event';
import { useChickenSounds } from '@/hooks/use-chicken-sounds';
import { AppProvider } from '@/context/app-context';
import { InventoryBag, InventoryProvider, isGameItemId, useInventory, type GameItemId, type InventoryItem } from '@/components/inventory';
import {
  FINAL_TIER,
  MERCY_DELAY_MS,
  MERCY_FLOOR,
  MERCY_FOLLOW_PER_MS,
  MERCY_RAMP_MS,
  MERCY_RECOVERY_PER_MS,
  TIERS,
  mixHex,
  moodEyes,
  morphForScore,
  tierForScore,
  tierProgress,
} from './chicken-tiers';

const BASE_SPEED = 0.125;
const MIN_SPEED = 0.075;
const AVOIDANCE_RADIUS = 110;
const AVOIDANCE_STRENGTH = 0.08;
const HEAT_PER_CLICK = 0.22;
const HEAT_DECAY_PER_MS = 0.0006;
const HEAT_MAX = 1.4;
const EVOLUTION_HEAT = 0.4;
const FLAP_AGITATION = 0.85;
const FLAP_SPEED_FLOOR = 0.6;
const ROTATION_SPRING = 0.02;
const ROTATION_DAMP = 0.16;
const MAX_BANK = 10;
const BANK_LERP = 0.08;
const SPIN_BOUNCE_CHANCE = 0.25;
const SPIN_BOUNCE_STRENGTH = 13;
const FACING_DEADZONE = 0.25;
const FLAP_BASE_MS = 470;
const FLAP_MIN_MS = 150;
const FLAP_MAX_MS = 680;
const FLAP_QUANTIZE_MS = 20;
const WOBBLE_AMPLITUDE = 3;
const WOBBLE_FREQUENCY = 0.002;
const BOUNCE_RANDOM = 0.3;
const MAX_DT = 32;
const CHICKEN_W = 70;
const CHICKEN_H = 140;
const PARTICLE_FADE = 0.0008;
const MAX_PARTICLES = 300;
const PARTICLE_EMISSION = 0.5;
const MAX_SHARD_PARTICLES = 90;
const SHARDS_PER_TRANSFORM = 26;
const SHARD_GRAVITY = 0.08;
const SHARD_FADE = 0.014;
const AURA_TONGUES = 20;
const LIGHTNING_START = 15;
const LIGHTNING_FULL = 140;
const LIGHTNING_INTERVAL_RARE = 3200;
const LIGHTNING_INTERVAL_FREQUENT = 480;
const CRACKLE_MIN_GAP_MS = 520;
const LIGHT_BLUE = { r: 95, g: 165, b: 255 };
const LIGHT_RED = { r: 255, g: 70, b: 55 };
const LIGHT_WHITE = { r: 255, g: 245, b: 235 };
const TIER0_AURA_START = 0.55;
const TIER0_AURA_MAX = 0.28;
const ARC_LIFE_MS = 240;
const ARC_SEGMENTS = 7;
const ARC_START_R_MIN = 6;
const ARC_START_R_SPREAD = 6;
const ARC_END_R_MIN = 26;
const ARC_END_R_SPREAD = 18;
const ARCS_PER_BURST_MIN = 3;
const ARCS_PER_BURST_SPREAD = 7;
const MAX_ARCS = 48;
const SCREAM_JITTER = 0.1;
const MERCY_CAPTION_THRESHOLD = 0.7;
const MIN_LOADER_MS = 700;
const LOADER_FADE_MS = 320;
const BRIDGE_LOG_CAP = 600;
const SPEED_SCORE_CAP = 180;
const SPEED_PER_SCORE = 0.011;
const TIER_SPEED_BUMP = [1, 1.12, 1.28, 1.45, 1.65, 1.8];
const GROUND_FRAC = 0.76;
const GROUND_WANDER = 0.028;
const GROUND_TURN_MIN_MS = 2600;
const GROUND_TURN_SPREAD_MS = 3800;
const GROUND_PAUSE_CHANCE = 0.35;
const GROUND_ROT_LERP = 0.1;
const GRAZE_DELAY_MIN_MS = 3800;
const GRAZE_DELAY_SPREAD_MS = 5200;
const GRAZE_DURATION_MIN_MS = 2300;
const GRAZE_DURATION_SPREAD_MS = 3200;
const BEND_ANGLE = 74;
const BEND_PECK_AMPLITUDE = 7;
const BEND_PECK_FREQ = 0.004;
const BEND_LERP = 0.07;
const FEATHERS_PER_CLICK = 2;
const FEATHER_EXTRA_CHANCE = 0.45;
const FEATHERS_PER_TRANSFORM = 10;
const MAX_FEATHERS = 22;
const FEATHER_SPAWN_GAP_MS = 140;
const PARKED_AURA_CLEAR = 190;
const FEATHER_LIFE_CAP_MS = 2600;
const FEATHER_SIZE_CAP = 14;
const AURA_SHIELD_STAGES: EscapeStage[] = ['surf', 'pilot', 'rocket', 'cosmos', 'jupiter'];
const HUD_SCRIM_SEQS: RocketSeq[] = ['explode'];
const ORB_HUD_HALF = 26;
const MARTIAN_AVOID_Y_FRAC = 0.5;
const MARTIAN_AVOID_GAP = 16;
const EXPLOSION_FULL_VW = 760;
const SQUASH_WINDOW_MS = 650;
const SQUASH_BASE = 0.5;
const SQUASH_PER_COMBO = 0.13;
const SQUASH_HEAT = 0.12;
const SQUASH_RELEASE_MS = 95;
const SQUASH_ATTR_CLEAR_MS = 380;
const SQUEAK_THRESHOLD = 0.75;
const HYPER_MIN_SCORE = 30;
const HYPER_DELAY_MIN_MS = 75_000;
const HYPER_DELAY_SPREAD_MS = 150_000;
const HYPER_DURATION_MS = 3000;
const HYPER_MULT_MIN = 10;
const HYPER_MULT_SPREAD = 10;
const HYPER_RECOVER_MS = 3500;
const HYPER_RECOVER_FACTOR = 0.3;
const HYPER_BONUS = 100;
const MAX_FRAME_TRAVEL = 130;
const TELEPORT_MIN_SCORE = 64;
const TELEPORT_DELAY_MIN_MS = 40_000;
const TELEPORT_DELAY_SPREAD_MS = 80_000;
const TELEPORT_OUT_MS = 120;
const TELEPORT_BONUS = 5;
const TELEPORT_BONUS_FRAMES = 5;
const TELEPORT_FRAME_TRACK_MAX = 90;
const TELEPORT_MIN_DIST_FRAC = 0.3;
const TELEPORT_DECOY_CHANCE = 0.4;
const TELEPORT_PRE_CHANCE = 0.5;
const TELEPORT_AFTER_CHANCE = 0.85;
const GHOST_MAX = 8;
const KID_DELAY_MIN_MS = 45_000;
const KID_DELAY_SPREAD_MS = 120_000;
const KID_W = 26;
const KID_H = 52;
const KID_WANDER = 0.04;
const KID_TURN_MIN_MS = 2200;
const KID_TURN_SPREAD_MS = 2600;
const KID_FLEE_MIN = 4.6;
const KID_FLEE_SPREAD = 1.4;
const KID_MAX = 4;
const STOMP_SQUEEZE_CHANCE = 0.1;
const FRANTIC_SQUEEZE_CHANCE = 0.04;
const FRANTIC_DURATION_MS = 720;
const FRANTIC_STEP_MS = 70;
const CEREMONY_COMBO = 8;
const CEREMONY_HEAT = 1.1;
const CEREMONY_COUNT_FROM = 5;
const CEREMONY_TICK_MS = 1000;
const CEREMONY_COOLDOWN_MIN_MS = 45_000;
const CEREMONY_COOLDOWN_SPREAD_MS = 45_000;
const MEGA_SQUEEZE_MS = 1300;
const EDGE_WILD_CHANCE = 0.22;
const EDGE_WRAP_CHANCE = 0.1;
const EDGE_PORTAL_CHANCE = 0.08;
const EDGE_PORTAL_HOT_CHANCE = 0.3;
const PORTAL_HOT_WINDOW_MS = 40_000;
const EDGE_SPECIAL_COOLDOWN_MS = 4000;
const PORTAL_SPLAT_MS = 3520;
const PORTAL_HIDE_MS = 260;
const PORTAL_EDGE_MARGIN = 60;
const JUMP_DELAY_MIN_MS = 7000;
const JUMP_DELAY_SPREAD_MS = 11_000;
const JUMP_CHANCE = 0.6;
const JUMP_KICK = 2.4;
const SCRAMBLE_MIN_SCORE = 10;
const SCRAMBLE_DELAY_MIN_MS = 35_000;
const SCRAMBLE_DELAY_SPREAD_MS = 70_000;
const SCRAMBLE_DURATION_MS = 1700;
const SCRAMBLE_RADIUS = 70;
const SCRAMBLE_DART_MIN_MS = 70;
const SCRAMBLE_DART_SPREAD_MS = 70;
const SCRAMBLE_SPEED = 9;
const CLICK_ACTIVE_WINDOW_MS = 1600;
const EVENT_DEFER_CHANCE = 0.5;
const KID_MERGE_CHANCE = 0.3;
const KID_MERGE_SPEED = 3.4;
const KID_MERGE_DELAY_MIN_MS = 8000;
const KID_MERGE_DELAY_SPREAD_MS = 17_000;
const KID_MERGE_PROXIMITY = 26;
const SIZE_BOOST_PER_MERGE = 0.12;
const SIZE_BOOST_MAX = 0.36;
const SIZE_BOOST_DECAY_MS = 30_000;
const VISIT_MERCY_THRESHOLD = 0.8;
const VISIT_CHANCE = 0.35;
const VISIT_ROLL_MS = 12_000;
const VISIT_COOLDOWN_MIN_MS = 30_000;
const VISIT_COOLDOWN_SPREAD_MS = 30_000;
const VISIT_NEAR_X = 70;
const VISIT_NEAR_Y = 56;
const VISIT_SPEED = 2.2;
const LEADERBOARD_OPEN_GUARD_MS = 900;
const TEXT_SCRIM = '[text-shadow:0_0_2px_rgba(0,0,0,0.65),0_1px_10px_rgba(0,0,0,0.6)]';
const SHEET_SAFE_SELECTOR = '#chicken-leaderboard-panel, [data-testid="chicken-leaderboard-link"], [data-testid="feedback-popup"], [data-testid="inventory-root"]';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
}

interface ShardParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  alpha: number;
  size: number;
  color: string;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Arc {
  points: { x: number; y: number }[];
  born: number;
  color: Rgb;
}

interface Lightning {
  intervalMs: number;
  color: Rgb;
  intensity: number;
}

interface Physics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  bank: number;
}

interface GroundState {
  vxTarget: number;
  nextTurnAt: number;
  nextGrazeAt: number;
  grazeUntil: number;
}

interface HyperState {
  phase: 'idle' | 'burst' | 'recover';
  until: number;
  nextAt: number;
  mult: number;
}

interface TeleportState {
  phase: 'idle' | 'out';
  nextAt: number;
  outUntil: number;
  target: { x: number; y: number } | null;
  origin: { x: number; y: number } | null;
  decoys: boolean;
  forcedDecoys: boolean | null;
  arrivedFrames: number;
}

interface Ghost {
  id: number;
  x: number;
  y: number;
  tier: number;
  morph: number;
  pre: boolean;
  born: number;
}

interface Kid {
  id: number;
  tier: number;
}

interface KidMotion {
  x: number;
  dir: number;
  vx: number;
  fleeing: boolean;
  nextTurnAt: number;
  merging: boolean;
  mergeAt: number;
}

interface Orb {
  id: number;
  kind: OrbKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  phase: number;
}

interface CloneMotion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  big: boolean;
  tier: number;
  vanishAt: number;
  blinking: boolean;
}

interface CloneView {
  id: number;
  big: boolean;
  tier: number;
}

interface OrbView {
  id: number;
  kind: OrbKind;
}

interface OrbSnapshot {
  id: number;
  kind: OrbKind;
  label: string;
  x: number;
  y: number;
}

interface ScrambleState {
  phase: 'idle' | 'running';
  until: number;
  nextAt: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  nextDartAt: number;
}

interface VisitState {
  phase: 'idle' | 'seeking' | 'visiting';
  nextRollAt: number;
  cooldownUntil: number;
  kidId: number;
}

interface CeremonyState {
  phase: 'idle' | 'counting' | 'squeezing';
  value: number;
  nextTickAt: number;
  cooldownUntil: number;
}

interface PortalTransit {
  phase: 'idle' | 'splat' | 'gone';
  until: number;
  exit: { side: PortalSide; x: number; y: number } | null;
  entrySide: PortalSide | null;
  hotUntil: number;
  cooldownUntil: number;
}

export interface SoundEvent {
  type: 'scream' | 'powerup' | 'crackle' | 'squeak' | 'hawk' | 'sizzle';
  key?: string;
  rate?: number;
  synth?: boolean;
  at: number;
}

interface ChickenStateSnapshot {
  score: number;
  tier: number;
  mercy: number;
  morph: number;
  auraLevel: number;
  rotation: number;
  vx: number;
  vy: number;
  mood: string;
  lightning: Lightning | null;
  arcs: number;
  mode: 'ground' | 'flying';
  feathers: number;
  hyper: 'idle' | 'burst' | 'recover';
  ghosts: number;
  teleportFrames: number;
  squash: number;
  kids: number;
  countdown: number | null;
  portal: 'idle' | 'splat' | 'gone';
  sqmode: 'hug' | 'stomp';
  skin: string;
  scramble: 'idle' | 'running';
  visit: 'idle' | 'seeking' | 'visiting';
  sizeBoost: number;
  bend: number;
  stage: EscapeStage;
  stagePhase: StagePhase;
  seq: RocketSeq;
  gate: SpaceGateState;
  pos: { x: number; y: number };
  flightRoll: number;
  scene3dReady: boolean;
  scene3dProgress: number;
  scene3dGate: SpaceGateState;
  orbs: OrbSnapshot[];
  clones: number;
  clonesBlinking: number;
  vanished: number;
  chickens: number;
  cursors: number;
  cursorOffsets: CursorOffset[];
  cursorBuffMs: { x5: number; x3: number };
  frenzyMs: number;
  pilotTeleports: number;
  pace: { target: number; actual: number; behindPct: number; nextCheckIn: number; playMs: number };
  pieces: number;
  splitLevels: number[];
  held: boolean;
  holdProgress: number;
  holdDrift: number;
  bandaid: number | null;
  woundOpen: boolean;
  drops: number;
  pools: number;
  rootSplit: boolean;
}

interface ChickView {
  id: number;
  level: SplitLevel;
}

function makeChickMotion(id: number, level: SplitLevel, x: number, y: number, groupId: number, ts: number): ChickMotion {
  return {
    id,
    level,
    groupId,
    x,
    y,
    vx: 0,
    vy: 0,
    rot: 0,
    rv: 0,
    dir: 1,
    phase: 'free',
    phaseUntil: 0,
    nextTurnAt: 0,
    tossedAt: 0,
    spawnedAt: ts,
    squash: 0,
    stretch: 0,
    grabDx: 0,
    grabDy: 0,
    noSplit: false,
    breaking: false,
    leakUntil: 0,
    nextLeakAt: 0,
    targetVx: 0,
    targetVy: 0,
  };
}

interface ChickenBridge {
  plays: SoundEvent[];
  state: () => ChickenStateSnapshot;
  boost: (n: number) => void;
  spin: (v: number) => void;
  forceHyper: () => void;
  forceTeleport: (decoys: boolean) => void;
  forceKid: () => void;
  forceCeremony: () => void;
  forcePortal: () => void;
  forceScramble: () => void;
  forceVisit: () => void;
  forceMerge: () => void;
  openSheet: () => void;
  setScore: (n: number) => void;
  forceOrb: (kind: OrbKind) => void;
  forcePaceCheck: () => void;
  forceBird: (kind: BirdKind) => void;
  placeChicken: (x: number, y: number) => void;
  useItem: (id: string) => void;
  selectSkin: (id: string) => void;
  spawnMartian: (kind?: string) => void;
  martianClicks: () => number;
  collectOrb: (kind: OrbKind) => void;
  fastForward: (ms: number) => void;
  forceToss: (level?: number) => void;
  forceReform: () => void;
  forceBandaid: () => void;
  holdMsOverride: (ms: number) => void;
  inventory: () => InventoryItem[];
  grantItem: (id: string, fromX?: number, fromY?: number) => void;
  setSeqTimeScale: (n: number) => void;
}

type FeatherSkinItemId = Extract<GameItemId, 'hawk-feather' | 'eagle-feather' | 'phoenix-feather' | 'martian-friend'>;

function isFeatherSkinItem(id: string): id is FeatherSkinItemId {
  return id === 'hawk-feather' || id === 'eagle-feather' || id === 'phoenix-feather' || id === MARTIAN_ITEM_ID;
}

const NO_CHAR: CharSpot[] = [];
const BURN_STAGE_COUNT = 3;

function writeHeatVars(el: HTMLElement, live: boolean, burn: number, tint: number, regrow: number): void {
  el.style.setProperty('--burn-skin', live && burn > 0 ? '1' : '0');
  for (let i = 0; i < BURN_STAGE_COUNT; i++) {
    el.style.setProperty(`--burn-${i + 1}`, Math.max(0, Math.min(1, burn * BURN_STAGE_COUNT - i)).toFixed(3));
  }
  el.style.setProperty('--heat-tint', tint.toFixed(3));
  el.style.setProperty('--regrow', regrow.toFixed(3));
}

let featherSkinHandler: ((id: FeatherSkinItemId) => void) | null = null;

function applyFeatherSkin(id: FeatherSkinItemId): void {
  featherSkinHandler?.(id);
}

export function onUseItem(itemId: string): void {
  if (isFeatherSkinItem(itemId)) applyFeatherSkin(itemId);
}

interface BridgeWindow {
  __chicken?: ChickenBridge;
}

const MOON_PARK_X_FRAC = 0.17;
const loadSpaceFlight = () => import('./space-flight-3d');
const SpaceFlight3D = dynamic(loadSpaceFlight, { ssr: false });
const CosmosFlight = dynamic(() => import('./cosmos-3d'), { ssr: false });
const PRELOAD_IDLE_TIMEOUT_MS = 4000;
const PRELOAD_FALLBACK_DELAY_MS = 1500;

const STREAK_MAX_LEN = 34;
const STREAK_MAX_COUNT = 5;

function shortStreaks(x: number, y: number, now: number, count = 10): Streak[] {
  return makeTeleportStreaks(x, y, now, Math.min(count, STREAK_MAX_COUNT)).map((st) => ({
    ...st,
    len: Math.min(st.len, STREAK_MAX_LEN),
    vy: st.vy * 0.4,
  }));
}

function isScriptedStage(stage: EscapeStage): boolean {
  return stage === 'pilot' || stage === 'rocket';
}

function bridgeWindow(): BridgeWindow {
  return window as unknown as BridgeWindow;
}

function speedForScore(score: number): number {
  const base = 1 + Math.min(score, SPEED_SCORE_CAP) * SPEED_PER_SCORE;
  return base * TIER_SPEED_BUMP[tierForScore(score)];
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function lightningForScore(score: number): Lightning | null {
  if (score < LIGHTNING_START) return null;
  const t = Math.min(1, (score - LIGHTNING_START) / (LIGHTNING_FULL - LIGHTNING_START));
  const intervalMs =
    LIGHTNING_INTERVAL_RARE + (LIGHTNING_INTERVAL_FREQUENT - LIGHTNING_INTERVAL_RARE) * t;
  const color =
    t < 0.5 ? lerpRgb(LIGHT_BLUE, LIGHT_RED, t / 0.5) : lerpRgb(LIGHT_RED, LIGHT_WHITE, (t - 0.5) / 0.5);
  return { intervalMs, color, intensity: 0.4 + 0.6 * t };
}

function mercyTargetFor(idleMs: number): number {
  if (idleMs <= MERCY_DELAY_MS) return 1;
  const t = Math.min(1, (idleMs - MERCY_DELAY_MS) / MERCY_RAMP_MS);
  return 1 - (1 - MERCY_FLOOR) * smoothstep(t);
}

function auraLevelFor(score: number, mercy: number): number {
  const tier = tierForScore(score);
  const progress = tierProgress(score);
  const damp = 0.55 + 0.45 * mercy;
  if (tier === 0) {
    if (progress <= TIER0_AURA_START) return 0;
    return ((progress - TIER0_AURA_START) / (1 - TIER0_AURA_START)) * TIER0_AURA_MAX * damp;
  }
  const base = 0.35 + 0.13 * (tier - 1) + 0.25 * progress;
  return Math.min(1, base) * damp;
}

function auraRgbFor(score: number): { r: number; g: number; b: number } {
  const tier = tierForScore(score);
  const progress = tier === FINAL_TIER ? 0 : tierProgress(score);
  const nextAura = TIERS[Math.min(tier + 1, FINAL_TIER)].aura;
  const current = TIERS[tier].aura ?? nextAura;
  const next = nextAura ?? current;
  if (!current || !next) return { r: 255, g: 255, b: 255 };
  const channel = (a: number, b: number) => Math.round(a + (b - a) * progress);
  return {
    r: channel(current.r, next.r),
    g: channel(current.g, next.g),
    b: channel(current.b, next.b),
  };
}

function makeArc(cx: number, cy: number, color: Rgb): Arc {
  const points: { x: number; y: number }[] = [];
  const baseAngle = Math.random() * Math.PI * 2;
  const startR = ARC_START_R_MIN + Math.random() * ARC_START_R_SPREAD;
  const endR = ARC_END_R_MIN + Math.random() * ARC_END_R_SPREAD;
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const r = startR + (endR - startR) * t;
    const a = baseAngle + (Math.random() - 0.5) * 1.0;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 1.35 });
  }
  return { points, born: performance.now(), color };
}

function groundYFor(vh: number): number {
  return vh * GROUND_FRAC;
}

function drawAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ts: number,
  tier: number,
  level: number,
  rgb: Rgb
): void {
  if (level <= 0) return;
  const { r, g, b } = rgb;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const gy = cy - 14 * level;
  const glow = ctx.createRadialGradient(cx, gy, 8, cx, gy, 96 + 46 * level);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * level})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, gy, 70 + 30 * level, 104 + 48 * level, 0, 0, Math.PI * 2);
  ctx.fill();

  const hotR = Math.min(255, r + 90);
  const hotG = Math.min(255, g + 90);
  const hotB = Math.min(255, b + 90);
  const core = ctx.createRadialGradient(cx, cy - 4, 3, cx, cy - 4, 54 + 26 * level);
  core.addColorStop(0, `rgba(255, 255, 255, ${0.42 * level})`);
  core.addColorStop(0.5, `rgba(${hotR}, ${hotG}, ${hotB}, ${0.26 * level})`);
  core.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 46 + 16 * level, 76 + 24 * level, 0, 0, Math.PI * 2);
  ctx.fill();

  const tongues = AURA_TONGUES + tier * 2;
  const baseRx = 32 + tier * 1.5;
  const baseRy = 58 + tier * 2;
  const flickA = ts * 0.012;
  const flickB = ts * 0.02;
  for (let k = 0; k < tongues; k++) {
    const angle = (k / tongues) * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const upward = -sa;
    const upFactor = 0.5 + 0.5 * upward;
    const flick = 0.55 + 0.45 * Math.sin(flickA + k * 2.3) * Math.sin(flickB + k * 1.1);
    const len = (16 + 54 * level) * (0.35 + upFactor) * flick;
    const bx = cx + ca * baseRx;
    const by = cy + sa * baseRy;
    const tx = cx + ca * (baseRx + len * 0.6);
    const ty = cy + sa * (baseRy + len * 0.4) - len * upFactor;
    const w = (4.5 + 4 * level) * (0.5 + 0.5 * upFactor);
    const px = -sa * w;
    const py = ca * w;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.16 + 0.26 * level) * (0.6 + 0.4 * flick)})`;
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - px, by - py);
    ctx.closePath();
    ctx.fill();
    const ix = cx + ca * (baseRx + len * 0.42);
    const iy = cy + sa * (baseRy + len * 0.28) - len * upFactor * 0.72;
    ctx.fillStyle = `rgba(255, 250, 235, ${(0.1 + 0.22 * level) * flick})`;
    ctx.beginPath();
    ctx.moveTo(bx + px * 0.5, by + py * 0.5);
    ctx.lineTo(ix, iy);
    ctx.lineTo(bx - px * 0.5, by - py * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function ChickenGameInner() {
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState<EscapeStage>('none');
  const [stagePhase, setStagePhase] = useState<StagePhase>('live');
  const [parked, setParked] = useState<{ x: number; y: number } | null>(null);
  const parkedRef = useRef(parked);
  parkedRef.current = parked;
  const stageRef = useRef<EscapeStage>('none');
  const stagePhaseRef = useRef<StagePhase>('live');
  const stageStartRef = useRef(0);
  const stageAnchorRef = useRef({ x: 0, y: 0 });
  const [seq, setSeq] = useState<RocketSeq>('none');
  const [doorOpen, setDoorOpen] = useState(false);
  const [space3dOn, setSpace3dOn] = useState(false);
  const seqRef = useRef<RocketSeq>('none');
  const seqStartRef = useRef(0);
  const seqScaleRef = useRef(1);
  const seqClicksRef = useRef(0);
  const doorOpenRef = useRef(false);
  const flightRef = useRef<PlaneFlight>(createFlight(0));
  const planeFlightRef = useRef<PlaneFlight>(createFlight(0));
  const planeBodyRef = useRef({ x: 0, y: 0 });
  const pushRef = useRef({ x: 0, y: 0 });
  const rollRef = useRef(1);
  const approachFromRef = useRef({ x: 0, y: 0 });
  const moonFromRef = useRef<{ y: number } | null>(null);
  const flightProgressRef = useRef(0);
  const cosmosProgressRef = useRef(0);
  const scene3dReadyRef = useRef(false);
  const [gate, setGate] = useState<SpaceGateState>('none');
  const [gateCount, setGateCount] = useState(GATE_COUNT_FROM);
  const gateRef = useRef<SpaceGateState>('none');
  const pauseStartRef = useRef(0);
  const skip3dRef = useRef(false);
  const planeElRef = useRef<HTMLDivElement>(null);
  const bgRocketElRef = useRef<HTMLDivElement>(null);
  const surfYRef = useRef(0);
  const [tier, setTier] = useState(0);
  const [flashTier, setFlashTier] = useState<number | null>(null);
  const [mercyCaption, setMercyCaption] = useState(false);
  const [mood, setMood] = useState<(typeof TIERS)[number]['eyes']>('calm');
  const [sheet, setSheet] = useState<'board' | null>(null);
  const [loaderPhase, setLoaderPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [bonus, setBonus] = useState<{ amount: number; id: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [skin, setSkin] = useState(DEFAULT_SKIN_ID);
  const [skinsOpen, setSkinsOpen] = useState(false);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>([]);
  const [birdUi, setBirdUi] = useState<{ kind: BirdKind | null; grip: boolean }>({ kind: null, grip: false });
  const martianSpotsRef = useRef<MartianSpot[]>([]);
  const [distress, setDistress] = useState<HeatLevel>(0);
  const distressRef = useRef<HeatLevel>(0);
  const [burnLive, setBurnLive] = useState(false);
  const burnLiveRef = useRef(false);
  const [charSpots, setCharSpots] = useState<Record<string, CharSpot[]>>({});
  const sizzleRef = useRef(0);
  const regrowAtRef = useRef(0);
  const heatVarsRef = useRef('');
  const toastedGrantedRef = useRef(0);
  const birdUiRef = useRef(birdUi);
  const birdRef = useRef(createBirdState());
  const birdElsRef = useRef(createBirdEls());
  const multRef = useRef(1);
  const screamOverrideRef = useRef<'hawk' | null>(null);
  const scoreRef = useRef(0);
  const tierRef = useRef(0);
  const physicsRef = useRef<Physics>({
    x: 0, y: 0, vx: 0, vy: 0, rotation: 0, rv: 0, bank: 0,
  });
  const modeRef = useRef<'ground' | 'flying'>('ground');
  const groundRef = useRef<GroundState>({
    vxTarget: 0,
    nextTurnAt: 0,
    nextGrazeAt: 0,
    grazeUntil: 0,
  });
  const hyperRef = useRef<HyperState>({ phase: 'idle', until: 0, nextAt: 0, mult: 1 });
  const teleportRef = useRef<TeleportState>({
    phase: 'idle',
    nextAt: 0,
    outUntil: 0,
    target: null,
    origin: null,
    decoys: false,
    forcedDecoys: null,
    arrivedFrames: -1,
  });
  const facingRef = useRef(1);
  const flapMsRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const shardParticlesRef = useRef<ShardParticle[]>([]);
  const feathersRef = useRef<Feather[]>([]);
  const streaksRef = useRef<Streak[]>([]);
  const lastFeatherAtRef = useRef(0);
  const arcsRef = useRef<Arc[]>([]);
  const nextArcAtRef = useRef(0);
  const lastCrackleAtRef = useRef(0);
  const speedRef = useRef(1);
  const heatRef = useRef(0);
  const moodRef = useRef<(typeof TIERS)[number]['eyes']>('calm');
  const mercyRef = useRef(1);
  const mercyCaptionRef = useRef(false);
  const lastHitRef = useRef(0);
  const playsRef = useRef<SoundEvent[]>([]);
  const mountAtRef = useRef(0);
  const comboRef = useRef({ count: 0, lastAt: 0 });
  const squashRef = useRef(0);
  const squashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squashAttrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sqModeRef = useRef<'hug' | 'stomp'>('hug');
  const franticUntilRef = useRef(0);
  const franticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ceremonyRef = useRef<CeremonyState>({
    phase: 'idle',
    value: 0,
    nextTickAt: 0,
    cooldownUntil: 0,
  });
  const countdownRef = useRef<number | null>(null);
  const countdownElRef = useRef<HTMLDivElement>(null);
  const megaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalRef = useRef<PortalTransit>({
    phase: 'idle',
    until: 0,
    exit: null,
    entrySide: null,
    hotUntil: 0,
    cooldownUntil: 0,
  });
  const portalsRef = useRef<Portal[]>([]);
  const nextJumpAtRef = useRef(0);
  const skinRef = useRef(DEFAULT_SKIN_ID);
  const scrambleRef = useRef<ScrambleState>({
    phase: 'idle',
    until: 0,
    nextAt: 0,
    originX: 0,
    originY: 0,
    targetX: 0,
    targetY: 0,
    nextDartAt: 0,
  });
  const visitRef = useRef<VisitState>({
    phase: 'idle',
    nextRollAt: 0,
    cooldownUntil: 0,
    kidId: 0,
  });
  const sizeBoostRef = useRef(0);
  const bendRef = useRef(0);
  const ghostsRef = useRef<Ghost[]>([]);
  const ghostIdRef = useRef(0);
  const ghostSweepAtRef = useRef(0);
  const kidIdRef = useRef(0);
  const nextKidAtRef = useRef(0);
  const kidMotionRef = useRef(new Map<number, KidMotion>());
  const kidElsRef = useRef(new Map<number, HTMLDivElement>());
  const kidsCountRef = useRef(0);
  const [chicks, setChicks] = useState<ChickView[]>([]);
  const [wound, setWound] = useState<Wound | null>(null);
  const woundRef = useRef<Wound | null>(null);
  const chickMotionRef = useRef(new Map<number, ChickMotion>());
  const chickElsRef = useRef(new Map<number, HTMLDivElement>());
  const groupsRef = useRef(new Map<number, ChickGroup>());
  const chickIdRef = useRef(0);
  const groupIdRef = useRef(0);
  const rootSplitRef = useRef(false);
  const depthMaxRef = useRef(0);
  const holdRef = useRef<HoldState | null>(null);
  const holdMsOverrideRef = useRef<number | null>(null);
  const suppressClickUntilRef = useRef(0);
  const forceReformRef = useRef(false);
  const dropsRef = useRef<RainbowDrop[]>([]);
  const poolsRef = useRef<Pool[]>([]);
  const pointerRef = useRef({ lastX: -1000, lastY: -1000, vx: 0, vy: 0, ax: 0 });
  const hudRef = useRef<HTMLDivElement>(null);
  const hudLabelRef = useRef<HTMLSpanElement>(null);
  const hudBarRef = useRef<HTMLDivElement>(null);
  const hudReadoutRef = useRef<HTMLSpanElement>(null);
  const hudFullRef = useRef(false);
  const hitRef = useRef<(e?: ReactMouseEvent<HTMLDivElement>, extra?: boolean, source?: { x: number; y: number }) => void>(() => undefined);
  const [orbViews, setOrbViews] = useState<OrbView[]>([]);
  const [cloneViews, setCloneViews] = useState<CloneView[]>([]);
  const [overlayOffsets, setOverlayOffsets] = useState<CursorOffset[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const orbElsRef = useRef(new Map<number, HTMLDivElement>());
  const orbIdRef = useRef(0);
  const orbFiredRef = useRef<Record<OrbKind, boolean>>({ multiply: false, cursor5: false, cursor3: false, frenzy: false });
  const frenzyUntilRef = useRef(0);
  const pilotTeleportsRef = useRef(0);
  const frenzyElRef = useRef<HTMLDivElement | null>(null);
  const playMsRef = useRef(0);
  const lastCheckMsRef = useRef(0);
  const lastCatchUpMsRef = useRef(Number.NEGATIVE_INFINITY);
  const catchUpCountRef = useRef(0);
  const cloneMotionRef = useRef(new Map<number, CloneMotion>());
  const cloneElsRef = useRef(new Map<number, HTMLDivElement>());
  const cloneIdRef = useRef(0);
  const multiplyStartRef = useRef(0);
  const vanishedRef = useRef(0);
  const blackHolesRef = useRef<BlackHole[]>([]);
  const cursorBuffRef = useRef({ x5Until: 0, x3Until: 0 });
  const cursorOffsetsRef = useRef<CursorOffset[]>([{ dx: 0, dy: 0 }]);
  const cursorKeyRef = useRef('00');
  const cursorElsRef = useRef<HTMLDivElement[]>([]);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const chickenElRef = useRef<HTMLDivElement>(null);
  const facingElRef = useRef<HTMLDivElement>(null);
  const rubberElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { progress, playScream, playPowerUp, playHawk, crackle, squeak, sizzle } = useChickenSounds();

  const recordPlay = useCallback((event: SoundEvent) => {
    const log = playsRef.current;
    log.push(event);
    if (log.length > BRIDGE_LOG_CAP) log.shift();
  }, []);

  const spawnShards = useCallback((cx: number, cy: number, count: number, color: string) => {
    const shards = shardParticlesRef.current;
    for (let i = 0; i < count && shards.length < MAX_SHARD_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      shards.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        rotation: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.4,
        alpha: 1,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  }, []);

  const spawnFeathers = useCallback((cx: number, cy: number, count: number) => {
    const feathers = feathersRef.current;
    const now = performance.now();
    const tier = tierRef.current;
    const def = TIERS[tier];
    const nextDef = TIERS[Math.min(tier + 1, FINAL_TIER)];
    const m = morphForScore(scoreRef.current);
    const skin = skinById(skinRef.current);
    const tierBody = mixHex(def.body, nextDef.body, m);
    const tierDark = mixHex(def.bodyDark, nextDef.bodyDark, m);
    const body = skin.id === 'classic' ? tierBody : mixHex(skin.body, tierBody, skin.tierBlend);
    const dark = skin.id === 'classic' ? tierDark : mixHex(skin.bodyDark, tierDark, skin.tierBlend);
    if (now - lastFeatherAtRef.current < FEATHER_SPAWN_GAP_MS) return;
    lastFeatherAtRef.current = now;
    for (let i = 0; i < count && feathers.length < MAX_FEATHERS; i++) {
      const f = makeFeather(cx, cy, Math.random() < 0.5 ? body : dark, now);
      f.elong = 1;
      f.drifter = false;
      f.size = Math.min(f.size, FEATHER_SIZE_CAP);
      f.life = Math.min(f.life, FEATHER_LIFE_CAP_MS);
      feathers.push(f);
    }
  }, []);

  const addGhost = useCallback((x: number, y: number, pre: boolean) => {
    const ghost: Ghost = {
      id: ++ghostIdRef.current,
      x,
      y,
      tier: tierRef.current,
      morph: morphForScore(scoreRef.current),
      pre,
      born: performance.now(),
    };
    ghostsRef.current = [...ghostsRef.current.slice(-(GHOST_MAX - 1)), ghost];
    setGhosts(ghostsRef.current);
  }, []);

  const removeGhost = useCallback((id: number) => {
    ghostsRef.current = ghostsRef.current.filter((g) => g.id !== id);
    setGhosts(ghostsRef.current);
  }, []);

  const spawnKid = useCallback(() => {
    const vw = window.innerWidth;
    const id = ++kidIdRef.current;
    const x = 60 + Math.random() * Math.max(120, vw - 240);
    kidMotionRef.current.set(id, {
      x,
      dir: Math.random() < 0.5 ? -1 : 1,
      vx: 0,
      fleeing: false,
      nextTurnAt: 0,
      merging: false,
      mergeAt:
        Math.random() < KID_MERGE_CHANCE
          ? performance.now() + KID_MERGE_DELAY_MIN_MS + Math.random() * KID_MERGE_DELAY_SPREAD_MS
          : 0,
    });
    setKids((k) => {
      const next = [...k, { id, tier: Math.floor(Math.random() * (tierRef.current + 1)) }];
      kidsCountRef.current = next.length;
      return next;
    });
  }, []);

  const removeKid = useCallback((id: number) => {
    kidMotionRef.current.delete(id);
    kidElsRef.current.delete(id);
    setKids((k) => {
      const next = k.filter((kid) => kid.id !== id);
      kidsCountRef.current = next.length;
      return next;
    });
  }, []);

  const fleeKid = useCallback((id: number) => {
    const motion = kidMotionRef.current.get(id);
    if (!motion || motion.fleeing || motion.merging) return;
    motion.fleeing = true;
    const sign = motion.x < window.innerWidth / 2 ? -1 : 1;
    motion.vx = sign * (KID_FLEE_MIN + Math.random() * KID_FLEE_SPREAD);
    motion.dir = sign;
    const el = kidElsRef.current.get(id);
    if (el) el.style.setProperty('--flap-ms', '90ms');
  }, []);

  const startKidMerge = useCallback((id: number) => {
    const motion = kidMotionRef.current.get(id);
    if (!motion || motion.fleeing || motion.merging) return;
    motion.merging = true;
    const el = kidElsRef.current.get(id);
    if (el) el.style.setProperty('--flap-ms', '90ms');
  }, []);

  const clickKid = useCallback(
    (id: number) => {
      if (Math.random() < KID_MERGE_CHANCE) startKidMerge(id);
      else fleeKid(id);
    },
    [startKidMerge, fleeKid]
  );


  const syncChicks = useCallback(() => {
    setChicks([...chickMotionRef.current.values()].map((m) => ({ id: m.id, level: m.level })));
  }, []);

  const setWoundState = useCallback((next: Wound | null) => {
    woundRef.current = next;
    setWound(next);
  }, []);

  const emitDrops = useCallback((x: number, y: number, count: number) => {
    const now = performance.now();
    for (let i = 0; i < count && dropsRef.current.length < MAX_DROPS; i++) {
      dropsRef.current.push(makeDrop(x, y, now, i));
    }
  }, []);

  const hideHud = useCallback(() => {
    if (hudRef.current) hudRef.current.style.opacity = '0';
    hudFullRef.current = false;
    if (hudBarRef.current) hudBarRef.current.classList.remove('hold-bar-full');
  }, []);

  const restoreRoot = useCallback((x: number, y: number, rot: number) => {
    const p = physicsRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    p.x = clamp(x - CHICKEN_W / 2, 0, vw - CHICKEN_W);
    p.y = clamp(y - CHICKEN_H / 2, 0, vh - CHICKEN_H);
    p.rotation = rot;
    p.rv = 0;
    const angle = Math.random() * Math.PI * 2;
    p.vx = Math.cos(angle) * BASE_SPEED;
    p.vy = Math.sin(angle) * BASE_SPEED;
    rootSplitRef.current = false;
    forceReformRef.current = false;
  }, []);

  const convertRoot = useCallback(
    (ts: number): ChickMotion => {
      const p = physicsRef.current;
      const m = makeChickMotion(++chickIdRef.current, 0, p.x + CHICKEN_W / 2, p.y + CHICKEN_H / 2, 0, ts);
      m.rot = p.rotation;
      m.dir = facingRef.current;
      chickMotionRef.current.set(m.id, m);
      rootSplitRef.current = true;
      syncChicks();
      return m;
    },
    [syncChicks]
  );

  const removeChickEl = useCallback((id: number) => {
    chickMotionRef.current.delete(id);
    chickElsRef.current.delete(id);
  }, []);

  const splitChick = useCallback(
    (m: ChickMotion, ts: number) => {
      const level = (m.level + 1) as SplitLevel;
      const gid = ++groupIdRef.current;
      const group: ChickGroup = {
        id: gid,
        level,
        parentGroupId: m.groupId,
        mergeAt: ts + mergeDelayFor(level),
        expected: SPLIT_COUNT,
        members: new Set(),
        returning: false,
        cx: m.x,
        cy: m.y,
      };
      groupsRef.current.set(gid, group);
      groupsRef.current.get(m.groupId)?.members.delete(m.id);
      removeChickEl(m.id);
      for (const deg of splitFan(SPLIT_COUNT)) {
        const c = makeChickMotion(++chickIdRef.current, level, m.x, m.y, gid, ts);
        const angle = ((-90 + deg) * Math.PI) / 180;
        const speed =
          (SCATTER_SPEED_MIN + Math.random() * SCATTER_SPEED_SPREAD) *
          (1 + (Math.random() - 0.5) * 2 * SCATTER_SPEED_JITTER);
        c.vx = Math.cos(angle) * speed;
        c.vy = Math.sin(angle) * speed;
        c.rv = (Math.random() - 0.5) * 2 * TOSS_SPIN_RANDOM;
        c.dir = c.vx >= 0 ? 1 : -1;
        c.phase = 'scatter';
        c.phaseUntil = ts + SCATTER_MS;
        if (m.breaking) c.leakUntil = ts + RAINBOW_LEAK_MS;
        chickMotionRef.current.set(c.id, c);
        group.members.add(c.id);
      }
      depthMaxRef.current = Math.max(depthMaxRef.current, level);
      spawnFeathers(m.x, m.y, 6);
      squeak(0.35);
      recordPlay({ type: 'squeak', at: Date.now() });
      syncChicks();
    },
    [removeChickEl, spawnFeathers, squeak, recordPlay, syncChicks]
  );

  const mergeGroup = useCallback(
    (g: ChickGroup, ts: number) => {
      const members = [...g.members].map((id) => chickMotionRef.current.get(id)).filter((m): m is ChickMotion => !!m);
      const c = groupCentroid(members);
      for (const m of members) removeChickEl(m.id);
      groupsRef.current.delete(g.id);
      if (g.level === 1) {
        restoreRoot(c.x, c.y, 0);
        setWoundState(depthMaxRef.current >= MAX_SPLIT_LEVEL ? { hp: BANDAID_HP, open: false } : null);
        depthMaxRef.current = 0;
      } else {
        const parent = makeChickMotion(++chickIdRef.current, (g.level - 1) as SplitLevel, c.x, c.y, g.parentGroupId, ts);
        parent.dir = members[0]?.dir ?? 1;
        chickMotionRef.current.set(parent.id, parent);
        const pg = groupsRef.current.get(g.parentGroupId);
        if (pg) {
          pg.members.add(parent.id);
          pg.mergeAt = Math.max(pg.mergeAt, ts + REJOIN_DELAY_MS);
        }
      }
      spawnFeathers(c.x, c.y, 5);
      squeak(0.35);
      recordPlay({ type: 'squeak', at: Date.now() });
      syncChicks();
    },
    [removeChickEl, restoreRoot, setWoundState, spawnFeathers, squeak, recordPlay, syncChicks]
  );

  const startRelease = useCallback(
    (m: ChickMotion, vx: number, vy: number, ts: number) => {
      const v = tossVelocity(vx, vy);
      m.vx = v.vx;
      m.vy = v.vy;
      m.rv = v.vx * TOSS_SPIN_FROM_VX + (Math.random() * 2 - 1) * TOSS_SPIN_RANDOM;
      m.phase = 'tossed';
      m.tossedAt = ts;
      m.noSplit = m.level >= MAX_SPLIT_LEVEL;
      const w = woundRef.current;
      if (m.level === 0 && w && !w.open && w.hp > 0) {
        const hp = w.hp - 1;
        if (hp > 0) {
          m.noSplit = true;
          emitDrops(m.x, m.y, RAINBOW_DROP_SEEP);
          setWoundState({ hp, open: false });
        } else {
          m.breaking = true;
          emitDrops(m.x, m.y, RAINBOW_DROP_BURST);
          setWoundState({ hp: 0, open: true });
        }
      }
    },
    [emitDrops, setWoundState]
  );

  const landChick = useCallback(
    (m: ChickMotion, ts: number) => {
      if (!m.noSplit && m.level < MAX_SPLIT_LEVEL) {
        splitChick(m, ts);
        return;
      }
      if (m.level === 0) {
        restoreRoot(m.x, m.y, 0);
        removeChickEl(m.id);
        syncChicks();
        return;
      }
      m.phase = 'free';
      m.nextTurnAt = 0;
    },
    [splitChick, restoreRoot, removeChickEl, syncChicks]
  );

  const beginHold = useCallback((id: number, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || holdRef.current) return;
    const now = performance.now();
    const m = id === 0 ? null : chickMotionRef.current.get(id);
    if (id !== 0 && (!m || m.phase !== 'free' && m.phase !== 'returning' || now - m.spawnedAt < FRESH_PROTECT_MS)) return;
    if (id === 0 && rootSplitRef.current) return;
    const p = physicsRef.current;
    holdRef.current = {
      id,
      ms: 0,
      grabbed: false,
      outsideSince: 0,
      anchorX: p.x,
      anchorY: p.y,
      driftX: 0,
      driftY: 0,
      driftTotal: 0,
    };
  }, []);

  const grabHold = useCallback(
    (h: HoldState, ts: number) => {
      const m = h.id === 0 ? convertRoot(ts) : chickMotionRef.current.get(h.id);
      if (!m) {
        holdRef.current = null;
        return;
      }
      const mouse = mouseRef.current;
      h.id = m.id;
      h.grabbed = true;
      m.phase = 'held';
      m.vx = 0;
      m.vy = 0;
      m.grabDx = clamp(m.x - mouse.x, -CHICK_W, CHICK_W);
      m.grabDy = clamp(m.y - mouse.y, -CHICK_H, CHICK_H);
      spawnFeathers(m.x, m.y, 3);
      squeak(0.35);
      recordPlay({ type: 'squeak', at: Date.now() });
    },
    [convertRoot, spawnFeathers, squeak, recordPlay]
  );

  const endHold = useCallback(() => {
    const h = holdRef.current;
    if (!h) return;
    holdRef.current = null;
    hideHud();
    if (!h.grabbed) return;
    const m = chickMotionRef.current.get(h.id);
    suppressClickUntilRef.current = performance.now() + 120;
    if (m) startRelease(m, pointerRef.current.vx, pointerRef.current.vy, performance.now());
  }, [hideHud, startRelease]);

  const tickHold = useCallback(
    (ts: number, dtMs: number, dt: number) => {
      const mouse = mouseRef.current;
      const pr = pointerRef.current;
      if (pr.lastX > -500) {
        const vx = (mouse.x - pr.lastX) / dt;
        const vy = (mouse.y - pr.lastY) / dt;
        const nvx = pr.vx + (vx - pr.vx) * POINTER_EMA;
        pr.ax = nvx - pr.vx;
        pr.vx = nvx;
        pr.vy += (vy - pr.vy) * POINTER_EMA;
      }
      pr.lastX = mouse.x;
      pr.lastY = mouse.y;
      const h = holdRef.current;
      if (!h) return;
      if (h.grabbed) {
        if (hudRef.current) {
          hudRef.current.style.transform = `translate(${mouse.x + 16}px, ${mouse.y + 18}px)`;
        }
        return;
      }
      const m = h.id === 0 ? null : chickMotionRef.current.get(h.id);
      if (h.id !== 0 && !m) {
        holdRef.current = null;
        hideHud();
        return;
      }
      const level = m ? m.level : 0;
      const size = chickSize(level);
      const p = physicsRef.current;
      const cx = m ? m.x : p.x + CHICKEN_W / 2;
      const cy = m ? m.y : p.y + CHICKEN_H / 2;
      const halfW = Math.max(size.w, MIN_HIT_PX) / 2 + HOLD_SLACK_PX;
      const halfH = Math.max(size.h, MIN_HIT_PX) / 2 + HOLD_SLACK_PX;
      const inside = Math.abs(mouse.x - cx) <= halfW && Math.abs(mouse.y - cy) <= halfH;
      if (inside) {
        h.outsideSince = 0;
        h.ms += dtMs;
      } else if (!h.outsideSince) {
        h.outsideSince = ts;
      } else if (ts - h.outsideSince > HOLD_GRACE_MS) {
        holdRef.current = null;
        hideHud();
        return;
      }
      let dx = cx - mouse.x;
      let dy = cy - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.001) {
        dx = 0;
        dy = -1;
      } else {
        dx /= d;
        dy /= d;
      }
      const step = heldDriftFor(level) * dt;
      h.driftTotal += step;
      if (m) {
        m.x += dx * step;
        m.y += dy * step;
      } else {
        h.driftX += dx * step;
        h.driftY += dy * step;
      }
      const holdMs = holdMsOverrideRef.current ?? HOLD_MS;
      const hud = hudRef.current;
      if (hud) {
        const show = h.ms >= Math.min(HOLD_HUD_DELAY_MS, holdMs * 0.2);
        hud.style.opacity = show ? '1' : '0';
        hud.style.transform = `translate(${mouse.x + 16}px, ${mouse.y + 18}px)`;
        const frac = Math.min(1, h.ms / holdMs);
        if (hudBarRef.current) hudBarRef.current.style.width = `${(frac * 100).toFixed(1)}%`;
        if (hudReadoutRef.current) {
          hudReadoutRef.current.textContent = `${(Math.min(h.ms, holdMs) / 1000).toFixed(1)} / ${(holdMs / 1000).toFixed(1)}s`;
        }
        if (hudLabelRef.current) hudLabelRef.current.textContent = frac >= 1 ? 'toss!' : 'hold to toss';
      }
      if (h.ms >= holdMs) {
        if (hudBarRef.current) hudBarRef.current.classList.add('hold-bar-full');
        grabHold(h, ts);
      }
    },
    [grabHold, hideHud]
  );

  const tickChicks = useCallback(
    (ts: number, dtMs: number, dt: number, vw: number, vh: number) => {
      const motions = chickMotionRef.current;
      const groundY = groundYFor(vh);
      const mouse = mouseRef.current;
      const pr = pointerRef.current;
      const forced = forceReformRef.current;
      const hold = holdRef.current;
      for (const g of [...groupsRef.current.values()]) {
        const members = [...g.members]
          .map((id) => motions.get(id))
          .filter((m): m is ChickMotion => !!m);
        if (members.length === 0) continue;
        if (!g.returning) {
          if (
            members.length === g.expected &&
            members.every((m) => m.phase === 'free') &&
            (forced || ts >= g.mergeAt)
          ) {
            g.returning = true;
            for (const m of members) m.phase = 'returning';
          }
          continue;
        }
        if (members.some((m) => m.phase !== 'returning')) {
          g.returning = false;
          g.mergeAt = ts + REGROUP_RETRY_MS;
          for (const m of members) if (m.phase === 'returning') m.phase = 'free';
          continue;
        }
        const c = groupCentroid(members);
        g.cx = c.x;
        g.cy = c.y;
        if (members.every((m) => Math.hypot(m.x - c.x, m.y - c.y) < MERGE_PROXIMITY)) mergeGroup(g, ts);
      }
      const groundMode = modeRef.current === 'ground';
      const speedBase = BASE_SPEED * FRAME_MS * speedRef.current;
      const cursorX = mouse.x;
      const cursorY = mouse.y;
      for (const m of motions.values()) {
        const size = chickSize(m.level);
        const halfH = size.h / 2;
        const el = chickElsRef.current.get(m.id);
        const pending = hold && !hold.grabbed && hold.id === m.id;
        if (m.squash > 0) {
          m.squash *= Math.pow(SQUASH_DECAY, dt);
          if (m.squash < 0.005) m.squash = 0;
        }
        if (m.phase === 'held') {
          const tx = mouse.x + m.grabDx;
          const ty = mouse.y + m.grabDy;
          const k = Math.min(1, RAG_FOLLOW * dt);
          m.x += (tx - m.x) * k;
          m.y += (ty - m.y) * k;
          ragdollStep(m, pr.ax, dt);
          m.stretch = Math.min(RAG_STRETCH_MAX, Math.hypot(pr.vx, pr.vy) * RAG_STRETCH_PER_SPEED);
          m.dir = pr.vx > 1 ? 1 : pr.vx < -1 ? -1 : m.dir;
        } else if (m.phase === 'tossed' || m.phase === 'scatter') {
          m.stretch *= 0.9;
          const impact = tossStep(m, { w: size.w, h: size.h, vw, vh, groundY }, dt);
          if (impact >= TOSS_SPLIT_IMPACT_MIN) {
            spawnFeathers(m.x, m.y, 2);
            if (m.phase === 'tossed') {
              squeak(0.35);
              recordPlay({ type: 'squeak', at: Date.now() });
            }
          }
          if (m.phase === 'tossed') {
            if (impact >= TOSS_SPLIT_IMPACT_MIN || ts - m.tossedAt >= TOSS_SPLIT_FALLBACK_MS) {
              landChick(m, ts);
              if (!motions.has(m.id)) continue;
            }
          } else if (ts >= m.phaseUntil) {
            m.phase = 'free';
            m.nextTurnAt = 0;
          }
        } else if (!pending) {
          m.stretch *= 0.9;
          const factor = LEVEL_FREE_SPEED[m.level];
          if (m.phase === 'returning') {
            const g = groupsRef.current.get(m.groupId);
            if (g) {
              const dx = g.cx - m.x;
              const dy = g.cy - m.y;
              const dist = Math.hypot(dx, dy);
              const step = Math.min(dist, RETURN_SPEED * factor * (forced ? FORCE_REFORM_BOOST : 1) * dt);
              if (dist > 0.001) {
                m.x += (dx / dist) * step;
                m.y += (dy / dist) * step;
              }
              if (Math.abs(dx) > 2) m.dir = dx > 0 ? 1 : -1;
            }
          } else if (groundMode) {
            const floorY = groundY - halfH;
            if (m.y < floorY - 1) {
              m.vy += 0.9 * dt;
              m.y = Math.min(floorY, m.y + m.vy * dt);
              m.x = clamp(m.x + m.vx * dt, size.w / 2, vw - size.w / 2);
            } else {
              if (!m.nextTurnAt || ts >= m.nextTurnAt) {
                m.nextTurnAt = ts + FREE_TURN_MIN_MS + Math.random() * FREE_TURN_SPREAD_MS;
                m.targetVx =
                  Math.random() < GROUND_PAUSE_CHANCE ? 0 : (Math.random() < 0.5 ? -1 : 1) * GROUND_WANDER * FRAME_MS * factor;
              }
              m.vy = 0;
              m.vx += (m.targetVx - m.vx) * Math.min(1, 0.05 * dt);
              m.x = clamp(m.x + m.vx * dt, size.w / 2 + 8, vw - size.w / 2 - 8);
              m.y = floorY + Math.sin(ts * 0.004 + m.id) * 1.2;
              m.rot += (0 - m.rot) * Math.min(1, 0.1 * dt);
              m.rv = 0;
            }
            if (m.vx > 0.05) m.dir = 1;
            else if (m.vx < -0.05) m.dir = -1;
          } else {
            if (!m.nextTurnAt || ts >= m.nextTurnAt) {
              m.nextTurnAt = ts + FREE_TURN_MIN_MS + Math.random() * FREE_TURN_SPREAD_MS;
              const angle = Math.random() * Math.PI * 2;
              const spd = speedBase * factor;
              m.targetVx = Math.cos(angle) * spd;
              m.targetVy = Math.sin(angle) * spd;
            }
            m.vx += (m.targetVx - m.vx) * Math.min(1, FREE_STEER * dt);
            m.vy += (m.targetVy - m.vy) * Math.min(1, FREE_STEER * dt);
            const adx = m.x - cursorX;
            const ady = m.y - cursorY;
            const ad = Math.hypot(adx, ady);
            if (ad < FREE_AVOID_RADIUS && ad > 0) {
              const f = ((FREE_AVOID_RADIUS - ad) / FREE_AVOID_RADIUS) * FREE_AVOID_FORCE * dt;
              m.vx += (adx / ad) * f;
              m.vy += (ady / ad) * f;
            }
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            const halfW = size.w / 2;
            if (m.x < halfW || m.x > vw - halfW) {
              m.x = clamp(m.x, halfW, vw - halfW);
              m.vx = -m.vx;
              m.targetVx = -m.targetVx;
            }
            if (m.y < halfH || m.y > groundY - halfH) {
              m.y = clamp(m.y, halfH, groundY - halfH);
              m.vy = -m.vy;
              m.targetVy = -m.targetVy;
            }
            m.rv += (-m.rot * FREE_ROT_SPRING - m.rv * FREE_ROT_DAMP) * dt;
            m.rot += m.rv * dt;
            if (m.vx > 0.25) m.dir = 1;
            else if (m.vx < -0.25) m.dir = -1;
          }
          if (m.phase === 'returning') {
            m.rv += (-m.rot * FREE_ROT_SPRING - m.rv * FREE_ROT_DAMP) * dt;
            m.rot += m.rv * dt;
          }
        }
        if (m.leakUntil > ts && ts >= m.nextLeakAt) {
          m.nextLeakAt = ts + RAINBOW_LEAK_INTERVAL_MS;
          emitDrops(m.x, m.y, 1);
        }
        if (el) {
          const s = LEVEL_SCALE[m.level];
          const sx = (1 + m.squash - m.stretch * 0.5) * s * m.dir;
          const sy = (1 - m.squash * 0.8 + m.stretch) * s;
          el.style.transform = `translate(${(m.x - CHICK_W / 2).toFixed(1)}px, ${(m.y - CHICK_H / 2).toFixed(1)}px) rotate(${m.rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
          const ragdoll = m.phase === 'held' || m.phase === 'tossed';
          const flag = ragdoll ? '1' : '0';
          if (el.dataset.ragdoll !== flag) {
            el.dataset.ragdoll = flag;
            el.style.setProperty('--flap-ms', `${ragdoll ? HELD_FLAP_MS : FREE_FLAP_MS}ms`);
          }
          if (el.dataset.phase !== m.phase) el.dataset.phase = m.phase;
          if (ragdoll) {
            el.style.setProperty('--rag-head', `${(-m.rot * 0.35).toFixed(1)}deg`);
            el.style.setProperty('--rag-wing', `${(m.rot * 0.5 + 12).toFixed(1)}deg`);
            el.style.setProperty('--rag-legs', `${(-m.rot * 0.3).toFixed(1)}deg`);
          }
        }
      }
      const drops = dropsRef.current;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        updateDrop(d, dt);
        if (d.y >= groundY) {
          addPool(poolsRef.current, makePool(d.x, groundY, performance.now()));
          drops.splice(i, 1);
        } else if (d.y > vh + 20) {
          drops.splice(i, 1);
        }
      }
      const pools = poolsRef.current;
      const nowMs = performance.now();
      for (let i = pools.length - 1; i >= 0; i--) {
        if (nowMs - pools[i].born >= POOL_LIFE_MS) pools.splice(i, 1);
      }
    },
    [mergeGroup, landChick, spawnFeathers, squeak, recordPlay, emitDrops]
  );

  const clickPiece = useCallback((id: number) => {
    if (performance.now() < suppressClickUntilRef.current) return;
    const m = chickMotionRef.current.get(id);
    if (!m || m.phase === 'held') return;
    hitRef.current(undefined, true, { x: m.x, y: m.y });
  }, []);

  const forceTossAt = useCallback(
    (level?: number) => {
      const now = performance.now();
      holdRef.current = null;
      hideHud();
      let target: ChickMotion | undefined;
      for (const m of chickMotionRef.current.values()) {
        if ((m.phase === 'free' || m.phase === 'returning') && (level === undefined || m.level === level)) {
          target = m;
          break;
        }
      }
      if (!target && !rootSplitRef.current && (level === undefined || level === 0)) target = convertRoot(now);
      if (!target) return;
      startRelease(target, FORCED_TOSS_VX * (Math.random() < 0.5 ? -1 : 1), FORCED_TOSS_VY, now);
    },
    [convertRoot, hideHud, startRelease]
  );

  const selectSkin = useCallback((id: string) => {
    setSkin(id);
    skinRef.current = id;
    multRef.current = skinMultiplier(id);
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, id);
    } catch {}
    setSkinsOpen(false);
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(SKIN_STORAGE_KEY);
    } catch {}
    const unlocked = readUnlockedSkins();
    setUnlockedSkins(unlocked);
    setCharSpots(readCharSpots());
    if (saved && (SKINS.some((s) => s.id === saved) || unlocked.includes(saved))) {
      setSkin(saved);
      skinRef.current = saved;
      multRef.current = skinMultiplier(saved);
    }
  }, []);

  useEffect(() => {
    featherSkinHandler = (id) => {
      const skinId = id === MARTIAN_ITEM_ID ? MARTIAN_SKIN_ID : Object.values(BIRD_SPECS).find((b) => b.itemId === id)?.skinId;
      if (!skinId) return;
      if (skinById(skinId).id !== skinId) return;
      setUnlockedSkins(unlockSkin(skinId));
      selectSkin(skinId);
    };
    return () => {
      featherSkinHandler = null;
    };
  }, [selectSkin]);

  const syncBirdUi = useCallback((kind: BirdKind | null, grip: boolean) => {
    const cur = birdUiRef.current;
    if (cur.kind === kind && cur.grip === grip) return;
    const next = { kind, grip };
    birdUiRef.current = next;
    setBirdUi(next);
  }, []);

  const restoreBirdSnapshot = useCallback(() => {
    const snap = birdRef.current.snapshot;
    if (!snap) return;
    const p = physicsRef.current;
    modeRef.current = snap.mode;
    speedRef.current = snap.speed;
    heatRef.current = snap.heat;
    p.vx = snap.vx;
    p.vy = snap.vy;
    facingRef.current = snap.facing;
  }, []);

  const beginPortal = useCallback((side: PortalSide, ts: number) => {
    const portal = portalRef.current;
    if (portal.phase !== 'idle') return;
    const p = physicsRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (side === 'left') p.x = 0;
    else if (side === 'right') p.x = vw - CHICKEN_W;
    else if (side === 'top') p.y = 0;
    else p.y = vh - CHICKEN_H;
    p.vx = 0;
    p.vy = 0;
    p.rv = 0;
    const cx = p.x + CHICKEN_W / 2;
    const cy = p.y + CHICKEN_H / 2;
    const color = auraRgbFor(scoreRef.current);
    portalsRef.current.push({
      x: side === 'left' ? 10 : side === 'right' ? vw - 10 : cx,
      y: side === 'top' ? 10 : side === 'bottom' ? vh - 10 : cy,
      side,
      born: ts,
      color,
    });
    const exitSides = (['left', 'right', 'top', 'bottom'] as PortalSide[]).filter(
      (s) => s !== side
    );
    const exitSide = exitSides[Math.floor(Math.random() * exitSides.length)];
    const spanX = Math.max(PORTAL_EDGE_MARGIN, vw - CHICKEN_W - PORTAL_EDGE_MARGIN * 2);
    const spanY = Math.max(PORTAL_EDGE_MARGIN, vh - CHICKEN_H - PORTAL_EDGE_MARGIN * 2);
    const exit = {
      side: exitSide,
      x:
        exitSide === 'left'
          ? 0
          : exitSide === 'right'
            ? vw - CHICKEN_W
            : PORTAL_EDGE_MARGIN + Math.random() * spanX,
      y:
        exitSide === 'top'
          ? 0
          : exitSide === 'bottom'
            ? vh - CHICKEN_H
            : PORTAL_EDGE_MARGIN + Math.random() * spanY,
    };
    portal.phase = 'splat';
    portal.until = ts + PORTAL_SPLAT_MS;
    portal.exit = exit;
    portal.entrySide = side;
    if (rubberElRef.current) rubberElRef.current.dataset.splat = side;
  }, []);

  const startFrantic = useCallback(() => {
    const rubber = rubberElRef.current;
    const chicken = chickenElRef.current;
    if (!rubber || !chicken) return;
    franticUntilRef.current = performance.now() + FRANTIC_DURATION_MS;
    if (squashTimerRef.current) clearTimeout(squashTimerRef.current);
    if (squashAttrTimerRef.current) clearTimeout(squashAttrTimerRef.current);
    if (franticTimerRef.current) clearInterval(franticTimerRef.current);
    rubber.dataset.squashed = '1';
    chicken.setAttribute('data-squash', '1.00');
    const step = () => {
      if (performance.now() >= franticUntilRef.current) {
        if (franticTimerRef.current) clearInterval(franticTimerRef.current);
        franticTimerRef.current = null;
        rubber.style.setProperty('--sq', '0');
        rubber.dataset.squashed = '0';
        squashRef.current = 0;
        squashAttrTimerRef.current = setTimeout(() => {
          chicken.setAttribute('data-squash', '0');
        }, SQUASH_ATTR_CLEAR_MS);
        return;
      }
      const sq = 0.55 + Math.random() * 0.45;
      squashRef.current = sq;
      sqModeRef.current = Math.random() < 0.5 ? 'stomp' : 'hug';
      rubber.dataset.sqmode = sqModeRef.current;
      rubber.style.setProperty('--sq', sq.toFixed(3));
      rubber.style.setProperty('--sqx', (Math.random() * 2 - 1).toFixed(2));
      rubber.style.setProperty('--sqy', Math.random().toFixed(2));
    };
    step();
    franticTimerRef.current = setInterval(step, FRANTIC_STEP_MS);
  }, []);

  const applySquash = useCallback(
    (e?: ReactMouseEvent<HTMLDivElement>) => {
      const rubber = rubberElRef.current;
      const chicken = chickenElRef.current;
      if (!rubber || !chicken) return;
      const now = performance.now();
      const combo = comboRef.current;
      combo.count = now - combo.lastAt < SQUASH_WINDOW_MS ? combo.count + 1 : 1;
      combo.lastAt = now;
      const sq = Math.min(
        1,
        SQUASH_BASE + (combo.count - 1) * SQUASH_PER_COMBO + heatRef.current * SQUASH_HEAT
      );
      if (sq >= SQUEAK_THRESHOLD) {
        squeak(sq);
        recordPlay({ type: 'squeak', at: Date.now() });
      }
      if (now < franticUntilRef.current) return;
      if (Math.random() < FRANTIC_SQUEEZE_CHANCE) {
        startFrantic();
        return;
      }
      let sqx = 0;
      let sqy = 0.5;
      if (e) {
        const rect = chicken.getBoundingClientRect();
        if (rect.width > 0) {
          sqx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        }
        if (rect.height > 0) {
          sqy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        }
      }
      sqModeRef.current = Math.random() < STOMP_SQUEEZE_CHANCE ? 'stomp' : 'hug';
      squashRef.current = sq;
      rubber.style.setProperty('--sq', sq.toFixed(3));
      rubber.style.setProperty('--sqx', sqx.toFixed(2));
      rubber.style.setProperty('--sqy', sqy.toFixed(2));
      rubber.dataset.sqmode = sqModeRef.current;
      rubber.dataset.squashed = '1';
      chicken.setAttribute('data-squash', sq.toFixed(2));
      if (squashTimerRef.current) clearTimeout(squashTimerRef.current);
      if (squashAttrTimerRef.current) clearTimeout(squashAttrTimerRef.current);
      squashTimerRef.current = setTimeout(() => {
        rubber.style.setProperty('--sq', '0');
        rubber.dataset.squashed = '0';
        squashRef.current = 0;
        squashAttrTimerRef.current = setTimeout(() => {
          chicken.setAttribute('data-squash', '0');
        }, SQUASH_ATTR_CLEAR_MS);
      }, SQUASH_RELEASE_MS);
    },
    [squeak, recordPlay, startFrantic]
  );

  const enterSeq = useCallback((next: RocketSeq, now: number) => {
    seqRef.current = next;
    seqStartRef.current = now;
    if (next === 'explode') playBoom();
    setSeq(next);
  }, []);

  const enterStage = useCallback((next: EscapeStage, now: number) => {
    const p = physicsRef.current;
    const prev = stageRef.current;
    stageRef.current = next;
    stageStartRef.current = now;
    stageAnchorRef.current = { x: p.x, y: p.y };
    surfYRef.current = p.y;
    const phase: StagePhase = introMsFor(next) > 0 ? 'intro-a' : 'live';
    stagePhaseRef.current = phase;
    setStagePhase(phase);
    setStage(next);
    if (next === 'pilot' || next === 'rocket' || next === 'moon') modeRef.current = 'flying';
    if (next !== 'moon' && next !== 'cosmos') setParked(null);
    if (isSpaceStage(next)) {
      modeRef.current = 'flying';
      if (prev === 'moon') {
        p.vy = -BASE_SPEED * 1.2;
        p.vx = facingRef.current * BASE_SPEED * 0.8;
      }
    }
    if (isScriptedStage(next)) {
      hyperRef.current.phase = 'idle';
      scrambleRef.current.phase = 'idle';
      if (teleportRef.current.phase !== 'idle') {
        teleportRef.current.phase = 'idle';
        if (chickenElRef.current) chickenElRef.current.style.opacity = '1';
      }
    }
    if (next === 'pilot') {
      pilotTeleportsRef.current = 0;
      flightRef.current = createFlight(facingRef.current >= 0 ? 0 : Math.PI);
    }
    if (next === 'rocket') {
      seqClicksRef.current = 0;
      pushRef.current = { x: 0, y: 0 };
      if (prev === 'pilot') {
        planeFlightRef.current = flightRef.current;
        planeBodyRef.current = { x: p.x, y: p.y };
        flightRef.current = createFlight(-Math.PI / 2 + (Math.random() - 0.5) * 0.5);
        enterSeq('planeExit', now);
      } else {
        flightRef.current = createFlight(-Math.PI / 2);
        enterSeq('drift', now);
      }
    } else if (next === 'moon') {
      moonFromRef.current = prev === 'rocket' ? { y: p.y } : null;
      enterSeq('none', now);
    } else {
      enterSeq('none', now);
    }
  }, [enterSeq]);

  const shiftTimers = useCallback((ms: number) => {
    for (const o of orbsRef.current) o.bornAt += ms;
    for (const c of cloneMotionRef.current.values()) c.vanishAt += ms;
    multiplyStartRef.current += ms;
    cursorBuffRef.current.x5Until += ms;
    cursorBuffRef.current.x3Until += ms;
    frenzyUntilRef.current += ms;
    for (const pool of poolsRef.current) pool.born += ms;
    lastHitRef.current += ms;
  }, []);

  const resumeFromGate = useCallback(
    (skip: boolean) => {
      const now = performance.now();
      shiftTimers(now - pauseStartRef.current);
      skip3dRef.current = skip;
      gateRef.current = 'none';
      setGate('none');
      enterSeq('flight3d', now);
    },
    [shiftTimers, enterSeq]
  );

  const openGate = useCallback(() => {
    startSpacePreload(loadSpaceFlight).catch(() => {});
    pauseStartRef.current = performance.now();
    if (getSpaceProgress().done) {
      resumeFromGate(false);
      return;
    }
    gateRef.current = 'downloading';
    setGate('downloading');
  }, [resumeFromGate]);

  const startGateCountdown = useCallback(() => {
    if (gateRef.current !== 'ready') return;
    gateRef.current = 'countdown';
    setGateCount(GATE_COUNT_FROM);
    setGate('countdown');
  }, []);

  useEffect(() => {
    if (gate !== 'downloading') return;
    const id = setInterval(() => {
      if (getSpaceProgress().done && gateRef.current === 'downloading') {
        gateRef.current = 'ready';
        setGate('ready');
      }
    }, 150);
    return () => clearInterval(id);
  }, [gate]);

  useEffect(() => {
    if (gate !== 'countdown') return;
    const id = setInterval(() => setGateCount((c) => c - 1), GATE_COUNT_TICK_MS);
    return () => clearInterval(id);
  }, [gate]);

  useEffect(() => {
    if (gate === 'countdown' && gateCount <= 0) resumeFromGate(false);
  }, [gate, gateCount, resumeFromGate]);

  useEffect(() => {
    if (loaderPhase !== 'done') return;
    let cancelled = false;
    const start = () => {
      startSpacePreload(loadSpaceFlight)
        .then(() => {
          if (!cancelled) scene3dReadyRef.current = true;
        })
        .catch(() => {});
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      idle(start, { timeout: PRELOAD_IDLE_TIMEOUT_MS });
    } else {
      setTimeout(start, PRELOAD_FALLBACK_DELAY_MS);
    }
    return () => {
      cancelled = true;
    };
  }, [loaderPhase]);

  useEffect(() => {
    if (seq === 'flight3d') {
      if (!skip3dRef.current) setSpace3dOn(true);
      return;
    }
    if ((stage === 'moon' || isSpaceStage(stage)) && space3dOn) {
      const id = setTimeout(() => setSpace3dOn(false), CANVAS_FADE_OUT_MS + 200);
      return () => clearTimeout(id);
    }
  }, [seq, stage, space3dOn]);

  const { items: inventoryItems, grant: grantItem, use: useItem } = useInventory();
  const itemsRef = useRef(inventoryItems);
  itemsRef.current = inventoryItems;

  const birdScoreClick = useCallback((x: number, y: number) => {
    screamOverrideRef.current = 'hawk';
    hitRef.current(undefined, true, { x, y });
    screamOverrideRef.current = null;
  }, []);

  const onTalon = useCallback(
    (side: TalonSide, x: number, y: number) => {
      const bird = birdRef.current;
      const result = tapTalon(bird, side, performance.now());
      if (result === 'ignored') return;
      birdScoreClick(x, y);
      if (result === 'freed-left') {
        syncBirdUi(bird.kind, false);
        if (bird.kind && BIRD_SPECS[bird.kind].heat) {
          setCharSpots(recordChar(skinRef.current, BURN_SPOT));
          regrowAtRef.current = performance.now();
          burnLiveRef.current = false;
          setBurnLive(false);
        }
      }
    },
    [birdScoreClick, syncBirdUi]
  );

  const onToasted = useCallback(
    (index: number, x: number, y: number) => {
      const point = collectToasted(birdRef.current, index);
      if (!point) return;
      const inBag = itemsRef.current.find((i) => i.id === 'toasted-feather')?.count ?? 0;
      const have = Math.max(inBag, toastedGrantedRef.current);
      if (have >= TOASTED_MAX) return;
      toastedGrantedRef.current = have + 1;
      grantItem('toasted-feather', { x, y });
    },
    [grantItem]
  );

  const onBird = useCallback(
    (x: number, y: number) => {
      const result = tapRecedingBird(birdRef.current, performance.now(), groundYFor(window.innerHeight));
      if (result === 'ignored') return;
      birdScoreClick(x, y);
    },
    [birdScoreClick]
  );

  const onFeather = useCallback(
    (x: number, y: number) => {
      const kind = birdRef.current.kind;
      const point = takeFeather(birdRef.current);
      if (!kind || !point) return;
      grantItem(BIRD_SPECS[kind].itemId, { x, y });
    },
    [grantItem]
  );

  const onMartianReward = useCallback(
    (x: number, y: number) => {
      grantItem(MARTIAN_ITEM_ID, { x, y });
    },
    [grantItem]
  );

  useEffect(() => {
    if (stage !== 'cosmos') return;
    const id = setTimeout(() => setParked(null), LIFTOFF_MS + 300);
    return () => clearTimeout(id);
  }, [stage]);

  const toggleSheet = useCallback(() => {
    setSkinsOpen(false);
    setSheet((s) => {
      if (s === 'board') return null;
      if (performance.now() - lastHitRef.current < LEADERBOARD_OPEN_GUARD_MS) return s;
      return 'board';
    });
  }, []);

  const closeSheetOnOutside = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element | null;
    if (target?.closest(SHEET_SAFE_SELECTOR)) return;
    setSheet((s) => (s === null ? s : null));
  }, []);

  const removeOrb = useCallback((id: number) => {
    orbsRef.current = orbsRef.current.filter((o) => o.id !== id);
    orbElsRef.current.delete(id);
    setOrbViews((v) => v.filter((o) => o.id !== id));
  }, []);

  const spawnOrb = useCallback((kind: OrbKind) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edge = Math.floor(Math.random() * 4);
    const along = Math.random();
    const x = edge === 0 ? ORB_SPAWN_MARGIN : edge === 1 ? vw - ORB_SPAWN_MARGIN : ORB_SPAWN_MARGIN + along * (vw - 2 * ORB_SPAWN_MARGIN);
    const y = edge === 2 ? ORB_SPAWN_MARGIN : edge === 3 ? vh - ORB_SPAWN_MARGIN : ORB_SPAWN_MARGIN + along * (vh - 2 * ORB_SPAWN_MARGIN);
    const heading = Math.atan2(vh / 2 - y, vw / 2 - x) + (Math.random() - 0.5) * 1.2;
    const id = ++orbIdRef.current;
    orbsRef.current.push({
      id,
      kind,
      x,
      y,
      vx: Math.cos(heading) * ORB_DRIFT_SPEED,
      vy: Math.sin(heading) * ORB_DRIFT_SPEED,
      bornAt: performance.now(),
      phase: Math.random() * Math.PI * 2,
    });
    setOrbViews((v) => [...v, { id, kind }]);
  }, []);

  const checkOrbSchedule = useCallback(
    (prev: number, next: number) => {
      for (const kind of crossedOrbs(prev, next, orbFiredRef.current)) {
        orbFiredRef.current[kind] = true;
        spawnOrb(kind);
      }
    },
    [spawnOrb]
  );

  const runPaceCheck = useCallback(() => {
    lastCheckMsRef.current = playMsRef.current;
    const bird = birdRef.current;
    if (
      scoreRef.current >= PACE_END_SCORE ||
      orbsRef.current.length > 0 ||
      gateRef.current !== 'none' ||
      bird.pending ||
      isBirdBusy(bird) ||
      playMsRef.current - lastCatchUpMsRef.current < CATCHUP_COOLDOWN_MS
    ) {
      return;
    }
    const behind = behindFraction(paceTarget(playMsRef.current), scoreRef.current);
    const kind = catchUpKind(behind, catchUpCountRef.current);
    if (!kind) return;
    catchUpCountRef.current += 1;
    lastCatchUpMsRef.current = playMsRef.current;
    spawnOrb(kind);
  }, [spawnOrb]);

  const removeClone = useCallback((id: number) => {
    cloneMotionRef.current.delete(id);
    cloneElsRef.current.delete(id);
    setCloneViews((v) => v.filter((c) => c.id !== id));
  }, []);

  const applyMultiply = useCallback((now: number) => {
    const p = physicsRef.current;
    const vh = window.innerHeight;
    const kidY = groundYFor(vh) - KID_H;
    const sources: { x: number; y: number; big: boolean; tier: number }[] = [
      { x: p.x, y: p.y, big: true, tier: tierRef.current },
    ];
    for (const motion of kidMotionRef.current.values()) {
      sources.push({ x: motion.x, y: kidY, big: false, tier: Math.floor(Math.random() * (tierRef.current + 1)) });
    }
    for (const motion of cloneMotionRef.current.values()) {
      sources.push({ x: motion.x, y: motion.y, big: motion.big, tier: motion.tier });
    }
    let total = sources.length;
    const added: CloneView[] = [];
    for (const src of sources) {
      for (let i = 0; i < MULTIPLY_FACTOR - 1 && total < MAX_CHICKENS_ON_SCREEN; i++) {
        const id = ++cloneIdRef.current;
        const angle = Math.random() * Math.PI * 2;
        cloneMotionRef.current.set(id, {
          x: src.x + (Math.random() - 0.5) * CLONE_SPAWN_SPREAD,
          y: src.y + (Math.random() - 0.5) * CLONE_SPAWN_SPREAD,
          vx: Math.cos(angle) * CLONE_DRIFT_SPEED,
          vy: Math.sin(angle) * CLONE_DRIFT_SPEED,
          w: src.big ? CHICKEN_W : KID_W,
          h: src.big ? CHICKEN_H : KID_H,
          big: src.big,
          tier: src.tier,
          vanishAt: 0,
          blinking: false,
        });
        added.push({ id, big: src.big, tier: src.tier });
        total++;
      }
    }
    multiplyStartRef.current = now;
    for (const motion of cloneMotionRef.current.values()) {
      motion.blinking = false;
      motion.vanishAt =
        now + MULTIPLY_VANISH_EARLIEST_MS + Math.random() * (MULTIPLY_DURATION_MS - MULTIPLY_VANISH_EARLIEST_MS);
    }
    for (const el of cloneElsRef.current.values()) el.classList.remove('chicken-clone-blink');
    setCloneViews((v) => [...v, ...added]);
  }, []);

  const collectOrb = useCallback(
    (id: number) => {
      const orb = orbsRef.current.find((o) => o.id === id);
      if (!orb) return;
      const now = performance.now();
      removeOrb(id);
      for (const color of ORB_SHARD_COLORS) spawnShards(orb.x, orb.y, ORB_COLLECT_SHARDS / 2, color);
      const riser = playPowerUp(false);
      recordPlay({ type: 'powerup', key: riser.key, synth: riser.synth, at: Date.now() });
      const buff = cursorBuffRef.current;
      if (orb.kind === 'multiply') applyMultiply(now);
      else if (orb.kind === 'frenzy') frenzyUntilRef.current = Math.max(now, frenzyUntilRef.current) + FRENZY_DURATION_MS;
      else if (orb.kind === 'cursor5') buff.x5Until = Math.max(now, buff.x5Until) + CURSOR_BUFF_MS;
      else buff.x3Until = Math.max(now, buff.x3Until) + CURSOR_BUFF_MS;
    },
    [removeOrb, spawnShards, playPowerUp, recordPlay, applyMultiply]
  );

  const tickAbilities = useCallback(
    (ts: number, dtMs: number, vw: number, vh: number) => {
      if (scoreRef.current > 0 && gateRef.current === 'none' && !document.hidden) {
        playMsRef.current += dtMs;
        if (playMsRef.current - lastCheckMsRef.current >= CATCHUP_CHECK_MS) runPaceCheck();
      }
      const frenzyLeft = frenzyUntilRef.current - ts;
      const frenzyEl = frenzyElRef.current;
      if (frenzyEl) {
        const live = frenzyLeft > 0;
        frenzyEl.style.opacity = live ? (frenzyLeft < FRENZY_BLINK_MS && Math.floor(ts / 250) % 2 === 0 ? '0.45' : '1') : '0';
        if (live) frenzyEl.textContent = `Frenzy x2 ${Math.ceil(frenzyLeft / 1000)}s`;
      }
      const orbs = orbsRef.current;
      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        const age = ts - orb.bornAt;
        if (age >= ORB_LIFETIME_MS) {
          removeOrb(orb.id);
          continue;
        }
        orb.x += orb.vx * dtMs;
        orb.y += orb.vy * dtMs;
        if (orb.x < ORB_SPAWN_MARGIN || orb.x > vw - ORB_SPAWN_MARGIN) orb.vx = -orb.vx;
        if (orb.y < ORB_SPAWN_MARGIN || orb.y > vh - ORB_SPAWN_MARGIN) orb.vy = -orb.vy;
        orb.x = Math.max(ORB_SPAWN_MARGIN, Math.min(vw - ORB_SPAWN_MARGIN, orb.x));
        orb.y = Math.max(ORB_SPAWN_MARGIN, Math.min(vh - ORB_SPAWN_MARGIN, orb.y));
        keepOutOfHud(hudZone(vw), orb, ORB_HUD_HALF, ORB_HUD_HALF, true);
        const el = orbElsRef.current.get(orb.id);
        if (el) {
          const wobble = Math.sin(ts * ORB_WOBBLE_FREQUENCY + orb.phase) * ORB_WOBBLE_AMPLITUDE;
          el.style.transform = `translate(${orb.x - ORB_RADIUS}px, ${orb.y + wobble - ORB_RADIUS}px)`;
          const remaining = ORB_LIFETIME_MS - age;
          el.style.opacity = remaining < ORB_FADE_MS ? String(remaining / ORB_FADE_MS) : '1';
        }
      }

      const clones = cloneMotionRef.current;
      if (clones.size > 0) {
        const sinceStart = ts - multiplyStartRef.current;
        for (const [id, motion] of clones) {
          if (ts >= motion.vanishAt) {
            const cx = motion.x + motion.w / 2;
            const cy = motion.y + motion.h / 2;
            blackHolesRef.current.push({ x: cx, y: cy, bornAt: ts });
            streaksRef.current.push(...shortStreaks(cx, cy, ts, 6));
            spawnFeathers(cx, cy, VANISH_FEATHERS);
            vanishedRef.current++;
            removeClone(id);
            continue;
          }
          motion.x += motion.vx * dtMs;
          motion.y += motion.vy * dtMs;
          keepOutOfHud(hudZone(vw), motion, motion.w / 2, motion.h / 2, false);
          if (motion.x < 0 || motion.x > vw - motion.w) motion.vx = -motion.vx;
          if (motion.y < 0 || motion.y > vh - motion.h) motion.vy = -motion.vy;
          motion.x = Math.max(0, Math.min(vw - motion.w, motion.x));
          motion.y = Math.max(0, Math.min(vh - motion.h, motion.y));
          const el = cloneElsRef.current.get(id);
          if (el) {
            el.style.transform = `translate(${motion.x}px, ${motion.y}px) scaleX(${motion.vx < 0 ? -1 : 1})`;
            if (!motion.blinking && sinceStart >= MULTIPLY_BLINK_START_MS) {
              motion.blinking = true;
              el.classList.add('chicken-clone-blink');
              el.dataset.blinking = '1';
            }
          }
        }
      }
      const holes = blackHolesRef.current;
      for (let i = holes.length - 1; i >= 0; i--) {
        if (ts - holes[i].bornAt > BLACK_HOLE_LIFE_MS) holes.splice(i, 1);
      }

      const buff = cursorBuffRef.current;
      const x5 = ts < buff.x5Until;
      const x3 = ts < buff.x3Until;
      const key = `${x5 ? 1 : 0}${x3 ? 1 : 0}`;
      if (key !== cursorKeyRef.current) {
        cursorKeyRef.current = key;
        const offsets = buildCursorOffsets(x5, x3);
        cursorOffsetsRef.current = offsets;
        setOverlayOffsets(offsets.length > 1 ? offsets.filter((o) => !o.hidden) : []);
      }
      const mouse = mouseRef.current;
      const els = cursorElsRef.current;
      const overlays = cursorOffsetsRef.current.length > 1 ? cursorOffsetsRef.current.filter((o) => !o.hidden) : [];
      for (let i = 0; i < overlays.length; i++) {
        const el = els[i];
        if (el) {
          el.style.transform = `translate(${mouse.x + overlays[i].dx - CURSOR_HAND_HOT_X}px, ${mouse.y + overlays[i].dy - CURSOR_HAND_HOT_Y}px)`;
        }
      }
    },
    [removeOrb, removeClone, spawnFeathers, runPaceCheck]
  );

  const hit = useCallback(
    (e?: ReactMouseEvent<HTMLDivElement>, extra?: boolean, source?: { x: number; y: number }) => {
      if (gateRef.current !== 'none') return;
      const now = performance.now();
      const p = physicsRef.current;
      const plain = source !== undefined;
      const bird = birdRef.current;
      if (!plain && isGripping(bird.phase)) return;
      let award = 1;
      const hyper = hyperRef.current;
      const tp = teleportRef.current;
      if (plain) {
        award = 1;
      } else if (hyper.phase === 'burst') {
        award = HYPER_BONUS;
        hyper.phase = 'recover';
        hyper.until = now + HYPER_RECOVER_MS;
      } else if (tp.decoys && tp.arrivedFrames >= 0 && tp.arrivedFrames <= TELEPORT_BONUS_FRAMES) {
        award = TELEPORT_BONUS;
      }
      if (award > 1) setBonus({ amount: award, id: now });
      if (!plain && modeRef.current === 'ground') {
        modeRef.current = 'flying';
        p.vy = -BASE_SPEED * 1.2;
        p.vx = facingRef.current * BASE_SPEED * 0.8;
      }
      const visit = visitRef.current;
      if (!plain && visit.phase !== 'idle') {
        visit.phase = 'idle';
        visit.cooldownUntil = now + VISIT_COOLDOWN_MIN_MS + Math.random() * VISIT_COOLDOWN_SPREAD_MS;
      }
      const prevScore = scoreRef.current;
      const frenzyOn = now < frenzyUntilRef.current;
      const next = prevScore + award * multRef.current * (frenzyOn ? FRENZY_FACTOR : 1);
      scoreRef.current = next;
      const shown = Math.floor(next);
      setScore(shown);
      checkOrbSchedule(Math.floor(prevScore), shown);
      queueBirdsForScore(bird, Math.floor(prevScore), shown);
      if (!plain && noteCalmClick(bird)) restoreBirdSnapshot();
      const buff = cursorBuffRef.current;
      if (now < buff.x5Until) buff.x5Until += CURSOR_EXTEND_PER_CLICK_MS;
      if (now < buff.x3Until) buff.x3Until += CURSOR_EXTEND_PER_CLICK_MS;
      if (frenzyOn) frenzyUntilRef.current = Math.min(frenzyUntilRef.current + FRENZY_EXTEND_PER_CLICK_MS, now + FRENZY_CAP_MS);
      speedRef.current = speedForScore(shown);
      const currentStage = stageRef.current;
      const rawStage = stageForScore(shown);
      const cosmosOpen = shown >= COSMOS_FORCE_SCORE || (!bird.pending && !isBirdBusy(bird));
      const scoreStage = isSpaceStage(rawStage) && !cosmosOpen ? currentStage : rawStage;
      cosmosProgressRef.current = cosmosProgress(shown);
      const nextStage = scoreStage === 'moon' && currentStage === 'pilot' ? 'rocket' : scoreStage;
      if (seqRef.current === 'planeExit') seqClicksRef.current += 1;
      if (
        stageRank(nextStage) > stageRank(currentStage) &&
        !(nextStage === 'moon' && currentStage === 'rocket')
      ) {
        enterStage(nextStage, now);
      }
      heatRef.current = Math.min(HEAT_MAX, heatRef.current + HEAT_PER_CLICK);
      lastHitRef.current = now;
      const cx = source ? source.x : p.x + CHICKEN_W / 2;
      const cy = source ? source.y : p.y + CHICKEN_H / 2;
      const previousTier = tierRef.current;
      const newTier = tierForScore(shown);
      if (newTier !== previousTier) {
        tierRef.current = newTier;
        setTier(newTier);
        setFlashTier(newTier);
        const riser = playPowerUp(newTier === FINAL_TIER);
        recordPlay({ type: 'powerup', key: riser.key, synth: riser.synth, at: Date.now() });
        spawnShards(cx, cy, SHARDS_PER_TRANSFORM, TIERS[previousTier].body);
        spawnFeathers(cx, cy, FEATHERS_PER_TRANSFORM);
        heatRef.current = Math.min(HEAT_MAX, heatRef.current + EVOLUTION_HEAT);
      } else {
        const rate =
          TIERS[newTier].screamRate * (1 - SCREAM_JITTER / 2 + Math.random() * SCREAM_JITTER);
        const hawkCall = screamOverrideRef.current === 'hawk';
        const played = hawkCall ? playHawk() : playScream(rate);
        if (played) {
          recordPlay({ type: hawkCall ? 'hawk' : 'scream', key: played.key, rate: played.rate, at: Date.now() });
        }
        const count = FEATHERS_PER_CLICK + (Math.random() < FEATHER_EXTRA_CHANCE ? 1 : 0);
        if (!isBirdBusy(bird)) spawnFeathers(cx, cy, count);
      }
      if (!extra) applySquash(e);
      const ceremony = ceremonyRef.current;
      if (
        !plain &&
        !isScriptedStage(stageRef.current) &&
        !rootSplitRef.current &&
        !holdRef.current &&
        !isBirdBusy(bird) &&
        ceremony.phase === 'idle' &&
        now >= ceremony.cooldownUntil &&
        heatRef.current >= CEREMONY_HEAT &&
        comboRef.current.count >= CEREMONY_COMBO
      ) {
        ceremony.phase = 'counting';
        ceremony.value = CEREMONY_COUNT_FROM;
        ceremony.nextTickAt = now + CEREMONY_TICK_MS;
        countdownRef.current = ceremony.value;
        setCountdown(ceremony.value);
      }
    },
    [playPowerUp, playScream, playHawk, recordPlay, spawnShards, spawnFeathers, applySquash, enterStage, checkOrbSchedule, restoreBirdSnapshot]
  );

  useEffect(() => {
    hitRef.current = hit;
  }, [hit]);

  useEffect(() => {
    mountAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!progress.done || loaderPhase !== 'loading') return;
    const elapsed = performance.now() - mountAtRef.current;
    const id = setTimeout(
      () => setLoaderPhase('fading'),
      Math.max(0, MIN_LOADER_MS - elapsed)
    );
    return () => clearTimeout(id);
  }, [progress.done, loaderPhase]);

  useEffect(() => {
    if (loaderPhase !== 'fading') return;
    const id = setTimeout(() => setLoaderPhase('done'), LOADER_FADE_MS);
    return () => clearTimeout(id);
  }, [loaderPhase]);

  useEffect(() => {
    const bridge: ChickenBridge = {
      plays: playsRef.current,
      state: () => ({
        score: Math.floor(scoreRef.current),
        scoreExact: scoreRef.current,
        speed: speedRef.current,
        mult: multRef.current,
        bird: birdStateView(birdRef.current),
        tier: tierRef.current,
        mercy: mercyRef.current,
        morph: morphForScore(scoreRef.current),
        auraLevel: auraLevelFor(scoreRef.current, mercyRef.current),
        rotation: physicsRef.current.rotation,
        vx: physicsRef.current.vx,
        vy: physicsRef.current.vy,
        mood: moodRef.current,
        lightning: lightningForScore(scoreRef.current),
        arcs: arcsRef.current.length,
        mode: modeRef.current,
        feathers: feathersRef.current.length,
        hyper: hyperRef.current.phase,
        ghosts: ghostsRef.current.length,
        teleportFrames: teleportRef.current.arrivedFrames,
        squash: squashRef.current,
        kids: kidsCountRef.current,
        countdown: countdownRef.current,
        portal: portalRef.current.phase,
        sqmode: sqModeRef.current,
        skin: skinRef.current,
        scramble: scrambleRef.current.phase,
        visit: visitRef.current.phase,
        sizeBoost: sizeBoostRef.current,
        bend: bendRef.current,
        stage: stageRef.current,
        stagePhase: stagePhaseRef.current,
        seq: seqRef.current,
        gate: gateRef.current,
        pos: { x: physicsRef.current.x, y: physicsRef.current.y },
        flightRoll: rollRef.current,
        scene3dReady: scene3dReadyRef.current,
        scene3dProgress: getSpaceProgress().pct,
        scene3dGate: gateRef.current,
        orbs: orbsRef.current.map((o) => ({ id: o.id, kind: o.kind, label: ORB_LABELS[o.kind], x: o.x, y: o.y })),
        clones: cloneMotionRef.current.size,
        clonesBlinking: [...cloneMotionRef.current.values()].filter((c) => c.blinking).length,
        vanished: vanishedRef.current,
        chickens: 1 + kidMotionRef.current.size + cloneMotionRef.current.size,
        cursors: cursorOffsetsRef.current.length,
        cursorOffsets: cursorOffsetsRef.current,
        pilotTeleports: pilotTeleportsRef.current,
        frenzyMs: Math.max(0, frenzyUntilRef.current - performance.now()),
        pace: {
          target: paceTarget(playMsRef.current),
          actual: scoreRef.current,
          behindPct: behindFraction(paceTarget(playMsRef.current), scoreRef.current) * 100,
          nextCheckIn: Math.max(0, CATCHUP_CHECK_MS - (playMsRef.current - lastCheckMsRef.current)),
          playMs: playMsRef.current,
        },
        cursorBuffMs: {
          x5: Math.max(0, cursorBuffRef.current.x5Until - performance.now()),
          x3: Math.max(0, cursorBuffRef.current.x3Until - performance.now()),
        },
        pieces: chickMotionRef.current.size,
        splitLevels: [...chickMotionRef.current.values()].map((c) => c.level).sort(),
        held: !!holdRef.current?.grabbed,
        holdProgress: holdRef.current
          ? Math.min(1, holdRef.current.ms / (holdMsOverrideRef.current ?? HOLD_MS))
          : 0,
        holdDrift: holdRef.current?.driftTotal ?? 0,
        bandaid: woundRef.current ? woundRef.current.hp : null,
        woundOpen: !!woundRef.current?.open,
        drops: dropsRef.current.length,
        pools: poolsRef.current.length,
        rootSplit: rootSplitRef.current,
      }),
      boost: (n: number) => {
        for (let i = 0; i < n; i++) hit();
      },
      spin: (v: number) => {
        physicsRef.current.rv += v;
      },
      forceHyper: () => {
        const now = performance.now();
        hyperRef.current = {
          phase: 'burst',
          until: now + HYPER_DURATION_MS,
          nextAt: now + HYPER_DELAY_MIN_MS,
          mult: HYPER_MULT_MIN + Math.random() * HYPER_MULT_SPREAD,
        };
        if (modeRef.current === 'ground') modeRef.current = 'flying';
      },
      forceTeleport: (decoys: boolean) => {
        if (modeRef.current === 'ground') modeRef.current = 'flying';
        const tp = teleportRef.current;
        tp.phase = 'idle';
        tp.nextAt = performance.now();
        tp.arrivedFrames = -1;
        tp.forcedDecoys = decoys;
      },
      forceKid: () => {
        spawnKid();
      },
      forceCeremony: () => {
        const ceremony = ceremonyRef.current;
        if (ceremony.phase !== 'idle') return;
        ceremony.phase = 'counting';
        ceremony.value = CEREMONY_COUNT_FROM;
        ceremony.nextTickAt = performance.now() + CEREMONY_TICK_MS;
        countdownRef.current = ceremony.value;
        setCountdown(ceremony.value);
      },
      forcePortal: () => {
        if (modeRef.current === 'ground') modeRef.current = 'flying';
        const sides: PortalSide[] = ['left', 'right', 'top', 'bottom'];
        beginPortal(sides[Math.floor(Math.random() * sides.length)], performance.now());
      },
      forceScramble: () => {
        if (modeRef.current === 'ground') modeRef.current = 'flying';
        const scramble = scrambleRef.current;
        const p = physicsRef.current;
        scramble.phase = 'running';
        scramble.until = performance.now() + SCRAMBLE_DURATION_MS;
        scramble.originX = p.x;
        scramble.originY = p.y;
        scramble.targetX = p.x;
        scramble.targetY = p.y;
        scramble.nextDartAt = 0;
      },
      forceVisit: () => {
        const ids = [...kidMotionRef.current.keys()];
        if (ids.length === 0) return;
        if (modeRef.current === 'ground') modeRef.current = 'flying';
        const motion = kidMotionRef.current.get(ids[0]);
        if (motion) motion.mergeAt = 0;
        const visit = visitRef.current;
        visit.phase = 'seeking';
        visit.kidId = ids[0];
      },
      forceMerge: () => {
        const ids = [...kidMotionRef.current.keys()];
        if (ids.length > 0) startKidMerge(ids[0]);
      },
      openSheet: () => setSheet('board'),
      setSeqTimeScale: (n: number) => {
        seqScaleRef.current = n;
      },
      setScore: (n: number) => {
        for (const kind of Object.keys(ORB_THRESHOLDS) as OrbKind[]) {
          if (ORB_THRESHOLDS[kind] < n) orbFiredRef.current[kind] = true;
        }
        scoreRef.current = n - 1;
        hit();
      },
      forceOrb: (kind: OrbKind) => {
        orbFiredRef.current[kind] = true;
        spawnOrb(kind);
      },
      collectOrb: (kind: OrbKind) => {
        const orb = orbsRef.current.find((o) => o.kind === kind);
        if (orb) collectOrb(orb.id);
      },
      forceBird: (kind: BirdKind) => {
        queueBird(birdRef.current, kind);
      },
      placeChicken: (x: number, y: number) => {
        const p = physicsRef.current;
        p.x = x;
        p.y = y;
        p.vx = 0;
        p.vy = 0;
        if (modeRef.current === 'ground') modeRef.current = 'flying';
      },
      useItem: (id: string) => useItem(id),
      selectSkin: (id: string) => selectSkin(id),
      spawnMartian: (kind?: string) => spawnMartianNow(MARTIAN_KINDS.find((k): k is MartianKind => k === kind)),
      martianClicks: () => readMartianClicks(),
      forcePaceCheck: () => runPaceCheck(),
      fastForward: (ms: number) => {
        playMsRef.current += ms;
        frenzyUntilRef.current -= ms;
        shiftBirdTime(birdRef.current, ms);
        for (const o of orbsRef.current) o.bornAt -= ms;
        for (const c of cloneMotionRef.current.values()) c.vanishAt -= ms;
        multiplyStartRef.current -= ms;
        cursorBuffRef.current.x5Until -= ms;
        cursorBuffRef.current.x3Until -= ms;
        for (const pool of poolsRef.current) pool.born -= ms;
      },
      forceToss: (level?: number) => forceTossAt(level),
      forceReform: () => {
        forceReformRef.current = true;
      },
      forceBandaid: () => {
        if (!rootSplitRef.current) setWoundState({ hp: BANDAID_HP, open: false });
      },
      holdMsOverride: (ms: number) => {
        holdMsOverrideRef.current = ms > 0 ? ms : null;
      },
      inventory: () => itemsRef.current,
      grantItem: (id: string, fromX?: number, fromY?: number) => {
        if (!isGameItemId(id)) return;
        grantItem(id, fromX !== undefined && fromY !== undefined ? { x: fromX, y: fromY } : undefined);
      },
    };
    bridgeWindow().__chicken = bridge;
    return () => {
      if (bridgeWindow().__chicken === bridge) delete bridgeWindow().__chicken;
    };
  }, [hit, spawnKid, beginPortal, startKidMerge, spawnOrb, collectOrb, forceTossAt, setWoundState, grantItem, useItem, selectSkin, runPaceCheck]);

  const startBirdNow = useCallback(
    (ts: number, kind: BirdKind) => {
      const bird = birdRef.current;
      const p = physicsRef.current;
      const snapshot: BirdSnapshot = {
        speed: speedRef.current,
        heat: heatRef.current,
        vx: p.vx,
        vy: p.vy,
        facing: facingRef.current,
        mode: modeRef.current,
      };
      for (const id of [...kidMotionRef.current.keys()]) removeKid(id);
      for (const id of [...cloneMotionRef.current.keys()]) removeClone(id);
      orbsRef.current = [];
      setOrbViews([]);
      cursorBuffRef.current.x5Until = 0;
      cursorBuffRef.current.x3Until = 0;
      hyperRef.current.phase = 'idle';
      scrambleRef.current.phase = 'idle';
      visitRef.current.phase = 'idle';
      sizeBoostRef.current = 0;
      modeRef.current = 'flying';
      setParked(null);
      let hud: HudRect | null = null;
      const stageEl = chickenElRef.current?.parentElement;
      if (stageEl) {
        for (const el of stageEl.querySelectorAll('[data-hud]')) {
          const r = el.getBoundingClientRect();
          hud = hud
            ? { left: Math.min(hud.left, r.left), top: Math.min(hud.top, r.top), right: Math.max(hud.right, r.right), bottom: Math.max(hud.bottom, r.bottom) }
            : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }
      }
      startBird(bird, kind, ts, p.x + CHICKEN_W / 2, p.y + CHICKEN_H / 2, window.innerWidth, window.innerHeight, snapshot, hud, { w: CHICKEN_W, h: CHICKEN_H });
      bird.talonWeight = talonWeightFor(kind, multRef.current);
      syncBirdUi(kind, false);
    },
    [removeKid, removeClone, syncBirdUi]
  );

  useEffect(() => {
    const p = physicsRef.current;
    p.x = window.innerWidth / 2 - CHICKEN_W / 2;
    p.y = groundYFor(window.innerHeight) - CHICKEN_H;
    p.vx = 0;
    p.vy = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endHold);
    window.addEventListener('pointercancel', endHold);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endHold);
      window.removeEventListener('pointercancel', endHold);
    };
  }, [endHold]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(SHEET_SAFE_SELECTOR)) return;
      if (performance.now() < suppressClickUntilRef.current) return;
      const p = physicsRef.current;
      const kidY = groundYFor(window.innerHeight) - KID_H;
      for (const offset of cursorOffsetsRef.current) {
        if (offset.dx === 0 && offset.dy === 0) continue;
        const px = e.clientX + offset.dx;
        const py = e.clientY + offset.dy;
        const orb = orbsRef.current.find((o) => pointInCircle(px, py, o.x, o.y, ORB_RADIUS));
        if (orb) {
          collectOrb(orb.id);
          continue;
        }
        if (!rootSplitRef.current && pointInRect(px, py, p.x, p.y, CHICKEN_W, CHICKEN_H)) hit(undefined, true);
        for (const piece of chickMotionRef.current.values()) {
          const size = chickSize(piece.level);
          if (pointInRect(px, py, piece.x - size.w / 2, piece.y - size.h / 2, size.w, size.h)) {
            hit(undefined, true, { x: piece.x, y: piece.y });
          }
        }
        for (const [id, motion] of kidMotionRef.current) {
          if (pointInRect(px, py, motion.x, kidY, KID_W, KID_H)) {
            clickKid(id);
            hit(undefined, true);
          }
        }
        for (const motion of cloneMotionRef.current.values()) {
          if (pointInRect(px, py, motion.x, motion.y, motion.w, motion.h)) hit(undefined, true);
        }
      }
    };
    const onDown = () => cursorLayerRef.current?.setAttribute('data-pressed', 'true');
    const onUp = () => cursorLayerRef.current?.setAttribute('data-pressed', 'false');
    window.addEventListener('click', onClick);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [hit, collectOrb, clickKid]);

  useEffect(() => {
    return () => {
      if (squashTimerRef.current) clearTimeout(squashTimerRef.current);
      if (squashAttrTimerRef.current) clearTimeout(squashAttrTimerRef.current);
      if (franticTimerRef.current) clearInterval(franticTimerRef.current);
      if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const animate = (ts: number) => {
      if (gateRef.current !== 'none') {
        lastTimeRef.current = ts;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const rawDt = ts - lastTimeRef.current;
      const dtMs = Math.min(rawDt, MAX_DT);
      const dt = dtMs / 16.67;
      lastTimeRef.current = ts;

      if (!lastHitRef.current) lastHitRef.current = ts;
      const target = mercyTargetFor(ts - lastHitRef.current);
      const currentMercy = mercyRef.current;
      const mercy =
        target < currentMercy
          ? Math.max(target, currentMercy - MERCY_FOLLOW_PER_MS * dtMs)
          : Math.min(target, currentMercy + MERCY_RECOVERY_PER_MS * dtMs);
      mercyRef.current = mercy;
      const captionVisible = mercy < MERCY_CAPTION_THRESHOLD;
      if (captionVisible !== mercyCaptionRef.current) {
        mercyCaptionRef.current = captionVisible;
        setMercyCaption(captionVisible);
      }

      heatRef.current = Math.max(0, heatRef.current - HEAT_DECAY_PER_MS * dtMs);
      const nextMood = moodEyes(scoreRef.current, heatRef.current);
      if (nextMood !== moodRef.current) {
        moodRef.current = nextMood;
        setMood(nextMood);
      }

      const ceremony = ceremonyRef.current;
      if (ceremony.phase === 'counting' && ts >= ceremony.nextTickAt) {
        ceremony.value -= 1;
        if (ceremony.value <= 0) {
          ceremony.phase = 'squeezing';
          ceremony.cooldownUntil =
            ts + CEREMONY_COOLDOWN_MIN_MS + Math.random() * CEREMONY_COOLDOWN_SPREAD_MS;
          countdownRef.current = null;
          setCountdown(null);
          const rubber = rubberElRef.current;
          if (rubber) {
            rubber.classList.add('chicken-mega-squeeze');
            squeak(1);
            recordPlay({ type: 'squeak', at: Date.now() });
            if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
            megaTimerRef.current = setTimeout(() => {
              rubber.classList.remove('chicken-mega-squeeze');
              ceremonyRef.current.phase = 'idle';
            }, MEGA_SQUEEZE_MS);
          } else {
            ceremony.phase = 'idle';
          }
        } else {
          ceremony.nextTickAt += CEREMONY_TICK_MS;
          countdownRef.current = ceremony.value;
          setCountdown(ceremony.value);
        }
      }
      if (countdownElRef.current) {
        const mm = mouseRef.current;
        countdownElRef.current.style.transform = `translate(${mm.x + 14}px, ${mm.y + 18}px)`;
      }

      const p = physicsRef.current;
      const m = mouseRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sc = scoreRef.current;
      const flying = modeRef.current === 'flying';
      tickHold(ts, dtMs, dt);
      const bird = birdRef.current;
      const upcoming = nextBird(bird);
      if (
        upcoming &&
        !rootSplitRef.current &&
        holdRef.current === null &&
        portalRef.current.phase === 'idle' &&
        teleportRef.current.phase === 'idle'
      ) {
        startBirdNow(ts, upcoming);
      }
      const birdTick = tickBird(bird, birdElsRef.current, {
        ts,
        dtMs,
        vw,
        vh,
        chickenCx: p.x + CHICKEN_W / 2,
        chickenCy: p.y + CHICKEN_H / 2,
        groundY: groundYFor(vh),
      });
      if (birdTick.restore) restoreBirdSnapshot();
      if (birdTick.grabbed) {
        syncBirdUi(bird.kind, true);
        setParked(null);
      }
      if (bird.phase === 'done' && !bird.feather && !nextBird(bird)) syncBirdUi(null, false);
      if (birdTick.heat !== distressRef.current) {
        distressRef.current = birdTick.heat;
        setDistress(birdTick.heat);
      }
      const liveBurn = birdTick.heat === 2;
      if (liveBurn && !burnLiveRef.current) {
        burnLiveRef.current = true;
        setBurnLive(true);
      }
      if (birdTick.sizzle !== sizzleRef.current) {
        if (sizzleRef.current === 0 && birdTick.sizzle > 0) recordPlay({ type: 'sizzle', at: Date.now() });
        sizzleRef.current = birdTick.sizzle;
        sizzle(birdTick.sizzle);
      }
      const regrow = regrowAtRef.current ? Math.min(1, (ts - regrowAtRef.current) / REGROW_MS) : 1;
      if (regrow >= 1) regrowAtRef.current = 0;
      if (chickenElRef.current) {
        const key = `${burnLiveRef.current ? 1 : 0}|${birdTick.burn.toFixed(3)}|${birdTick.tint.toFixed(3)}|${regrow.toFixed(3)}`;
        if (key !== heatVarsRef.current) {
          heatVarsRef.current = key;
          writeHeatVars(chickenElRef.current, burnLiveRef.current, birdTick.burn, birdTick.tint, regrow);
        }
      }
      const rootBusy = rootSplitRef.current || holdRef.current !== null || isBirdBusy(bird);

      const hyper = hyperRef.current;
      const stNow = stageRef.current;
      const scripted = isScriptedStage(stNow);
      const seqNow = seqRef.current;
      const seqElapsed = (ts - seqStartRef.current) * seqScaleRef.current;
      const flightKind: FlightKind =
        stNow === 'pilot'
          ? 'plane'
          : stNow === 'rocket'
            ? seqNow === 'planeExit' || seqNow === 'explode' || seqNow === 'drift'
              ? 'float'
              : 'scripted'
            : 'none';
      rollRef.current = 1;
      if (flying && !rootBusy && !scripted && sc >= HYPER_MIN_SCORE) {
        if (hyper.phase === 'idle') {
          if (!hyper.nextAt) {
            hyper.nextAt = ts + HYPER_DELAY_MIN_MS + Math.random() * HYPER_DELAY_SPREAD_MS;
          } else if (ts >= hyper.nextAt) {
            if (
              ts - lastHitRef.current < CLICK_ACTIVE_WINDOW_MS &&
              Math.random() < EVENT_DEFER_CHANCE
            ) {
              hyper.nextAt = ts + HYPER_DELAY_MIN_MS + Math.random() * HYPER_DELAY_SPREAD_MS;
            } else {
              hyper.phase = 'burst';
              hyper.until = ts + HYPER_DURATION_MS;
              hyper.mult = HYPER_MULT_MIN + Math.random() * HYPER_MULT_SPREAD;
            }
          }
        }
      }
      if (hyper.phase === 'burst' && ts >= hyper.until) {
        hyper.phase = 'recover';
        hyper.until = ts + HYPER_RECOVER_MS;
      } else if (hyper.phase === 'recover' && ts >= hyper.until) {
        hyper.phase = 'idle';
        hyper.nextAt = ts + HYPER_DELAY_MIN_MS + Math.random() * HYPER_DELAY_SPREAD_MS;
      }
      const hyperFactor =
        hyper.phase === 'burst' ? hyper.mult : hyper.phase === 'recover' ? HYPER_RECOVER_FACTOR : 1;

      const sp = speedRef.current * mercy * hyperFactor;

      const portal = portalRef.current;
      if (portal.phase === 'splat' && ts >= portal.until) {
        portal.phase = 'gone';
        portal.until = ts + PORTAL_HIDE_MS;
        if (rubberElRef.current) delete rubberElRef.current.dataset.splat;
        if (chickenElRef.current) chickenElRef.current.style.opacity = '0';
        if (portal.entrySide) {
          const side = portal.entrySide;
          portalsRef.current.push({
            x: side === 'left' ? 10 : side === 'right' ? vw - 10 : p.x + CHICKEN_W / 2,
            y: side === 'top' ? 10 : side === 'bottom' ? vh - 10 : p.y + CHICKEN_H / 2,
            side,
            born: ts,
            color: auraRgbFor(sc),
          });
        }
      } else if (portal.phase === 'gone' && ts >= portal.until && portal.exit) {
        const { side, x, y } = portal.exit;
        p.x = Math.max(0, Math.min(x, vw - CHICKEN_W));
        p.y = Math.max(0, Math.min(y, vh - CHICKEN_H));
        const inward =
          side === 'left' ? 0 : side === 'right' ? Math.PI : side === 'top' ? Math.PI / 2 : -Math.PI / 2;
        const exitAngle = inward + (Math.random() - 0.5) * 1.2;
        p.vx = Math.cos(exitAngle) * BASE_SPEED;
        p.vy = Math.sin(exitAngle) * BASE_SPEED;
        const ecx = p.x + CHICKEN_W / 2;
        const ecy = p.y + CHICKEN_H / 2;
        portalsRef.current.push({
          x: side === 'left' ? 10 : side === 'right' ? vw - 10 : ecx,
          y: side === 'top' ? 10 : side === 'bottom' ? vh - 10 : ecy,
          side,
          born: ts,
          color: auraRgbFor(sc),
        });
        spawnFeathers(ecx, ecy, 4);
        if (chickenElRef.current) chickenElRef.current.style.opacity = '1';
        portal.phase = 'idle';
        portal.exit = null;
        portal.entrySide = null;
        portal.hotUntil = ts + PORTAL_HOT_WINDOW_MS;
        portal.cooldownUntil = ts + EDGE_SPECIAL_COOLDOWN_MS;
      }

      if (
        visitRef.current.phase === 'visiting' &&
        !kidMotionRef.current.has(visitRef.current.kidId)
      ) {
        visitRef.current.phase = 'idle';
        visitRef.current.cooldownUntil = ts + VISIT_COOLDOWN_MIN_MS;
      }

      const tp = teleportRef.current;
      if (
        stNow === 'pilot' &&
        pilotTeleportsRef.current === 0 &&
        tp.phase === 'idle' &&
        ts - stageStartRef.current >= PILOT_TELEPORT_AFTER_MS
      ) {
        const cx0 = p.x + CHICKEN_W / 2;
        const cy0 = p.y + CHICKEN_H / 2;
        const minDist = Math.hypot(vw, vh) * PILOT_TELEPORT_MIN_DIST_FRAC;
        let tx = cx0;
        let ty = cy0;
        for (let attempt = 0; attempt < 12; attempt++) {
          tx = 140 + Math.random() * Math.max(120, vw - 280);
          ty = 280 + Math.random() * Math.max(120, vh - 400);
          if (Math.hypot(tx - cx0, ty - cy0) >= minDist) break;
        }
        pilotTeleportsRef.current = 1;
        tp.phase = 'out';
        tp.outUntil = ts + PILOT_TELEPORT_OUT_MS;
        tp.origin = { x: cx0, y: cy0 };
        tp.target = { x: tx, y: ty };
        tp.decoys = false;
        streaksRef.current.push(...shortStreaks(cx0, cy0, ts));
        if (chickenElRef.current) chickenElRef.current.style.opacity = '0';
        addGhost(tx - CHICKEN_W / 2, ty - CHICKEN_H / 2, true);
      }
      if (
        flying &&
        !rootBusy &&
        !scripted &&
        (sc >= TELEPORT_MIN_SCORE || tp.forcedDecoys !== null) &&
        tp.phase === 'idle' &&
        portal.phase === 'idle' &&
        scrambleRef.current.phase === 'idle'
      ) {
        if (!tp.nextAt) {
          tp.nextAt = ts + TELEPORT_DELAY_MIN_MS + Math.random() * TELEPORT_DELAY_SPREAD_MS;
        } else if (
          ts - lastHitRef.current < CLICK_ACTIVE_WINDOW_MS &&
          tp.forcedDecoys === null &&
          ts >= tp.nextAt &&
          Math.random() < EVENT_DEFER_CHANCE
        ) {
          tp.nextAt = ts + TELEPORT_DELAY_MIN_MS + Math.random() * TELEPORT_DELAY_SPREAD_MS;
        } else if (ts >= tp.nextAt) {
          const cx0 = p.x + CHICKEN_W / 2;
          const cy0 = p.y + CHICKEN_H / 2;
          const minDist = Math.hypot(vw, vh) * TELEPORT_MIN_DIST_FRAC;
          let tx = cx0;
          let ty = cy0;
          for (let attempt = 0; attempt < 12; attempt++) {
            tx = 90 + Math.random() * Math.max(120, vw - 180);
            ty = 90 + Math.random() * Math.max(120, vh - 240);
            if (Math.hypot(tx - cx0, ty - cy0) >= minDist) break;
          }
          tp.phase = 'out';
          tp.outUntil = ts + TELEPORT_OUT_MS;
          tp.origin = { x: cx0, y: cy0 };
          tp.target = { x: tx, y: ty };
          tp.decoys = tp.forcedDecoys ?? Math.random() < TELEPORT_DECOY_CHANCE;
          tp.forcedDecoys = null;
          streaksRef.current.push(...shortStreaks(cx0, cy0, ts));
          if (chickenElRef.current) chickenElRef.current.style.opacity = '0';
          if (Math.random() < TELEPORT_PRE_CHANCE) {
            addGhost(tx - CHICKEN_W / 2, ty - CHICKEN_H / 2, true);
          }
        }
      }
      if (tp.phase === 'out' && ts >= tp.outUntil && tp.target) {
        const { x: tx, y: ty } = tp.target;
        p.x = Math.max(0, Math.min(tx - CHICKEN_W / 2, vw - CHICKEN_W));
        p.y = Math.max(0, Math.min(ty - CHICKEN_H / 2, vh - CHICKEN_H));
        if (stNow !== 'pilot') {
          const angle = Math.random() * Math.PI * 2;
          p.vx = Math.cos(angle) * BASE_SPEED;
          p.vy = Math.sin(angle) * BASE_SPEED;
        }
        streaksRef.current.push(...shortStreaks(tx, ty, ts));
        if (chickenElRef.current) chickenElRef.current.style.opacity = '1';
        if (tp.origin && Math.random() < TELEPORT_AFTER_CHANCE) {
          addGhost(tp.origin.x - CHICKEN_W / 2, tp.origin.y - CHICKEN_H / 2, false);
        }
        if (tp.decoys) {
          const decoyCount = 2 + (Math.random() < 0.5 ? 1 : 0);
          for (let i = 0; i < decoyCount; i++) {
            addGhost(
              60 + Math.random() * Math.max(120, vw - 180),
              60 + Math.random() * Math.max(120, vh - 260),
              false
            );
          }
        }
        tp.phase = 'idle';
        tp.arrivedFrames = 0;
        tp.nextAt = ts + TELEPORT_DELAY_MIN_MS + Math.random() * TELEPORT_DELAY_SPREAD_MS;
      }
      if (tp.arrivedFrames >= 0) {
        tp.arrivedFrames += 1;
        if (tp.arrivedFrames > TELEPORT_FRAME_TRACK_MAX) {
          tp.arrivedFrames = -1;
          tp.decoys = false;
        }
      }

      if (!flying) {
        const g = groundRef.current;
        if (!g.nextTurnAt) {
          g.nextTurnAt = ts + GROUND_TURN_MIN_MS + Math.random() * GROUND_TURN_SPREAD_MS;
          g.nextGrazeAt = ts + GRAZE_DELAY_MIN_MS + Math.random() * GRAZE_DELAY_SPREAD_MS;
          g.vxTarget = (Math.random() < 0.5 ? -1 : 1) * GROUND_WANDER;
        }
        if (ts >= g.nextTurnAt) {
          g.nextTurnAt = ts + GROUND_TURN_MIN_MS + Math.random() * GROUND_TURN_SPREAD_MS;
          g.vxTarget =
            Math.random() < GROUND_PAUSE_CHANCE
              ? 0
              : (Math.random() < 0.5 ? -1 : 1) * GROUND_WANDER;
        }
        const grazing = ts < g.grazeUntil;
        if (!grazing && ts >= g.nextGrazeAt) {
          g.grazeUntil = ts + GRAZE_DURATION_MIN_MS + Math.random() * GRAZE_DURATION_SPREAD_MS;
          g.nextGrazeAt =
            g.grazeUntil + GRAZE_DELAY_MIN_MS + Math.random() * GRAZE_DELAY_SPREAD_MS;
        }
        const wandering = grazing ? 0 : g.vxTarget;
        p.vx += (wandering - p.vx) * Math.min(1, 0.05 * dt);
        p.vy = 0;
        p.x = Math.max(8, Math.min(p.x + p.vx * dt, vw - CHICKEN_W - 8));
        const bob = Math.sin(ts * 0.004) * 1.2;
        p.y = groundYFor(vh) - CHICKEN_H + bob;
        p.rotation += (0 - p.rotation) * Math.min(1, GROUND_ROT_LERP * dt);
        p.rv = 0;
        p.bank = 0;
        if (p.vx > 0.01) facingRef.current = 1;
        else if (p.vx < -0.01) facingRef.current = -1;
      } else if (portal.phase !== 'idle') {
        p.bank = 0;
      } else if (flightKind !== 'none') {
        if (flightKind === 'scripted') {
          p.vx = 0;
          p.vy = 0;
          p.rv = 0;
          p.bank = 0;
        } else {
          const speedScale =
            flightKind === 'plane'
              ? PILOT_SPEED_SCALE
              : seqNow === 'planeExit'
                ? PLANE_EXIT_SCALE
                : seqNow === 'explode'
                  ? EXPLODE_SCALE
                  : driftSpeedScale(seqElapsed);
          const out = stepFlight(
            flightRef.current,
            p.x + CHICKEN_W / 2,
            p.y + CHICKEN_H / 2,
            vw,
            vh,
            dtMs,
            ts,
            FLIGHT_PX_PER_MS * speedScale,
            { barrels: flightKind === 'plane', tiltScale: flightKind === 'plane' ? 1 : 0.5, avoid: hudZone(vw) }
          );
          const push = pushRef.current;
          p.x += out.dx + push.x * dtMs;
          p.y += out.dy + push.y * dtMs;
          if (flightKind === 'plane') {
            p.x = Math.max(PLANE_HALF_W - CHICKEN_W / 2, Math.min(vw - PLANE_HALF_W - CHICKEN_W / 2, p.x));
          }
          keepOutOfHud(hudZone(vw), p, CHICKEN_W / 2, CHICKEN_H / 2, false);
          const decay = Math.exp(-PUSH_DECAY_PER_MS * dtMs);
          push.x *= decay;
          push.y *= decay;
          p.vx = out.dx / Math.max(dtMs, 1);
          p.vy = out.dy / Math.max(dtMs, 1);
          p.rotation = out.rotation;
          p.rv = 0;
          p.bank = 0;
          rollRef.current = out.rollY;
          facingRef.current = out.facing;
        }
      } else if (scrambleRef.current.phase === 'running') {
        const scramble = scrambleRef.current;
        if (ts >= scramble.until) {
          scramble.phase = 'idle';
          scramble.nextAt = ts + SCRAMBLE_DELAY_MIN_MS + Math.random() * SCRAMBLE_DELAY_SPREAD_MS;
          const exitAngle = Math.random() * Math.PI * 2;
          p.vx = Math.cos(exitAngle) * BASE_SPEED;
          p.vy = Math.sin(exitAngle) * BASE_SPEED;
        } else {
          if (ts >= scramble.nextDartAt) {
            scramble.nextDartAt = ts + SCRAMBLE_DART_MIN_MS + Math.random() * SCRAMBLE_DART_SPREAD_MS;
            scramble.targetX = Math.max(
              8,
              Math.min(scramble.originX + (Math.random() - 0.5) * 2 * SCRAMBLE_RADIUS, vw - CHICKEN_W - 8)
            );
            scramble.targetY = Math.max(
              8,
              Math.min(scramble.originY + (Math.random() - 0.5) * 2 * SCRAMBLE_RADIUS, vh - CHICKEN_H - 8)
            );
          }
          const ddx = scramble.targetX - p.x;
          const ddy = scramble.targetY - p.y;
          const dd = Math.hypot(ddx, ddy);
          if (dd > 1) {
            const step = Math.min(dd, SCRAMBLE_SPEED * dt);
            p.x += (ddx / dd) * step;
            p.y += (ddy / dd) * step;
            if (Math.abs(ddx) > 4) facingRef.current = ddx > 0 ? 1 : -1;
          }
          p.vx = 0;
          p.vy = 0;
          p.rotation = Math.sin(ts * 0.05) * 6;
          p.rv = 0;
          p.bank = 0;
        }
      } else if (visitRef.current.phase === 'seeking') {
        const visit = visitRef.current;
        const motion = kidMotionRef.current.get(visit.kidId);
        if (!motion || motion.fleeing || motion.merging) {
          visit.phase = 'idle';
        } else {
          const targetX = motion.x + KID_W / 2 - CHICKEN_W / 2;
          const targetY = groundYFor(vh) - CHICKEN_H;
          const ddx = targetX - p.x;
          const ddy = targetY - p.y;
          const dd = Math.hypot(ddx, ddy);
          if (dd > 1) {
            const step = Math.min(dd, VISIT_SPEED * dt);
            p.x += (ddx / dd) * step;
            p.y += (ddy / dd) * step;
            if (Math.abs(ddx) > 6) facingRef.current = ddx > 0 ? 1 : -1;
          }
          p.vx = 0;
          p.vy = 0;
          p.rotation += (0 - p.rotation) * Math.min(1, 0.08 * dt);
          p.rv = 0;
          p.bank = 0;
          if (Math.abs(p.x - targetX) < VISIT_NEAR_X && Math.abs(p.y - targetY) < VISIT_NEAR_Y) {
            modeRef.current = 'ground';
            visit.phase = 'visiting';
            groundRef.current.nextGrazeAt = ts + 800;
          }
        }
      } else {
        const scramble = scrambleRef.current;
        if (!scramble.nextAt) {
          scramble.nextAt = ts + SCRAMBLE_DELAY_MIN_MS + Math.random() * SCRAMBLE_DELAY_SPREAD_MS;
        } else if (
          ts >= scramble.nextAt &&
          !rootBusy &&
          !scripted &&
          sc >= SCRAMBLE_MIN_SCORE &&
          ts - lastHitRef.current < CLICK_ACTIVE_WINDOW_MS &&
          hyper.phase !== 'burst' &&
          ceremonyRef.current.phase === 'idle'
        ) {
          scramble.phase = 'running';
          scramble.until = ts + SCRAMBLE_DURATION_MS;
          scramble.originX = p.x;
          scramble.originY = p.y;
          scramble.targetX = p.x;
          scramble.targetY = p.y;
          scramble.nextDartAt = 0;
        }
        if (!nextJumpAtRef.current) {
          nextJumpAtRef.current = ts + JUMP_DELAY_MIN_MS + Math.random() * JUMP_DELAY_SPREAD_MS;
        } else if (ts >= nextJumpAtRef.current) {
          nextJumpAtRef.current = ts + JUMP_DELAY_MIN_MS + Math.random() * JUMP_DELAY_SPREAD_MS;
          if (Math.random() < JUMP_CHANCE) {
            const jumpAngle = Math.random() * Math.PI * 2;
            p.vx += Math.cos(jumpAngle) * BASE_SPEED * JUMP_KICK;
            p.vy += Math.sin(jumpAngle) * BASE_SPEED * JUMP_KICK;
            p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH * 0.8;
          }
        }

        let dx = p.vx * dt * sp;
        let dy = p.vy * dt * sp;
        const travel = Math.hypot(dx, dy);
        if (travel > MAX_FRAME_TRAVEL) {
          dx = (dx / travel) * MAX_FRAME_TRAVEL;
          dy = (dy / travel) * MAX_FRAME_TRAVEL;
        }
        p.x += dx;
        p.y += dy;
        keepOutOfHud(hudZone(vw), p, CHICKEN_W / 2, CHICKEN_H / 2, false);
        if (stageRef.current === 'jupiter' && p.y + CHICKEN_H > vh * MARTIAN_AVOID_Y_FRAC) {
          const cxc = p.x + CHICKEN_W / 2;
          for (const spot of martianSpotsRef.current) {
            const mx = spot.xFrac * vw + spot.width / 2;
            const minGap = spot.width / 2 + CHICKEN_W / 2 + MARTIAN_AVOID_GAP;
            const gap = cxc - mx;
            if (Math.abs(gap) >= minGap) continue;
            const dir = gap >= 0 ? 1 : -1;
            p.x = Math.max(0, Math.min(vw - CHICKEN_W, mx + dir * minGap - CHICKEN_W / 2));
            if (Math.sign(p.vx) !== dir) p.vx = -p.vx;
          }
        }

        const wildKick = (side: PortalSide) => {
          if (Math.random() >= EDGE_WILD_CHANCE) return;
          const speed0 = Math.max(BASE_SPEED * 0.8, Math.hypot(p.vx, p.vy));
          const wildAngle = Math.random() * Math.PI * 2;
          p.vx = Math.cos(wildAngle) * speed0;
          p.vy = Math.sin(wildAngle) * speed0;
          if (side === 'left' && p.vx < 0) p.vx *= -1;
          else if (side === 'right' && p.vx > 0) p.vx *= -1;
          else if (side === 'top' && p.vy < 0) p.vy *= -1;
          else if (side === 'bottom' && p.vy > 0) p.vy *= -1;
          p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH * 1.5;
        };
        const tryEdgeSpecial = (side: PortalSide): boolean => {
          if (scripted || rootBusy || ts < portal.cooldownUntil || portal.phase !== 'idle' || tp.phase !== 'idle') {
            return false;
          }
          const portalChance = ts < portal.hotUntil ? EDGE_PORTAL_HOT_CHANCE : EDGE_PORTAL_CHANCE;
          const roll = Math.random();
          if (roll < portalChance) {
            beginPortal(side, ts);
            return true;
          }
          if (roll < portalChance + EDGE_WRAP_CHANCE) {
            streaksRef.current.push(
              ...shortStreaks(p.x + CHICKEN_W / 2, p.y + CHICKEN_H / 2, ts, 6)
            );
            if (side === 'left') p.x = vw - CHICKEN_W - 2;
            else if (side === 'right') p.x = 2;
            else if (side === 'top') p.y = vh - CHICKEN_H - 2;
            else p.y = 2;
            streaksRef.current.push(
              ...shortStreaks(p.x + CHICKEN_W / 2, p.y + CHICKEN_H / 2, ts, 6)
            );
            portal.cooldownUntil = ts + EDGE_SPECIAL_COOLDOWN_MS;
            return true;
          }
          return false;
        };

        if (p.x <= 0 || p.x >= vw - CHICKEN_W) {
          const side: PortalSide = p.x <= 0 ? 'left' : 'right';
          if (!tryEdgeSpecial(side)) {
            p.vx *= -1;
            p.vy += (Math.random() - 0.5) * BOUNCE_RANDOM;
            if (Math.random() < SPIN_BOUNCE_CHANCE) {
              p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
            }
            p.x = Math.max(0, Math.min(p.x, vw - CHICKEN_W));
            wildKick(side);
          }
        }
        if (portal.phase === 'idle' && (p.y <= 0 || p.y >= vh - CHICKEN_H)) {
          const side: PortalSide = p.y <= 0 ? 'top' : 'bottom';
          if (!tryEdgeSpecial(side)) {
            p.vy *= -1;
            p.vx += (Math.random() - 0.5) * BOUNCE_RANDOM;
            if (Math.random() < SPIN_BOUNCE_CHANCE) {
              p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
            }
            p.y = Math.max(0, Math.min(p.y, vh - CHICKEN_H));
            wildKick(side);
          }
        }

        p.rv += (-p.rotation * ROTATION_SPRING - p.rv * ROTATION_DAMP) * dt;
        p.rotation += p.rv * dt;

        const ccx = p.x + CHICKEN_W / 2;
        const ccy = p.y + CHICKEN_H / 2;
        const mdx = ccx - m.x;
        const mdy = ccy - m.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist < AVOIDANCE_RADIUS && dist > 0) {
          const force = ((AVOIDANCE_RADIUS - dist) / AVOIDANCE_RADIUS) * AVOIDANCE_STRENGTH * sp;
          p.vx += (mdx / dist) * force;
          p.vy += (mdy / dist) * force;
        }

        const visit = visitRef.current;
        if (!rootBusy && visit.phase === 'idle' && kidsCountRef.current > 0 && mercy < VISIT_MERCY_THRESHOLD && stageRef.current === 'none') {
          if (!visit.nextRollAt) {
            visit.nextRollAt = ts + VISIT_ROLL_MS;
          } else if (ts >= visit.nextRollAt) {
            visit.nextRollAt = ts + VISIT_ROLL_MS;
            if (ts >= visit.cooldownUntil && Math.random() < VISIT_CHANCE) {
              const candidates = [...kidMotionRef.current.entries()].filter(
                ([, kidMotion]) => !kidMotion.fleeing && !kidMotion.merging
              );
              if (candidates.length > 0) {
                visit.kidId = candidates[Math.floor(Math.random() * candidates.length)][0];
                visit.phase = 'seeking';
              }
            }
          }
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpd = BASE_SPEED * sp;
        const minSpd = MIN_SPEED * sp;
        if (speed > maxSpd) {
          p.vx = (p.vx / speed) * maxSpd;
          p.vy = (p.vy / speed) * maxSpd;
        } else if (speed < minSpd && speed > 0) {
          p.vx = (p.vx / speed) * minSpd;
          p.vy = (p.vy / speed) * minSpd;
        }

        const moveSpeed = Math.hypot(p.vx, p.vy);
        const horiz = moveSpeed > 0 ? p.vx / moveSpeed : 0;
        p.bank += (horiz * MAX_BANK - p.bank) * Math.min(1, BANK_LERP * dt);
        if (p.vx > FACING_DEADZONE) facingRef.current = 1;
        else if (p.vx < -FACING_DEADZONE) facingRef.current = -1;
      }

      const wobble = flying ? Math.sin(ts * WOBBLE_FREQUENCY) * WOBBLE_AMPLITUDE : 0;
      const cx = p.x + CHICKEN_W / 2;
      const cy = p.y + CHICKEN_H / 2;

      const agitation = 1 + heatRef.current * FLAP_AGITATION;
      const flapBase = flying ? FLAP_BASE_MS : FLAP_BASE_MS * 1.35;
      const flapMs =
        Math.round(
          Math.max(
            FLAP_MIN_MS,
            Math.min(FLAP_MAX_MS, flapBase / ((FLAP_SPEED_FLOOR + sp) * agitation))
          ) / FLAP_QUANTIZE_MS
        ) * FLAP_QUANTIZE_MS;

      if (sizeBoostRef.current > 0) {
        sizeBoostRef.current = Math.max(
          0,
          sizeBoostRef.current - (dtMs * SIZE_BOOST_PER_MERGE) / SIZE_BOOST_DECAY_MS
        );
      }
      const bendTarget =
        modeRef.current === 'ground' && ts < groundRef.current.grazeUntil
          ? BEND_ANGLE + Math.sin(ts * BEND_PECK_FREQ) * BEND_PECK_AMPLITUDE
          : 0;
      bendRef.current += (bendTarget - bendRef.current) * Math.min(1, BEND_LERP * dt);
      if (bendRef.current < 0.05 && bendTarget === 0) bendRef.current = 0;

      let stageScale = 1;
      const st = stageRef.current;
      if (st !== 'none') {
        const elapsed = ts - stageStartRef.current;
        const intro = introMsFor(st);
        const splitFrac = st === 'pilot' ? GOGGLE_PHASE_FRAC : st === 'moon' ? MOON_DESCENT_FRAC : 1;
        const phase: StagePhase =
          elapsed >= intro ? 'live' : elapsed >= intro * splitFrac ? 'intro-b' : 'intro-a';
        if (phase !== stagePhaseRef.current) {
          stagePhaseRef.current = phase;
          setStagePhase(phase);
          if (st === 'pilot' && phase === 'live') {
            flightRef.current = createFlight(facingRef.current >= 0 ? 0 : Math.PI);
          }
          if (st === 'moon' && phase === 'intro-b') {
            setParked({ x: p.x, y: p.y });
            modeRef.current = 'ground';
          }
        }
        const anchor = stageAnchorRef.current;
        if (phase !== 'live' && st !== 'moon' && st !== 'pilot') {
          p.x = anchor.x + (st === 'rocket' ? (Math.random() - 0.5) * 3 : 0);
          p.y = anchor.y;
          p.vx = 0;
          p.vy = 0;
        }
        if (st === 'surf' && portal.phase === 'idle') {
          const footX = p.x + CHICKEN_W / 2;
          const target = surfSurfaceY(footX, ts, vh, heatRef.current) - SURF_BOARD_BOTTOM;
          surfYRef.current += (target - surfYRef.current) * Math.min(1, SURF_PULL * dt);
          p.y = surfYRef.current;
          p.vy = 0;
          p.rotation +=
            (surfSlopeDeg(footX, ts, heatRef.current) * SURF_TILT - p.rotation) * Math.min(1, 0.2 * dt);
        }
        if (st === 'pilot' || st === 'rocket') {
          if (modeRef.current === 'ground') modeRef.current = 'flying';
        }
        if (st === 'rocket') {
          const se = seqElapsed;
          const rcx = vw * ROCKET_BG_X_FRAC;
          const rcy = vh * ROCKET_BG_Y_FRAC;
          const cxNow = p.x + CHICKEN_W / 2;
          const cyNow = p.y + CHICKEN_H / 2;
          const placeCenter = (x: number, y: number) => {
            p.x = x - CHICKEN_W / 2;
            p.y = y - CHICKEN_H / 2;
          };
          const bg = bgRocketElRef.current;
          const writeBg = (opacity: number, scale: number) => {
            if (!bg) return;
            bg.style.opacity = opacity.toFixed(3);
            bg.style.transform = `translate(${rcx - CHICKEN_W / 2}px, ${rcy - CHICKEN_H / 2}px) scale(${scale.toFixed(3)})`;
          };
          if (seqNow === 'planeExit') {
            const pb = planeBodyRef.current;
            const o = stepFlight(
              planeFlightRef.current,
              pb.x + CHICKEN_W / 2,
              pb.y + CHICKEN_H / 2,
              vw,
              vh,
              dtMs,
              ts,
              FLIGHT_PX_PER_MS * PLANE_BODY_SCALE,
              { barrels: true, tiltScale: 1, avoid: hudZone(vw) }
            );
            pb.x += o.dx;
            pb.y += o.dy;
            pb.x = Math.max(PLANE_HALF_W - CHICKEN_W / 2, Math.min(vw - PLANE_HALF_W - CHICKEN_W / 2, pb.x));
            if (planeElRef.current) {
              planeElRef.current.style.transform = `translate(${pb.x}px, ${pb.y}px) rotate(${o.rotation}deg) scale(${o.facing}, ${o.rollY.toFixed(3)})`;
            }
            const readyToBlow =
              (se >= PLANE_EXIT_MS && seqClicksRef.current >= EXPLODE_CLICKS) ||
              se >= PLANE_EXIT_MS + EXPLODE_FALLBACK_MS;
            if (readyToBlow) {
              const awayX = cxNow - (pb.x + CHICKEN_W / 2);
              const awayY = cyNow - (pb.y + CHICKEN_H / 2);
              const away = Math.hypot(awayX, awayY) || 1;
              const strength = Math.max(0, 1 - away / PUSH_RADIUS) * PUSH_PX_PER_MS;
              pushRef.current = { x: (awayX / away) * strength, y: (awayY / away) * strength };
              if (planeElRef.current) planeElRef.current.style.transform = `translate(${pb.x}px, ${pb.y}px)`;
              enterSeq('explode', ts);
            }
          } else if (seqNow === 'explode') {
            if (se >= EXPLODE_MS) enterSeq('drift', ts);
          } else if (seqNow === 'drift') {
            const look = rocketLook('drift', se);
            writeBg(look.opacity, look.scale);
            if (se >= DRIFT_MS) {
              approachFromRef.current = { x: cxNow, y: cyNow };
              enterSeq('rocketApproach', ts);
            }
          } else if (seqNow === 'rocketApproach') {
            const look = rocketLook('rocketApproach', se);
            writeBg(look.opacity, look.scale);
            const u = Math.min(1, se / APPROACH_MS);
            const e = smooth01(u);
            const from = approachFromRef.current;
            const doorX = rcx;
            const doorY = rcy + ROCKET_DOOR_OFFSET_Y * look.scale;
            const dxv = doorX - from.x;
            const dyv = doorY - from.y;
            const len = Math.hypot(dxv, dyv) || 1;
            const phaseAngle = u * Math.PI * 2 * APPROACH_SWAY_CYCLES;
            const sway = Math.sin(phaseAngle) * APPROACH_SWAY_PX * (1 - e);
            placeCenter(from.x + dxv * e - (dyv / len) * sway, from.y + dyv * e + (dxv / len) * sway);
            stageScale = 1 + (BOARD_CHICKEN_SCALE - 1) * e;
            p.rotation = Math.cos(phaseAngle) * 8 * (1 - e);
            facingRef.current = dxv >= 0 ? 1 : -1;
            if (se >= APPROACH_MS) enterSeq('boarding', ts);
          } else if (seqNow === 'boarding') {
            const look = rocketLook('boarding', se);
            writeBg(look.opacity, look.scale);
            const open = doorOpenAt(se);
            if (open !== doorOpenRef.current) {
              doorOpenRef.current = open;
              setDoorOpen(open);
            }
            const v = smooth01((se - CLIMB_START_MS) / (CLIMB_END_MS - CLIMB_START_MS));
            const doorY = rcy + ROCKET_DOOR_OFFSET_Y * look.scale;
            placeCenter(rcx, doorY - 14 * v + Math.sin(ts * 0.004) * (1 - v) * 3);
            stageScale = BOARD_CHICKEN_SCALE + (BOARD_INSIDE_SCALE - BOARD_CHICKEN_SCALE) * v;
            p.rotation = 0;
            facingRef.current = 1;
            if (chickenElRef.current) {
              chickenElRef.current.style.opacity = (1 - smooth01((v - 0.5) / 0.5)).toFixed(3);
            }
            if (se >= BOARDING_MS) openGate();
          } else if (seqNow === 'flight3d') {
            const tx = vw * FLIGHT_TARGET_X_FRAC;
            const ty = vh * FLIGHT_TARGET_Y_FRAC;
            let fx = rcx;
            let fy = rcy;
            let fScale = ROCKET_BG_MAX_SCALE;
            let v = 0;
            if (se < LIFTOFF_HOLD_MS) {
              fx += (Math.random() - 0.5) * LIFTOFF_SHAKE_PX * 2;
              fy += (Math.random() - 0.5) * LIFTOFF_SHAKE_PX * 2;
            } else {
              v = smooth01((se - LIFTOFF_HOLD_MS) / LIFTOFF_RISE_MS);
              fx = rcx + (tx - rcx) * v + Math.sin(se / 1300) * FLIGHT_SWAY_X * v;
              fy = rcy + (ty - rcy) * v + Math.cos(se / 1700) * FLIGHT_SWAY_Y * v;
              fScale = ROCKET_BG_MAX_SCALE + (ROCKET_MIN_SCALE - ROCKET_BG_MAX_SCALE) * v;
            }
            placeCenter(fx, fy);
            stageScale = fScale;
            p.rotation = Math.sin(se / 1700) * FLIGHT_SWAY_ROT * v;
            facingRef.current = 1;
            if (chickenElRef.current) {
              chickenElRef.current.style.opacity = smooth01(se / INSIDE_FADE_MS).toFixed(3);
            }
            const flightMs = skip3dRef.current ? FLIGHT_SKIP_MS : FLIGHT_MS;
            flightProgressRef.current = Math.min(1, se / flightMs);
            if (se >= flightMs) enterStage('moon', ts);
          }
        }
        if (st === 'moon' && phase === 'intro-a') {
          const t = Math.min(1, elapsed / (intro * MOON_DESCENT_FRAC));
          const arrivalFrom = moonFromRef.current;
          const eased = arrivalFrom ? smooth01(t) : 1 - (1 - t) * (1 - t);
          const start = arrivalFrom ? arrivalFrom.y : -CHICKEN_H * 2;
          p.x = anchor.x + (Math.min(vw * MOON_PARK_X_FRAC, anchor.x) - anchor.x) * eased;
          p.y = start + (groundYFor(vh) - ROCKET_LEG_BOTTOM - start) * eased;
          p.vx = 0;
          p.vy = 0;
          p.rotation = 0;
          p.bank = 0;
          stageScale = ROCKET_MIN_SCALE + (1 - ROCKET_MIN_SCALE) * eased;
        }
      }

      const rootHold = holdRef.current;
      if (rootHold && !rootHold.grabbed && rootHold.id === 0) {
        p.x = rootHold.anchorX + rootHold.driftX;
        p.y = rootHold.anchorY + rootHold.driftY;
      }
      if (birdTick.hold) {
        p.x = birdTick.hold.x - CHICKEN_W / 2;
        p.y = birdTick.hold.y - CHICKEN_H / 2;
        p.vx = 0;
        p.vy = 0;
        p.rotation = 0;
        p.rv = 0;
        p.bank = 0;
        modeRef.current = 'flying';
      }
      if (chickenElRef.current) {
        const gripped = isGripping(bird.phase) ? 'none' : '';
        if (chickenElRef.current.style.pointerEvents !== gripped) chickenElRef.current.style.pointerEvents = gripped;
        const hidden = rootSplitRef.current ? 'hidden' : 'visible';
        if (chickenElRef.current.style.visibility !== hidden) chickenElRef.current.style.visibility = hidden;
        chickenElRef.current.style.transform =
          `translate(${p.x}px, ${p.y}px) rotate(${p.rotation + wobble + p.bank}deg) scale(${((1 + sizeBoostRef.current) * stageScale).toFixed(3)}, ${((1 + sizeBoostRef.current) * stageScale * rollRef.current).toFixed(3)})`;
        chickenElRef.current.style.setProperty('--bend', `${bendRef.current.toFixed(1)}deg`);
        if (flapMs !== flapMsRef.current) {
          flapMsRef.current = flapMs;
          chickenElRef.current.style.setProperty('--flap-ms', `${flapMs}ms`);
        }
      }
      if (facingElRef.current) {
        const sign = String(facingRef.current);
        if (facingElRef.current.dataset.facing !== sign) {
          facingElRef.current.dataset.facing = sign;
          facingElRef.current.style.transform =
            facingRef.current < 0 ? 'scaleX(-1)' : 'scaleX(1)';
        }
      }

      const kidMotions = kidMotionRef.current;
      if (!nextKidAtRef.current) {
        nextKidAtRef.current = ts + KID_DELAY_MIN_MS + Math.random() * KID_DELAY_SPREAD_MS;
      } else if (ts >= nextKidAtRef.current) {
        nextKidAtRef.current = ts + KID_DELAY_MIN_MS + Math.random() * KID_DELAY_SPREAD_MS;
        if (kidMotions.size < KID_MAX && !rootBusy) {
          const broodRoll = Math.random();
          const brood = Math.min(
            KID_MAX - kidMotions.size,
            broodRoll < 0.12 ? 3 : broodRoll < 0.45 ? 2 : 1
          );
          for (let i = 0; i < brood; i++) spawnKid();
        }
      }
      if (kidMotions.size > 0) {
        const kidY = groundYFor(vh) - KID_H;
        for (const [id, motion] of kidMotions) {
          if (motion.merging) {
            const chickenCx = p.x + CHICKEN_W / 2;
            const kidCx = motion.x + KID_W / 2;
            const dxm = chickenCx - kidCx;
            if (Math.abs(dxm) > 2) motion.dir = dxm > 0 ? 1 : -1;
            motion.x += Math.sign(dxm) * Math.min(Math.abs(dxm), KID_MERGE_SPEED * dt);
            if (Math.abs(dxm) < KID_MERGE_PROXIMITY) {
              removeKid(id);
              sizeBoostRef.current = Math.min(
                SIZE_BOOST_MAX,
                sizeBoostRef.current + SIZE_BOOST_PER_MERGE
              );
              spawnFeathers(chickenCx, p.y + CHICKEN_H / 2, 5);
              squeak(0.35);
              recordPlay({ type: 'squeak', at: Date.now() });
              continue;
            }
          } else if (motion.fleeing) {
            motion.x += motion.vx * dt;
            if (motion.x < -KID_W * 3 || motion.x > vw + KID_W * 3) {
              removeKid(id);
              continue;
            }
          } else if (motion.mergeAt && ts >= motion.mergeAt) {
            startKidMerge(id);
          } else {
            if (!motion.nextTurnAt || ts >= motion.nextTurnAt) {
              motion.nextTurnAt = ts + KID_TURN_MIN_MS + Math.random() * KID_TURN_SPREAD_MS;
              motion.vx =
                Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * KID_WANDER;
              if (motion.vx !== 0) motion.dir = motion.vx > 0 ? 1 : -1;
            }
            motion.x = Math.max(10, Math.min(motion.x + motion.vx * dt, vw - KID_W - 10));
          }
          const el = kidElsRef.current.get(id);
          if (el) {
            const bob = Math.sin(ts * 0.006 + id) * 1;
            el.style.transform = `translate(${motion.x}px, ${kidY + bob}px) scaleX(${motion.dir})`;
          }
        }
      }

      tickAbilities(performance.now(), dtMs, vw, vh);
      tickChicks(ts, dtMs, dt, vw, vh);

      if (ts >= ghostSweepAtRef.current) {
        ghostSweepAtRef.current = ts + 500;
        const alive = ghostsRef.current.filter((g) => ts - g.born < 1400);
        if (alive.length !== ghostsRef.current.length) {
          ghostsRef.current = alive;
          setGhosts(alive);
        }
      }

      const currentTier = tierRef.current;
      const tierDef = TIERS[currentTier];
      const intensity = Math.min(1 + sc * 0.05, 5);
      const count = Math.ceil(intensity * dt * PARTICLE_EMISSION);
      const particles = particlesRef.current;

      for (let i = 0; i < count && particles.length < MAX_PARTICLES && !AURA_SHIELD_STAGES.includes(stNow) && !rootBusy; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          alpha: 0.05 + Math.random() * 0.05,
          size: 2 + Math.random() * 2,
          hue: tierDef.particleHue,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= PARTICLE_FADE * dt;
        pt.size *= 0.995;
        if (pt.alpha <= 0) particles.splice(i, 1);
      }

      const shards = shardParticlesRef.current;
      for (let i = shards.length - 1; i >= 0; i--) {
        const sh = shards[i];
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.vy += SHARD_GRAVITY * dt;
        sh.rotation += sh.rv * dt;
        sh.alpha -= SHARD_FADE * dt;
        if (sh.alpha <= 0) shards.splice(i, 1);
      }

      const feathers = feathersRef.current;
      for (let i = feathers.length - 1; i >= 0; i--) {
        if (!updateFeather(feathers[i], dt, ts)) feathers.splice(i, 1);
      }

      const parkedNow = parkedRef.current;
      const nearParked = stNow === 'moon' && parkedNow !== null && Math.hypot(cx - parkedNow.x - CHICKEN_W / 2, cy - parkedNow.y - CHICKEN_H / 2) < PARKED_AURA_CLEAR;
      const shielded = rootBusy || nearParked || AURA_SHIELD_STAGES.includes(stNow);
      const lightning = shielded ? null : lightningForScore(sc);
      if (lightning) {
        if (!nextArcAtRef.current) nextArcAtRef.current = ts + lightning.intervalMs;
        if (ts >= nextArcAtRef.current) {
          nextArcAtRef.current = ts + lightning.intervalMs * (0.6 + Math.random() * 0.8);
          const burst = ARCS_PER_BURST_MIN + Math.floor(Math.random() * ARCS_PER_BURST_SPREAD);
          for (let i = 0; i < burst && arcsRef.current.length < MAX_ARCS; i++) {
            arcsRef.current.push(makeArc(cx, cy, lightning.color));
          }
          if (ts - lastCrackleAtRef.current > CRACKLE_MIN_GAP_MS) {
            lastCrackleAtRef.current = ts;
            crackle();
            recordPlay({ type: 'crackle', at: Date.now() });
          }
        }
      } else {
        nextArcAtRef.current = 0;
        arcsRef.current = [];
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (stageRef.current === 'surf') drawSurf(ctx, vw, vh, ts, heatRef.current);

        const auraRgb = auraRgbFor(sc);
        if (!shielded) drawAura(ctx, cx, cy, ts, currentTier, auraLevelFor(sc, mercy), auraRgb);

        const now = performance.now();
        const arcs = arcsRef.current;
        for (let i = arcs.length - 1; i >= 0; i--) {
          const age = now - arcs[i].born;
          if (age > ARC_LIFE_MS) {
            arcs.splice(i, 1);
            continue;
          }
          const alpha = 1 - age / ARC_LIFE_MS;
          const pts = arcs[i].points;
          const col = arcs[i].color;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          const trace = () => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          };
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.28 * alpha})`;
          ctx.lineWidth = 3.2;
          trace();
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.75 * alpha})`;
          ctx.lineWidth = 1.5;
          trace();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
          ctx.lineWidth = 0.85;
          trace();
        }

        for (const pt of particles) {
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = `hsl(${pt.hue}, 80%, 60%)`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const sh of shards) {
          ctx.globalAlpha = sh.alpha;
          ctx.fillStyle = sh.color;
          ctx.save();
          ctx.translate(sh.x, sh.y);
          ctx.rotate(sh.rotation);
          ctx.beginPath();
          ctx.moveTo(0, -sh.size);
          ctx.lineTo(sh.size * 0.8, sh.size * 0.6);
          ctx.lineTo(-sh.size * 0.8, sh.size * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;

        for (const f of feathers) {
          drawFeather(ctx, f, ts);
        }

        drawPools(ctx, poolsRef.current, now);
        drawDrops(ctx, dropsRef.current);
        if (AURA_SHIELD_STAGES.includes(stageRef.current)) streaksRef.current.length = 0;
        drawStreaks(ctx, streaksRef.current, now, dt, auraRgb);
        drawPortals(ctx, portalsRef.current, now);
        drawBlackHoles(ctx, blackHolesRef.current, performance.now(), BLACK_HOLE_LIFE_MS, BLACK_HOLE_RADIUS);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [crackle, recordPlay, addGhost, spawnKid, removeKid, squeak, spawnFeathers, beginPortal, startKidMerge, tickAbilities, tickHold, tickChicks, enterStage, enterSeq, openGate]);

  const morph = morphForScore(score);
  const renderAuraLevel = auraLevelFor(score, 1);
  const renderAuraRgb = auraRgbFor(score);
  const glowStyle =
    renderAuraLevel > 0 && !AURA_SHIELD_STAGES.includes(stage) && !birdUi.grip && !(stage === 'moon' && parked !== null)
      ? {
          filter: `drop-shadow(0 0 ${6 + 10 * renderAuraLevel + tier * 2}px rgba(${renderAuraRgb.r}, ${renderAuraRgb.g}, ${renderAuraRgb.b}, ${Math.min(0.55, 0.15 + renderAuraLevel * 0.5)}))`,
        }
      : undefined;

  return (
    <div
      data-testid="chicken-stage"
      data-variant="2"
      data-multicursor={overlayOffsets.length > 0 ? '1' : '0'}
      onPointerDownCapture={sheet === 'board' ? closeSheetOnOutside : undefined}
      className={`fixed inset-0 bg-[#0b0b0b] overflow-hidden select-none chicken-hand-cursor [&_[data-testid=chicken-leaderboard-link]]:text-white/60 [&_[data-testid=chicken-leaderboard-link]]:[text-shadow:0_0_2px_rgba(0,0,0,0.65),0_1px_10px_rgba(0,0,0,0.6)] ${stage === 'rocket' && seq === 'explode' ? 'escape-shake' : ''}`}
    >
      <GameScenery tier={tier} />
      {isSpaceStage(stage) && <CosmosFlight progressRef={cosmosProgressRef} landing={stage === 'jupiter'} />}
      <EscapeScenery stage={stage} seq={seq} />
      <SpaceGate gate={gate} count={gateCount} onSkip={() => resumeFromGate(true)} onStart={startGateCountdown} />
      {space3dOn && <SpaceFlight3D progressRef={flightProgressRef} leaving={stage === 'moon' || isSpaceStage(stage)} />}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <MartianLayer
        occupiedRef={martianSpotsRef}
        avoidXFrac={() => (physicsRef.current.x + CHICKEN_W / 2) / window.innerWidth}
        active={stage === 'jupiter'}
        blocked={birdUi.kind !== null || skinsOpen || sheet !== null || gate !== 'none'}
        onReward={onMartianReward}
      />
      {parked && stage === 'cosmos' && (
        <div data-testid="liftoff-rocket" className="absolute inset-0 z-[2] pointer-events-none animate-[cosmosLiftoff_2.6s_ease-in_forwards]">
          <ParkedRocket x={parked.x} y={parked.y} />
        </div>
      )}

      {stage === 'jupiter' && (
        <div data-testid="hud-scrim" className="absolute top-[170px] left-1/2 h-[220px] w-[520px] max-w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.6),rgba(0,0,0,0.26)_45%,transparent_70%)] pointer-events-none" />
      )}
      {stage === 'rocket' && HUD_SCRIM_SEQS.includes(seq) && (
        <div data-testid="hud-scrim" className="absolute top-[170px] left-1/2 h-[220px] w-[520px] max-w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.34),rgba(0,0,0,0.12)_45%,transparent_70%)] pointer-events-none" />
      )}
      {stage === 'jupiter' && (
        <div data-testid="ground-scrim" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      )}

      <div data-hud="" className={`absolute top-[225px] left-1/2 -translate-x-1/2 text-base text-white/60 pointer-events-none ${TEXT_SCRIM}`}>
        Squeeze the chicken
      </div>

      <div className="absolute top-4 right-5 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setSkinsOpen((v) => !v)}
          aria-expanded={skinsOpen}
          data-testid="chicken-skins-toggle"
          className="cursor-pointer text-xs font-medium tracking-wide text-white/40 transition-colors hover:text-white/80"
        >
          Skins
        </button>
        {skinsOpen && (
          <div
            data-testid="chicken-skins-panel"
            className="flex gap-2 rounded-xl border border-white/10 bg-black/50 p-2 backdrop-blur-md"
          >
            {[...SKINS, ...UNLOCKABLE_SKINS.filter((s) => unlockedSkins.includes(s.id))].map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.name}
                onClick={() => selectSkin(s.id)}
                data-testid={`chicken-skin-${s.id}`}
                aria-pressed={skin === s.id}
                className={`cursor-pointer rounded-lg border p-1.5 transition-colors ${skin === s.id ? 'border-[#FFD700]/60 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <ChickenSvg className="w-[22px]" tier={tier} morph={0} eyes="calm" skin={s.id} />
                <span className="sr-only">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {countdown !== null && (
        <div
          ref={countdownElRef}
          data-testid="chicken-countdown"
          className="absolute top-0 left-0 z-30 pointer-events-none text-xl font-bold text-white/90 drop-shadow-[0_0_8px_rgba(255,215,0,0.7)] tabular-nums"
          style={{
            transform: `translate(${mouseRef.current.x + 14}px, ${mouseRef.current.y + 18}px)`,
          }}
        >
          {countdown}s…
        </div>
      )}

      {bonus && (
        <div
          key={bonus.id}
          data-testid="chicken-bonus-caption"
          onAnimationEnd={() => setBonus(null)}
          className="absolute top-[235px] left-1/2 text-2xl font-bold text-[#FFD700] pointer-events-none animate-[bonusRise_0.9s_ease-out_forwards]"
        >
          +{bonus.amount}
        </div>
      )}

      <div data-hud="" className="absolute top-[265px] left-1/2 -translate-x-1/2 text-5xl font-bold text-white tabular-nums pointer-events-none [text-shadow:0_0_3px_rgba(0,0,0,0.6),0_2px_16px_rgba(0,0,0,0.55)]">
        {score}
      </div>

      {mercyCaption && (
        <div
          data-testid="chicken-mercy-caption"
          className={`absolute top-[330px] left-1/2 -translate-x-1/2 text-xs italic text-white/50 pointer-events-none animate-[fadeIn_0.6s_ease-out] ${TEXT_SCRIM}`}
        >
          the chicken grows smug… and slow
        </div>
      )}

      {score > 80 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${Math.min((score - 80) * 0.01, 0.4)}) 100%)`,
          }}
        />
      )}

      {flashTier !== null && (
        <div
          key={`flash-${flashTier}`}
          onAnimationEnd={() => setFlashTier(null)}
          className="absolute inset-0 pointer-events-none animate-[transformFlash_0.42s_ease-out_forwards]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 40%, transparent 75%)',
          }}
        />
      )}

      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          data-testid="chicken-ghost"
          data-pre={ghost.pre ? '1' : '0'}
          onAnimationEnd={() => removeGhost(ghost.id)}
          className={`absolute top-0 left-0 pointer-events-none will-change-transform ${ghost.pre ? 'chicken-ghost-pre' : 'chicken-ghost'}`}
          style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }}
        >
          <ChickenSvg className="w-[70px]" tier={ghost.tier} morph={ghost.morph} skin={skin} />
        </div>
      ))}

      {kids.map((kid) => (
        <div
          key={kid.id}
          data-testid="chicken-kid"
          ref={(el) => {
            if (el) kidElsRef.current.set(kid.id, el);
            else kidElsRef.current.delete(kid.id);
          }}
          onClick={() => clickKid(kid.id)}
          className="absolute top-0 left-0 will-change-transform"
        >
          <ChickenSvg className="w-[26px]" tier={kid.tier} morph={0} eyes="calm" />
        </div>
      ))}

      {chicks.map((c) => (
        <div
          key={c.id}
          data-testid="chicken-piece"
          data-level={c.level}
          data-tier={tier}
          data-chick-id={c.id}
          data-ragdoll="0"
          ref={(el) => {
            if (el) chickElsRef.current.set(c.id, el);
            else chickElsRef.current.delete(c.id);
          }}
          onPointerDown={(e) => beginHold(c.id, e)}
          onClick={() => clickPiece(c.id)}
          className="chicken-piece absolute top-0 left-0 touch-none will-change-transform"
        >
          <span className="absolute" style={{ inset: -hitPadFor(c.level) }} />
          <ChickenSvg
            className="block w-[70px]"
            tier={tier}
            morph={morph}
            eyes={mood}
            skin={skin}
            wound={c.level === 0 ? wound : null}
          />
        </div>
      ))}

      <HoldTossHud hudRef={hudRef} labelRef={hudLabelRef} barRef={hudBarRef} readoutRef={hudReadoutRef} />

      {cloneViews.map((clone) => (
        <div
          key={clone.id}
          data-testid="chicken-clone"
          ref={(el) => {
            if (el) cloneElsRef.current.set(clone.id, el);
            else cloneElsRef.current.delete(clone.id);
          }}
          onClick={() => hit(undefined, true)}
          className="absolute top-0 left-0 will-change-transform"
        >
          <ChickenSvg
            className={clone.big ? 'w-[70px]' : 'w-[26px]'}
            tier={clone.tier}
            morph={clone.big ? morph : 0}
            eyes="calm"
            skin={clone.big ? skin : undefined}
          />
        </div>
      ))}

      {parked && stage === 'moon' && !birdUi.grip && <ParkedRocket x={parked.x} y={parked.y} />}

      {birdUi.kind && <BirdLayer kind={birdUi.kind} part="back" els={birdElsRef} onTalon={onTalon} onBird={onBird} onFeather={onFeather} onToasted={onToasted} />}

      {stage === 'rocket' && (seq === 'planeExit' || seq === 'explode') && (
        <div
          ref={planeElRef}
          data-testid={seq === 'planeExit' ? 'detached-plane' : 'plane-wreck'}
          className="absolute top-0 left-0 pointer-events-none w-[70px] h-[140px]"
          style={{ transform: `translate(${planeBodyRef.current.x}px, ${planeBodyRef.current.y}px)` }}
        >
          {seq === 'planeExit' ? <DetachedPlane /> : <Explosion scale={Math.min(1, window.innerWidth / EXPLOSION_FULL_VW)} />}
        </div>
      )}

      {stage === 'rocket' && (seq === 'drift' || seq === 'rocketApproach' || seq === 'boarding') && (
        <div
          ref={bgRocketElRef}
          data-testid="background-rocket"
          className="absolute top-0 left-0 pointer-events-none opacity-0 w-[70px] h-[140px]"
        >
          <BackgroundRocket doorOpen={doorOpen} />
        </div>
      )}

      <div
        ref={chickenElRef}
        data-testid="chicken"
        data-tier={tier}
        data-squash="0"
        className="absolute z-[5] will-change-transform"
        style={{ left: 0, top: 0 }}
        onPointerDown={(e) => beginHold(0, e)}
        onClick={(e) => {
          if (performance.now() < suppressClickUntilRef.current) return;
          hit(e);
        }}
      >
        <div
          ref={facingElRef}
          data-testid="chicken-facing"
          data-facing="1"
          className="relative"
          style={{ transition: 'transform 160ms ease-out', transformOrigin: 'center' }}
        >
          <EscapeVehicleBack stage={birdUi.grip ? 'none' : stage} phase={stagePhase} seq={seq} />
          <div ref={rubberElRef} className="chicken-rubber" data-squashed="0" data-sqmode="hug">
            <ChickenSvg
              className="w-[70px]"
              style={glowStyle}
              tier={tier}
              morph={morph}
              eyes={mood}
              skin={skin}
              wound={wound}
              distress={distress}
              burn={burnLive}
              char={charSpots[skin] ?? NO_CHAR}
            />
          </div>
          <EscapeVehicleFront stage={birdUi.grip ? 'none' : stage} phase={stagePhase} seq={seq} />
        </div>
        <EscapeGiggle show={stage === 'pilot' && stagePhase === 'intro-a'} />
      </div>

      {birdUi.kind && <BirdLayer kind={birdUi.kind} part="front" els={birdElsRef} onTalon={onTalon} onBird={onBird} onFeather={onFeather} onToasted={onToasted} />}

      <div
        ref={frenzyElRef}
        data-testid="chicken-frenzy"
        className="pointer-events-none fixed bottom-6 left-6 z-[60] rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold tracking-wide text-white opacity-0 shadow-[0_0_0_2px_#ffb02e]"
      />
      {orbViews.map((orb) => (
        <div
          key={orb.id}
          data-testid="chicken-orb"
          data-kind={orb.kind}
          aria-label={ORB_LABELS[orb.kind]}
          ref={(el) => {
            if (el) orbElsRef.current.set(orb.id, el);
            else orbElsRef.current.delete(orb.id);
          }}
          onClick={() => collectOrb(orb.id)}
          style={{ fontSize: ORB_LABEL_PX[orb.kind] }}
          className="absolute top-0 left-0 z-20 h-[41px] w-[41px] cursor-pointer rounded-full will-change-transform"
        >
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(#ff3b3b,#ffb02e,#f6ec3a,#3ddc6a,#35b6ff,#8a5cff,#ff3b3b)] animate-[orbSpin_7s_linear_infinite]" />
          <div className={`${orbFont.className} absolute inset-0 flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.45),rgba(255,255,255,0.08)_55%,transparent_75%)] px-0.5 text-center leading-[0.8] tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_6px_rgba(0,0,0,0.6)]`}>
            <span className="flex flex-col items-center">
              <span>{ORB_LABELS[orb.kind].split(' ')[0]}</span>
              <span>{ORB_LABELS[orb.kind].split(' ').slice(1).join(' ')}</span>
            </span>
          </div>
        </div>
      ))}

      <div
        ref={cursorLayerRef}
        data-pressed="false"
        className="group pointer-events-none absolute inset-0 z-40"
      >
        {overlayOffsets.map((offset, i) => (
          <div
            key={`${offset.dx},${offset.dy}`}
            data-testid="chicken-extra-cursor"
            ref={(el) => {
              if (el) {
                cursorElsRef.current[i] = el;
                el.style.transform = `translate(${mouseRef.current.x + offset.dx - CURSOR_HAND_HOT_X}px, ${mouseRef.current.y + offset.dy - CURSOR_HAND_HOT_Y}px)`;
              }
            }}
            className="absolute top-0 left-0 will-change-transform"
          >
            <svg
              width={CURSOR_HAND_SIZE}
              height={CURSOR_HAND_SIZE}
              viewBox="0 0 40 40"
              className="transition-transform duration-75 group-data-[pressed=true]:scale-[0.82]"
            >
              <g stroke="#4a2e1a" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                <path
                  d="M12 23 Q10.6 15.5 13.6 14.2 Q15.6 13.4 16.6 15 L16.6 10.6 Q16.6 8.2 18.6 8.2 Q20.6 8.2 20.6 10.6 L20.6 9 Q20.6 6.6 22.6 6.6 Q24.6 6.6 24.6 9 L24.6 10.8 Q24.6 8.8 26.4 8.8 Q28.4 8.8 28.4 11.2 L28.4 15.4 Q29.8 14 31.2 15.6 Q32.6 17.4 30.8 20 L26.2 26.6 Q24.2 29.6 20 29.6 Q15 29.6 13.2 26 Z"
                  fill="#F2B279"
                />
                <path d="M20.6 10.6 L20.6 16.2 M24.6 10.8 L24.6 16.4 M28.4 13.2 L27.8 17.2" fill="none" stroke="#c98f5c" strokeWidth="1.3" />
              </g>
            </svg>
          </div>
        ))}
      </div>

      <InventoryBag forceClosed={sheet !== null} onOpenChange={(open) => open && setSheet(null)} />

      <LeaderboardPanel
        open={sheet === 'board'}
        onToggle={toggleSheet}
        onClose={() => setSheet(null)}
        score={score}
      />

      {loaderPhase !== 'done' && (
        <SoundLoader progress={progress} fading={loaderPhase === 'fading'} />
      )}
    </div>
  );
}

export function ChickenGameV2() {
  return (
    <AppProvider>
      <InventoryProvider onUse={onUseItem}>
        <ChickenGameInner />
      </InventoryProvider>
    </AppProvider>
  );
}
