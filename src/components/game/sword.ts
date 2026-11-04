import { CLONE_DOM_LIMIT } from './chicken-orbs';

export const SWORD_ITEM_ID = 'sword';
export const SWORD_PULL_CLICKS = 25;
export const SWORD_MAX_CHICKENS = 1000;
export const SWORD_SPLIT_RAW = 1;
export const SWORD_RECUT_MS = 350;
export const SWORD_SLASH_MS = 260;
export const SWORD_SLASH_MAX = 24;
export const SWORD_HIT_PAD = 14;
export const SWORD_CURSOR_CLASS = 'chicken-sword-cursor';
export const SPRITE_TIER_FROM = CLONE_DOM_LIMIT + 1;
export const LOD_TIER_FROM = 301;
export const GRID_CELL_PX = 64;
export const LOD_SIZES = [1, 0.65, 0.42] as const;
export const LOD_WOBBLE_PHASES = 4;
export const LOD_WOBBLE_MS = 420;
export const LOD_WOBBLE_PX = 3;
export const SPRITE_WOBBLE_PX = 2;
export const SWARM_PARTICLE_CAP = 200;
export const CLONE_SPLIT_COUNT = 3;
export const CLONE_MAX_SPLIT_LEVEL = 3;
export const CLONE_MERGE_MIN_MS = 9000;
export const CLONE_MERGE_SPREAD_MS = 6000;
export const CLONE_MERGE_RATE_ABOVE = 0.005;
export const CLONE_MERGE_MIN_PER_S = 0.6;
export const CLONE_MERGE_PRESSURE_FROM = 300;
export const CLONE_RETURN_SPEED = 0.22;
export const CLONE_RETURN_TIMEOUT_MS = 4000;
export const CLONE_MERGE_PROXIMITY = 26;
export const CLONE_SCATTER_SPEED = 0.3;
export const CLONE_LEVEL_SCALE = [1, 0.66, 0.46, 0.34] as const;
export const FLOCK_BASE_COUNT = 40;

export function flockRadiusFor(base: number, count: number): number {
  return base * Math.sqrt(Math.max(1, count / FLOCK_BASE_COUNT));
}

export type RenderTier = 'dom' | 'sprite' | 'lod';

export function renderTierFor(count: number): RenderTier {
  if (count >= LOD_TIER_FROM) return 'lod';
  if (count >= SPRITE_TIER_FROM) return 'sprite';
  return 'dom';
}

export function lodSizeIndex(count: number): number {
  if (count < LOD_TIER_FROM) return 0;
  return count < (LOD_TIER_FROM + SWORD_MAX_CHICKENS) / 2 ? 1 : 2;
}

export function wobbleOffset(id: number, ts: number, px: number): number {
  const phase = (id % LOD_WOBBLE_PHASES) / LOD_WOBBLE_PHASES;
  return Math.sin((ts / LOD_WOBBLE_MS + phase) * Math.PI * 2) * px;
}

export function mergePerSecond(count: number): number {
  if (count <= CLONE_MERGE_PRESSURE_FROM) return CLONE_MERGE_MIN_PER_S;
  return Math.max(CLONE_MERGE_MIN_PER_S, count * CLONE_MERGE_RATE_ABOVE);
}

export function cloneMergeDelayMs(count: number): number {
  const base = CLONE_MERGE_MIN_MS + Math.random() * CLONE_MERGE_SPREAD_MS;
  return count > CLONE_MERGE_PRESSURE_FROM ? base * (CLONE_MERGE_PRESSURE_FROM / count) : base;
}

export interface GridRect {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class SpatialGrid {
  private cells = new Map<number, GridRect[]>();
  private cols = 1;

