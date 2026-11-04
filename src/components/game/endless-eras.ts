import type { OrbKind } from './chicken-orbs';
import type { CreatureKind } from './creature-event';

export const ENDLESS_FROM = 25_000;
export const ERA_SCORE_STEP = 8_000;
export const ERA_MAX_MS = 180_000;
export const ERA_TRANSITION_MS = 6_000;
export const ERA_OVERRUN_MS = 20_000;
export const DROP_BEHIND_BONUS = 1.5;
export const FIRE_FORM_SCORE = 29_000;

export type EndlessScene = 'fire-sky' | 'night-yard';

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

export const CAT_OFFSETS_MS: Record<CreatureKind, number> = { kitty: 15_000, tiger: 75_000, lion: 135_000 };

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
];

export interface EraClock {
  index: number;
  enteredAtMs: number;
  byTime: boolean;
  queue: EraCreature[];
  transitionUntilMs: number;
}

export function createEraClock(): EraClock {
  return { index: -1, enteredAtMs: 0, byTime: false, queue: [], transitionUntilMs: 0 };
}

export function eraIndexForScore(score: number): number {
  let index = -1;
  ENDLESS_ERAS.forEach((era, i) => {
    if (score >= era.from) index = i;
  });
  return index;
}

export function nextEraIndex(clock: EraClock, score: number, playMs: number): number | null {
  const byScore = eraIndexForScore(score);
  if (byScore > clock.index) return byScore;
  if (clock.index < 0 || clock.index >= ENDLESS_ERAS.length - 1) return null;
  return playMs - clock.enteredAtMs >= ERA_MAX_MS ? clock.index + 1 : null;
}

export function enterEra(clock: EraClock, index: number, score: number, playMs: number): EndlessEraDef {
  const era = ENDLESS_ERAS[index];
  clock.index = index;
  clock.enteredAtMs = playMs;
  clock.byTime = score < era.from;
  clock.queue = [...era.creatures].sort((a, b) => a.atMs - b.atMs);
  clock.transitionUntilMs = playMs + ERA_TRANSITION_MS;
  return era;
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
}
