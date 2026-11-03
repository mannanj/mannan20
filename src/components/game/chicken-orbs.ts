export type OrbKind = 'multiply' | 'cursor5' | 'cursor3';

export interface CursorOffset {
  dx: number;
  dy: number;
}

export const ORB_KINDS: OrbKind[] = ['multiply', 'cursor5', 'cursor3'];

export const ORB_THRESHOLDS: Record<OrbKind, number> = {
  multiply: 500,
  cursor5: 750,
  cursor3: 1250,
};

export const ORB_LABELS: Record<OrbKind, string> = {
  multiply: 'Multiply x3',
  cursor5: 'Cursor x5',
  cursor3: 'Cursor x3',
};

export const ORB_LIFETIME_MS = 30_000;
export const ORB_FADE_MS = 2000;
export const ORB_RADIUS = 44;
export const ORB_DRIFT_SPEED = 0.05;
export const ORB_SPAWN_MARGIN = 80;
export const ORB_WOBBLE_AMPLITUDE = 14;
export const ORB_WOBBLE_FREQUENCY = 0.0016;
export const ORB_COLLECT_SHARDS = 10;
export const ORB_SHARD_COLORS = ['#ff3b3b', '#ffb02e', '#f6ec3a', '#3ddc6a', '#35b6ff', '#8a5cff'];

export const MULTIPLY_FACTOR = 3;
export const MULTIPLY_DURATION_MS = 15_000;
export const MULTIPLY_BLINK_START_MS = 10_000;
export const MULTIPLY_VANISH_EARLIEST_MS = 12_000;
export const MAX_CHICKENS_ON_SCREEN = 60;
export const CLONE_DRIFT_SPEED = 0.09;
export const CLONE_SPAWN_SPREAD = 40;
export const BLACK_HOLE_LIFE_MS = 900;
export const BLACK_HOLE_RADIUS = 16;
export const VANISH_FEATHERS = 6;

export const CURSOR_BUFF_MS = 30_000;
export const CURSOR_EXTEND_PER_CLICK_MS = 100;
export const CURSOR_X5_OFFSET = 48;
export const CURSOR_X3_OFFSET = 30;
export const MAX_CURSORS = 15;
export const CURSOR_HAND_SIZE = 40;
export const CURSOR_HAND_HOT_X = 20;
export const CURSOR_HAND_HOT_Y = 19;

export function buildCursorOffsets(x5Active: boolean, x3Active: boolean): CursorOffset[] {
  const arm = CURSOR_X5_OFFSET;
  const base: CursorOffset[] = x5Active
    ? [
        { dx: 0, dy: 0 },
        { dx: -arm, dy: -arm },
        { dx: arm, dy: -arm },
        { dx: -arm, dy: arm },
        { dx: arm, dy: arm },
      ]
    : [{ dx: 0, dy: 0 }];
  if (!x3Active) return base;
  const spread = CURSOR_X3_OFFSET;
  const seen = new Set<string>();
  const out: CursorOffset[] = [];
  for (const o of base) {
    for (const shift of [0, -spread, spread]) {
      const point = { dx: o.dx + shift, dy: o.dy };
      const key = `${point.dx},${point.dy}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(point);
    }
  }
  return out.slice(0, MAX_CURSORS);
}

export function crossedOrbs(prev: number, next: number, fired: Record<OrbKind, boolean>): OrbKind[] {
  return ORB_KINDS.filter((k) => !fired[k] && prev < ORB_THRESHOLDS[k] && next >= ORB_THRESHOLDS[k]);
}

export function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