  clear(viewportW: number): void {
    this.cells.clear();
    this.cols = Math.max(1, Math.ceil(viewportW / GRID_CELL_PX) + 1);
  }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  insert(rect: GridRect): void {
    const x0 = Math.max(0, Math.floor(rect.x / GRID_CELL_PX));
    const y0 = Math.max(0, Math.floor(rect.y / GRID_CELL_PX));
    const x1 = Math.max(0, Math.floor((rect.x + rect.w) / GRID_CELL_PX));
    const y1 = Math.max(0, Math.floor((rect.y + rect.h) / GRID_CELL_PX));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const k = this.key(cx, cy);
        const bucket = this.cells.get(k);
        if (bucket) bucket.push(rect);
        else this.cells.set(k, [rect]);
      }
    }
  }

  queryPoint(x: number, y: number, pad = 0): GridRect[] {
    const out: GridRect[] = [];
    const seen = new Set<number>();
    const x0 = Math.max(0, Math.floor((x - pad) / GRID_CELL_PX));
    const y0 = Math.max(0, Math.floor((y - pad) / GRID_CELL_PX));
    const x1 = Math.max(0, Math.floor((x + pad) / GRID_CELL_PX));
    const y1 = Math.max(0, Math.floor((y + pad) / GRID_CELL_PX));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const r of this.cells.get(this.key(cx, cy)) ?? []) {
          if (seen.has(r.id)) continue;
          if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) {
            seen.add(r.id);
            out.push(r);
          }
        }
      }
    }
    return out;
  }

  querySegment(x0: number, y0: number, x1: number, y1: number, pad = 0): GridRect[] {
    const out: GridRect[] = [];
    const seen = new Set<number>();
    const minX = Math.max(0, Math.floor((Math.min(x0, x1) - pad) / GRID_CELL_PX));
    const maxX = Math.max(0, Math.floor((Math.max(x0, x1) + pad) / GRID_CELL_PX));
    const minY = Math.max(0, Math.floor((Math.min(y0, y1) - pad) / GRID_CELL_PX));
    const maxY = Math.max(0, Math.floor((Math.max(y0, y1) + pad) / GRID_CELL_PX));
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        for (const r of this.cells.get(this.key(cx, cy)) ?? []) {
          if (seen.has(r.id)) continue;
          if (segmentHitsRect(x0, y0, x1, y1, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2)) {
            seen.add(r.id);
            out.push(r);
          }
        }
      }
    }
    return out;
  }
}

export function segmentHitsRect(x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const edges = [
    [-dx, x0 - rx],
    [dx, rx + rw - x0],
    [-dy, y0 - ry],
    [dy, ry + rh - y0],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return true;
}

export interface Slash {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
}

export interface SwordState {
  equipped: boolean;
  lastX: number;
  lastY: number;
  lastTs: number;
  slashes: Slash[];
  recut: Map<number, number>;
  splits: number;
}

export function createSwordState(): SwordState {
  return { equipped: false, lastX: -1, lastY: -1, lastTs: 0, slashes: [], recut: new Map(), splits: 0 };
}

export function pushSlash(s: SwordState, x0: number, y0: number, x1: number, y1: number, ts: number): void {
  s.slashes.push({ x0, y0, x1, y1, born: ts });
  if (s.slashes.length > SWORD_SLASH_MAX) s.slashes.splice(0, s.slashes.length - SWORD_SLASH_MAX);
}

export function canCut(s: SwordState, id: number, ts: number): boolean {
  const last = s.recut.get(id);
  if (last !== undefined && ts - last < SWORD_RECUT_MS) return false;
  s.recut.set(id, ts);
  if (s.recut.size > SWORD_MAX_CHICKENS * 2) {
    for (const [k, at] of s.recut) if (ts - at > SWORD_RECUT_MS) s.recut.delete(k);
  }
  return true;
}

export function drawSlashes(ctx: CanvasRenderingContext2D, slashes: Slash[], ts: number): void {
  for (let i = slashes.length - 1; i >= 0; i--) {
    const age = ts - slashes[i].born;
    if (age > SWORD_SLASH_MS) {
      slashes.splice(i, 1);
      continue;
    }
    const t = age / SWORD_SLASH_MS;
    const { x0, y0, x1, y1 } = slashes[i];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 6 * (1 - t) + 1;
    ctx.shadowColor = 'rgba(190,220,255,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }
}
