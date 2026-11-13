import { useSyncExternalStore } from 'react';
import { readPetGuns, writePetGuns, type GunId, type PetGuns, type PetId } from './gear';

const EMPTY: PetGuns = {};
const listeners = new Set<() => void>();
let guns: PetGuns | null = null;

function current(): PetGuns {
  guns ??= readPetGuns();
  return guns;
}

export function petGun(pet: PetId): GunId | null {
  return current()[pet] ?? null;
}

export function assignPetGun(pet: PetId, gun: GunId | null): void {
  const next = { ...current() };
  if (gun) next[pet] = gun;
  else delete next[pet];
  guns = next;
  writePetGuns(next);
  for (const listen of listeners) listen();
}

function subscribe(listen: () => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}

export function usePetGuns(): PetGuns {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}
