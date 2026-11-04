export const GAME_VARIANT_PARAM = 'variant';
export const NEXT_GAME_VARIANT = '2';

export function isNextGameVariant(value: string | string[] | undefined): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === NEXT_GAME_VARIANT;
}

const MAX_TEST_START = 1_000_000;

export const TEST_SCENES: Record<string, number> = {
  surf: 250,
  pilot: 350,
  'plane-exit': 698,
  rocket: 700,
  moon: 800,
  multiply: 500,
  'cursor-x5': 750,
  'cursor-x3': 1250,
  hawk: 2000,
  eagle: 10_000,
  cosmos: 10_500,
  jupiter: 17_000,
  phoenix: 25_000,
};

export function testStartScore(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && v in TEST_SCENES) return TEST_SCENES[v];
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_TEST_START ? n : null;
}
