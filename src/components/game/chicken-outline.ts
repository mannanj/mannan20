export type OutlinePattern = 'classic' | 'hawk' | 'eagle' | 'phoenix';

export interface OutlinePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export interface OutlineFrame {
  cx: number;
  cy: number;
  facing: number;
  sx: number;
  sy: number;
  rot: number;
}

interface Pt {
  x: number;
  y: number;
}

type Shape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } | { kind: 'poly'; pts: Pt[] };

export const SVG_VIEW_W = 80;
export const SVG_VIEW_H = 160;
export const SVG_CENTER_X = 40;
export const SVG_CENTER_Y = 80;
export const SVG_TO_PX = 70 / SVG_VIEW_W;
export const OUTLINE_SAMPLES = 72;
const RAY_ORIGIN_X = 40;
const RAY_ORIGIN_Y = 86;
const RAY_MAX = 110;
const RAY_STEP = 0.5;
const BEZIER_STEPS = 8;

const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: 'ellipse', cx, cy, rx, ry });
const poly = (...coords: number[]): Shape => {
  const pts: Pt[] = [];
  for (let i = 0; i < coords.length; i += 2) pts.push({ x: coords[i], y: coords[i + 1] });
  return { kind: 'poly', pts };
};

function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, out: Pt[]): void {
  for (let i = 1; i <= BEZIER_STEPS; i++) {
    const t = i / BEZIER_STEPS;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
}

const WING_LEFT: Shape = (() => {
  const pts: Pt[] = [{ x: 22, y: 90 }];
  cubic({ x: 22, y: 90 }, { x: 10, y: 92 }, { x: 4, y: 104 }, { x: 8, y: 120 }, pts);
  cubic({ x: 8, y: 120 }, { x: 14, y: 116 }, { x: 19, y: 106 }, { x: 24, y: 97 }, pts);
  return { kind: 'poly', pts };
})();

const WING_RIGHT: Shape = { kind: 'poly', pts: WING_LEFT.kind === 'poly' ? WING_LEFT.pts.map((p) => ({ x: SVG_VIEW_W - p.x, y: p.y })) : [] };

const PHOENIX_TAIL: Shape = (() => {
  const pts: Pt[] = [{ x: 20, y: 126 }];
  cubic({ x: 20, y: 126 }, { x: 6, y: 136 }, { x: 2, y: 150 }, { x: 10, y: 160 }, pts);
  cubic({ x: 10, y: 160 }, { x: 14, y: 148 }, { x: 22, y: 142 }, { x: 30, y: 146 }, pts);
  cubic({ x: 30, y: 146 }, { x: 24, y: 150 }, { x: 20, y: 156 }, { x: 22, y: 162 }, pts);
  cubic({ x: 22, y: 162 }, { x: 30, y: 154 }, { x: 38, y: 150 }, { x: 44, y: 154 }, pts);
  return { kind: 'poly', pts };
})();

const BASE_SHAPES: Shape[] = [
  ellipse(40, 108, 24, 40),
  ellipse(40, 58, 13, 26),
  ellipse(40, 28, 16, 14),
  poly(33, 16, 35, 5, 38, 15, 41, 3, 44, 14, 47, 6, 49, 16),
  poly(55, 25, 65, 19, 66, 38, 55, 33),
  poly(55, 21, 74, 14, 58, 27),
  poly(55, 33, 72, 44, 57, 36),
  ellipse(52, 40, 4, 5),
  WING_LEFT,
  WING_RIGHT,
];

const PATTERN_SHAPES: Record<OutlinePattern, Shape[]> = {
  classic: [],
  hawk: [poly(20, 128, 2, 152, 13, 150, 8, 162, 22, 152, 21, 164, 31, 147)],
  eagle: [poly(18, 128, 8, 156, 18, 150, 24, 160, 30, 148, 40, 158, 46, 146), ellipse(40, 46, 14, 18)],
  phoenix: [PHOENIX_TAIL, poly(31, 14, 33, 2, 37, 12, 40, 0, 43, 12, 47, 2, 49, 14)],
};

function insideShape(s: Shape, x: number, y: number): boolean {
  if (s.kind === 'ellipse') {
    const dx = (x - s.cx) / s.rx;
    const dy = (y - s.cy) / s.ry;
    return dx * dx + dy * dy <= 1;
  }
  let inside = false;
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function outlinePatternFor(pattern: string | undefined): OutlinePattern {
  return pattern === 'hawk' || pattern === 'eagle' || pattern === 'phoenix' ? pattern : 'classic';
}

export function insideChicken(pattern: OutlinePattern, x: number, y: number): boolean {
  for (const s of BASE_SHAPES) if (insideShape(s, x, y)) return true;
  for (const s of PATTERN_SHAPES[pattern]) if (insideShape(s, x, y)) return true;
  return false;
}

const outlineCache = new Map<OutlinePattern, OutlinePoint[]>();

export function chickenOutline(pattern: OutlinePattern): OutlinePoint[] {
  const cached = outlineCache.get(pattern);
  if (cached) return cached;
  const raw: Pt[] = [];
  for (let k = 0; k < OUTLINE_SAMPLES; k++) {
    const a = (k / OUTLINE_SAMPLES) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let last = 0;
    for (let t = RAY_STEP; t <= RAY_MAX; t += RAY_STEP) {
      if (insideChicken(pattern, RAY_ORIGIN_X + dx * t, RAY_ORIGIN_Y + dy * t)) last = t;
    }
    raw.push({ x: RAY_ORIGIN_X + dx * last, y: RAY_ORIGIN_Y + dy * last });
  }
  const points: OutlinePoint[] = raw.map((p, i) => {
    const prev = raw[(i + raw.length - 1) % raw.length];
    const next = raw[(i + 1) % raw.length];
    let nx = next.y - prev.y;
    let ny = -(next.x - prev.x);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const rx = p.x - RAY_ORIGIN_X;
    const ry = p.y - RAY_ORIGIN_Y;
    if (nx * rx + ny * ry < 0) {
      nx = -nx;
      ny = -ny;
    }
    const rl = Math.hypot(rx, ry) || 1;
    const mx = nx * 0.6 + (rx / rl) * 0.4;
    const my = ny * 0.6 + (ry / rl) * 0.4;
    const ml = Math.hypot(mx, my) || 1;
    return { x: p.x, y: p.y, nx: mx / ml, ny: my / ml };
  });
  outlineCache.set(pattern, points);
  return points;
}

export function projectOutline(points: OutlinePoint[], frame: OutlineFrame, out: OutlinePoint[]): OutlinePoint[] {
  const cos = Math.cos(frame.rot);
  const sin = Math.sin(frame.rot);
  const fx = frame.sx * SVG_TO_PX * frame.facing;
  const fy = frame.sy * SVG_TO_PX;
  out.length = points.length;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const lx = (p.x - SVG_CENTER_X) * fx;
    const ly = (p.y - SVG_CENTER_Y) * fy;
    const nlx = p.nx * frame.facing;
    const nly = p.ny;
    const nl = Math.hypot(nlx, nly) || 1;
    const nrx = nlx * cos - nly * sin;
    const nry = nlx * sin + nly * cos;
    out[i] = {
      x: frame.cx + lx * cos - ly * sin,
      y: frame.cy + lx * sin + ly * cos,
      nx: nrx / nl,
      ny: nry / nl,
    };
  }
  return out;
}

export const OUTLINE_PATTERNS: OutlinePattern[] = ['classic', 'hawk', 'eagle', 'phoenix'];

export function warmOutlines(): void {
  for (const pattern of OUTLINE_PATTERNS) chickenOutline(pattern);
}
