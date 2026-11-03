export type OrbKind = 'multiply' | 'cursor5' | 'cursor3';

export interface CursorOffset {
  dx: number;
  dy: number;
  hidden?: boolean;
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
export const ORB_RADIUS = 20.5;
export const ORB_LABEL_PX: Record<OrbKind, number> = { multiply: 11, cursor5: 12.5, cursor3: 12.5 };
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
export const CURSOR_X5_OFFSET = 30;
export const CURSOR_X3_OFFSET = 21;
export const CURSOR_RING_INNER_COUNT = 6;
export const CURSOR_RING_INNER_RADIUS = 40;
export const CURSOR_RING_OUTER_COUNT = 8;
export const CURSOR_RING_OUTER_RADIUS = 78;
const TRIANGLE_COS = Math.cos(Math.PI / 6);
const TRIANGLE_SIN = Math.sin(Math.PI / 6);
export const MAX_CURSORS = 15;
export const CURSOR_HAND_SIZE = 40;
export const CURSOR_HAND_HOT_X = 20;
export const CURSOR_HAND_HOT_Y = 19;

function ring(count: number, radius: number, phase: number): CursorOffset[] {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * Math.PI * 2;
    return { dx: Math.round(Math.cos(a) * radius), dy: Math.round(Math.sin(a) * radius) };
  });
}

export function buildCursorOffsets(x5Active: boolean, x3Active: boolean): CursorOffset[] {
  const anchor: CursorOffset = { dx: 0, dy: 0 };
  if (x5Active && x3Active) {
    return [
      anchor,
      ...ring(CURSOR_RING_INNER_COUNT, CURSOR_RING_INNER_RADIUS, -Math.PI / 2),
      ...ring(CURSOR_RING_OUTER_COUNT, CURSOR_RING_OUTER_RADIUS, -Math.PI / 2 + Math.PI / CURSOR_RING_OUTER_COUNT),
    ].slice(0, MAX_CURSORS);
  }
  if (x5Active) {
    const arm = CURSOR_X5_OFFSET;
    return [anchor, { dx: -arm, dy: -arm }, { dx: arm, dy: -arm }, { dx: -arm, dy: arm }, { dx: arm, dy: arm }];
  }
  if (x3Active) {
    const r = CURSOR_X3_OFFSET;
    return [
      { dx: 0, dy: 0, hidden: true },
      { dx: 0, dy: -r },
      { dx: -Math.round(r * TRIANGLE_COS), dy: Math.round(r * TRIANGLE_SIN) },
      { dx: Math.round(r * TRIANGLE_COS), dy: Math.round(r * TRIANGLE_SIN) },
    ];
  }
  return [anchor];
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
