'use client';

import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { ChickenSvg } from './chicken-svg';
import { GameScenery } from './game-scenery';
import { LeaderboardPanel } from './leaderboard-panel';
import { SoundLoader } from './sound-loader';
import {
  drawFeather,
  drawStreaks,
  makeFeather,
  makeTeleportStreaks,
  updateFeather,
  type Feather,
  type Streak,
} from './chicken-effects';
import { useChickenSounds } from '@/hooks/use-chicken-sounds';
import { AppProvider } from '@/context/app-context';
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

const BASE_SPEED = 0.25;
const MIN_SPEED = 0.15;
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
const PARTICLE_FADE = 0.02;
const MAX_PARTICLES = 200;
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
const BRIDGE_LOG_CAP = 300;
const SPEED_SCORE_CAP = 180;
const SPEED_PER_SCORE = 0.011;
const TIER_SPEED_BUMP = [1, 1.12, 1.28, 1.45, 1.65];
const GROUND_FRAC = 0.76;
const GROUND_WANDER = 0.055;
const GROUND_TURN_MIN_MS = 2600;
const GROUND_TURN_SPREAD_MS = 3800;
const GROUND_PAUSE_CHANCE = 0.35;
const GROUND_ROT_LERP = 0.1;
const GRAZE_DELAY_MIN_MS = 3800;
const GRAZE_DELAY_SPREAD_MS = 5200;
const GRAZE_DURATION_MIN_MS = 1500;
const GRAZE_DURATION_SPREAD_MS = 1600;
const GRAZE_ANGLE = 34;
const GRAZE_PECK_AMPLITUDE = 7;
const GRAZE_PECK_FREQ = 0.02;
const FEATHERS_PER_CLICK = 2;
const FEATHER_EXTRA_CHANCE = 0.45;
const FEATHERS_PER_TRANSFORM = 10;
const MAX_FEATHERS = 40;
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
}

export interface SoundEvent {
  type: 'scream' | 'powerup' | 'crackle' | 'squeak';
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
}

interface ChickenBridge {
  plays: SoundEvent[];
  state: () => ChickenStateSnapshot;
  boost: (n: number) => void;
  spin: (v: number) => void;
  forceHyper: () => void;
  forceTeleport: (decoys: boolean) => void;
  forceKid: () => void;
}

