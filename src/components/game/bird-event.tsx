'use client';

import type { CSSProperties, RefObject } from 'react';
import { hudPushOut, hudZone } from './hud-safe-zone';
import type { GameItemId } from '@/components/inventory';
import manifest from '../../../public/game/birds/manifest.json';
import { TapCursorGlyph } from './tap-cursor-icon';
import { talonNeed } from './chicken-pacing';

export type BirdKind = 'hawk' | 'eagle' | 'phoenix';
export type BirdPhase = 'idle' | 'approach' | 'grab' | 'right' | 'recoil' | 'left' | 'hover' | 'depart' | 'recede' | 'done';
export type TalonSide = 'right' | 'left';
type FrameName = 'fly-up' | 'fly-level' | 'fly-down' | 'bank' | 'away-3q' | 'away-far' | 'grab-body' | 'talon-left' | 'talon-right' | 'feather';
type FxName = 'fire-puff' | 'toasted-feather';
export type HeatLevel = 0 | 1 | 2;

interface FrameAsset {
  width: number;
  height: number;
  file: string;
  anchor?: { x: number; y: number };
}

interface TalonLayout {
  h: number;
  dx: number;
  dy: number;
  xMark: { x: number; y: number };
}

export interface BirdSpec {
  kind: BirdKind;
  bodyWidth: number;
  anchorShift: { x: number; y: number };
  chickenOffset: { x: number; y: number };
  right: TalonLayout;
  left: TalonLayout;
  rightClicks: number;
  leftClicks: number;
  focal: { x: number; y: number };
  skinId: string;
  itemId: GameItemId;
  multiplier: number;
  featherClicks: number;
  heat: boolean;
  flightSpan: number;
}

const FRAMES = manifest as unknown as Record<BirdKind, Partial<Record<FrameName, FrameAsset>>> & { fx: Record<FxName, FrameAsset> };

