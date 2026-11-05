import type { OrbKind } from './chicken-orbs';
import type { CreatureKind } from './creature-event';

export const ENDLESS_FROM = 2000;
export const ERA_SCORE_STEP = 6000;
export const ERA_MAX_MS = 120_000
export const ERA_MIN_MS = 75_000;
export const ERA_TRANSITION_MS = 6_000;
export const ERA_OVERRUN_MS = 20_000;
export const DROP_BEHIND_BONUS = 1.5;
export const FIRE_FORM_SCORE = 3500;
export const REAL_CHICKEN_UNLOCK_SCORE = 27_000;
export const GATE_KEY_ERA_ID = 'forest';
export const ROTATION_FIRST_INDEX = 1;
export const CREATURE_SPEED_PER_LAP = 0.2;
export const CREATURE_DURATION_FLOOR = 0.6;
export const ROTATION_DROP_SCALE = 0.5;
export const PHOENIX2_TALON_SCALE = 1.5;
export const PHOENIX2_FIRE_SKY_MS = 60_000;
export const MYSTERY_ORB: OrbKind = 'mystery';

export type EndlessScene = 'fire-sky' | 'night-yard' | 'jungle' | 'temple' | 'temple-gate' | 'forest';

export interface EraCreature {
  kind: CreatureKind;
  atMs: number;
}

export interface EndlessEraDef {
  id: string;
  label: string;
  from: number;
  scene: EndlessScene;
  pool: OrbKind[];
  creatures: EraCreature[];
}

export const CAT_OFFSETS_MS: Record<CreatureKind, number> = { kitty: 8000, tiger: 35_000, lion: 65_000, cyclops: 10_000, hydra: 45_000, cerberus: 15_000, tree: 10_000 };
export const SECOND_TREE_AT_MS = 55_000;
export const TREES_PER_FOREST = 2;
export const LATER_SWORD_TREE_CHANCE = 0.3;

export const ENDLESS_ERAS: EndlessEraDef[] = [
  {
    id: 'fire',
    label: 'Fire form',
    from: ENDLESS_FROM,
    scene: 'fire-sky',
    pool: ['giant', 'magnet', 'eggs', 'frenzy', 'multiply10', 'cursor5', 'multiply25'],
    creatures: [],
  },
  {
    id: 'big-cats',
    label: 'Big cats',
    from: ENDLESS_FROM + ERA_SCORE_STEP,
    scene: 'night-yard',
    pool: ['eggs', 'frenzy', 'multiply5', 'cursor5', 'cursor3'],
    creatures: [
      { kind: 'kitty', atMs: CAT_OFFSETS_MS.kitty },
      { kind: 'tiger', atMs: CAT_OFFSETS_MS.tiger },
      { kind: 'lion', atMs: CAT_OFFSETS_MS.lion },
    ],
  },
  {
    id: 'jungle',
    label: 'Jungle',
    from: ENDLESS_FROM + ERA_SCORE_STEP * 2,
    scene: 'jungle',
    pool: ['eggs', 'frenzy', 'cursor5', 'cursor3', 'multiply10'],
    creatures: [],
  },
  {
    id: 'myth-1',
    label: 'Myth',
    from: ENDLESS_FROM + ERA_SCORE_STEP * 3,
    scene: 'temple',
    pool: ['eggs', 'frenzy', 'multiply5', 'cursor5', 'giant'],
    creatures: [
      { kind: 'cyclops', atMs: CAT_OFFSETS_MS.cyclops },
      { kind: 'hydra', atMs: CAT_OFFSETS_MS.hydra },
    ],
  },
  {
    id: 'myth-2',
    label: 'The gate',
    from: ENDLESS_FROM + ERA_SCORE_STEP * 4,
    scene: 'temple-gate',
    pool: ['eggs', 'frenzy', 'multiply10', 'cursor5', 'magnet'],
    creatures: [{ kind: 'cerberus', atMs: CAT_OFFSETS_MS.cerberus }],
  },
  {
    id: GATE_KEY_ERA_ID,
    label: 'Enchanted forest',
    from: ENDLESS_FROM + ERA_SCORE_STEP * 5,
    scene: 'forest',
    pool: ['eggs', 'frenzy', 'chain', 'multiply25', 'multiply100', 'cursor5'],
    creatures: [
      { kind: 'tree', atMs: CAT_OFFSETS_MS.tree },
      { kind: 'tree', atMs: SECOND_TREE_AT_MS },
    ],
  },
];

export function eraIndexById(id: string): number {
  return ENDLESS_ERAS.findIndex((e) => e.id === id);
}

export const ROTATION_LENGTH = ENDLESS_ERAS.length - ROTATION_FIRST_INDEX;

