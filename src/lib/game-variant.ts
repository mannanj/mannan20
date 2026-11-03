export const GAME_VARIANT_PARAM = 'variant';
export const NEXT_GAME_VARIANT = '2';

export function isNextGameVariant(value: string | string[] | undefined): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === NEXT_GAME_VARIANT;
}

const MAX_TEST_START = 1_000_000;

export function testStartScore(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_TEST_START ? n : null;
}
