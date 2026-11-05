export type OrbKind =
  | 'multiply'
  | 'cursor5'
  | 'cursor3'
  | 'frenzy'
  | 'eggs'
  | 'multiply5'
  | 'chain'
  | 'multiply10'
  | 'multiply25'
  | 'multiply100'
  | 'giant'
  | 'magnet'
  | 'mystery'
  | 'jev';

export interface CursorOffset {
  dx: number;
  dy: number;
  hidden?: boolean;
}

export const ORB_KINDS: OrbKind[] = ['multiply', 'cursor5', 'cursor3', 'frenzy', 'eggs'];

export const ORB_THRESHOLDS: Record<OrbKind, number> = {
  multiply: 300,
  cursor5: 600,
  cursor3: 900,
  frenzy: 1200,
  eggs: 2200,
  multiply5: Number.POSITIVE_INFINITY,
  chain: Number.POSITIVE_INFINITY,
  multiply10: Number.POSITIVE_INFINITY,
  multiply25: Number.POSITIVE_INFINITY,
  multiply100: Number.POSITIVE_INFINITY,
  giant: Number.POSITIVE_INFINITY,
  magnet: Number.POSITIVE_INFINITY,
  mystery: Number.POSITIVE_INFINITY,
  jev: Number.POSITIVE_INFINITY,
};

export const ORB_LABELS: Record<OrbKind, string> = {
  multiply: 'Multiply x3',
  cursor5: 'Cursor x5',
  cursor3: 'Cursor x3',
  frenzy: 'Frenzy x2',
  eggs: 'Golden Eggs',
  multiply5: 'Multiply x5',
  chain: 'Chain Lightning',
  multiply10: 'Multiply x10',
  multiply25: 'Multiply x25',
  multiply100: 'Multiply x100',
  giant: 'Giant x2.5',
  magnet: 'Magnet pull',
  mystery: 'Mystery ???',
  jev: 'Jev ?',
};

export const ORB_LIFETIME_MS = 30_000;
export const ORB_FADE_MS = 2000;
export const ORB_RADIUS = 20.5;
export const JEV_ORB_RADIUS = 48;
export const ORB_LABEL_PX: Record<OrbKind, number> = {
  multiply: 11,
  cursor5: 12.5,
  cursor3: 12.5,
  frenzy: 11,
  eggs: 10,
  multiply5: 11,
  chain: 8.5,
  multiply10: 10.5,
  multiply25: 10.5,
  multiply100: 9.5,
  giant: 11,
  magnet: 11,
  mystery: 11,
  jev: 11,
};
export const MYSTERY_REVEAL_MS = 1800;
export const MYSTERY_EFFECTS: { kind: OrbKind; weight: number }[] = [
  { kind: 'frenzy', weight: 8 },
  { kind: 'cursor5', weight: 6 },
  { kind: 'cursor3', weight: 4 },
  { kind: 'eggs', weight: 6 },
  { kind: 'multiply5', weight: 6 },
  { kind: 'multiply10', weight: 4 },
  { kind: 'chain', weight: 6 },
  { kind: 'giant', weight: 6 },
  { kind: 'magnet', weight: 5 },
  { kind: 'multiply25', weight: 2 },
];
export const GIANT_FACTOR = 2.5;
export const GIANT_DURATION_MS = 15_000;
export const GIANT_SCALE = 1.6;
export const MAGNET_DURATION_MS = 10_000;
export const MAGNET_PULL_PER_MS = 0.0022;
export const MAGNET_MAX_SPEED = 0.9;
export const ORB_DRIFT_SPEED = 0.05;
export const ORB_SPAWN_MARGIN = 80;
export const ORB_WOBBLE_AMPLITUDE = 14;
export const ORB_WOBBLE_FREQUENCY = 0.0016;
export const ORB_COLLECT_SHARDS = 10;
export const ORB_SHARD_COLORS = ['#ff3b3b', '#ffb02e', '#f6ec3a', '#3ddc6a', '#35b6ff', '#8a5cff'];

