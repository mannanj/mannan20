import { describe, expect, test } from 'bun:test';
import { createEraClock, finishesLap, lapForStep } from './endless-eras';

const STEP_LIMIT = 1000;

function firstStepOfLap(lap: number): number {
  const step = Array.from({ length: STEP_LIMIT }, (_, i) => i).find((s) => lapForStep(s) === lap);
  if (step === undefined) throw new Error(`no step for lap ${lap}`);
  return step;
}

describe('lap ends', () => {
  test('every lap end counts, not just the first', () => {
    const clock = createEraClock();
    for (const lap of [1, 2, 3]) {
      clock.lap = lap;
      const next = firstStepOfLap(lap + 1);
      expect(finishesLap(clock, next)).toBe(true);
      expect(finishesLap(clock, next - 1)).toBe(false);
    }
  });
});
