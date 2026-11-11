export const JEV_ITEM_ID = 'jev';
export const JEV_READY_KEY = 'chicken-jev-ready-at';

export const JEV_ACTIVE_MS = 20_000;
export const HELPER_MAX_PLAY_MS = 40_000;
export const JEV_COOLDOWN_MS = 20_000;
export const JEV_RISE_MS = 3500;
export const JEV_REACH_MS = 450;
export const JEV_SLEEP_MS = 2600;
export const JEV_PROMPT_MS = 12_000;
export const JEV_NOTE_MS = 2500;
export const JEV_CLICK_INTERVAL_MS = 400;
export const JEV_MAX_CLICKS_PER_FRAME = 4;
export const JEV_SQUEEZE_MS = 70;
export const JEV_RIGHT_PX = 250;
export const JEV_PROMPT_EDGE_PX = 150;

export const MONKEY_ITEM_ID = 'monkey';
export const MONKEY_READY_KEY = 'chicken-monkey-ready-at';
export const MONKEY_ACTIVE_MS = 20_000;
export const MONKEY_COOLDOWN_MS = 20_000;
export const MONKEY_RISE_MS = 1500;
export const MONKEY_LEAVE_MS = 900;
export const MONKEY_SHOT_MS = 1000;
export const MONKEY_DART_MS = 140;
export const MONKEY_DARTS = 6;
export const HELPER_GAP_PX = 16;
export const HELPER_WAKE_MS = 450;
export const HELPER_WAKE_HOP = [{ transform: 'translateY(0)' }, { transform: 'translateY(-6%)' }, { transform: 'translateY(0)' }];

export const MONKEY_ART = {
  sit: '/game/jev/monkey-sit.webp',
  shoot: '/game/jev/monkey-shoot.webp',
};

export const MONKEY_COPY = {
  tag: 'monkey',
  grab: 'Grab the monkey',
  resting: (left: string) => `Monkey back in ${left}`,
};

export const JEV_ART = {
  orb: '/game/jev/orb.webp',
  bust: '/game/jev/bust.webp',
  sleep: '/game/jev/sleep.webp',
  armOpen: '/game/jev/arm-open.webp',
  armFist: '/game/jev/arm-fist.webp',
};

export const JEV_COPY = {
  ask: 'Call Jev to play?',
  yes: 'Call',
  no: 'Not now',
  tag: 'jev',
  sleeping: (left: string) => `Jev wakes in ${left}`,
};

export interface JevPoint {
  x: number;
  y: number;
}

export function helperPlayMs(call: number, rng: () => number): number {
  return call === 0 ? JEV_ACTIVE_MS : JEV_ACTIVE_MS + rng() * (HELPER_MAX_PLAY_MS - JEV_ACTIVE_MS);
}

export function jevBox(vw: number, vh: number): { w: number; h: number } {
  return { w: vw / 7, h: vh / 9 };
}

export function jevArmLength(vw: number): number {
  return vw / 15;
}

export function jevArmAngle(shoulder: JevPoint, target: JevPoint): number {
  return Math.atan2(target.y - shoulder.y, target.x - shoulder.x) - Math.PI;
}

export function jevClicksDue(owedMs: number): number {
  return Math.floor(owedMs / JEV_CLICK_INTERVAL_MS);
}

export function formatJevWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function readJevReadyAt(key = JEV_READY_KEY): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function writeJevReadyAt(at: number, key = JEV_READY_KEY): void {
  try {
    localStorage.setItem(key, String(at));
  } catch {}
}
