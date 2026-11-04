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
  multiply: 300,
  'cursor-x5': 600,
  'cursor-x3': 900,
  frenzy: 1200,
  eggs: 2200,
  'multiply-x5': 2500,
  chain: 5000,
  'multiply-x10': 7000,
  'multiply-x25': 11_000,
  'multiply-x100': 18_000,
  hawk: 2000,
  eagle: 10_000,
  cosmos: 10_500,
  jupiter: 17_000,
  phoenix: 25_000,
  'fire-era': 29_000,
  kitty: 33_000,
  tiger: 33_100,
  lion: 33_200,
  myth: 41_000,
  cyclops: 41_100,
  hydra: 41_200,
  cerberus: 49_000,
  forest: 57_000,
  tree: 57_100,
  sword: 57_200,
  'swarm-1000': 57_300,
  'lap-2': 65_000,
  mystery: 73_000,
};

export function testStartScene(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v in TEST_SCENES ? v : undefined;
}

export function testStartScore(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && v in TEST_SCENES) return TEST_SCENES[v];
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_TEST_START ? n : null;
}
