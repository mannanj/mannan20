export const JEV_ITEM_ID = 'jev';
export const JEV_READY_KEY = 'chicken-jev-ready-at';

export const JEV_ACTIVE_MS = 30_000;
export const JEV_COOLDOWN_MS = 300_000;
export const JEV_RISE_MS = 3500;
export const JEV_REACH_MS = 450;
export const JEV_SLEEP_MS = 2600;
export const JEV_PROMPT_MS = 12_000;
export const JEV_NOTE_MS = 2500;
export const JEV_CLICK_INTERVAL_MS = 25;
export const JEV_MAX_CLICKS_PER_FRAME = 4;
export const JEV_SQUEEZE_MS = 70;
export const JEV_RIGHT_PX = 80;
export const JEV_PROMPT_EDGE_PX = 150;

export const JEV_ART = {
  orb: '/game/jev/orb.webp',
  bust: '/game/jev/bust.webp',
  sleep: '/game/jev/sleep.webp',
  armOpen: '/game/jev/arm-open.webp',
  armFist: '/game/jev/arm-fist.webp',
};

export const JEV_COPY = {
  ask: 'Activate Jev to help you play?',
  yes: 'Activate',
  no: 'Not now',
  tag: 'jev',
  sleeping: (left: string) => `Jev wakes in ${left}`,
};

export interface JevPoint {
  x: number;
  y: number;
}

export function jevBox(vw: number, vh: number): { w: number; h: number } {
  return { w: vw / 7, h: vh / 9 };
}

export function jevArmLength(vw: number): number {
  return vw / 5;
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

export function readJevReadyAt(): number {
  try {
    return Number(localStorage.getItem(JEV_READY_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeJevReadyAt(at: number): void {
  try {
    localStorage.setItem(JEV_READY_KEY, String(at));
  } catch {}
}