declare global {
  interface Window {
    __chicken?: ChickenBridge;
  }
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
  const [tier, setTier] = useState(0);
  const [flashTier, setFlashTier] = useState<number | null>(null);
  const [mercyCaption, setMercyCaption] = useState(false);
  const [mood, setMood] = useState<(typeof TIERS)[number]['eyes']>('calm');
  const [sheet, setSheet] = useState<'board' | null>(null);
  const [loaderPhase, setLoaderPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [bonus, setBonus] = useState<{ amount: number; id: number } | null>(null);
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
  const ghostsRef = useRef<Ghost[]>([]);
  const ghostIdRef = useRef(0);
  const ghostSweepAtRef = useRef(0);
  const kidIdRef = useRef(0);
  const nextKidAtRef = useRef(0);
  const kidMotionRef = useRef(new Map<number, KidMotion>());
  const kidElsRef = useRef(new Map<number, HTMLDivElement>());
  const kidsCountRef = useRef(0);
  const chickenElRef = useRef<HTMLDivElement>(null);
  const facingElRef = useRef<HTMLDivElement>(null);
  const rubberElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { progress, playScream, playPowerUp, crackle, squeak } = useChickenSounds();

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

  const spawnFeathers = useCallback((cx: number, cy: number, count: number, maxTier: number) => {
    const feathers = feathersRef.current;
    const now = performance.now();
    for (let i = 0; i < count && feathers.length < MAX_FEATHERS; i++) {
      const t = Math.floor(Math.random() * (maxTier + 1));
      const def = TIERS[t];
      const color = Math.random() < 0.5 ? def.body : def.bodyDark;
      feathers.push(makeFeather(cx, cy, color, now));
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
    if (!motion || motion.fleeing) return;
    motion.fleeing = true;
    const sign = motion.x < window.innerWidth / 2 ? -1 : 1;
    motion.vx = sign * (KID_FLEE_MIN + Math.random() * KID_FLEE_SPREAD);
    motion.dir = sign;
    const el = kidElsRef.current.get(id);
    if (el) el.style.setProperty('--flap-ms', '90ms');
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
      let sqx = 0;
      if (e) {
        const rect = chicken.getBoundingClientRect();
        if (rect.width > 0) {
          sqx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        }
      }
      squashRef.current = sq;
      rubber.style.setProperty('--sq', sq.toFixed(3));
      rubber.style.setProperty('--sqx', sqx.toFixed(2));
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
      if (sq >= SQUEAK_THRESHOLD) {
        squeak(sq);
        recordPlay({ type: 'squeak', at: Date.now() });
      }
    },
    [squeak, recordPlay]
  );

  const hit = useCallback(
    (e?: ReactMouseEvent<HTMLDivElement>) => {
      const now = performance.now();
      const p = physicsRef.current;
      let award = 1;
      const hyper = hyperRef.current;
      const tp = teleportRef.current;
      if (hyper.phase === 'burst') {
        award = HYPER_BONUS;
        hyper.phase = 'recover';
        hyper.until = now + HYPER_RECOVER_MS;
      } else if (tp.decoys && tp.arrivedFrames >= 0 && tp.arrivedFrames <= TELEPORT_BONUS_FRAMES) {
        award = TELEPORT_BONUS;
      }
      if (award > 1) setBonus({ amount: award, id: now });
      if (modeRef.current === 'ground') {
        modeRef.current = 'flying';
        p.vy = -BASE_SPEED * 1.2;
        p.vx = facingRef.current * BASE_SPEED * 0.8;
      }
      const next = scoreRef.current + award;
      scoreRef.current = next;
      setScore(next);
      speedRef.current = speedForScore(next);
      heatRef.current = Math.min(HEAT_MAX, heatRef.current + HEAT_PER_CLICK);
      lastHitRef.current = now;
      const cx = p.x + CHICKEN_W / 2;
      const cy = p.y + CHICKEN_H / 2;
      const previousTier = tierRef.current;
      const newTier = tierForScore(next);
      if (newTier !== previousTier) {
        tierRef.current = newTier;
        setTier(newTier);
        setFlashTier(newTier);
        const riser = playPowerUp(newTier === FINAL_TIER);
        recordPlay({ type: 'powerup', key: riser.key, synth: riser.synth, at: Date.now() });
        spawnShards(cx, cy, SHARDS_PER_TRANSFORM, TIERS[previousTier].body);
        spawnFeathers(cx, cy, FEATHERS_PER_TRANSFORM, newTier);
        heatRef.current = Math.min(HEAT_MAX, heatRef.current + EVOLUTION_HEAT);
      } else {
        const rate =
          TIERS[newTier].screamRate * (1 - SCREAM_JITTER / 2 + Math.random() * SCREAM_JITTER);
        const played = playScream(rate);
        if (played) {
          recordPlay({ type: 'scream', key: played.key, rate: played.rate, at: Date.now() });
        }
        const count = FEATHERS_PER_CLICK + (Math.random() < FEATHER_EXTRA_CHANCE ? 1 : 0);
        spawnFeathers(cx, cy, count, newTier);
      }
      applySquash(e);
    },
    [playPowerUp, playScream, recordPlay, spawnShards, spawnFeathers, applySquash]
  );

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
        score: scoreRef.current,
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
    };
    window.__chicken = bridge;
    return () => {
      if (window.__chicken === bridge) delete window.__chicken;
    };
  }, [hit, spawnKid]);

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
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    return () => {
      if (squashTimerRef.current) clearTimeout(squashTimerRef.current);
      if (squashAttrTimerRef.current) clearTimeout(squashAttrTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const animate = (ts: number) => {
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

      const p = physicsRef.current;
      const m = mouseRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sc = scoreRef.current;
      const flying = modeRef.current === 'flying';

      const hyper = hyperRef.current;
      if (flying && sc >= HYPER_MIN_SCORE) {
        if (hyper.phase === 'idle') {
          if (!hyper.nextAt) {
            hyper.nextAt = ts + HYPER_DELAY_MIN_MS + Math.random() * HYPER_DELAY_SPREAD_MS;
          } else if (ts >= hyper.nextAt) {
            hyper.phase = 'burst';
            hyper.until = ts + HYPER_DURATION_MS;
            hyper.mult = HYPER_MULT_MIN + Math.random() * HYPER_MULT_SPREAD;
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

      const tp = teleportRef.current;
      if (flying && (sc >= TELEPORT_MIN_SCORE || tp.forcedDecoys !== null) && tp.phase === 'idle') {
        if (!tp.nextAt) {
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
          streaksRef.current.push(...makeTeleportStreaks(cx0, cy0, ts));
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
        const angle = Math.random() * Math.PI * 2;
        p.vx = Math.cos(angle) * BASE_SPEED;
        p.vy = Math.sin(angle) * BASE_SPEED;
        streaksRef.current.push(...makeTeleportStreaks(tx, ty, ts));
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
        const bob = Math.sin(ts * 0.004) * 1.2 + (grazing ? Math.sin(ts * GRAZE_PECK_FREQ) * 2 : 0);
        p.y = groundYFor(vh) - CHICKEN_H + bob;
        const rotTarget = grazing
          ? facingRef.current * (GRAZE_ANGLE + Math.sin(ts * GRAZE_PECK_FREQ) * GRAZE_PECK_AMPLITUDE)
          : 0;
        p.rotation += (rotTarget - p.rotation) * Math.min(1, GROUND_ROT_LERP * dt);
        p.rv = 0;
        p.bank = 0;
        if (p.vx > 0.01) facingRef.current = 1;
        else if (p.vx < -0.01) facingRef.current = -1;
      } else {
        let dx = p.vx * dt * sp;
        let dy = p.vy * dt * sp;
        const travel = Math.hypot(dx, dy);
        if (travel > MAX_FRAME_TRAVEL) {
          dx = (dx / travel) * MAX_FRAME_TRAVEL;
          dy = (dy / travel) * MAX_FRAME_TRAVEL;
        }
        p.x += dx;
        p.y += dy;

        if (p.x <= 0 || p.x >= vw - CHICKEN_W) {
          p.vx *= -1;
          p.vy += (Math.random() - 0.5) * BOUNCE_RANDOM;
          if (Math.random() < SPIN_BOUNCE_CHANCE) {
            p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
          }
          p.x = Math.max(0, Math.min(p.x, vw - CHICKEN_W));
        }
        if (p.y <= 0 || p.y >= vh - CHICKEN_H) {
          p.vy *= -1;
          p.vx += (Math.random() - 0.5) * BOUNCE_RANDOM;
          if (Math.random() < SPIN_BOUNCE_CHANCE) {
            p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
          }
          p.y = Math.max(0, Math.min(p.y, vh - CHICKEN_H));
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

      if (chickenElRef.current) {
        chickenElRef.current.style.transform =
          `translate(${p.x}px, ${p.y}px) rotate(${p.rotation + wobble + p.bank}deg)`;
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
        if (kidMotions.size === 0) spawnKid();
      }
      if (kidMotions.size > 0) {
        const kidY = groundYFor(vh) - KID_H;
        for (const [id, motion] of kidMotions) {
          if (motion.fleeing) {
            motion.x += motion.vx * dt;
            if (motion.x < -KID_W * 3 || motion.x > vw + KID_W * 3) {
              removeKid(id);
              continue;
            }
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
      const count = Math.ceil(intensity * dt);
      const particles = particlesRef.current;

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          alpha: 0.4 + Math.random() * 0.3,
          size: 2 + Math.random() * 3,
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

      const lightning = lightningForScore(sc);
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

        const auraRgb = auraRgbFor(sc);
        drawAura(ctx, cx, cy, ts, currentTier, auraLevelFor(sc, mercy), auraRgb);

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

        drawStreaks(ctx, streaksRef.current, now, dt, auraRgb);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [crackle, recordPlay, addGhost, spawnKid, removeKid]);

  const morph = morphForScore(score);
  const renderAuraLevel = auraLevelFor(score, 1);
  const renderAuraRgb = auraRgbFor(score);
  const glowStyle =
    renderAuraLevel > 0
      ? {
          filter: `drop-shadow(0 0 ${6 + 10 * renderAuraLevel + tier * 2}px rgba(${renderAuraRgb.r}, ${renderAuraRgb.g}, ${renderAuraRgb.b}, ${Math.min(0.55, 0.15 + renderAuraLevel * 0.5)}))`,
        }
      : undefined;

  return (
    <div className="fixed inset-0 bg-[#0b0b0b] overflow-hidden select-none cursor-crosshair">
      <GameScenery tier={tier} />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <span className="absolute top-4 left-5 text-xs text-white/40 font-medium tracking-wide pointer-events-none">
        Floating Chicken Game
      </span>

      <div className="absolute top-[225px] left-1/2 -translate-x-1/2 text-base text-white/50 pointer-events-none">
        Click the chicken
      </div>

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

      <div className="absolute top-[265px] left-1/2 -translate-x-1/2 text-5xl font-bold text-white tabular-nums pointer-events-none">
        {score}
      </div>

      {mercyCaption && (
        <div
          data-testid="chicken-mercy-caption"
          className="absolute top-[330px] left-1/2 -translate-x-1/2 text-xs italic text-white/35 pointer-events-none animate-[fadeIn_0.6s_ease-out]"
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
          <ChickenSvg className="w-[70px]" tier={ghost.tier} morph={ghost.morph} />
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
          onClick={() => fleeKid(kid.id)}
          className="absolute top-0 left-0 cursor-pointer will-change-transform"
        >
          <ChickenSvg className="w-[26px]" tier={kid.tier} morph={0} eyes="calm" />
        </div>
      ))}

      <div
        ref={chickenElRef}
        data-testid="chicken"
        data-tier={tier}
        data-squash="0"
        className="absolute will-change-transform cursor-pointer"
        style={{ left: 0, top: 0 }}
        onClick={hit}
      >
        <div
          ref={facingElRef}
          data-testid="chicken-facing"
          data-facing="1"
          style={{ transition: 'transform 160ms ease-out', transformOrigin: 'center' }}
        >
          <div ref={rubberElRef} className="chicken-rubber" data-squashed="0">
            <ChickenSvg className="w-[70px]" style={glowStyle} tier={tier} morph={morph} eyes={mood} />
          </div>
        </div>
      </div>

      <LeaderboardPanel
        open={sheet === 'board'}
        onToggle={() => setSheet((s) => (s === 'board' ? null : 'board'))}
        onClose={() => setSheet(null)}
        score={score}
      />

      {loaderPhase !== 'done' && (
        <SoundLoader progress={progress} fading={loaderPhase === 'fading'} />
      )}
    </div>
  );
}

export function ChickenGame() {
  return (
    <AppProvider>
      <ChickenGameInner />
    </AppProvider>
  );
}
