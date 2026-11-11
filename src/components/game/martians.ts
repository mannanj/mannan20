export type MartianKind = 'pip' | 'moss' | 'zap';

export interface MartianSpec {
  kind: MartianKind;
  src: string;
  aspect: number;
  height: number;
  label: string;
}

export const MARTIAN_SPECS: Record<MartianKind, MartianSpec> = {
  pip: { kind: 'pip', src: '/game/martians/pip.webp', aspect: 0.52, height: 210, label: 'Pip' },
  moss: { kind: 'moss', src: '/game/martians/moss.webp', aspect: 0.8, height: 190, label: 'Moss' },
  zap: { kind: 'zap', src: '/game/martians/zap.webp', aspect: 0.5, height: 230, label: 'Zap' },
};

export const MARTIAN_KINDS: MartianKind[] = ['pip', 'moss', 'zap'];
export const MARTIAN_ITEM_ID = 'martian-friend';
export const MARTIAN_SKIN_ID = 'martian';
export const MARTIAN_CLICKS_GOAL = 30;
export const MARTIAN_CLICKS_KEY = 'martian-clicks';
export const MARTIAN_FIRST_SPAWN_MS = 7000;
export const MARTIAN_SPAWN_MIN_MS = 14_000;
export const MARTIAN_SPAWN_SPREAD_MS = 12_000;
export const MARTIAN_STAY_MS = 26_000;
export const MARTIAN_REWARD_STAY_MS = 2200;
export const MARTIAN_WALK_MS = 3200;
export const MARTIAN_MAX_ON_SCREEN = 2;
export const MARTIAN_LABEL_MS = 2000;
export const MARTIAN_SLOTS = [14, 36, 58, 76];
export const BG_MARTIAN_COUNT = 7;

export function readMartianClicks(): number {
  try {
    const n = Number(window.localStorage.getItem(MARTIAN_CLICKS_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(MARTIAN_CLICKS_GOAL, Math.floor(n))) : 0;
  } catch {
    return 0;
  }
}

export function writeMartianClicks(n: number): void {
  try {
    window.localStorage.setItem(MARTIAN_CLICKS_KEY, String(n));
  } catch {}
}

let spawnHandler: ((kind?: MartianKind) => void) | null = null;

export function setMartianSpawnHandler(fn: ((kind?: MartianKind) => void) | null): void {
  spawnHandler = fn;
}

export function spawnMartianNow(kind?: MartianKind): void {
  spawnHandler?.(kind);
}
