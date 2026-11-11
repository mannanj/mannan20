import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTrace, replayTrace, type HandTrace, type TraceFrame } from './hand-trace';

const FIXTURES = join(import.meta.dir, '../../../e2e/fixtures/hand-traces');
const FRAME_MS = 33;

function lm(tipGap: number, palm: number): [number, number, number][] {
  const pts: [number, number, number][] = Array.from({ length: 21 }, () => [0.5, 0.5, 0]);
  pts[0] = [0.5, palm + 0.3, 0];
  pts[9] = [0.5, palm, 0];
  pts[4] = [0.45, 0.3, 0];
  pts[8] = [0.45 + tipGap, 0.3, 0];
  pts[12] = [0.9, 0.1, 0];
  return pts;
}

describe('hand trace replay', () => {
  test('counts pinches and flicks per scripted segment', () => {
    const trace: HandTrace = createTrace('test');
    const frames: TraceFrame[] = [];
    let t = 0;
    const push = (seg: string, gap: number, palm: number) => frames.push({ t: (t += FRAME_MS), seg, lm: lm(gap, palm) });
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 5; k++) push('pinch2', 0.25, 0.5);
      for (let k = 0; k < 5; k++) push('pinch2', 0.01, 0.5);
    }
    for (let k = 0; k < 10; k++) push('flick', 0.25, 0.5);
    for (const palm of [0.5, 0.5, 0.6, 0.7, 0.62, 0.52, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) push('flick', 0.25, palm);
    for (let k = 0; k < 20; k++) push('free', 0.25, 0.5 + Math.sin(k / 6) * 0.01);
    trace.frames = frames;
    const r = replayTrace(trace);
    expect(r.pinch2.pinches).toBe(3);
    expect(r.flick.flicks).toBe(1);
    expect(r.free.squeezes).toBe(0);
  });

  const traces = existsSync(FIXTURES) ? readdirSync(FIXTURES).filter((f) => f.endsWith('.json')) : [];
  for (const file of traces) {
    test(`recorded trace ${file} detects the scripted gestures`, () => {
      const trace = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as HandTrace;
      const r = replayTrace(trace);
      for (const [id, seg] of Object.entries(r)) {
        if (seg.expected === 0) expect(seg.squeezes, id).toBeLessThanOrEqual(1);
        else expect(Math.abs(seg.squeezes - seg.expected), id).toBeLessThanOrEqual(1);
      }
    });
  }
});