export interface EraClock {
  index: number;
  step: number;
  lap: number;
  enteredAtMs: number;
  byTime: boolean;
  queue: EraCreature[];
  transitionUntilMs: number;
  fireSkyUntilMs: number;
  phoenixDue: boolean;
}

export function createEraClock(): EraClock {
  return { index: -1, step: -1, lap: 1, enteredAtMs: 0, byTime: false, queue: [], transitionUntilMs: 0, fireSkyUntilMs: 0, phoenixDue: false };
}

export function eraStepForScore(score: number): number {
  return score < ENDLESS_FROM ? -1 : Math.floor((score - ENDLESS_FROM) / ERA_SCORE_STEP);
}

export function eraIndexForStep(step: number): number {
  if (step < 0) return -1;
  if (step < ROTATION_FIRST_INDEX) return step;
  return ROTATION_FIRST_INDEX + ((step - ROTATION_FIRST_INDEX) % ROTATION_LENGTH);
}

export function lapForStep(step: number): number {
  return step < ROTATION_FIRST_INDEX ? 1 : 1 + Math.floor((step - ROTATION_FIRST_INDEX) / ROTATION_LENGTH);
}

export function stepForIndex(index: number, lap: number): number {
  return index < ROTATION_FIRST_INDEX ? index : (lap - 1) * ROTATION_LENGTH + index;
}

export function eraStepFrom(step: number): number {
  return ENDLESS_FROM + step * ERA_SCORE_STEP;
}

export function lapStartScore(lap: number): number {
  return eraStepFrom(stepForIndex(ROTATION_FIRST_INDEX, lap));
}

export function eraIndexForScore(score: number): number {
  return eraIndexForStep(eraStepForScore(score));
}

export function nextEraStep(clock: EraClock, score: number, playMs: number): number | null {
  const byScore = eraStepForScore(score);
  if (clock.step < 0) return byScore >= 0 ? byScore : null;
  const inEra = playMs - clock.enteredAtMs;
  if (byScore > clock.step && inEra >= ERA_MIN_MS) return clock.step + 1;
  return inEra >= ERA_MAX_MS ? clock.step + 1 : null;
}

export function enterEraStep(clock: EraClock, step: number, score: number, playMs: number): EndlessEraDef {
  const index = eraIndexForStep(step);
  const era = ENDLESS_ERAS[index];
  clock.step = step;
  clock.index = index;
  clock.lap = lapForStep(step);
  clock.enteredAtMs = playMs;
  clock.byTime = score < eraStepFrom(step);
  clock.queue = [...era.creatures].sort((a, b) => a.atMs - b.atMs);
  clock.transitionUntilMs = playMs + ERA_TRANSITION_MS;
  clock.phoenixDue = clock.lap > 1 && index === ROTATION_FIRST_INDEX;
  clock.fireSkyUntilMs = clock.phoenixDue ? playMs + PHOENIX2_FIRE_SKY_MS : 0;
  return era;
}

export function enterEra(clock: EraClock, index: number, score: number, playMs: number): EndlessEraDef {
  return enterEraStep(clock, stepForIndex(index, Math.max(1, clock.lap)), score, playMs);
}

export function creatureDurationScale(lap: number): number {
  return Math.max(CREATURE_DURATION_FLOOR, 1 / (1 + CREATURE_SPEED_PER_LAP * (lap - 1)));
}

export function dropScaleForLap(lap: number): number {
  return lap > 1 ? ROTATION_DROP_SCALE : 1;
}

export function poolForLap(era: EndlessEraDef, lap: number): OrbKind[] {
  return lap > 1 ? [...era.pool, MYSTERY_ORB] : era.pool;
}

export function eraScene(clock: EraClock, playMs: number): EndlessScene | null {
  if (clock.index < 0) return null;
  return playMs < clock.fireSkyUntilMs ? 'fire-sky' : ENDLESS_ERAS[clock.index].scene;
}

export function dueCreature(clock: EraClock, playMs: number): CreatureKind | null {
  const next = clock.queue[0];
  if (!next || playMs - clock.enteredAtMs < next.atMs) return null;
  clock.queue.shift();
  return next.kind;
}

export function currentEra(clock: EraClock): EndlessEraDef | null {
  return clock.index >= 0 ? ENDLESS_ERAS[clock.index] : null;
}

export function shiftEraTime(clock: EraClock, ms: number): void {
  if (clock.index < 0) return;
  clock.enteredAtMs -= ms;
  clock.transitionUntilMs -= ms;
  clock.fireSkyUntilMs -= ms;
}

const STAGE_COVERING_SCENES: EndlessScene[] = ['night-yard', 'temple', 'temple-gate', 'forest'];

export function sceneCoversStage(scene: EndlessScene | null): boolean {
  return scene !== null && STAGE_COVERING_SCENES.includes(scene);
}
