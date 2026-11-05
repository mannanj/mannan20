import { describe, expect, test } from 'bun:test';
import { BOTTOM_ZONE_PX, CANNON_POINTS, canDock, cannonHome, coolingSeconds, flatPoints, zoneLimitY } from './cannon';

describe('chicken cannon', () => {
  test('docks only near the bottom-middle silhouette', () => {
    const home = cannonHome(1280, 720);
    expect(canDock(home, 1280, 720)).toBe(true);
    expect(canDock({ x: 100, y: 100 }, 1280, 720)).toBe(false);
  });
  test('a hit is a flat 100 points at any multiplier', () => {
    expect(flatPoints(1) * 1).toBe(CANNON_POINTS);
    expect(flatPoints(17.5) * 17.5).toBeCloseTo(CANNON_POINTS, 6);
  });
  test('the chicken stays above the bottom zone', () => {
    expect(zoneLimitY(720, 140) + 140).toBe(720 - BOTTOM_ZONE_PX);
  });
  test('the spinner rounds up remaining seconds', () => {
    expect(coolingSeconds(4100)).toBe(5);
    expect(coolingSeconds(0)).toBe(0);
  });
});
