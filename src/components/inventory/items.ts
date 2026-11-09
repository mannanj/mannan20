export interface InventoryItem {
  id: string;
  label: string;
  count: number;
}

export interface ItemDefinition {
  label: string;
  max: number;
  usable: boolean;
  draggable?: boolean;
}

export const INVENTORY_STORAGE_KEY = 'article-inventory-v1';
export const DEFAULT_ITEM_MAX = 12;
export const ITEM_DRAG_TYPE = 'application/x-game-item';

export const GAME_ITEMS = {
  'hawk-feather': { label: 'Hawk feather', max: 1, usable: true },
  'eagle-feather': { label: 'Eagle feather', max: 1, usable: true },
  'phoenix-feather': { label: 'Phoenix feather', max: 1, usable: true },
  'toasted-feather': { label: 'Toasted feather', max: 10, usable: false },
  'martian-friend': { label: 'Martian friend', max: 1, usable: true },
  'yarn-ball': { label: 'Yarn ball', max: 3, usable: true },
  'golden-mane': { label: 'Golden mane', max: 1, usable: true },
  'hydra-scale': { label: 'Hydra scale', max: 2, usable: true },
  'gate-key': { label: 'Gate key', max: 1, usable: true },
  'key-to-the-city': { label: 'Key to the City', max: 1, usable: false },
  sword: { label: 'Sword', max: 1, usable: true },
  jev: { label: 'Jev (asleep)', max: 1, usable: true },
  monkey: { label: 'Monkey', max: 1, usable: true },
  mongoose: { label: 'Mongoose', max: 1, usable: true },
  laser: { label: 'Laser', max: 1, usable: true },
  'ray-gun': { label: 'Ray gun', max: 1, usable: true, draggable: true },
  'freeze-gun': { label: 'Freeze gun', max: 1, usable: true, draggable: true },
} as const satisfies Record<string, ItemDefinition>;

export type GameItemId = keyof typeof GAME_ITEMS;

export const GARDEN_ITEM_MAX: Record<string, number> = {
  'easter-egg': 12,
  'id-card': 1,
  'ruby-gem': 1,
};

export function isGameItemId(id: string): id is GameItemId {
  return id in GAME_ITEMS;
}

export function definitionFor(id: string): ItemDefinition | null {
  return isGameItemId(id) ? GAME_ITEMS[id] : null;
}

export function maxFor(id: string): number {
  return definitionFor(id)?.max ?? GARDEN_ITEM_MAX[id] ?? DEFAULT_ITEM_MAX;
}

export function labelFor(id: string): string {
  return definitionFor(id)?.label ?? id;
}

export function parseStoredItems(raw: string | null): InventoryItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: InventoryItem[] = [];
  for (const entry of parsed as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, label, count } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || typeof count !== 'number' || !(count > 0)) continue;
    items.push({ id, label: typeof label === 'string' ? label : labelFor(id), count: Math.floor(count) });
  }
  return items;
}
