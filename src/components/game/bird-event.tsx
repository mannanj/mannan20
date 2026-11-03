'use client';

import type { CSSProperties, RefObject } from 'react';
import type { GameItemId } from '@/components/inventory';
import manifest from '../../../public/game/birds/manifest.json';
import { TapCursorGlyph } from './tap-cursor-icon';

export type BirdKind = 'hawk' | 'eagle' | 'phoenix';
export type BirdPhase = 'idle' | 'approach' | 'grab' | 'right' | 'recoil' | 'left' | 'hover' | 'depart' | 'recede' | 'done';
export type TalonSide = 'right' | 'left';
type FrameName = 'fly-up' | 'fly-level' | 'fly-down' | 'bank' | 'away-3q' | 'away-far' | 'grab-body' | 'talon-left' | 'talon-right' | 'feather';

interface FrameAsset {
  width: number;
  height: number;
  file: string;
  anchor?: { x: number; y: number };
}

interface TalonLayout {
  scale: number;
  dx: number;
  dy: number;
  xMark: { x: number; y: number };
}

export interface BirdSpec {
  kind: BirdKind;
  bodyWidth: number;
  anchorShift: { x: number; y: number };
  right: TalonLayout;
  left: TalonLayout;
  rightClicks: number;
  leftClicks: number;
  focal: { x: number; y: number };
  skinId: string;
  itemId: GameItemId;
  multiplier: number;
  featherClicks: number;
}

const FRAMES = manifest as unknown as Record<BirdKind, Partial<Record<FrameName, FrameAsset>>>;

export const BIRD_SPECS: Record<BirdKind, BirdSpec> = {
  hawk: {
    kind: 'hawk',
    bodyWidth: 400,
    anchorShift: { x: 0.11, y: -0.04 },
    right: { scale: 1, dx: -0.38, dy: -0.12, xMark: { x: 0.55, y: 0.7 } },
    left: { scale: 0.85, dx: 0.55, dy: -0.45, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 25,
    leftClicks: 25,
    focal: { x: 0, y: 0 },
    skinId: 'hawk',
    itemId: 'hawk-feather',
    multiplier: 1.25,
    featherClicks: 25,
  },
  eagle: {
    kind: 'eagle',
    bodyWidth: 440,
    anchorShift: { x: 0.09, y: -0.03 },
    right: { scale: 1, dx: -0.38, dy: -0.12, xMark: { x: 0.55, y: 0.7 } },
    left: { scale: 0.85, dx: 0.55, dy: -0.45, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 50,
    leftClicks: 50,
    focal: { x: 0.08, y: -0.08 },
    skinId: 'eagle',
    itemId: 'eagle-feather',
    multiplier: 2,
    featherClicks: 25,
  },
  phoenix: {
    kind: 'phoenix',
    bodyWidth: 400,
    anchorShift: { x: 0.1, y: -0.03 },
    right: { scale: 0.95, dx: -0.38, dy: -0.12, xMark: { x: 0.55, y: 0.7 } },
    left: { scale: 0.8, dx: 0.55, dy: -0.45, xMark: { x: 0.45, y: 0.7 } },
    rightClicks: 100,
    leftClicks: 100,
    focal: { x: -0.08, y: -0.08 },
    skinId: 'phoenix',
    itemId: 'toasted-feather',
    multiplier: 1,
    featherClicks: 25,
  },
};

export const BIRD_TRIGGER_SCORE: Record<BirdKind, number> = { hawk: 2000, eagle: 10_000, phoenix: 25_000 };
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
const DRIFT_SPEED = 0.03;
const WINGBEAT_MS = 170;
const MAX_BANK_DEG = 32;
const BANK_FRAME_DEG = 16;
const BANK_GAIN = 30_000;
const BANK_LERP = 0.14;
const FLIGHT_W = 300;
const APPROACH_START_SCALE = 0.55;
const APPROACH_BOB_PX = 4;
const EDGE_MARGIN = 24;
const SPAWN_OFFSET = 160;
const CTRL_ALONG = 0.6;
const SWOOP_DEPTH = 220;
const RECOIL_DX = -10;
const RECOIL_DY = -14;
const TALON_LIFT_FRAC = 0.55;
const TALON_LIFT_DEG = -25;
const LIFT_PX = 30;
const RECEDE_BANK_END = 0.25;
const RECEDE_3Q_END = 0.55;
const RECEDE_FADE_FROM = 0.85;
const RECEDE_BANK_DEG = 22;
const WINGBEAT_PULSE = 0.08;
const HOVER_BOB_PX = 5;
const HINT_R = 18;
const HINT_TAIL_DX = 190;
const HINT_TAIL_DY = 150;
const HINT_HEAD_LEN = 16;
const HINT_HEAD_HALF = 10;
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
  };
}

