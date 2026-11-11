import { describe, expect, test } from 'bun:test';
import { FLICK_COOLDOWN_MS, INDEX_TIP, MIDDLE_TIP, PINCH_OFF, PINCH_ON, THUMB_TIP, createFlick, flickStep, nextPinched, pinchRatio, screenPoint, smooth, type FlickState, type HandPoint } from './hand-gesture';

function hand(tip: HandPoint, thumb: HandPoint): HandPoint[] {
  const pts = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  pts[0] = { x: 0.5, y: 0.8 };
  pts[9] = { x: 0.5, y: 0.5 };
  pts[12] = { x: 0.95, y: 0.05 };
  pts[INDEX_TIP] = tip;
  pts[THUMB_TIP] = thumb;
  return pts;
}

describe('hand gesture', () => {
  test('the index tip maps mirrored onto the screen with a reach margin', () => {
    const near = (p: HandPoint, x: number, y: number) => {
      expect(p.x).toBeCloseTo(x, 3);
      expect(p.y).toBeCloseTo(y, 3);
    };
    near(screenPoint(hand({ x: 0.15, y: 0.15 }, { x: 0, y: 0 }), 1000, 800), 1000, 0);
    near(screenPoint(hand({ x: 0.85, y: 0.85 }, { x: 0, y: 0 }), 1000, 800), 0, 800);
    near(screenPoint(hand({ x: 0.5, y: 0.5 }, { x: 0, y: 0 }), 1000, 800), 500, 400);
  });

  test('pinch ratio is thumb-to-index distance over hand size', () => {
    expect(pinchRatio(hand({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.3 }))).toBe(0);
    expect(pinchRatio(hand({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }))).toBeCloseTo(1);
  });

  test('pinch uses hysteresis so a hovering pinch does not chatter', () => {
    expect(nextPinched(false, PINCH_ON + 0.01)).toBe(false);
    expect(nextPinched(false, PINCH_ON - 0.01)).toBe(true);
    expect(nextPinched(true, PINCH_OFF - 0.01)).toBe(true);
    expect(nextPinched(true, PINCH_OFF + 0.01)).toBe(false);
  });

  test('smoothing eases toward the new point', () => {
    expect(smooth(null, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 });
    const s = smooth({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(s.x).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(100);
  });

  test('a three-finger pinch (thumb, index and middle tips meet) also counts', () => {
    const pts = hand({ x: 0.41, y: 0.29 }, { x: 0.4, y: 0.3 });
    pts[MIDDLE_TIP] = { x: 0.41, y: 0.3 };
    expect(nextPinched(false, pinchRatio(pts))).toBe(true);
  });

  test('a pointing hand with the thumb tucked against the middle finger is not a pinch', () => {
    const pts = hand({ x: 0.5, y: 0.1 }, { x: 0.4, y: 0.45 });
    pts[MIDDLE_TIP] = { x: 0.41, y: 0.45 };
    expect(nextPinched(false, pinchRatio(pts))).toBe(false);
  });

  const run = (ys: number[], stepMs = 33) => {
    let st: FlickState = createFlick();
    const out: { flick: boolean; hold: boolean }[] = [];
    ys.forEach((y, i) => {
      const r = flickStep(st, y, 1000 + i * stepMs);
      st = r.state;
      out.push({ flick: r.flick, hold: r.holdCursor });
    });
    return out;
  };

  test('a quick down-and-up flick is one squeeze and holds the cursor', () => {
    const out = run([0.5, 0.5, 0.6, 0.7, 0.62, 0.52, 0.5, 0.5]);
    expect(out.filter((o) => o.flick)).toHaveLength(1);
    expect(out.slice(2, 6).every((o) => o.hold)).toBe(true);
  });

  test('slow movement is not a flick and does not hold the cursor', () => {
    const out = run([0.5, 0.51, 0.52, 0.53, 0.52, 0.51, 0.5]);
    expect(out.some((o) => o.flick)).toBe(false);
    expect(out.some((o) => o.hold)).toBe(false);
  });

  test('a single fast stroke without the return is not a squeeze', () => {
    expect(run([0.5, 0.5, 0.6, 0.7, 0.7, 0.7, 0.7]).some((o) => o.flick)).toBe(false);
  });

  test('a flick while pinching, or right after letting go, is not a second squeeze', () => {
    const ys = [0.5, 0.5, 0.6, 0.7, 0.62, 0.52, 0.5, 0.5];
    let st: FlickState = createFlick();
    const flicks = ys.map((y, i) => {
      const r = flickStep(st, y, 1000 + i * 33, i < 3);
      st = r.state;
      return r.flick;
    });
    expect(flicks.some(Boolean)).toBe(false);
  });

  test('flicks have a short cooldown', () => {
    const out = run([0.5, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.6], FLICK_COOLDOWN_MS / 4);
    expect(out.filter((o) => o.flick).length).toBeLessThan(3);
  });
});