export const MULTIPLY_FACTORS: Partial<Record<OrbKind, number>> = {
  multiply: 3,
  multiply5: 5,
  multiply10: 10,
  multiply25: 25,
  multiply100: 100,
};
export const MULTIPLY_FACTOR = 3;
export const MULTIPLY_DURATION_MS = 15_000;
export const MULTIPLY_DURATIONS_MS: Partial<Record<OrbKind, number>> = {
  multiply: 15_000,
  multiply5: 15_000,
  multiply10: 15_000,
  multiply25: 12_000,
  multiply100: 10_000,
};
export const MULTIPLY_BLINK_BEFORE_END_MS = 5000;
export const MULTIPLY_VANISH_SPREAD_MS = 3000;
export const MULTIPLY_BLINK_START_MS = 10_000;
export const MULTIPLY_VANISH_EARLIEST_MS = 12_000;
export const MAX_CHICKENS_ON_SCREEN = 150;
export const CLONE_DOM_LIMIT = 60;
export const CLONE_DRIFT_SPEED = 0.09;
export const CLONE_HOMING = 0.00022;
export const CLONE_FLOCK_RADIUS = 130;
export const CLONE_MAX_SPEED = 0.16;
export const CLONE_SPAWN_SPREAD = 40;
export const BLACK_HOLE_LIFE_MS = 900;
export const BLACK_HOLE_RADIUS = 16;
export const VANISH_FEATHERS = 6;
export const VANISH_FEATHERS_SWARM = 1;

export const CHAIN_DURATION_MS = 15_000;
export const CHAIN_RADIUS = 200;
export const CHAIN_MAX_ARCS = 6;
export const CHAIN_ARC_LIFE_MS = 320;
export const CHAIN_ARC_SEGMENTS = 9;
export const CHAIN_ARC_JITTER = 14;
export const CHAIN_BLINK_MS = 4000;

export const EGG_LAY_INTERVAL_MS = 2000;
export const EGG_LAY_COUNT = 8;
export const EGG_POINTS = 100;
export const BIG_EGG_POINTS = 500;
export const BIG_EGG_CHANCE = 0.15;
export const EGG_HATCH_MS = 10_000;
export const EGG_HATCH_ANIM_MS = 900;
export const EGG_W = 28;
export const EGG_H = 36;
export const BIG_EGG_SCALE = 1.45;
export const EGG_DROP_MS = 600;
export const GOLDEN_LIFE_MS = 33_000;
export const GOLDEN_BLINK_MS = 4000;
export const MAX_GOLDEN_CHICKENS = 3;
export const GOLDEN_HIT_VALUE = 5;
export const GOLDEN_W = 70;
export const GOLDEN_H = 140;
export const GOLDEN_SPEED = 0.14;
export const GOLDEN_TURN_MIN_MS = 900;
export const GOLDEN_TURN_SPREAD_MS = 1800;
export const GOLDEN_BURST_SHARDS = 28;
export const GOLDEN_BURST_FEATHERS = 14;
export const GOLDEN_COLORS = ['#ffd54a', '#ffb300', '#fff3b0', '#ffe082'];

export const CURSOR_BUFF_MS = 30_000;
export const CURSOR_EXTEND_PER_CLICK_MS = 50;
export const CURSOR_CAP_MS = 60_000;
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

export function pickMysteryEffect(last: OrbKind | null, rng: () => number): OrbKind {
  const options = MYSTERY_EFFECTS.filter((e) => e.kind !== last);
  const total = options.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * total;
  for (const e of options) {
    roll -= e.weight;
    if (roll < 0) return e.kind;
  }
  return options[options.length - 1].kind;
}

export function orbRadius(kind: OrbKind): number {
  return kind === 'jev' ? JEV_ORB_RADIUS : ORB_RADIUS;
}

export function multiplyFactor(kind: OrbKind): number | null {
  return MULTIPLY_FACTORS[kind] ?? null;
}

export function multiplyDurationMs(kind: OrbKind): number {
  return MULTIPLY_DURATIONS_MS[kind] ?? MULTIPLY_DURATION_MS;
}

export function orbLabelLines(kind: OrbKind): [string, string] {
  const words = ORB_LABELS[kind].split(' ');
  return [words[0], words.slice(1).join(' ')];
}

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

export function crossedOrbs(prev: number, next: number, fired: Partial<Record<OrbKind, boolean>>): OrbKind[] {
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
