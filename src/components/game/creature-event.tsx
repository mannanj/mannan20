'use client';

import type { CSSProperties, RefObject } from 'react';
import type { GameItemId } from '@/components/inventory';
import type { CreatureSoundKey } from '@/lib/chicken-audio';
import { hudPushOut, hudZone } from './hud-safe-zone';

export type CreatureKind = 'kitty' | 'tiger' | 'lion';
export type CreatureMode = 'grab' | 'miss' | 'spectacle';
export type CreaturePhase = 'idle' | 'enter' | 'act' | 'hold' | 'sit' | 'leave' | 'done';
type Pose = 'walk' | 'stalk' | 'pounce' | 'hold' | 'sit';

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
}

export interface ClickTarget {
  id: string;
  label: string;
  clicks: number;
  raw: number;
}

export interface CreatureSpec {
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

export const CREATURE_ORDER: CreatureKind[] = ['kitty', 'tiger', 'lion'];
export const KITTY_HOLD_MS: [number, number] = [4000, 6000];
export const KITTY_HOLD_FLOOR_MS = 2000;
export const KITTY_CLICKS_PER_SHORTEN = 3;
export const KITTY_SHORTEN_MS = 1000;
export const BIG_CAT_STAY_MS: [number, number] = [5000, 10_000];
export const LION_MANE_CLICKS = 15;
export const LION_MANE_RAW = 2;
export const CREATURE_HINT_DELAY_MS = 1500;
export const MIN_HIT_PX = 56;
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

function sizeBasis(vw: number, vh: number): number {
  return Math.min(vh, vw * PORTRAIT_SIZE_BASIS);
}

function pose(file: string, aspect: number, faces: 1 | -1, scale: number, head: Rel): PoseAsset {
  return { file: `${ASSET_BASE}/${file}.webp`, aspect, faces, scale, head };
}

export const CREATURE_SPECS: Record<CreatureKind, CreatureSpec> = {
  kitty: {
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
    kind: 'lion',
    mode: 'miss',
    label: 'lion',
    banner: "click the lion's mane to tame it",
    heightFrac: 0.32,
    poses: {
      walk: pose('lion-walk', 1.43, -1, 1, { x: 0, y: 0, w: 0.42, h: 0.62 }),
      stalk: pose('lion-chase', 1.09, -1, 1.1, { x: 0.2, y: 0, w: 0.6, h: 0.55 }),
      pounce: pose('lion-pounce', 1.27, 1, 1.15, { x: 0.55, y: 0, w: 0.45, h: 0.55 }),
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

export interface CreatureState {
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
  dropped: boolean;
  dropBonus: number;
  pending: CreatureKind | null;
  enterSoundDone: boolean;
}

export function createCreatureState(): CreatureState {
  return {
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
    dropped: false,
    dropBonus: 1,
    pending: null,
    enterSoundDone: false,
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
}

export function createCreatureEls(): CreatureEls {
  return { root: null, imgA: null, imgB: null, front: null, shadow: null, body: null, targets: {}, hint: null, banner: null, feathers: Array.from({ length: FEATHER_SLOTS }, () => null) };
}

export function isCreatureBusy(s: CreatureState): boolean {
  return (s.phase !== 'idle' && s.phase !== 'done') || s.pending !== null;
}

export function isCreatureHolding(s: CreatureState): boolean {
  return s.phase === 'hold';
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

function groundCenterY(spec: CreatureSpec, p: Pose, vh: number, groundY: number): number {
  const { h } = sizeFor(spec, p, vh);
  return groundY - h / 2 + h * GROUND_SINK_FRAC;
}

export function startCreature(s: CreatureState, kind: CreatureKind, ctx: CreatureStartCtx): void {
  const spec = CREATURE_SPECS[kind];
  const fresh = createCreatureState();
  Object.assign(s, fresh);
  s.kind = kind;
  s.enteredAt = ctx.ts;
  s.dropBonus = ctx.dropBonus;
  const fromLeft = ctx.chickenCx >= ctx.vw / 2;
  s.dir = fromLeft ? 1 : -1;
  const vh = sizeBasis(ctx.vw, ctx.vh);
  const { w } = sizeFor(spec, 'walk', vh);
  s.pos = { x: fromLeft ? -w * SPAWN_OFFSET_FRAC : ctx.vw + w * SPAWN_OFFSET_FRAC, y: groundCenterY(spec, 'walk', vh, ctx.groundY) };
  const stand = ctx.chickenCx - s.dir * ctx.vw * STAND_DIST_FRAC;
  s.standX = clamp(stand, w / 2 + EDGE_MARGIN, ctx.vw - w / 2 - EDGE_MARGIN);
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
  for (const f of s.feathers) f.born -= ms;
}

export function tapCreatureBody(s: CreatureState): boolean {
  if (s.phase !== 'hold') return false;
  s.bodyClicks += 1;
  if (s.bodyClicks % KITTY_CLICKS_PER_SHORTEN === 0) {
    const minEnd = s.phaseAt + KITTY_HOLD_FLOOR_MS;
    s.holdEndsAt = Math.max(minEnd, s.holdEndsAt - KITTY_SHORTEN_MS);
  }
  return true;
}

export interface TargetTap {
  raw: number;
  completed: boolean;
}

export function tapCreatureTarget(s: CreatureState, targetId: string): TargetTap | null {
  if (!s.kind || s.phase !== 'act') return null;
  const target = CREATURE_SPECS[s.kind].targets.find((t) => t.id === targetId);
  if (!target || s.tamed) return null;
  s.targetClicks += 1;
  if (s.targetClicks >= target.clicks) {
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

export function tickCreature(s: CreatureState, els: CreatureEls, ctx: CreatureTickCtx): CreatureTickResult {
  const result: CreatureTickResult = { hold: null, flyUp: false, clearY: null, grabbed: false, released: false, drop: null, sound: null, done: false };
  if (!s.kind || !creatureOnScreen(s)) return result;
  const spec = CREATURE_SPECS[s.kind];
  const { ts, vw, groundY } = ctx;
  const vh = sizeBasis(vw, ctx.vh);
  const elapsed = ts - s.phaseAt;
  const chickenBottom = ctx.chickenCy + ctx.chickenH / 2;

  if (s.phase === 'enter') {
    if (!s.enterSoundDone) {
      s.enterSoundDone = true;
      result.sound = spec.sounds.enter;
    }
    const t = clamp(elapsed / spec.enterMs, 0, 1);
    const start = s.dir === 1 ? -sizeFor(spec, 'walk', vh).w * SPAWN_OFFSET_FRAC : vw + sizeFor(spec, 'walk', vh).w * SPAWN_OFFSET_FRAC;
    s.pos.x = start + (s.standX - start) * easeOut(t);
    s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
    if (spec.mode !== 'grab') result.clearY = reachTopFor(spec, vh, groundY) - CLEARANCE_PX;
    if (t >= 1) {
      if (spec.stalkMs > 0 && elapsed < spec.enterMs + spec.stalkMs) {
        setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
      } else {
        setPhase(s, 'act', ts);
        s.swipeAt = ts;
        s.swipeFrom = { ...s.pos };
        if (spec.mode === 'grab') result.sound = spec.sounds.act;
        if (spec.mode !== 'grab') setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
      }
    }
  } else if (s.phase === 'act' && spec.mode === 'grab') {
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
    const { w, h } = sizeFor(spec, 'hold', vh);
    s.pos.y = groundCenterY(spec, 'hold', vh, groundY);
    const flipped = s.dir !== poseAsset(spec, 'hold').faces;
    const relX = flipped ? 1 - HOLD_POINT_X : HOLD_POINT_X;
    result.hold = { x: s.pos.x - w / 2 + w * relX, y: s.pos.y - h / 2 + h * HOLD_POINT_Y };
    if (ts >= s.holdEndsAt) {
      setPhase(s, 'leave', ts);
      setPose(s, 'pounce', ts);
      s.swipeFrom = { ...s.pos };
      s.dir = s.pos.x < vw / 2 ? -1 : 1;
      s.feathers = [];
      result.released = true;
      result.drop = rollDrop(s, spec, result.hold, ctx.rng);
    }
  } else if (s.phase === 'act') {
    const actMs = Math.max(SWIPE_MS, s.stayMs - spec.enterMs - spec.leaveMs);
    const { h } = sizeFor(spec, 'pounce', vh);
    const since = ts - s.swipeAt;
    if (!s.swiping && since >= SWIPE_EVERY_MS && elapsed + SWIPE_MS < actMs) {
      s.swiping = true;
      s.swipeAt = ts;
      s.swipeFrom = { ...s.pos };
      s.misses += 1;
      result.flyUp = true;
      setPose(s, 'pounce', ts);
    }
    if (s.swiping) {
      const t = clamp((ts - s.swipeAt) / SWIPE_MS, 0, 1);
      const base = groundCenterY(spec, 'pounce', vh, groundY);
      s.pos.y = base - Math.sin(t * Math.PI) * h * POUNCE_LIFT_FRAC;
      if (t >= 1) {
        s.swiping = false;
        s.swipeAt = ts;
        setPose(s, spec.poses.stalk ? 'stalk' : 'walk', ts);
      }
    } else {
      s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
      const dx = ctx.chickenCx - s.pos.x;
      const step = Math.min(Math.abs(dx), CHASE_SPEED * ctx.dtMs);
      s.pos.x += Math.sign(dx) * step;
      if (Math.abs(dx) > ctx.chickenW) s.dir = dx >= 0 ? 1 : -1;
    }
    result.clearY = reachTopFor(spec, vh, groundY) - CLEARANCE_PX;
    if (s.swiping) s.minClearance = Math.min(s.minClearance, reachTopFor(spec, vh, groundY) - chickenBottom);
    if (s.tamed) {
      setPhase(s, 'sit', ts);
      setPose(s, 'sit', ts);
      s.swiping = false;
      const box = currentBox(spec, s, vh);
      const head = headRect(spec, s, box, s.dir !== poseAsset(spec, s.pose).faces);
      result.drop = rollDrop(s, spec, { x: head.x + head.w / 2, y: head.y + head.h / 2 }, ctx.rng);
    } else if (elapsed >= actMs) {
      setPhase(s, 'leave', ts);
      setPose(s, 'walk', ts);
      s.swipeFrom = { ...s.pos };
      s.dir = s.pos.x < vw / 2 ? -1 : 1;
    }
  } else if (s.phase === 'sit') {
    s.pos.y = groundCenterY(spec, 'sit', vh, groundY);
    if (elapsed >= SIT_MS) {
      setPhase(s, 'leave', ts);
      setPose(s, 'walk', ts);
      s.swipeFrom = { ...s.pos };
      s.dir = s.pos.x < vw / 2 ? -1 : 1;
    }
  } else if (s.phase === 'leave') {
    const { w } = sizeFor(spec, s.pose, vh);
    const exitX = nearestExitX(s, w, vw);
    const t = clamp(elapsed / (spec.leaveMs / LEAVE_SPEED_BOOST), 0, 1);
    s.pos.x = s.swipeFrom.x + (exitX - s.swipeFrom.x) * t;
    s.pos.y = groundCenterY(spec, s.pose, vh, groundY);
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
    if (spec.bodyTarget && s.phase === 'hold') place(els.body, atLeast(box, MIN_HIT_PX));
    else hide(els.body);
  }
  const activeTargets = s.phase === 'act' && !s.tamed ? spec.targets : [];
  for (const target of spec.targets) {
    const el = els.targets[target.id];
    if (!el) continue;
    if (!activeTargets.includes(target)) {
      hide(el);
      continue;
    }
    const head = atLeast(headRect(spec, s, box, flipped), MIN_HIT_PX);
    place(el, head);
    el.dataset.clicks = String(s.targetClicks);
  }
  if (els.hint) {
    const target = activeTargets[0];
    if (target && ts - s.phaseAt >= CREATURE_HINT_DELAY_MS) {
      const head = headRect(spec, s, box, flipped);
      els.hint.textContent = `click the ${target.label} ${s.targetClicks} / ${target.clicks}`;
      const w = els.hint.offsetWidth || 160;
      const hh = els.hint.offsetHeight || 28;
      const x0 = clamp(head.x + head.w / 2 - w / 2, HINT_EDGE_PAD, vw - w - HINT_EDGE_PAD);
      const y0 = Math.max(HINT_EDGE_PAD, head.y - hh - HINT_GAP_PX);
      const zone = hudZone(vw);
      const push = hudPushOut(zone, x0 + w / 2, y0 + hh / 2, w / 2, hh / 2);
      const x = clamp(x0 + push.dx, HINT_EDGE_PAD, vw - w - HINT_EDGE_PAD);
      const y = push.dy < 0 ? zone.bottom + HINT_GAP_PX : Math.max(HINT_EDGE_PAD, y0 + push.dy);
      els.hint.style.visibility = 'visible';
      els.hint.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } else {
      hide(els.hint);
    }
  }
  if (els.banner) {
    const show = s.phase === 'hold' || (spec.mode !== 'grab' && (s.phase === 'act' || s.phase === 'enter'));
    els.banner.style.opacity = show ? '1' : '0';
    els.banner.textContent = s.tamed ? `the ${spec.label} is tamed` : spec.banner;
  }
  if (els.root) {
    els.root.dataset.phase = s.phase;
    els.root.dataset.pose = s.pose;
    els.root.dataset.misses = String(s.misses);
    els.root.dataset.tamed = s.tamed ? '1' : '0';
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
    tamed: s.tamed,
    dropped: s.dropped,
    enteredAt: s.enteredAt,
    leftAt: s.leftAt,
    x: s.pos.x,
    y: s.pos.y,
  };
}

const LAYER = 'pointer-events-none absolute top-0 left-0 max-w-none select-none object-contain will-change-transform [visibility:hidden]';
const IMG_STYLE: CSSProperties = { transformOrigin: '50% 50%' };
const HIT = 'absolute top-0 left-0 z-[6] cursor-pointer will-change-transform [visibility:hidden]';
const FEATHER_SLOT_INDEXES = Array.from({ length: FEATHER_SLOTS }, (_, i) => i);

interface CreatureLayerProps {
  kind: CreatureKind;
  els: RefObject<CreatureEls>;
  onBody: (x: number, y: number) => void;
  onTarget: (id: string, x: number, y: number) => void;
}

export function CreatureLayer({ kind, els, onBody, onTarget }: CreatureLayerProps) {
  const spec = CREATURE_SPECS[kind];
  const bind = <K extends 'root' | 'imgA' | 'imgB' | 'front' | 'shadow' | 'body' | 'hint' | 'banner'>(key: K) => (el: CreatureEls[K]) => {
    els.current[key] = el;
  };
  return (
    <div ref={bind('root')} data-testid="creature-root" data-kind={kind} data-mode={spec.mode} data-phase="idle" data-misses="0" data-tamed="0" className="contents">
      <div ref={bind('shadow')} data-testid="creature-shadow" className="pointer-events-none absolute top-0 left-0 z-[3] rounded-[50%] bg-black/60 blur-[6px] will-change-transform [visibility:hidden]" />
      <img ref={bind('imgB')} alt="" draggable={false} data-testid="creature-prev" className={`${LAYER} z-[4]`} style={IMG_STYLE} />
      <img ref={bind('imgA')} alt="" draggable={false} data-testid="creature-img" className={`${LAYER} z-[4] drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]`} style={IMG_STYLE} />
      {spec.bodyTarget && (
        <img ref={bind('front')} alt="" draggable={false} data-testid="creature-front" className={`${LAYER} z-[6]`} style={{ ...IMG_STYLE, clipPath: PAW_FRONT_CLIP }} />
      )}
      {spec.bodyTarget && <div ref={bind('body')} data-testid="creature-body" className={HIT} onClick={(e) => onBody(e.clientX, e.clientY)} />}
      {spec.targets.map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            els.current.targets[t.id] = el;
          }}
          data-testid={`creature-target-${t.id}`}
          data-clicks="0"
          className={`${HIT} rounded-full`}
          onClick={(e) => onTarget(t.id, e.clientX, e.clientY)}
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
          className="pointer-events-none absolute top-0 left-0 z-[7] h-5 w-2.5 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.35)] [visibility:hidden]"
        />
      ))}
    </div>
  );
}