export const BIRD_SPECS: Record<BirdKind, BirdSpec> = {
  hawk: {
    kind: 'hawk',
    bodyWidth: 110,
    anchorShift: { x: 0.11, y: -0.04 },
    chickenOffset: { x: 0.02, y: 0.55 },
    right: { h: 0.42, dx: -0.06, dy: -0.1, xMark: { x: 0.55, y: 0.7 } },
    left: { h: 0.36, dx: 0.12, dy: -0.16, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 25,
    leftClicks: 25,
    focal: { x: 0, y: 0 },
    skinId: 'hawk',
    itemId: 'hawk-feather',
    multiplier: 1.25,
    featherClicks: 25,
    heat: false,
    flightSpan: 85,
  },
  eagle: {
    kind: 'eagle',
    bodyWidth: 120,
    anchorShift: { x: 0.09, y: -0.03 },
    chickenOffset: { x: 0.02, y: 0.55 },
    right: { h: 0.42, dx: -0.06, dy: -0.1, xMark: { x: 0.55, y: 0.7 } },
    left: { h: 0.36, dx: 0.12, dy: -0.16, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 50,
    leftClicks: 50,
    focal: { x: 0.12, y: -0.1 },
    skinId: 'eagle',
    itemId: 'eagle-feather',
    multiplier: 2,
    featherClicks: 25,
    heat: false,
    flightSpan: 95,
  },
  phoenix: {
    kind: 'phoenix',
    bodyWidth: 150,
    anchorShift: { x: 0.1, y: -0.03 },
    chickenOffset: { x: 0.02, y: 0.55 },
    right: { h: 0.42, dx: -0.06, dy: -0.1, xMark: { x: 0.55, y: 0.7 } },
    left: { h: 0.36, dx: 0.12, dy: -0.16, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 100,
    leftClicks: 100,
    focal: { x: -0.1, y: -0.12 },
    skinId: 'phoenix',
    itemId: 'phoenix-feather',
    multiplier: 3,
    featherClicks: 25,
    heat: true,
    flightSpan: 115,
  },
};

export const BIRD_ORDER: BirdKind[] = ['hawk', 'eagle', 'phoenix'];
export const BIRD_TRIGGER_SCORE: Record<BirdKind, number> = { hawk: 500, eagle: 600, phoenix: 2000 };
export const BIRD_PULSE_EVERY_TAPS = 5;
export const TOASTED_MAX = 10;
export const TOASTED_ALIVE_MAX = 12;
export const REGROW_MS = 3500;
export const FLASH_MAX_OPACITY = 0.18;
const FIRE_PULSE_MS = 520;
const FIRE_SIZE_FRAC = 1.6;
const SHIMMER_W_FRAC = 2.6;
const SHIMMER_H_FRAC = 1.5;
const TOASTED_LIFE_MIN_MS = 1600;
const TOASTED_LIFE_SPREAD_MS = 1200;
const TOASTED_W_FRAC = 0.34;
const TOASTED_VX_MIN = 0.06;
const TOASTED_VX_SPREAD = 0.1;
const TOASTED_VY = -0.09;
const TOASTED_GRAVITY = 0.00016;
const TOASTED_SPIN_DEG_MS = 0.25;
const GRIP_DX_VB = -13;
const GRIP_DY_VB = 20;
const CHICKEN_VB_W = 80;
const CHICKEN_VB_H = 160;
const SIZZLE_T1_BASE = 0.25;
const SIZZLE_T1_GAIN = 0.35;
const SIZZLE_T2_BASE = 0.65;
const SIZZLE_T2_GAIN = 0.35;
const HEAT_TINT_MAX = 0.14;
const COUNTER_EDGE_PAD = 6;
export const BIRD_BANNER_TEXT = 'help the chicken escape!';
export const BIRD_LABEL_TEXT = 'click the claw';
export const BIRD_CALM_FREE_CLICKS = 25;
export const BIRD_CALM_MS = 60_000;
export const BIRD_HINT_DELAY_MS = 10_000;
export const BIRD_LABEL_DELAY_MS = 30_000;
export const BIRD_LOOK_EVERY_TAPS = 5;
export const BIRD_LOOK_MS = 600;
export const BIRD_DEPART_DELAY_MS = 5000;
export const BIRD_BIG_FLAP_AT_MS = 6000;
export const BIRD_RECEDE_MS = 10_000;
const APPROACH_MS = 1900;
const GRAB_MS = 450;
const RECOIL_MS = 700;
const FLAP_EVERY_MS = 2000;
const FLAP_MS = 260;
const BIG_FLAPS = 4;
const BIG_FLAP_GAP_MS = 190;
const END_SCALE = 0.02;
const FEATHER_FALL_MS = 2200;
const FEATHER_H = 180;
const FEATHER_SWAY_PX = 34;
const MIN_HIT_PX = 44;
const MIN_TALON_HIT_PX = 56;
const HIT_SPLIT_GAP = 1;
const TALON_HIT_FRAC = 0.9;
const XFADE_MS = 140;
const DRIFT_SPEED = 0.03;
const WINGBEAT_MS = 170;
const MAX_BANK_DEG = 32;
const BANK_FRAME_DEG = 16;
const BANK_GAIN = 30_000;
const BANK_LERP = 0.14;
const APPROACH_START_SCALE = 0.55;
const APPROACH_BOB_PX = 4;
const EDGE_MARGIN = 24;
const SPAWN_OFFSET = 160;
const CTRL_ALONG = 0.6;
const SWOOP_DEPTH = 220;
const RECOIL_DX = -10;
const RECOIL_DY = -14;
const TALON_LIFT_FRAC = 0.35;
const TALON_LIFT_DEG = -35;
const LIFT_PX = 30;
const RECEDE_BANK_END = 0.25;
const RECEDE_3Q_END = 0.55;
const RECEDE_FADE_FROM = 0.85;
const RECEDE_BANK_DEG = 22;
const WINGBEAT_PULSE = 0.05;
const HOVER_BOB_PX = 5;
const HINT_R = 18;
const HINT_TAIL_DX = 170;
const HINT_TAIL_DY = 120;
const HINT_SIDE_DY = 14;
const HINT_SIDE_STRETCH = 1.25;
const HINT_HEAD_LEN = 16;
const HINT_HEAD_HALF = 10;
const HINT_EDGE_PAD = 44;
const HINT_LABEL_W = 128;
const HINT_LABEL_PAD = 8;
const COUNTER_GAP = 10;
const LOOK_WIDTH_FRAC = 0.9;
const WINGBEAT_CYCLE: FrameName[] = ['fly-up', 'fly-level', 'fly-down', 'fly-level'];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

export interface HudRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BirdSnapshot {
  speed: number;
  heat: number;
  vx: number;
  vy: number;
  facing: number;
  mode: 'ground' | 'flying';
}

interface FeatherDrop {
  x: number;
  y: number;
  born: number;
  groundY: number;
}

export interface ToastedFeather {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  born: number;
  life: number;
}

export interface BirdState {
  kind: BirdKind | null;
  phase: BirdPhase;
  phaseAt: number;
  pending: boolean;
  triggered: boolean;
  start: Point;
  ctrl: Point;
  pos: Point;
  prevPos: Point;
  heading: number;
  bank: number;
  scale: number;
  fit: number;
  anchor: Point;
  settled: Point;
  grabFrom: Point;
  intercept: Point;
  nudge: Point;
  drift: Point;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  hud: HudRect | null;
  chicken: { w: number; h: number };
  rightClicks: number;
  leftClicks: number;
  talonWeight: number;
  lastTapAt: number;
  hintShownAt: number;
  lookUntil: number;
  looks: number;
  calm: boolean;
  calmUntil: number;
  calmClicks: number;
  hoverCenter: Point;
  nextFlapAt: number;
  flapAt: number;
  bigFlapsLeft: number;
  recoveryClicks: number;
  feathered: boolean;
  feather: FeatherDrop | null;
  snapshot: BirdSnapshot | null;
  preload: HTMLImageElement[];
  queue: BirdKind[];
  finished: BirdKind[];
  talonScale: number;
  pulseAt: number;
  pulses: number;
  burn: number;
  heat: HeatLevel;
  toasted: ToastedFeather[];
  toastedSpawned: number;
  swapAt: number;
}

export function createBirdState(): BirdState {
  const zero = { x: 0, y: 0 };
  return {
    kind: null,
    phase: 'idle',
    phaseAt: 0,
    pending: false,
    triggered: false,
    start: { ...zero },
    ctrl: { ...zero },
    pos: { ...zero },
    prevPos: { ...zero },
    heading: 0,
    bank: 0,
    scale: 1,
    fit: 1,
    anchor: { ...zero },
    settled: { ...zero },
    grabFrom: { ...zero },
    intercept: { ...zero },
    nudge: { ...zero },
    drift: { ...zero },
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    hud: null,
    chicken: { w: 70, h: 140 },
    rightClicks: 0,
    leftClicks: 0,
    talonWeight: 1,
    lastTapAt: 0,
    hintShownAt: 0,
    lookUntil: 0,
    looks: 0,
    calm: false,
    calmUntil: 0,
    calmClicks: 0,
    hoverCenter: { ...zero },
    nextFlapAt: 0,
    flapAt: 0,
    bigFlapsLeft: 0,
    recoveryClicks: 0,
    feathered: false,
    feather: null,
    snapshot: null,
    preload: [],
    queue: [],
    finished: [],
    talonScale: 1,
    pulseAt: 0,
    pulses: 0,
    burn: 0,
    heat: 0,
    toasted: Array.from({ length: TOASTED_ALIVE_MAX }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, born: 0, life: 0 })),
    toastedSpawned: 0,
    swapAt: 0,
  };
}

export interface BirdEls {
  root: HTMLDivElement | null;
  flight: HTMLImageElement | null;
  flightPrev: HTMLImageElement | null;
  hitR: HTMLDivElement | null;
  hitL: HTMLDivElement | null;
  body: HTMLImageElement | null;
  look: HTMLImageElement | null;
  talonL: HTMLImageElement | null;
  talonR: HTMLImageElement | null;
  hint: SVGSVGElement | null;
  x1: SVGLineElement | null;
  x2: SVGLineElement | null;
  shaft: SVGLineElement | null;
  head: SVGPolygonElement | null;
  cursor: SVGGElement | null;
  label: SVGTextElement | null;
  counter: HTMLDivElement | null;
  banner: HTMLDivElement | null;
  hitArea: HTMLDivElement | null;
  feather: HTMLImageElement | null;
  fire: HTMLImageElement | null;
  flash: HTMLDivElement | null;
  shimmer: HTMLDivElement | null;
  toasted: (HTMLImageElement | null)[];
}

export function createBirdEls(): BirdEls {
  return {
    root: null,
    flight: null,
    flightPrev: null,
    hitR: null,
    hitL: null,
    body: null,
    look: null,
    talonL: null,
    talonR: null,
    hint: null,
    x1: null,
    x2: null,
    shaft: null,
    head: null,
    cursor: null,
    label: null,
    counter: null,
    banner: null,
    hitArea: null,
    feather: null,
    fire: null,
    flash: null,
    shimmer: null,
    toasted: Array.from({ length: TOASTED_ALIVE_MAX }, () => null),
  };
}

export function isGripping(phase: BirdPhase): boolean {
  return phase === 'grab' || phase === 'right' || phase === 'recoil' || phase === 'left';
}

export function isBirdBusy(s: BirdState): boolean {
  return (s.phase !== 'idle' && s.phase !== 'done') || s.calm;
}

export function queueBird(s: BirdState, kind: BirdKind): boolean {
  if (s.kind === kind && s.phase !== 'done') return false;
  if (s.finished.includes(kind) || s.queue.includes(kind)) return false;
  s.queue.push(kind);
  s.triggered = true;
  return true;
}

export function requeueBird(s: BirdState, kind: BirdKind): boolean {
  s.finished = s.finished.filter((k) => k !== kind);
  return queueBird(s, kind);
}

export function queueBirdsForScore(s: BirdState, prevShown: number, shown: number): void {
  for (const kind of BIRD_ORDER) {
    const at = BIRD_TRIGGER_SCORE[kind];
    if (prevShown < at && shown >= at) queueBird(s, kind);
  }
}

export function nextBird(s: BirdState): BirdKind | null {
  if (s.calm || (s.phase !== 'idle' && s.phase !== 'done')) return null;
  return s.queue[0] ?? null;
}

export function anyToastedAlive(s: BirdState): number {
  return s.toasted.filter((f) => f.alive).length;
}

export function collectToasted(s: BirdState, index: number): Point | null {
  const f = s.toasted[index];
  if (!f || !f.alive) return null;
  f.alive = false;
  return { x: f.x, y: f.y };
}

function gripPoint(hold: Point, chicken: { w: number; h: number }): Point {
  return { x: hold.x + (GRIP_DX_VB / CHICKEN_VB_W) * chicken.w, y: hold.y + (GRIP_DY_VB / CHICKEN_VB_H) * chicken.h };
}

function spawnToasted(s: BirdState, at: Point, ts: number): void {
  const slot = s.toasted.find((f) => !f.alive);
  if (!slot) return;
  const dir = Math.random() < 0.5 ? -1 : 1;
  slot.alive = true;
  slot.x = at.x;
  slot.y = at.y;
  slot.vx = dir * (TOASTED_VX_MIN + Math.random() * TOASTED_VX_SPREAD);
  slot.vy = TOASTED_VY * (0.6 + Math.random() * 0.8);
  slot.rot = Math.random() * 360;
  slot.spin = (Math.random() - 0.5) * 2 * TOASTED_SPIN_DEG_MS;
  slot.born = ts;
  slot.life = TOASTED_LIFE_MIN_MS + Math.random() * TOASTED_LIFE_SPREAD_MS;
  s.toastedSpawned += 1;
}

const HELMET_FRAMES: ReadonlySet<string> = new Set(['grab-body', 'fly-level', 'fly-up', 'fly-down', 'bank', 'away-3q']);

function frame(kind: BirdKind, name: FrameName): FrameAsset {
  const a = FRAMES[kind][name];
  if (a && kind === 'hawk' && HELMET_FRAMES.has(name)) return { ...a, file: a.file.replace('.webp', '-helmet.webp') };
  if (!a) throw new Error(`missing bird frame ${kind}/${name}`);
  return a;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeIn(t: number): number {
  return t * t;
}

interface Layout {
  body: Rect;
  right: Rect;
  left: Rect;
}

function layoutFor(spec: BirdSpec, cx: number, cy: number, cw: number, ch: number, fit: number): Layout {
  const gb = frame(spec.kind, 'grab-body');
  const tr = frame(spec.kind, 'talon-right');
  const tl = frame(spec.kind, 'talon-left');
  const an = gb.anchor ?? { x: 0, y: 0 };
  const bw = spec.bodyWidth * fit;
  const bh = (bw * gb.height) / gb.width;
  const ax = cx - spec.chickenOffset.x * bw;
  const ay = cy - spec.chickenOffset.y * bh;
  const body = { x: ax - (an.x + spec.anchorShift.x) * bw, y: ay - (an.y + spec.anchorShift.y) * bh, w: bw, h: bh };
  const rh = bh * spec.right.h;
  const rw = (rh * tr.width) / tr.height;
  const right = { x: ax + spec.right.dx * bw - rw / 2, y: ay + spec.right.dy * bh, w: rw, h: rh };
  const lh = bh * spec.left.h;
  const lw = (lh * tl.width) / tl.height;
  const left = { x: ax + spec.left.dx * bw - lw / 2, y: ay + spec.left.dy * bh, w: lw, h: lh };
  void cw;
  void ch;
  return { body, right, left };
}

interface Extents {
  left: number;
  right: number;
  top: number;
  bottom: number;
  body: Rect;
}

function extentsFor(spec: BirdSpec, cw: number, ch: number, fit: number): Extents {
  const L = layoutFor(spec, 0, 0, cw, ch, fit);
  const rects = [L.body, L.right, L.left, { x: -cw / 2, y: -ch / 2, w: cw, h: ch }];
  return {
    left: Math.min(...rects.map((r) => r.x)),
    right: Math.max(...rects.map((r) => r.x + r.w)),
    top: Math.min(...rects.map((r) => r.y)),
    bottom: Math.max(...rects.map((r) => r.y + r.h)),
    body: L.body,
  };
}

function hitsHud(ext: Extents, x: number, y: number, hud: HudRect | null): boolean {
  if (!hud) return false;
  const M = EDGE_MARGIN;
  const bl = x + ext.body.x;
  const br = bl + ext.body.w;
  const bt = y + ext.body.y;
  const bb = bt + ext.body.h;
  return br > hud.left - M && bl < hud.right + M && bt < hud.bottom + M && bb > hud.top - M;
}

function settleAnchor(s: BirdState, spec: BirdSpec, vw: number, vh: number): void {
  const M = EDGE_MARGIN;
  const { w: cw, h: ch } = s.chicken;
  const full = extentsFor(spec, cw, ch, 1);
  const fit = Math.min(1, (vh - 2 * M) / (full.bottom - full.top), (vw - 2 * M) / (full.right - full.left));
  const ext = extentsFor(spec, cw, ch, fit);
  const bounds = { minX: M - ext.left, maxX: vw - M - ext.right, minY: M - ext.top, maxY: vh - M - ext.bottom };
  let x = clamp(s.intercept.x, bounds.minX, bounds.maxX);
  let y = clamp(s.intercept.y, bounds.minY, bounds.maxY);
  const hud = s.hud;
  if (hud && hitsHud(ext, x, y, hud)) {
    const options: { x: number; y: number; d: number }[] = [];
    const xL = hud.left - M - (ext.body.x + ext.body.w);
    const xR = hud.right + M - ext.body.x;
    const yD = hud.bottom + M - ext.body.y;
    if (xL >= bounds.minX) options.push({ x: xL, y, d: Math.abs(xL - x) });
    if (xR <= bounds.maxX) options.push({ x: xR, y, d: Math.abs(xR - x) });
    if (yD <= bounds.maxY) options.push({ x, y: yD, d: Math.abs(yD - y) });
    options.sort((a, b) => a.d - b.d);
    if (options[0]) {
      x = options[0].x;
      y = options[0].y;
    }
  }
  s.fit = fit;
  s.bounds = bounds;
  s.anchor = { x, y };
  s.settled = { x, y };
  s.nudge = { x: x - s.intercept.x, y: y - s.intercept.y };
  const a = Math.random() * Math.PI * 2;
  s.drift = { x: Math.cos(a) * DRIFT_SPEED, y: Math.sin(a) * DRIFT_SPEED };
}

export function startBird(s: BirdState, kind: BirdKind, ts: number, cx: number, cy: number, vw: number, vh: number, snapshot: BirdSnapshot, hud: HudRect | null, chicken: { w: number; h: number }): void {
  const fresh = createBirdState();
  const queue = s.queue.filter((k) => k !== kind);
  Object.assign(s, fresh, { kind, triggered: true, pending: false, snapshot, hud, chicken, queue, finished: s.finished });
  s.phase = 'approach';
  s.phaseAt = ts;
  const fromRight = cx < vw / 2;
  s.start = { x: fromRight ? vw + SPAWN_OFFSET : -SPAWN_OFFSET, y: -SPAWN_OFFSET / 2 };
  s.ctrl = { x: s.start.x + (cx - s.start.x) * CTRL_ALONG, y: Math.min(vh - EDGE_MARGIN * 2, cy + SWOOP_DEPTH) };
  s.pos = { ...s.start };
  s.prevPos = { ...s.start };
  s.scale = APPROACH_START_SCALE;
  const names: FrameName[] = ['fly-up', 'fly-level', 'fly-down', 'bank', 'away-3q', 'away-far', 'grab-body', 'talon-left', 'talon-right', 'feather'];
  s.preload = names
    .filter((n) => FRAMES[kind][n])
    .map((n) => {
      const img = new Image();
      img.src = frame(kind, n).file;
      return img;
    });
}

export function shiftBirdTime(s: BirdState, ms: number): void {
  s.phaseAt -= ms;
  if (s.lastTapAt) s.lastTapAt -= ms;
  if (s.hintShownAt) s.hintShownAt -= ms;
  if (s.lookUntil) s.lookUntil -= ms;
  if (s.calmUntil) s.calmUntil -= ms;
  if (s.nextFlapAt) s.nextFlapAt -= ms;
  if (s.flapAt) s.flapAt -= ms;
  if (s.feather) s.feather.born -= ms;
  if (s.pulseAt) s.pulseAt -= ms;
  if (s.swapAt) s.swapAt -= ms;
  for (const f of s.toasted) if (f.alive) f.born -= ms;
}

export type TapResult = 'ignored' | 'scored' | 'freed-right' | 'freed-left';

export function tapTalon(s: BirdState, side: TalonSide, ts: number): TapResult {
  const spec = s.kind ? BIRD_SPECS[s.kind] : null;
  if (!spec) return 'ignored';
  if (side === 'right' && s.phase === 'right') {
    s.rightClicks += 1;
    s.lastTapAt = ts;
    if (s.rightClicks >= talonNeed(spec.rightClicks * s.talonScale, s.talonWeight)) {
      s.phase = 'recoil';
      s.phaseAt = ts;
      s.hintShownAt = 0;
      s.lastTapAt = 0;
      return 'freed-right';
    }
    return 'scored';
  }
  if (side === 'left' && s.phase === 'left') {
    s.leftClicks += 1;
    s.lastTapAt = ts;
    const freed = s.leftClicks >= talonNeed(spec.leftClicks * s.talonScale, s.talonWeight);
    if (freed || s.leftClicks % BIRD_LOOK_EVERY_TAPS === 0) {
      s.lookUntil = ts + BIRD_LOOK_MS;
      s.looks += 1;
    }
    if (spec.heat) {
      s.burn = clamp(s.leftClicks / talonNeed(spec.leftClicks * s.talonScale, s.talonWeight), 0, 1);
      if (s.leftClicks % BIRD_PULSE_EVERY_TAPS === 0) {
        s.pulseAt = ts;
        s.pulses += 1;
      }
      spawnToasted(s, gripPoint(s.anchor, s.chicken), ts);
    }
    if (freed) {
      const L = layoutFor(spec, s.anchor.x, s.anchor.y, s.chicken.w, s.chicken.h, s.fit);
      s.hoverCenter = { x: L.body.x + L.body.w / 2, y: L.body.y + L.body.h / 2 };
      s.phase = 'hover';
      s.phaseAt = ts;
      s.calm = true;
      s.calmUntil = ts + BIRD_CALM_MS;
      s.calmClicks = 0;
      s.nextFlapAt = ts + FLAP_EVERY_MS;
      s.hintShownAt = 0;
      return 'freed-left';
    }
    return 'scored';
  }
  return 'ignored';
}

export function noteCalmClick(s: BirdState): boolean {
  if (!s.calm) return false;
  s.calmClicks += 1;
  if (s.calmClicks >= BIRD_CALM_FREE_CLICKS) {
    s.calm = false;
    return true;
  }
  return false;
}

export function tapRecedingBird(s: BirdState, ts: number, groundY: number): 'ignored' | 'scored' | 'feather' {
  if (s.phase !== 'recede' && s.phase !== 'depart') return 'ignored';
  const spec = s.kind ? BIRD_SPECS[s.kind] : null;
  if (!spec) return 'ignored';
  s.recoveryClicks += 1;
  s.flapAt = ts;
  if (!s.feathered && s.recoveryClicks >= spec.featherClicks) {
    s.feathered = true;
    s.feather = { x: s.pos.x, y: s.pos.y, born: ts, groundY };
    return 'feather';
  }
  return 'scored';
}

export function takeFeather(s: BirdState): Point | null {
  const f = s.feather;
  if (!f) return null;
  s.feather = null;
  return { x: f.x, y: f.y };
}

export interface BirdCtx {
  ts: number;
  dtMs: number;
  vw: number;
  vh: number;
  chickenCx: number;
  chickenCy: number;
  groundY: number;
}

export interface BirdTickResult {
  hold: Point | null;
  restore: boolean;
  grabbed: boolean;
  heat: HeatLevel;
  sizzle: number;
  burn: number;
  tint: number;
}

function fx(name: FxName): FrameAsset {
  return FRAMES.fx[name];
}

function tickToasted(s: BirdState, els: BirdEls, ctx: BirdCtx): void {
  const w = s.chicken.w * TOASTED_W_FRAC;
  const a = fx('toasted-feather');
  const h = (w * a.height) / a.width;
  for (let i = 0; i < s.toasted.length; i++) {
    const f = s.toasted[i];
    const el = els.toasted[i];
    if (f.alive) {
      const age = ctx.ts - f.born;
      if (age >= f.life || f.y > ctx.vh + h) f.alive = false;
      else {
        f.vy += TOASTED_GRAVITY * ctx.dtMs;
        f.x += f.vx * ctx.dtMs;
        f.y += f.vy * ctx.dtMs;
        f.rot += f.spin * ctx.dtMs;
        if (el) {
          const fade = age > f.life - 500 ? (f.life - age) / 500 : 1;
          place(el, { x: f.x - w / 2, y: f.y - h / 2, w, h }, ` rotate(${f.rot.toFixed(1)}deg)`);
          show(el, true, fade);
          el.style.pointerEvents = 'auto';
          if (el.dataset.alive !== '1') el.dataset.alive = '1';
        }
        continue;
      }
    }
    if (el && el.dataset.alive !== '0') {
      el.dataset.alive = '0';
      el.style.pointerEvents = 'none';
      show(el, false);
    }
  }
}

function tickHeat(s: BirdState, els: BirdEls, ctx: BirdCtx, hold: Point, result: BirdTickResult): void {
  const spec = s.kind ? BIRD_SPECS[s.kind] : null;
  const root = els.root;
  if (!spec || !spec.heat) {
    show(els.fire, false);
    show(els.flash, false);
    show(els.shimmer, false);
    return;
  }
  const second = s.phase === 'recoil' || s.phase === 'left';
  const heat: HeatLevel = second ? 2 : 1;
  const progress1 = clamp(s.rightClicks / talonNeed(spec.rightClicks * s.talonScale, s.talonWeight), 0, 1);
  result.heat = heat;
  result.burn = s.burn;
  result.sizzle = second ? SIZZLE_T2_BASE + SIZZLE_T2_GAIN * s.burn : SIZZLE_T1_BASE + SIZZLE_T1_GAIN * progress1;
  result.tint = HEAT_TINT_MAX * (second ? 0.6 + 0.4 * s.burn : 0.5 * progress1);
  const grip = gripPoint(hold, s.chicken);
  const pt = s.pulseAt ? (ctx.ts - s.pulseAt) / FIRE_PULSE_MS : 2;
  const pulsing = pt >= 0 && pt < 1;
  if (els.fire) {
    if (pulsing) {
      const a = fx('fire-puff');
      const size = s.chicken.w * FIRE_SIZE_FRAC * (0.55 + 0.85 * easeOut(pt));
      const h = (size * a.height) / a.width;
      place(els.fire, { x: grip.x - size / 2, y: grip.y - h * 0.62, w: size, h }, ` rotate(${(pt * 18).toFixed(1)}deg)`);
    }
    show(els.fire, pulsing, pulsing ? Math.sin(Math.PI * pt) : 0);
  }
  show(els.flash, pulsing, pulsing ? FLASH_MAX_OPACITY * Math.sin(Math.PI * pt) : 0);
  if (els.shimmer) {
    const w = s.chicken.w * SHIMMER_W_FRAC;
    const h = s.chicken.h * SHIMMER_H_FRAC;
    els.shimmer.style.height = `${h.toFixed(1)}px`;
    place(els.shimmer, { x: hold.x - w / 2, y: hold.y - h / 2, w, h });
    show(els.shimmer, second, 0.35 + 0.45 * s.burn);
  }
  if (root) {
    const pulse = pulsing ? '1' : '0';
    if (root.dataset.pulse !== pulse) root.dataset.pulse = pulse;
  }
}

function setFrame(img: HTMLImageElement, kind: BirdKind, name: FrameName): FrameAsset {
  const a = frame(kind, name);
  if (img.dataset.frame !== name) {
    img.dataset.frame = name;
    img.src = a.file;
  }
  return a;
}

function spanRect(a: FrameAsset, cx: number, cy: number, span: number): Rect {
  const k = span / Math.max(a.width, a.height);
  return { x: cx - (a.width * k) / 2, y: cy - (a.height * k) / 2, w: a.width * k, h: a.height * k };
}

function bodySpan(L: Layout): number {
  return Math.max(L.body.w, L.body.h);
}

function placeFlight(s: BirdState, els: BirdEls, ts: number, name: FrameName, cx: number, cy: number, span: number, extra: string, opacity: number): void {
  const cur = els.flight;
  const prev = els.flightPrev;
  if (!cur || !s.kind) return;
  const was = cur.dataset.frame as FrameName | undefined;
  if (was !== name) {
    if (prev && was && cur.style.visibility === 'visible') {
      prev.dataset.frame = was;
      prev.src = frame(s.kind, was).file;
      s.swapAt = ts;
    }
    setFrame(cur, s.kind, name);
  }
  const t = s.swapAt ? clamp((ts - s.swapAt) / XFADE_MS, 0, 1) : 1;
  place(cur, spanRect(frame(s.kind, name), cx, cy, span), extra);
  show(cur, opacity > 0, opacity * t);
  if (!prev) return;
  const old = prev.dataset.frame as FrameName | undefined;
  if (t < 1 && old && opacity > 0) {
    place(prev, spanRect(frame(s.kind, old), cx, cy, span), extra);
    show(prev, true, opacity * (1 - t));
  } else show(prev, false);
}

function hitSquare(target: Rect, mark: { x: number; y: number }, size: number): Rect {
  const cx = target.x + target.w * mark.x;
  const cy = target.y + target.h * mark.y;
  return { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
}

function placeHit(el: HTMLDivElement | null, r: Rect, active: boolean): void {
  if (!el) return;
  el.style.height = `${r.h.toFixed(1)}px`;
  place(el, r);
  el.style.pointerEvents = active ? 'auto' : 'none';
  show(el, true, 1);
}

function talonHits(spec: BirdSpec, L: Layout): { right: Rect; left: Rect } {
  const cR = { x: L.right.x + L.right.w * spec.right.xMark.x, y: L.right.y + L.right.h * spec.right.xMark.y };
  const cL = { x: L.left.x + L.left.w * spec.left.xMark.x, y: L.left.y + L.left.h * spec.left.xMark.y };
  const gap = Math.max(Math.abs(cR.x - cL.x), Math.abs(cR.y - cL.y));
  const want = Math.max(MIN_TALON_HIT_PX, Math.max(L.right.h, L.left.h) * TALON_HIT_FRAC);
  const size = Math.max(MIN_TALON_HIT_PX, Math.min(want, gap));
  const right = hitSquare(L.right, spec.right.xMark, size);
  const left = hitSquare(L.left, spec.left.xMark, size);
  const overlap = right.x < left.x + left.w && left.x < right.x + right.w && right.y < left.y + left.h && left.y < right.y + right.h;
  if (overlap) {
    const midX = (cR.x + cL.x) / 2;
    right.x = midX - HIT_SPLIT_GAP - size;
    left.x = midX + HIT_SPLIT_GAP;
  }
  return { right, left };
}

function wingbeatFrame(ts: number): FrameName {
  return WINGBEAT_CYCLE[Math.floor(ts / WINGBEAT_MS) % WINGBEAT_CYCLE.length];
}

function place(el: HTMLElement | null, r: Rect, extra = ''): void {
  if (!el) return;
  const w = `${r.w.toFixed(1)}px`;
  if (el.style.width !== w) el.style.width = w;
  el.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)${extra}`;
}

function show(el: HTMLElement | SVGElement | null, visible: boolean, opacity = 1): void {
  if (!el) return;
  const v = visible ? 'visible' : 'hidden';
  if (el.style.visibility !== v) el.style.visibility = v;
  if (visible) el.style.opacity = opacity.toFixed(3);
}

function drawHint(els: BirdEls, target: Rect, mark: { x: number; y: number }, vw: number, vh: number, label: boolean, side: TalonSide): void {
  const xc = target.x + target.w * mark.x;
  const yc = target.y + target.h * mark.y;
  const R = HINT_R;
  const outward = side === 'right' ? -1 : 1;
  const tail = { x: xc + outward * HINT_TAIL_DX, y: yc + HINT_TAIL_DY };
  if (tail.x + 80 > vw || tail.x - 80 < 0) tail.x = xc - outward * HINT_TAIL_DX;
  if (tail.y + 90 > vh) {
    tail.y = yc + HINT_SIDE_DY;
    tail.x = xc + outward * HINT_TAIL_DX * HINT_SIDE_STRETCH;
    if (tail.x + 80 > vw || tail.x - 80 < 0) tail.x = xc - outward * HINT_TAIL_DX * HINT_SIDE_STRETCH;
  }
  tail.x = Math.max(HINT_EDGE_PAD, Math.min(vw - HINT_EDGE_PAD, tail.x));
  tail.y = Math.max(HINT_EDGE_PAD, Math.min(vh - HINT_EDGE_PAD, tail.y));
  const ang = Math.atan2(yc - tail.y, xc - tail.x);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const head = { x: xc - cos * (R + 4), y: yc - sin * (R + 4) };
  const p1 = { x: head.x - cos * HINT_HEAD_LEN + sin * HINT_HEAD_HALF, y: head.y - sin * HINT_HEAD_LEN - cos * HINT_HEAD_HALF };
  const p2 = { x: head.x - cos * HINT_HEAD_LEN - sin * HINT_HEAD_HALF, y: head.y - sin * HINT_HEAD_LEN + cos * HINT_HEAD_HALF };
  const shaftEnd = { x: head.x - cos * (HINT_HEAD_LEN - 2), y: head.y - sin * (HINT_HEAD_LEN - 2) };
  const set = (el: SVGElement | null, attrs: Record<string, string>) => {
    if (!el) return;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  };
  set(els.x1, { x1: String(xc - R), y1: String(yc - R), x2: String(xc + R), y2: String(yc + R) });
  set(els.x2, { x1: String(xc + R), y1: String(yc - R), x2: String(xc - R), y2: String(yc + R) });
  set(els.shaft, { x1: String(tail.x), y1: String(tail.y), x2: String(shaftEnd.x), y2: String(shaftEnd.y) });
  set(els.head, { points: `${head.x},${head.y} ${p1.x},${p1.y} ${p2.x},${p2.y}` });
  if (els.cursor) els.cursor.setAttribute('transform', `translate(${tail.x + 4} ${tail.y + 4})`);
  if (els.label) {
    const labelY = tail.y + 84 > vh - HINT_LABEL_PAD ? tail.y - 40 : tail.y + 84;
    els.label.setAttribute('x', String(Math.max(HINT_LABEL_PAD, Math.min(vw - HINT_LABEL_W - HINT_LABEL_PAD, tail.x - 8))));
    els.label.setAttribute('y', String(labelY));
    els.label.style.visibility = label ? 'visible' : 'hidden';
  }
  if (els.hint) {
    els.hint.dataset.x = `${Math.round(xc)},${Math.round(yc)}`;
  }
}

function hideHint(els: BirdEls): void {
  show(els.hint, false);
  if (els.label) els.label.style.visibility = 'hidden';
}

function talonLift(t: number): string {
  return ` translateY(${(-t * TALON_LIFT_FRAC * 100).toFixed(1)}%) rotate(${(TALON_LIFT_DEG * t).toFixed(1)}deg)`;
}

function flapOpacity(s: BirdState, ts: number): number {
  if (!s.flapAt) return 0;
  const t = (ts - s.flapAt) / FLAP_MS;
  if (t < 0 || t > 1) return 0;
  return Math.sin(Math.PI * t);
}

export function tickBird(s: BirdState, els: BirdEls, ctx: BirdCtx): BirdTickResult {
  const result: BirdTickResult = { hold: null, restore: false, grabbed: false, heat: 0, sizzle: 0, burn: 0, tint: 0 };
  if (!s.kind || s.phase === 'idle') return result;
  const spec = BIRD_SPECS[s.kind];
  const { ts, vw, vh } = ctx;
  const root = els.root;
  if (root && root.dataset.phase !== s.phase) root.dataset.phase = s.phase;
  tickToasted(s, els, ctx);

  if (s.calm && ts >= s.calmUntil) {
    s.calm = false;
    result.restore = true;
  }

  if (s.phase === 'approach') {
    const t = clamp((ts - s.phaseAt) / APPROACH_MS, 0, 1);
    const e = easeInOut(t);
    const end = { x: ctx.chickenCx, y: ctx.chickenCy };
    const u = 1 - e;
    s.prevPos = s.pos;
    s.pos = {
      x: u * u * s.start.x + 2 * u * e * s.ctrl.x + e * e * end.x,
      y: u * u * s.start.y + 2 * u * e * s.ctrl.y + e * e * end.y,
    };
    const dx = s.pos.x - s.prevPos.x;
    const dy = s.pos.y - s.prevPos.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) {
      const heading = Math.atan2(dy, dx);
      let dh = heading - s.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const target = s.heading === 0 && s.prevPos === s.start ? 0 : clamp((dh / Math.max(1, ctx.dtMs)) * BANK_GAIN, -MAX_BANK_DEG, MAX_BANK_DEG);
      s.bank += (target - s.bank) * BANK_LERP;
      s.heading = heading;
    }
    s.scale = APPROACH_START_SCALE + (1 - APPROACH_START_SCALE) * e;
    const name = Math.abs(s.bank) > BANK_FRAME_DEG ? 'bank' : wingbeatFrame(ts);
    const bob = Math.sin(ts / 85) * APPROACH_BOB_PX;
    placeFlight(s, els, ts, name, s.pos.x, s.pos.y + bob, spec.flightSpan * s.scale, ` rotate(${s.bank.toFixed(1)}deg)`, 1);
    if (t >= 1) {
      s.intercept = { x: ctx.chickenCx, y: ctx.chickenCy };
      s.grabFrom = { ...s.intercept };
      settleAnchor(s, spec, vw, vh);
      s.phase = 'grab';
      s.phaseAt = ts;
      result.grabbed = true;
      show(els.banner, true, 1);
    }
    return result;
  }

  if (isGripping(s.phase)) {
    if (s.phase !== 'grab') {
      const ext = extentsFor(spec, s.chicken.w, s.chicken.h, s.fit);
      let nx = s.anchor.x + s.drift.x * ctx.dtMs;
      let ny = s.anchor.y + s.drift.y * ctx.dtMs;
      if (nx < s.bounds.minX || nx > s.bounds.maxX || hitsHud(ext, nx, s.anchor.y, s.hud)) {
        s.drift.x = -s.drift.x;
        nx = s.anchor.x;
      }
      if (ny < s.bounds.minY || ny > s.bounds.maxY || hitsHud(ext, nx, ny, s.hud)) {
        s.drift.y = -s.drift.y;
        ny = s.anchor.y;
      }
      s.anchor = { x: nx, y: ny };
    }
    const grabT = s.phase === 'grab' ? clamp((ts - s.phaseAt) / GRAB_MS, 0, 1) : 1;
    const ge = easeInOut(grabT);
    if (s.phase === 'grab' && grabT >= 1) {
      s.phase = 'right';
      s.phaseAt = ts;
    }
    const recoilT = s.phase === 'recoil' ? clamp((ts - s.phaseAt) / RECOIL_MS, 0, 1) : 0;
    if (s.phase === 'recoil' && recoilT >= 1) {
      s.phase = 'left';
      s.phaseAt = ts;
      s.lastTapAt = 0;
    }
    const hold = { x: s.grabFrom.x + (s.anchor.x - s.grabFrom.x) * ge, y: s.grabFrom.y + (s.anchor.y - s.grabFrom.y) * ge };
    result.hold = hold;
    tickHeat(s, els, ctx, hold, result);
    if (s.heat !== result.heat) s.heat = result.heat;
    if (root && root.dataset.heat !== String(result.heat)) root.dataset.heat = String(result.heat);
    const L = layoutFor(spec, hold.x, hold.y, s.chicken.w, s.chicken.h, s.fit);
    const recoilKick = Math.sin(Math.PI * recoilT);
    const rightLift = s.phase === 'recoil' ? easeInOut(recoilT) : s.phase === 'left' ? 1 : 0;
    const bodyShift = { x: RECOIL_DX * recoilKick, y: RECOIL_DY * recoilKick };
    const looking = ts < s.lookUntil;
    const lookK = looking ? Math.sin(Math.PI * clamp((ts - (s.lookUntil - BIRD_LOOK_MS)) / BIRD_LOOK_MS, 0, 1)) : 0;
    {
      const name = (els.flight?.dataset.frame as FrameName | undefined) ?? 'fly-level';
      const bodyC = { x: L.body.x + L.body.w / 2, y: L.body.y + L.body.h / 2 };
      const cx = hold.x + (bodyC.x - hold.x) * ge;
      const cy = hold.y + (bodyC.y - hold.y) * ge;
      const span = spec.flightSpan + (bodySpan(L) - spec.flightSpan) * ge;
      placeFlight(s, els, ts, name, cx, cy, span, ` rotate(${(s.bank * (1 - ge)).toFixed(1)}deg)`, grabT < 1 ? 1 - ge : 0);
    }
    place(els.body, { ...L.body, x: L.body.x + bodyShift.x, y: L.body.y + bodyShift.y });
    show(els.body, true, ge * (1 - lookK));
    if (els.look) {
      const a = setFrame(els.look, s.kind, 'fly-level');
      place(els.look, spanRect(a, L.body.x + L.body.w / 2 + bodyShift.x, L.body.y + L.body.h / 2 + bodyShift.y, bodySpan(L) * LOOK_WIDTH_FRAC));
      show(els.look, lookK > 0.01, lookK);
    }
    const hits = talonHits(spec, L);
    placeHit(els.hitR, { ...hits.right, y: hits.right.y - rightLift * L.right.h * TALON_LIFT_FRAC }, s.phase === 'right');
    placeHit(els.hitL, hits.left, s.phase === 'left');
    if (root && root.dataset.look !== (looking ? '1' : '0')) root.dataset.look = looking ? '1' : '0';
    place(els.talonL, L.left);
    show(els.talonL, true, ge);
    place(els.talonR, L.right, talonLift(rightLift));
    show(els.talonR, true, ge);
    const active: TalonSide | null = s.phase === 'right' ? 'right' : s.phase === 'left' ? 'left' : null;
    if (els.talonR) els.talonR.style.pointerEvents = active === 'right' ? 'auto' : 'none';
    if (els.talonL) els.talonL.style.pointerEvents = active === 'left' ? 'auto' : 'none';
    if (root) root.dataset.talon = active ?? '';
    if (active) {
      const since = s.lastTapAt !== 0 ? s.lastTapAt : s.phaseAt;
      if (s.hintShownAt === 0 && ts - since >= BIRD_HINT_DELAY_MS) s.hintShownAt = ts;
      const hintOn = s.hintShownAt !== 0;
      const labelOn = active === 'left' && hintOn && ts - s.hintShownAt >= BIRD_LABEL_DELAY_MS;
      const target = active === 'right' ? L.right : L.left;
      const markCfg = active === 'right' ? spec.right.xMark : spec.left.xMark;
      if (hintOn) drawHint(els, target, markCfg, vw, vh, labelOn, active);
      show(els.hint, hintOn, 1);
      if (root) {
        root.dataset.hint = hintOn ? '1' : '0';
        root.dataset.label = labelOn ? '1' : '0';
      }
      if (els.counter) {
        const n = active === 'right' ? s.rightClicks : s.leftClicks;
        const total = talonNeed((active === 'right' ? spec.rightClicks : spec.leftClicks) * s.talonScale, s.talonWeight);
        const text = `${active === 'right' ? 'front' : 'back'} claw ${n} / ${total}`;
        if (els.counter.textContent !== text) els.counter.textContent = text;
        const box = active === 'right' ? hits.right : hits.left;
        const y = box.y + box.h * 0.5 - 10;
        const width = els.counter.offsetWidth;
        const rawX = active === 'right' ? box.x - COUNTER_GAP - width : box.x + box.w + COUNTER_GAP * 2;
        const clampedX = Math.max(COUNTER_EDGE_PAD, Math.min(rawX, window.innerWidth - width - COUNTER_EDGE_PAD));
        const height = els.counter.offsetHeight;
        const push = hudPushOut(hudZone(window.innerWidth), clampedX + width / 2, y + height / 2, width / 2, height / 2);
        const x = Math.max(COUNTER_EDGE_PAD, Math.min(clampedX + push.dx, window.innerWidth - width - COUNTER_EDGE_PAD));
        const finalY = y + push.dy;
        els.counter.style.transform = `translate(${x.toFixed(1)}px, ${finalY.toFixed(1)}px)`;
        show(els.counter, true, 1);
      }
    } else {
      hideHint(els);
      show(els.counter, false);
      if (root) {
        root.dataset.hint = '0';
        root.dataset.label = '0';
      }
    }
    return result;
  }

  if (s.calm) result.hold = { ...s.anchor };
  if (spec.heat) result.burn = s.burn;
  s.heat = 0;
  show(els.fire, false);
  show(els.flash, false);
  show(els.shimmer, false);
  if (root) {
    if (root.dataset.heat !== '0') root.dataset.heat = '0';
    if (root.dataset.pulse !== '0') root.dataset.pulse = '0';
  }
  hideHint(els);
  show(els.counter, false);
  show(els.banner, false);
  if (els.talonR) els.talonR.style.pointerEvents = 'none';
  if (els.talonL) els.talonL.style.pointerEvents = 'none';
  show(els.hitR, false);
  show(els.hitL, false);
  if (els.hitR) els.hitR.style.pointerEvents = 'none';
  if (els.hitL) els.hitL.style.pointerEvents = 'none';
  if (root) root.dataset.talon = '';

  const sinceRelease = ts - s.phaseAt;
  if (s.phase === 'hover' || s.phase === 'depart') {
    if (s.phase === 'hover' && sinceRelease >= BIRD_DEPART_DELAY_MS) {
      s.phase = 'depart';
      s.bigFlapsLeft = BIG_FLAPS;
    }
    if (ts >= s.nextFlapAt && s.nextFlapAt > 0) {
      s.flapAt = ts;
      s.nextFlapAt = ts + FLAP_EVERY_MS;
    }
    if (s.phase === 'depart' && sinceRelease >= BIRD_BIG_FLAP_AT_MS) {
      if (s.bigFlapsLeft > 0 && ts - s.flapAt >= BIG_FLAP_GAP_MS) {
        s.flapAt = ts;
        s.bigFlapsLeft -= 1;
      }
      if (s.bigFlapsLeft === 0 && ts - s.flapAt >= FLAP_MS) {
        s.phase = 'recede';
        s.phaseAt = ts;
        s.start = { ...s.pos };
        s.bank = 0;
      }
    }
    const L = layoutFor(spec, s.anchor.x, s.anchor.y, s.chicken.w, s.chicken.h, s.fit);
    const lift = s.phase === 'depart' ? easeInOut(clamp((sinceRelease - BIRD_DEPART_DELAY_MS) / (BIRD_BIG_FLAP_AT_MS - BIRD_DEPART_DELAY_MS), 0, 1)) * LIFT_PX : 0;
    const bob = Math.sin(sinceRelease / 420) * HOVER_BOB_PX;
    const flap = flapOpacity(s, ts);
    const body = { ...L.body, y: L.body.y + bob - lift };
    s.pos = { x: body.x + body.w / 2, y: body.y + body.h / 2 };
    place(els.body, body);
    show(els.body, true, 1 - flap * 0.9);
    if (els.look) {
      const a = setFrame(els.look, s.kind, 'fly-down');
      place(els.look, spanRect(a, s.pos.x, s.pos.y, bodySpan(L) * LOOK_WIDTH_FRAC));
      show(els.look, flap > 0.02, flap);
    }
    const releaseT = easeOut(clamp(sinceRelease / RECOIL_MS, 0, 1));
    place(els.talonL, { ...L.left, y: L.left.y + bob - lift }, talonLift(releaseT));
    place(els.talonR, { ...L.right, y: L.right.y + bob - lift }, talonLift(1));
    show(els.talonL, true, 1 - releaseT * 0.4);
    show(els.talonR, true, 1);
    show(els.flight, false);
    show(els.flightPrev, false);
    if (els.hitArea) {
      const size = Math.max(MIN_HIT_PX, body.w * 0.6);
      els.hitArea.style.width = `${size}px`;
      els.hitArea.style.height = `${size}px`;
      els.hitArea.style.transform = `translate(${(s.pos.x - size / 2).toFixed(1)}px, ${(s.pos.y - size / 2).toFixed(1)}px)`;
      show(els.hitArea, s.phase !== 'hover', 1);
    }
  } else if (s.phase === 'recede') {
    const t = clamp((ts - s.phaseAt) / BIRD_RECEDE_MS, 0, 1);
    const e = easeOut(t);
    const focal = { x: vw * (0.5 + spec.focal.x), y: vh * (0.5 + spec.focal.y) };
    s.pos = { x: s.start.x + (focal.x - s.start.x) * e, y: s.start.y + (focal.y - s.start.y) * e };
    s.scale = 1 - (1 - END_SCALE) * easeOut(t);
    const name: FrameName = t < RECEDE_BANK_END ? 'bank' : t < RECEDE_3Q_END ? 'away-3q' : 'away-far';
    const bankT = clamp(t / RECEDE_BANK_END, 0, 1);
    s.bank = Math.sin(Math.PI * bankT) * RECEDE_BANK_DEG;
    const flutter = flapOpacity(s, ts);
    const beat = 1 + Math.sin(ts / 60) * WINGBEAT_PULSE * (1 - t * 0.6) + flutter * 0.1;
    const bob = Math.sin(ts / 120) * APPROACH_BOB_PX * (1 - t);
    const fadeIn = clamp((ts - s.phaseAt) / 300, 0, 1);
    const opacity = t > RECEDE_FADE_FROM ? (1 - t) / (1 - RECEDE_FADE_FROM) : 1;
    const L = layoutFor(spec, s.anchor.x, s.anchor.y, s.chicken.w, s.chicken.h, s.fit);
    const w = L.body.w;
    placeFlight(s, els, ts, name, s.pos.x, s.pos.y + bob, bodySpan(L) * s.scale, ` rotate(${s.bank.toFixed(1)}deg) scaleY(${beat.toFixed(4)})`, t < 1 ? opacity * fadeIn : 0);
    place(els.body, { ...L.body, x: s.pos.x - L.body.w / 2, y: s.pos.y - L.body.h / 2 }, ` scale(${s.scale.toFixed(4)})`);
    show(els.body, fadeIn < 1, 1 - fadeIn);
    show(els.look, false);
    show(els.talonL, false);
    show(els.talonR, false);
    if (els.hitArea) {
      const size = Math.max(MIN_HIT_PX, w * s.scale);
      els.hitArea.style.width = `${size.toFixed(1)}px`;
      els.hitArea.style.height = `${size.toFixed(1)}px`;
      els.hitArea.style.transform = `translate(${(s.pos.x - size / 2).toFixed(1)}px, ${(s.pos.y - size / 2).toFixed(1)}px)`;
      show(els.hitArea, t < 1, 1);
    }
    if (t >= 1) {
      s.phase = 'done';
      s.phaseAt = ts;
      s.finished.push(s.kind);
      show(els.hitArea, false);
    }
  } else {
    show(els.flight, false);
    show(els.flightPrev, false);
    show(els.body, false);
    show(els.look, false);
    show(els.talonL, false);
    show(els.talonR, false);
    show(els.hitArea, false);
  }

  if (els.feather) {
    const f = s.feather;
    if (f) {
      const a = setFrame(els.feather, s.kind, 'feather');
      const h = FEATHER_H;
      const w = (h * a.width) / a.height;
      const t = clamp((ts - f.born) / FEATHER_FALL_MS, 0, 1);
      const y = f.y + (f.groundY - h - f.y) * easeIn(t);
      const sway = Math.sin(t * Math.PI * 3) * FEATHER_SWAY_PX * (1 - t * 0.5);
      place(els.feather, { x: f.x - w / 2 + sway, y, w, h }, ` rotate(${(sway * 0.5).toFixed(1)}deg)`);
      els.feather.style.pointerEvents = t >= 1 ? 'auto' : 'none';
      els.feather.dataset.landed = t >= 1 ? '1' : '0';
      show(els.feather, true, 1);
    } else {
      show(els.feather, false);
    }
  }
  return result;
}

export function birdStateView(s: BirdState) {
  return {
    kind: s.kind,
    phase: s.phase,
    phaseAt: s.phaseAt,
    lastTapAt: s.lastTapAt,
    hintShownAt: s.hintShownAt,
    now: performance.now(),
    pending: s.pending,
    triggered: s.triggered,
    x: s.pos.x,
    y: s.pos.y,
    scale: s.scale,
    bank: s.bank,
    anchor: s.anchor,
    settled: s.settled,
    intercept: s.intercept,
    nudge: s.nudge,
    fit: s.fit,
    rightClicks: s.rightClicks,
    leftClicks: s.leftClicks,
    rightNeed: talonNeed(BIRD_SPECS[s.kind ?? 'hawk'].rightClicks * s.talonScale, s.talonWeight),
    leftNeed: talonNeed(BIRD_SPECS[s.kind ?? 'hawk'].leftClicks * s.talonScale, s.talonWeight),
    hint: s.hintShownAt !== 0,
    looks: s.looks,
    calm: s.calm,
    calmClicks: s.calmClicks,
    recoveryClicks: s.recoveryClicks,
    feathered: s.feathered,
    feather: s.feather ? { x: s.feather.x, y: s.feather.y } : null,
    snapshot: s.snapshot,
    queue: [...s.queue],
    finished: [...s.finished],
    heat: s.heat,
    pulses: s.pulses,
    burn: s.burn,
    toastedAlive: anyToastedAlive(s),
    toastedSpawned: s.toastedSpawned,
  };
}

const LAYER = 'pointer-events-none absolute top-0 left-0 max-w-none select-none will-change-transform [visibility:hidden]';
const TALON_STYLE: CSSProperties = { transformOrigin: '50% 0%' };
const FLIGHT_STYLE: CSSProperties = { transformOrigin: '50% 50%' };

interface BirdLayerProps {
  kind: BirdKind;
  part: 'back' | 'front';
  els: RefObject<BirdEls>;
  onTalon: (side: TalonSide, x: number, y: number) => void;
  onBird: (x: number, y: number) => void;
  onFeather: (x: number, y: number) => void;
  onToasted: (index: number, x: number, y: number) => void;
}

const TOASTED_SLOTS = Array.from({ length: TOASTED_ALIVE_MAX }, (_, i) => i);

export function BirdLayer({ kind, part, els, onTalon, onBird, onFeather, onToasted }: BirdLayerProps) {
  const spec = BIRD_SPECS[kind];
  const bind = <K extends keyof BirdEls>(key: K) => (el: BirdEls[K]) => {
    els.current[key] = el;
  };
  if (part === 'back') {
    return (
      <>
        <div ref={bind('flash')} data-testid="bird-flash" className="bird-flash pointer-events-none fixed inset-0 z-20 [visibility:hidden]" />
        <img ref={bind('body')} src={frame(kind, 'grab-body').file} alt="" draggable={false} data-testid="bird-body" className={LAYER} style={FLIGHT_STYLE} />
        <img ref={bind('look')} alt="" draggable={false} data-testid="bird-look" className={LAYER} style={FLIGHT_STYLE} />
        <img
          ref={bind('talonL')}
          src={frame(kind, 'talon-left').file}
          alt=""
          draggable={false}
          data-testid="bird-talon-left"
          className={`${LAYER} cursor-pointer`}
          style={TALON_STYLE}
          onClick={(e) => onTalon('left', e.clientX, e.clientY)}
        />
      </>
    );
  }
  return (
    <div ref={bind('root')} data-testid="bird-root" data-kind={kind} data-phase="idle" data-talon="" data-hint="0" data-label="0" data-look="0" data-heat="0" data-pulse="0" className="contents">
      <img ref={bind('flightPrev')} alt="" draggable={false} data-testid="bird-flight-prev" className={LAYER} style={FLIGHT_STYLE} />
      <img ref={bind('flight')} alt="" draggable={false} data-testid="bird-flight" className={LAYER} style={FLIGHT_STYLE} />
      {spec.heat && (
        <>
          <div ref={bind('shimmer')} data-testid="bird-shimmer" className="bird-shimmer pointer-events-none absolute top-0 left-0 will-change-transform [visibility:hidden]" />
          <img ref={bind('fire')} src={fx('fire-puff').file} alt="" draggable={false} data-testid="bird-fire" className={`${LAYER} mix-blend-screen`} style={FLIGHT_STYLE} />
          {TOASTED_SLOTS.map((i) => (
            <img
              key={i}
              ref={(el) => {
                els.current.toasted[i] = el;
              }}
              src={fx('toasted-feather').file}
              alt=""
              draggable={false}
              data-testid="toasted-feather"
              data-alive="0"
              className={`${LAYER} cursor-pointer drop-shadow-[0_3px_5px_rgba(0,0,0,0.5)]`}
              style={FLIGHT_STYLE}
              onClick={(e) => onToasted(i, e.clientX, e.clientY)}
            />
          ))}
        </>
      )}
      <img
        ref={bind('talonR')}
        src={frame(kind, 'talon-right').file}
        alt=""
        draggable={false}
        data-testid="bird-talon-right"
        className={`${LAYER} cursor-pointer`}
        style={TALON_STYLE}
        onClick={(e) => onTalon('right', e.clientX, e.clientY)}
      />
      <div
        ref={bind('hitL')}
        data-testid="bird-talon-hit-left"
        className="absolute top-0 left-0 cursor-pointer rounded-full will-change-transform [visibility:hidden]"
        onClick={(e) => onTalon('left', e.clientX, e.clientY)}
      />
      <div
        ref={bind('hitR')}
        data-testid="bird-talon-hit-right"
        className="absolute top-0 left-0 cursor-pointer rounded-full will-change-transform [visibility:hidden]"
        onClick={(e) => onTalon('right', e.clientX, e.clientY)}
      />
      <div
        ref={bind('hitArea')}
        data-testid="bird-hit"
        className="absolute top-0 left-0 cursor-pointer rounded-full will-change-transform [visibility:hidden]"
        onClick={(e) => onBird(e.clientX, e.clientY)}
      />
      <img
        ref={bind('feather')}
        alt=""
        draggable={false}
        data-testid="bird-feather"
        data-landed="0"
        className={`${LAYER} cursor-pointer drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]`}
        style={FLIGHT_STYLE}
        onClick={(e) => onFeather(e.clientX, e.clientY)}
      />
      <svg ref={bind('hint')} data-testid="bird-hint" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible [visibility:hidden]">
        <g stroke="#ff1a1a" strokeWidth="6" strokeLinecap="round" fill="none">
          <line ref={bind('x1')} data-testid="bird-hint-x" />
          <line ref={bind('x2')} />
          <line ref={bind('shaft')} strokeWidth="5" />
        </g>
        <polygon ref={bind('head')} fill="#ff1a1a" />
        <g ref={bind('cursor')}>
          <TapCursorGlyph x={0} y={0} scale={1.1} />
        </g>
        <text
          ref={bind('label')}
          data-testid="bird-hint-label"
          fontFamily="Geist, system-ui, sans-serif"
          fontSize="20"
          fontWeight="600"
          fill="#fff"
          stroke="#000"
          strokeWidth="4"
          paintOrder="stroke"
          style={{ visibility: 'hidden' }}
        >
          {BIRD_LABEL_TEXT}
        </text>
      </svg>
      <div
        ref={bind('counter')}
        data-testid="bird-counter"
        className="pointer-events-none absolute top-0 left-0 z-30 whitespace-nowrap rounded-md bg-black/50 px-1.5 py-0.5 text-base font-semibold text-[#ffd54a] [paint-order:stroke] [text-shadow:0_1px_0_#000,0_-1px_0_#000,1px_0_0_#000,-1px_0_0_#000,0_2px_6px_rgba(0,0,0,0.8)] will-change-transform [visibility:hidden]"
      />
      <div
        ref={bind('banner')}
        data-testid="bird-banner"
        className="pointer-events-none fixed top-[14px] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-black/55 px-4 py-2 text-[clamp(14px,4.2vw,22px)] max-sm:top-[44px] leading-[1.2] font-semibold tracking-[0.01em] text-white [visibility:hidden]"
      >
        {BIRD_BANNER_TEXT}
      </div>
      <span className="sr-only">{spec.kind}</span>
    </div>
  );
}
