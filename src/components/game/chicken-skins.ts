export interface ChickenSkin {
  id: string;
  name: string;
  tierBlend: number;
  body: string;
  bodyDark: string;
  belly: string;
  comb: string;
  mouth: string;
  beakTop: string;
  beakBottom: string;
  wattle: string;
  legs: string;
  accessory: 'none' | 'visor' | 'spikes' | 'halo' | 'antennae';
  pattern?: 'hawk' | 'eagle' | 'phoenix';
  multiplier?: number;
}

export const SKINS: ChickenSkin[] = [
  {
    id: 'classic',
    name: 'Classic Yard',
    tierBlend: 1,
    body: '#FFD700',
    bodyDark: '#E6C200',
    belly: '#FFE44D',
    comb: '#D32F2F',
    mouth: '#CC3300',
    beakTop: '#FF8C00',
    beakBottom: '#E67E00',
    wattle: '#D32F2F',
    legs: '#D32F2F',
    accessory: 'none',
  },
  {
    id: 'void',
    name: 'Void Walker',
    tierBlend: 0.3,
    body: '#2E2347',
    bodyDark: '#1D1633',
    belly: '#574B7E',
    comb: '#7C4DFF',
    mouth: '#4527A0',
    beakTop: '#B39DDB',
    beakBottom: '#9575CD',
    wattle: '#5E35B1',
    legs: '#4527A0',
    accessory: 'spikes',
  },
  {
    id: 'mecha',
    name: 'Mecha Cluck',
    tierBlend: 0.22,
    body: '#90A4AE',
    bodyDark: '#546E7A',
    belly: '#CFD8DC',
    comb: '#455A64',
    mouth: '#37474F',
    beakTop: '#FFB300',
    beakBottom: '#F57C00',
    wattle: '#607D8B',
    legs: '#37474F',
    accessory: 'visor',
  },
  {
    id: 'magma',
    name: 'Magma Core',
    tierBlend: 0.3,
    body: '#FF6F43',
    bodyDark: '#BF360C',
    belly: '#FFCCBC',
    comb: '#FFD54F',
    mouth: '#8D2F0B',
    beakTop: '#FFC107',
    beakBottom: '#FF8F00',
    wattle: '#E64A19',
    legs: '#4E342E',
    accessory: 'none',
  },
  {
    id: 'frost',
    name: 'Frostfall',
    tierBlend: 0.3,
    body: '#AEDFF7',
    bodyDark: '#7FC4E8',
    belly: '#E8F7FF',
    comb: '#E1F5FE',
    mouth: '#4FA3D1',
    beakTop: '#4FC3F7',
    beakBottom: '#29B6F6',
    wattle: '#81D4FA',
    legs: '#0277BD',
    accessory: 'halo',
  },
];

export const UNLOCKABLE_SKINS: ChickenSkin[] = [
  {
    id: 'hawk',
    name: 'Red-tail',
    tierBlend: 0.3,
    body: '#7A4A2B',
    bodyDark: '#5B3519',
    belly: '#E8D9BC',
    comb: '#5B3519',
    mouth: '#4A2A14',
    beakTop: '#C9A227',
    beakBottom: '#A98618',
    wattle: '#7A4A2B',
    legs: '#D9A92C',
    accessory: 'none',
    pattern: 'hawk',
    multiplier: 2.5,
  },
  {
    id: 'eagle',
    name: 'Bald Eagle',
    tierBlend: 0.08,
    body: '#4A2F1C',
    bodyDark: '#2F1C0F',
    belly: '#5A3B24',
    comb: '#F6F1E6',
    mouth: '#8A5A12',
    beakTop: '#F2B61C',
    beakBottom: '#D9980F',
    wattle: '#F6F1E6',
    legs: '#F2B61C',
    accessory: 'none',
    pattern: 'eagle',
    multiplier: 5,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    tierBlend: 0.08,
    body: '#FF6A00',
    bodyDark: '#C62A00',
    belly: '#FFD54A',
    comb: '#FFF176',
    mouth: '#8D1B00',
    beakTop: '#FFC400',
    beakBottom: '#FF8F00',
    wattle: '#FF3D00',
    legs: '#B71C1C',
    accessory: 'none',
    pattern: 'phoenix',
    multiplier: 15,
  },
  {
    id: 'martian',
    name: 'Martian',
    tierBlend: 0.25,
    body: '#7FD1B9',
    bodyDark: '#5FB59C',
    belly: '#E0A83A',
    comb: '#E0A83A',
    mouth: '#2E6B3A',
    beakTop: '#E0A83A',
    beakBottom: '#C98A2A',
    wattle: '#5FB59C',
    legs: '#C9D1DC',
    accessory: 'antennae',
    multiplier: 10,
  },
];

export interface CharSpot {
  x: number;
  y: number;
  r: number;
}

export const CHAR_STORAGE_KEY = 'chicken-skin-char-v1';
export const BURN_SPOT: CharSpot = { x: 27, y: 100, r: 11 };
export const BURN_STAGES = ['#F3C7A0', '#E0856B', '#9A5B3C', '#2B1B14'];
export const CHAR_FEATHER_OPACITY = 0.55;

function isCharSpot(v: unknown): v is CharSpot {
  if (typeof v !== 'object' || v === null) return false;
  const { x, y, r } = v as Record<string, unknown>;
  return typeof x === 'number' && typeof y === 'number' && typeof r === 'number';
}

export function readCharSpots(): Record<string, CharSpot[]> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CHAR_STORAGE_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, CharSpot[]> = {};
    for (const [id, spots] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(spots)) out[id] = spots.filter(isCharSpot);
    }
    return out;
  } catch {
    return {};
  }
}

export function recordChar(skinId: string, spot: CharSpot): Record<string, CharSpot[]> {
  const all = readCharSpots();
  all[skinId] = [...(all[skinId] ?? []), spot];
  try {
    window.localStorage.setItem(CHAR_STORAGE_KEY, JSON.stringify(all));
  } catch {}
  return all;
}

export const DEFAULT_SKIN_ID = 'classic';
export const SKIN_STORAGE_KEY = 'chicken-skin';
export const UNLOCKED_SKINS_KEY = 'chicken-skins-unlocked';

export function skinById(id: string | null | undefined): ChickenSkin {
  return SKINS.find((s) => s.id === id) ?? UNLOCKABLE_SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function skinMultiplier(id: string | null | undefined): number {
  return skinById(id).multiplier ?? 1;
}

export const MYTHIC_BONUS: Record<string, number> = { 'golden-mane': 20, 'hydra-scale': 30, 'gate-key': 40, sword: 50 };

export function stackedMultiplier(worn: Iterable<string>): number {
  let sum = 0;
  for (const id of worn) sum += MYTHIC_BONUS[id] ?? skinById(id).multiplier ?? 0;
  return sum || 1;
}

export function readUnlockedSkins(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(UNLOCKED_SKINS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function unlockSkin(id: string): string[] {
  const next = Array.from(new Set([...readUnlockedSkins(), id]));
  try {
    window.localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
