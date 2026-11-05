import { describe, expect, test } from 'bun:test';
import { MOUND_COUNT, MOUND_SCENE_MS, moundLayout, moundPhaseAt, splitShape, tossHitsChicken } from './mounds';

describe('mound scene', () => {
  test('runs inside a minute and ends gone', () => {
    expect(MOUND_SCENE_MS).toBeLessThanOrEqual(60_000);
    expect(MOUND_SCENE_MS).toBeGreaterThanOrEqual(30_000);
    expect(moundPhaseAt(0)).toBe('enter');
    expect(moundPhaseAt(10_000)).toBe('whack');
    expect(moundPhaseAt(40_000)).toBe('mongoose');
    expect(moundPhaseAt(MOUND_SCENE_MS)).toBe('gone');
  });

  test('the split cursor matches the mound layout exactly', () => {
    const mounds = moundLayout(1280, 720);
    const shape = splitShape(mounds);
    expect(shape).toHaveLength(MOUND_COUNT);
    expect(shape.some((o) => o.dx === 0 && o.dy === 0)).toBe(true);
    const anchor = mounds[Math.floor(MOUND_COUNT / 2)];
    shape.forEach((o, i) => expect(Math.abs(anchor.x + o.dx - mounds[i].x)).toBeLessThanOrEqual(1));
  });
});

describe('mongoose toss', () => {
  const from = { x: 800, y: 500 };
  const chicken = { x: 300, y: 300 };
  test('a toss toward the chicken lands, a toss away does not', () => {
    expect(tossHitsChicken(from, { x: -1, y: -0.4 }, chicken)).toBe(true);
    expect(tossHitsChicken(from, { x: 1, y: 0 }, chicken)).toBe(false);
  });
  test('a weak drop only counts right beside the chicken', () => {
    expect(tossHitsChicken(from, { x: -0.05, y: 0 }, chicken)).toBe(false);
    expect(tossHitsChicken({ x: 340, y: 320 }, { x: 0, y: 0 }, chicken)).toBe(true);
  });
});
