export interface HandPoint {
  x: number;
  y: number;
}

export const INDEX_TIP = 8;
export const THUMB_TIP = 4;
export const MIDDLE_TIP = 12;
const WRIST = 0;
const MIDDLE_KNUCKLE = 9;
const REACH_MARGIN = 0.15;
export const PINCH_ON = 0.32;
export const PINCH_OFF = 0.48;
export const POINTER_SMOOTHING = 0.45;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function screenPoint(landmarks: HandPoint[], width: number, height: number): HandPoint {
  const tip = landmarks[INDEX_TIP];
  const span = 1 - REACH_MARGIN * 2;
  return {
    x: clamp01((1 - tip.x - REACH_MARGIN) / span) * width,
    y: clamp01((tip.y - REACH_MARGIN) / span) * height,
  };
}

function gap(landmarks: HandPoint[], a: number, b: number): number {
  return Math.hypot(landmarks[a].x - landmarks[b].x, landmarks[a].y - landmarks[b].y);
}

export function pinchRatio(landmarks: HandPoint[]): number {
  const size = gap(landmarks, MIDDLE_KNUCKLE, WRIST);
  if (size <= 0) return Number.POSITIVE_INFINITY;
  return Math.min(gap(landmarks, THUMB_TIP, INDEX_TIP), gap(landmarks, THUMB_TIP, MIDDLE_TIP)) / size;
}

export const FLICK_SPEED = 1.6;
export const FLICK_RETURN_FRAC = 0.6;
export const FLICK_WINDOW_MS = 350;
export const FLICK_COOLDOWN_MS = 200;
export const CURSOR_HOLD_SPEED = 0.9;
export const CURSOR_HOLD_AFTER_MS = 220;

export interface FlickState {
  lastY: number | null;
  lastT: number;
  strokeDir: -1 | 0 | 1;
  strokeAt: number;
  coolUntil: number;
  holdUntil: number;
}

export interface FlickStep {
  state: FlickState;
  flick: boolean;
  holdCursor: boolean;
}

export function createFlick(): FlickState {
  return { lastY: null, lastT: 0, strokeDir: 0, strokeAt: 0, coolUntil: 0, holdUntil: 0 };
}

export function flickStep(prev: FlickState, palmY: number, t: number): FlickStep {
  const state = { ...prev, lastY: palmY, lastT: t };
  if (prev.lastY === null || t <= prev.lastT) return { state, flick: false, holdCursor: t < prev.holdUntil };
  const v = (palmY - prev.lastY) / ((t - prev.lastT) / 1000);
  const speed = Math.abs(v);
  const dir: -1 | 1 = v < 0 ? -1 : 1;
  if (speed >= CURSOR_HOLD_SPEED) state.holdUntil = t + CURSOR_HOLD_AFTER_MS;
  let flick = false;
  if (state.strokeDir !== 0 && t - state.strokeAt > FLICK_WINDOW_MS) state.strokeDir = 0;
  if (t >= state.coolUntil) {
    if (state.strokeDir !== 0 && dir !== state.strokeDir && speed >= FLICK_SPEED * FLICK_RETURN_FRAC) {
      flick = true;
      state.strokeDir = 0;
      state.coolUntil = t + FLICK_COOLDOWN_MS;
    } else if (speed >= FLICK_SPEED) {
      state.strokeDir = dir;
      state.strokeAt = t;
    }
  }
  return { state, flick, holdCursor: t < state.holdUntil };
}

export function palmY(landmarks: HandPoint[]): number {
  return landmarks[MIDDLE_KNUCKLE].y;
}

export function nextPinched(pinched: boolean, ratio: number): boolean {
  return pinched ? ratio < PINCH_OFF : ratio < PINCH_ON;
}

export function smooth(prev: HandPoint | null, next: HandPoint, alpha = POINTER_SMOOTHING): HandPoint {
  if (!prev) return next;
  return { x: prev.x + (next.x - prev.x) * alpha, y: prev.y + (next.y - prev.y) * alpha };
}
