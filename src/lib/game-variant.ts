export const GAME_VARIANT_PARAM = 'variant';
export const NEXT_GAME_VARIANT = '2';

export function isNextGameVariant(value: string | string[] | undefined): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === NEXT_GAME_VARIANT;
}

const MAX_TEST_START = 1_000_000;

export const TEST_SCENES: Record<string, number> = {
  surf: 125,
  pilot: 200,
  'plane-exit': 348,
  rocket: 350,
  moon: 400,
  mounds: 800,
  multiply: 175,
  'cursor-x5': 100,
  'cursor-x3': 250,
  frenzy: 450,
  eggs: 700,
  'multiply-x5': 800,
  chain: 900,
  'multiply-x10': 1000,
  'multiply-x25': 1500,
  'multiply-x100': 2000,
  hawk: 500,
  eagle: 600,
  cosmos: 1100,
  jupiter: 1500,
  phoenix: 2000,
  'fire-era': 3500,
  kitty: 8000,
  tiger: 8100,
  lion: 8200,
  jungle: 14000,
  myth: 20000,
  cyclops: 20100,
  hydra: 20200,
  cerberus: 26000,
  forest: 32000,
  tree: 32100,
  sword: 32200,
  'swarm-1000': 32300,
  'lap-2': 38000,
  mystery: 44000,
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
