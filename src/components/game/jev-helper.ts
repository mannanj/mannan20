import { PETS, type PetId } from './gear';

export const JEV_ITEM_ID = 'jev';
export const JEV_READY_KEY = 'chicken-jev-ready-at';

export const JEV_ACTIVE_MS = 20_000;
export const HELPER_MAX_PLAY_MS = 40_000;
export const JEV_COOLDOWN_MS = 20_000;
export const JEV_RISE_MS = 3500;
export const JEV_REACH_MS = 450;
export const JEV_SLEEP_MS = 2600;
export const JEV_NOTE_MS = 2500;
export const JEV_CLICK_INTERVAL_MS = 400;
export const JEV_MAX_CLICKS_PER_FRAME = 4;
export const JEV_SQUEEZE_MS = 70;
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
export const PET_BAND = 0.8;
export const PET_MAX_HEIGHT = 0.16;
export const PET_SLOT_FILL = 0.45;
export const PET_STAGGER = 0.6;
export const PET_NARROW_PX = 640;
export const PET_NARROW_BOTTOM_PX = 60;
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

export const PET_WIDTH: Record<PetId, number> = { jev: 2, monkey: 1 };

export interface PetBox {
  w: number;
  h: number;
  left: number;
  bottom: number;
}

export function petBox(pet: PetId, shown: readonly PetId[], vw: number, vh: number): PetBox {
  const index = Math.max(0, shown.indexOf(pet));
  const count = Math.max(1, shown.length);
  const slots = count % 2 === 1 && count > 1 ? count + 1 : count;
  const slot = slots > count && index >= count / 2 ? index + 1 : index;
  const slotW = (vw * PET_BAND) / slots;
  const h = Math.min(vh * PET_MAX_HEIGHT, slotW * PET_SLOT_FILL);
  const w = h * PET_WIDTH[pet];
  const center = (vw * (1 - PET_BAND)) / 2 + slotW * (slot + 0.5);
  const crowded = Math.max(...shown.map((p) => h * PET_WIDTH[p])) > slotW;
  const base = vw < PET_NARROW_PX ? PET_NARROW_BOTTOM_PX : 0;
  return { w, h, left: center - w / 2, bottom: base + (crowded && slot % 2 === 1 ? h * PET_STAGGER : 0) };
}

export function shownPets(owned: (pet: PetId) => boolean): PetId[] {
  return PETS.filter(owned);
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
