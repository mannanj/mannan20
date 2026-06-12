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
  accessory: 'none' | 'visor' | 'spikes' | 'halo';
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

export const DEFAULT_SKIN_ID = 'classic';
export const SKIN_STORAGE_KEY = 'chicken-skin';

export function skinById(id: string | null | undefined): ChickenSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
