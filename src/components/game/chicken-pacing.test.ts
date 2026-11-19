import { describe, expect, test } from 'bun:test';
import { BIG_MOMENT_COOLDOWN_MS, orbWeight, pickOrbKind, type SchedulerContext } from './chicken-pacing';

const ctx = (over: Partial<SchedulerContext>): SchedulerContext => ({
  score: 5000,
  behind: 0,
  ahead: false,
  lastKinds: [],
  activeKinds: [],
  clones: 0,
  goldens: 0,
  sinceBigMs: 1e9,
  sinceMultiplyEndMs: 1e9,
  rng: () => 0.5,
  ...over,
});

describe('pickOrbKind', () => {
  test('returns null, not undefined, when far behind and every candidate is a big orb on cooldown', () => {
    const c = ctx({ behind: 1, sinceBigMs: 0, pool: ['multiply25', 'multiply100'] });
    expect(pickOrbKind(c)).toBeNull();
  });

  test('never picks an owned aimbot, even when rng returns exactly 0', () => {
    const c = ctx({ aimbotOwned: true, pool: ['aimbot', 'frenzy'], rng: () => 0 });
    expect(orbWeight('aimbot', c)).toBe(0);
    expect(pickOrbKind(c)).toBe('frenzy');
  });

  test('never picks a big orb inside its cooldown, even when rng returns exactly 0', () => {
    const c = ctx({ sinceBigMs: BIG_MOMENT_COOLDOWN_MS - 1, pool: ['multiply100', 'magnet', 'mystery'], rng: () => 0 });
    expect(pickOrbKind(c)).toBe('magnet');
  });

  test('returns null when every pooled kind has zero weight', () => {
    const c = ctx({ aimbotOwned: true, pool: ['aimbot'], rng: () => 0 });
    expect(pickOrbKind(c)).toBeNull();
  });
});