export interface BirdEls {
  root: HTMLDivElement | null;
  flight: HTMLImageElement | null;
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
}

export function createBirdEls(): BirdEls {
  return {
    root: null,
    flight: null,
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
  };
}

export function isGripping(phase: BirdPhase): boolean {
  return phase === 'grab' || phase === 'right' || phase === 'recoil' || phase === 'left';
}

export function isBirdBusy(s: BirdState): boolean {
  return (s.phase !== 'idle' && s.phase !== 'done') || s.calm;
}

function frame(kind: BirdKind, name: FrameName): FrameAsset {
  const a = FRAMES[kind][name];
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
  const body = { x: cx - (an.x + spec.anchorShift.x) * bw, y: cy - (an.y + spec.anchorShift.y) * bh, w: bw, h: bh };
  const top = cy - ch / 2;
  const rw = (ch * spec.right.scale * tr.width) / tr.height;
  const right = { x: cx + spec.right.dx * cw - rw / 2, y: top + spec.right.dy * ch, w: rw, h: (rw * tr.height) / tr.width };
  const lw = (ch * spec.left.scale * tl.width) / tl.height;
  const left = { x: cx + spec.left.dx * cw - lw / 2, y: top + spec.left.dy * ch, w: lw, h: (lw * tl.height) / tl.width };
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
  Object.assign(s, fresh, { kind, triggered: true, pending: false, snapshot, hud, chicken });
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
}

export type TapResult = 'ignored' | 'scored' | 'freed-right' | 'freed-left';

