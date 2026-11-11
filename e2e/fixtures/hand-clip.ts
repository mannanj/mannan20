import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CLIP_W = 640;
export const CLIP_H = 480;
export const CLIP_FPS = 30;
export const CLIP_SECONDS = 23;
const HAND_SCALE = 0.5;
const HAND_W = CLIP_W * HAND_SCALE;
const HAND_H = CLIP_H * HAND_SCALE;
const OPEN_TIP = { x: 0.613, y: 0.113 };
const PINCH_TIP = { x: 0.624, y: 0.361 };
const PINCH_SHIFT = { x: (OPEN_TIP.x - PINCH_TIP.x) * HAND_W, y: (OPEN_TIP.y - PINCH_TIP.y) * HAND_H };
const REACH_MARGIN = 0.15;
const FLICK_PX = 160;
const FLICK_STROKE_S = 5 / CLIP_FPS;

type Pt = [number, number];
interface Segment {
  from: number;
  to: number;
  start: Pt;
  end: Pt;
  pinch: boolean;
}

const A: Pt = [160, 150];
const B: Pt = [300, 80];
const C: Pt = [60, 230];
const D: Pt = [200, 110];
const D_DOWN: Pt = [200, 110 + FLICK_PX];
export const FLICK_AT_S = 16;
export const PINCH_TIMES_S = [11, 18];

const seg = (from: number, to: number, start: Pt, end: Pt = start, pinch = false): Segment => ({ from, to, start, end, pinch });

export const SEGMENTS: Segment[] = [
  seg(1.5, 4, A),
  seg(4, 7, A, B),
  seg(7, 10, B, C),
  seg(10, 11, C),
  seg(11, 11.5, C, C, true),
  seg(11.5, 12.5, C),
  seg(12.5, 15, C, D),
  seg(15, FLICK_AT_S, D),
  seg(FLICK_AT_S, FLICK_AT_S + FLICK_STROKE_S, D, D_DOWN),
  seg(FLICK_AT_S + FLICK_STROKE_S, FLICK_AT_S + 2 * FLICK_STROKE_S, D_DOWN, D),
  seg(FLICK_AT_S + 2 * FLICK_STROKE_S, 18, D),
  seg(18, 18.5, D, D, true),
  seg(18.5, 19.5, D),
  seg(19.5, 22, D, A),
  seg(22, CLIP_SECONDS, A),
];

function tipAt(p: Pt): { x: number; y: number } {
  return { x: (p[0] + OPEN_TIP.x * HAND_W) / CLIP_W, y: (p[1] + OPEN_TIP.y * HAND_H) / CLIP_H };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function screenPointFor(p: Pt, width: number, height: number): { x: number; y: number } {
  const tip = tipAt(p);
  const span = 1 - REACH_MARGIN * 2;
  return { x: clamp01((1 - tip.x - REACH_MARGIN) / span) * width, y: clamp01((tip.y - REACH_MARGIN) / span) * height };
}

export const PINCH_POINTS: Pt[] = [C, D];
export const FLICK_POINT: Pt = D;

const num = (v: number) => v.toFixed(4);

function axisExpr(axis: 0 | 1, pinch: boolean): string {
  const parts = SEGMENTS.filter((s) => s.pinch === pinch);
  const shift = pinch ? (axis === 0 ? PINCH_SHIFT.x : PINCH_SHIFT.y) : 0;
  let expr = '0';
  for (const s of [...parts].reverse()) {
    const a = s.start[axis] + shift;
    const b = s.end[axis] + shift;
    const lerp = a === b ? num(a) : `${num(a)}+(${num(b - a)})*(t-${num(s.from)})/${num(s.to - s.from)}`;
    expr = `if(between(t\\,${num(s.from)}\\,${num(s.to)})\\,${lerp}\\,${expr})`;
  }
  return expr;
}

function enableExpr(pinch: boolean): string {
  return SEGMENTS.filter((s) => s.pinch === pinch)
    .map((s) => `between(t\\,${num(s.from)}\\,${num(s.to)})`)
    .join('+');
}

export const CLIP_PATH = join(tmpdir(), 'mannan-hand-control-clip.y4m');

export function hasFfmpeg(): boolean {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

export function buildHandClip(openImage: string, pinchImage: string, out = CLIP_PATH): string {
  if (existsSync(out) && statSync(out).size > 0 && statSync(out).mtimeMs > Math.max(statSync(openImage).mtimeMs, statSync(pinchImage).mtimeMs, statSync(__filename).mtimeMs)) return out;
  const filter = [
    `[1:v]scale=${HAND_W}:${HAND_H}[open]`,
    `[2:v]scale=${HAND_W}:${HAND_H}[pinch]`,
    `[0:v][open]overlay=x='${axisExpr(0, false)}':y='${axisExpr(1, false)}':enable='${enableExpr(false)}'[a]`,
    `[a][pinch]overlay=x='${axisExpr(0, true)}':y='${axisExpr(1, true)}':enable='${enableExpr(true)}'[v]`,
  ].join(';');
  const args = [
    '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=0xc8c8c8:s=${CLIP_W}x${CLIP_H}:r=${CLIP_FPS}:d=${CLIP_SECONDS}`,
    '-loop', '1', '-framerate', String(CLIP_FPS), '-i', openImage,
    '-loop', '1', '-framerate', String(CLIP_FPS), '-i', pinchImage,
    '-filter_complex', filter, '-map', '[v]', '-t', String(CLIP_SECONDS), '-pix_fmt', 'yuv420p', '-f', 'yuv4mpegpipe', out,
  ];
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr}`);
  return out;
}
