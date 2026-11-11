import { createFlick, flickStep, nextPinched, palmY, pinchRatio, type FlickState, type HandPoint } from './hand-gesture';

export const HAND_TRACE_PARAM = 'handtrace';
export const TRACE_MAX_FRAMES = 6000;

export interface TraceSegment {
  id: string;
  prompt: string;
  ms: number;
  expected: number;
}

export const TRACE_SCRIPT: TraceSegment[] = [
  { id: 'pinch2', prompt: 'Pinch thumb and index together 5 times', ms: 12_000, expected: 5 },
  { id: 'pinch3', prompt: 'Pinch thumb, index and middle together 5 times', ms: 12_000, expected: 5 },
  { id: 'flick', prompt: 'Flick your hand down and up 5 times', ms: 12_000, expected: 5 },
  { id: 'free', prompt: 'Move your hand around without pinching', ms: 12_000, expected: 0 },
];

export interface TraceFrame {
  t: number;
  seg: string | null;
  lm: [number, number, number][] | null;
}

export interface TraceEvent {
  t: number;
  seg: string | null;
  type: 'pinch' | 'flick';
}

export interface HandTrace {
  version: 1;
  recordedAt: string;
  userAgent: string;
  script: TraceSegment[];
  frames: TraceFrame[];
  events: TraceEvent[];
}

export interface SegmentResult {
  expected: number;
  pinches: number;
  flicks: number;
  squeezes: number;
  frames: number;
  handFrames: number;
}

export function createTrace(userAgent: string): HandTrace {
  return { version: 1, recordedAt: new Date().toISOString(), userAgent, script: TRACE_SCRIPT, frames: [], events: [] };
}

export function pushFrame(trace: HandTrace, frame: TraceFrame): void {
  trace.frames.push(frame);
  if (trace.frames.length > TRACE_MAX_FRAMES) trace.frames.shift();
}

export function replayTrace(trace: HandTrace): Record<string, SegmentResult> {
  const out: Record<string, SegmentResult> = {};
  for (const s of trace.script) out[s.id] = { expected: s.expected, pinches: 0, flicks: 0, squeezes: 0, frames: 0, handFrames: 0 };
  let pinched = false;
  let flick: FlickState = createFlick();
  for (const f of trace.frames) {
    const r = f.seg ? out[f.seg] : undefined;
    if (r) r.frames += 1;
    if (!f.lm) {
      pinched = false;
      continue;
    }
    if (r) r.handFrames += 1;
    const pts: HandPoint[] = f.lm.map(([x, y]) => ({ x, y }));
    const next = nextPinched(pinched, pinchRatio(pts));
    const step = flickStep(flick, palmY(pts), f.t, next);
    flick = step.state;
    if (r && next && !pinched) r.pinches += 1;
    if (r && step.flick) r.flicks += 1;
    pinched = next;
  }
  for (const r of Object.values(out)) r.squeezes = r.pinches + r.flicks;
  return out;
}