export function tapTalon(s: BirdState, side: TalonSide, ts: number): TapResult {
  const spec = s.kind ? BIRD_SPECS[s.kind] : null;
  if (!spec) return 'ignored';
  if (side === 'right' && s.phase === 'right') {
    s.rightClicks += 1;
    s.lastTapAt = ts;
    if (s.rightClicks >= spec.rightClicks) {
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
    const freed = s.leftClicks >= spec.leftClicks;
    if (freed || s.leftClicks % BIRD_LOOK_EVERY_TAPS === 0) {
      s.lookUntil = ts + BIRD_LOOK_MS;
      s.looks += 1;
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
}

function setFrame(img: HTMLImageElement, kind: BirdKind, name: FrameName): FrameAsset {
  const a = frame(kind, name);
  if (img.dataset.frame !== name) {
    img.dataset.frame = name;
    img.src = a.file;
  }
  return a;
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

function drawHint(els: BirdEls, target: Rect, mark: { x: number; y: number }, vw: number, vh: number, label: boolean): void {
  const xc = target.x + target.w * mark.x;
  const yc = target.y + target.h * mark.y;
  const R = HINT_R;
  const tail = { x: xc + HINT_TAIL_DX, y: yc + HINT_TAIL_DY };
  if (tail.x + 80 > vw) tail.x = xc - HINT_TAIL_DX;
  if (tail.y + 90 > vh) tail.y = yc - HINT_TAIL_DY;
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
    els.label.setAttribute('x', String(tail.x - 8));
    els.label.setAttribute('y', String(tail.y + 84));
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
  const result: BirdTickResult = { hold: null, restore: false, grabbed: false };
  if (!s.kind || s.phase === 'idle') return result;
  const spec = BIRD_SPECS[s.kind];
  const { ts, vw, vh } = ctx;
  const root = els.root;
  if (root && root.dataset.phase !== s.phase) root.dataset.phase = s.phase;

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
    if (els.flight) {
      const a = setFrame(els.flight, s.kind, name);
      const w = FLIGHT_W;
      const h = (w * a.height) / a.width;
      const bob = Math.sin(ts / 85) * APPROACH_BOB_PX;
      place(els.flight, { x: s.pos.x - w / 2, y: s.pos.y - h / 2 + bob, w, h }, ` rotate(${s.bank.toFixed(1)}deg) scale(${s.scale.toFixed(3)})`);
      show(els.flight, true, 1);
    }
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
    const L = layoutFor(spec, hold.x, hold.y, s.chicken.w, s.chicken.h, s.fit);
    const recoilKick = Math.sin(Math.PI * recoilT);
    const rightLift = s.phase === 'recoil' ? easeOut(recoilT) : s.phase === 'left' ? 1 : 0;
    const bodyShift = { x: RECOIL_DX * recoilKick, y: RECOIL_DY * recoilKick };
    const looking = ts < s.lookUntil;
    if (els.flight) {
      const a = frame(s.kind, (els.flight.dataset.frame as FrameName | undefined) ?? 'fly-level');
      const w = FLIGHT_W;
      const h = (w * a.height) / a.width;
      const bodyC = { x: L.body.x + L.body.w / 2, y: L.body.y + L.body.h / 2 };
      const cx = hold.x + (bodyC.x - hold.x) * ge;
      const cy = hold.y + (bodyC.y - hold.y) * ge;
      const sc = 1 + (L.body.w / FLIGHT_W - 1) * ge;
      place(els.flight, { x: cx - w / 2, y: cy - h / 2, w, h }, ` rotate(${(s.bank * (1 - ge)).toFixed(1)}deg) scale(${sc.toFixed(3)})`);
      show(els.flight, grabT < 1, 1 - ge);
    }
    place(els.body, { ...L.body, x: L.body.x + bodyShift.x, y: L.body.y + bodyShift.y });
    show(els.body, true, ge * (looking ? 0.12 : 1));
    if (els.look) {
      setFrame(els.look, s.kind, 'fly-level');
      const a = frame(s.kind, 'fly-level');
      const w = L.body.w * LOOK_WIDTH_FRAC;
      const h = (w * a.height) / a.width;
      place(els.look, { x: L.body.x + L.body.w / 2 - w / 2 + bodyShift.x, y: L.body.y + L.body.h / 2 - h / 2 + bodyShift.y, w, h });
      show(els.look, looking, 1);
    }
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
      if (hintOn) drawHint(els, target, markCfg, vw, vh, labelOn);
      show(els.hint, hintOn, 1);
      if (root) {
        root.dataset.hint = hintOn ? '1' : '0';
        root.dataset.label = labelOn ? '1' : '0';
      }
      if (els.counter) {
        const n = active === 'right' ? s.rightClicks : s.leftClicks;
        const total = active === 'right' ? spec.rightClicks : spec.leftClicks;
        const text = `${active === 'right' ? 'front' : 'back'} claw ${n} / ${total}`;
        if (els.counter.textContent !== text) els.counter.textContent = text;
        const y = target.y + target.h * 0.5 - 10;
        els.counter.style.transform =
          active === 'right'
            ? `translate(${(target.x - COUNTER_GAP).toFixed(1)}px, ${y.toFixed(1)}px) translateX(-100%)`
            : `translate(${(target.x + target.w + COUNTER_GAP).toFixed(1)}px, ${y.toFixed(1)}px)`;
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
  hideHint(els);
  show(els.counter, false);
  show(els.banner, false);
  if (els.talonR) els.talonR.style.pointerEvents = 'none';
  if (els.talonL) els.talonL.style.pointerEvents = 'none';
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
    const bob = Math.sin(ts / 420) * HOVER_BOB_PX;
    const flap = flapOpacity(s, ts);
    const body = { ...L.body, y: L.body.y + bob - lift };
    s.pos = { x: body.x + body.w / 2, y: body.y + body.h / 2 };
    place(els.body, body);
    show(els.body, true, 1 - flap * 0.9);
    if (els.look) {
      const a = setFrame(els.look, s.kind, 'fly-down');
      const w = body.w * LOOK_WIDTH_FRAC;
      const h = (w * a.height) / a.width;
      place(els.look, { x: s.pos.x - w / 2, y: s.pos.y - h / 2, w, h });
      show(els.look, flap > 0.02, flap);
    }
    const releaseT = easeOut(clamp(sinceRelease / RECOIL_MS, 0, 1));
    place(els.talonL, { ...L.left, y: L.left.y + bob - lift }, talonLift(releaseT));
    place(els.talonR, { ...L.right, y: L.right.y + bob - lift }, talonLift(1));
    show(els.talonL, true, 1 - releaseT * 0.4);
    show(els.talonR, true, 1);
    show(els.flight, false);
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
    if (els.flight) {
      const a = setFrame(els.flight, s.kind, name);
      const h = (w * a.height) / a.width;
      place(els.flight, { x: s.pos.x - w / 2, y: s.pos.y - h / 2 + bob, w, h }, ` rotate(${s.bank.toFixed(1)}deg) scale(${s.scale.toFixed(4)}, ${(s.scale * beat).toFixed(4)})`);
      show(els.flight, t < 1, opacity * fadeIn);
    }
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
      show(els.hitArea, false);
    }
  } else {
    show(els.flight, false);
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
    hint: s.hintShownAt !== 0,
    looks: s.looks,
    calm: s.calm,
    calmClicks: s.calmClicks,
    recoveryClicks: s.recoveryClicks,
    feathered: s.feathered,
    feather: s.feather ? { x: s.feather.x, y: s.feather.y } : null,
    snapshot: s.snapshot,
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
}

export function BirdLayer({ kind, part, els, onTalon, onBird, onFeather }: BirdLayerProps) {
  const spec = BIRD_SPECS[kind];
  const bind = <K extends keyof BirdEls>(key: K) => (el: BirdEls[K]) => {
    els.current[key] = el;
  };
  if (part === 'back') {
    return (
      <>
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
    <div ref={bind('root')} data-testid="bird-root" data-kind={kind} data-phase="idle" data-talon="" data-hint="0" data-label="0" data-look="0" className="contents">
      <img ref={bind('flight')} alt="" draggable={false} data-testid="bird-flight" className={LAYER} style={FLIGHT_STYLE} />
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
        className="pointer-events-none absolute top-0 left-0 whitespace-nowrap text-base font-semibold text-[#ffd54a] [paint-order:stroke] [text-shadow:0_1px_0_#000,0_-1px_0_#000,1px_0_0_#000,-1px_0_0_#000,0_2px_6px_rgba(0,0,0,0.8)] will-change-transform [visibility:hidden]"
      />
      <div
        ref={bind('banner')}
        data-testid="bird-banner"
        className="pointer-events-none fixed top-[14px] left-1/2 z-30 -translate-x-1/2 rounded-[10px] bg-black/55 px-4 py-2 text-[22px] leading-[1.2] font-semibold tracking-[0.01em] text-white [visibility:hidden]"
      >
        {BIRD_BANNER_TEXT}
      </div>
      <span className="sr-only">{spec.kind}</span>
    </div>
  );
}
