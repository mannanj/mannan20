import { describe, expect, test } from 'bun:test';
import { GUN_SHOT_MS, ICE_BLOCK_AT_MS, ICE_BLOCK_MIN_MS, ICE_SLOW_FACTOR, addFreezeShot, createIce, iceSpeedFactor, icePhase } from './gear';

describe('freeze gun', () => {
  test('one second on the chicken adds three seconds of slow', () => {
    const ice = createIce();
    for (let i = 0; i < 1000 / GUN_SHOT_MS; i++) addFreezeShot(ice, 0, () => 0);
    expect(ice.slowUntil).toBe(3000);
    expect(iceSpeedFactor(ice, 100)).toBe(ICE_SLOW_FACTOR);
  });

  test('enough ice locks the chicken in a block that cracks, heats and ends', () => {
    const ice = createIce();
    for (let t = 0; t < ICE_BLOCK_AT_MS; t += GUN_SHOT_MS) addFreezeShot(ice, t, () => 0);
    const end = ice.blockUntil;
    expect(end - (ICE_BLOCK_AT_MS - GUN_SHOT_MS)).toBe(ICE_BLOCK_MIN_MS);
    expect(iceSpeedFactor(ice, end - 1)).toBe(0);
    expect(icePhase(ice, end - 9000)).toBe('solid');
    expect(icePhase(ice, end - 5000)).toBe('cracking');
    expect(icePhase(ice, end - 1000)).toBe('heating');
  });
});
