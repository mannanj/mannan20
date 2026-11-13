'use client';

import { useEffect, useRef, useState } from 'react';
import { useInventory } from '@/components/inventory';
import { ItemArt } from '@/components/inventory/item-art';
import { labelFor } from '@/components/inventory/items';
import { GEAR_COPY, GEAR_MULT, isGearItem, multBadge, type PetId } from './gear';
import { assignPetGun, usePetGuns } from './pet-guns';

const BUTTON_ART_SIZE = 22;
const MENU_ART_SIZE = 30;

interface PetGunPickerProps {
  pet: PetId;
  name: string;
}

export function PetGunPicker({ pet, name }: PetGunPickerProps) {
  const { items } = useInventory();
  const guns = usePetGuns();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const owned = items.map((i) => i.id).filter(isGearItem);
  const current = guns[pet] && owned.includes(guns[pet]) ? guns[pet] : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  if (owned.length === 0) return null;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div ref={rootRef} data-hud data-testid={`${pet}-gun-picker`} className="pointer-events-auto relative" onPointerDown={stop} onClick={stop}>
      <button
        type="button"
        data-testid={`${pet}-gun-toggle`}
        aria-expanded={open}
        aria-label={GEAR_COPY.pick(name)}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 cursor-pointer touch-manipulation items-center gap-1 rounded-full bg-black/70 pl-1.5 pr-2 text-xs font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.15)] transition-colors hover:bg-black/85"
      >
        {current ? <ItemArt id={current} size={BUTTON_ART_SIZE} /> : <span className="whitespace-nowrap px-1 text-white/60">{GEAR_COPY.none}</span>}
        {current && <span className="tabular-nums text-[#7cf0a8]">{multBadge(GEAR_MULT[current])}</span>}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={`transition-transform ${open ? '' : 'rotate-180'}`}>
          <path d="M1.5 6.5 L5 3 L8.5 6.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" data-testid={`${pet}-gun-menu`} className="absolute bottom-full left-1/2 mb-2 flex min-w-[170px] -translate-x-1/2 flex-col gap-0.5 rounded-xl bg-black/85 p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md">
          {owned.map((gun) => (
            <button
              key={gun}
              type="button"
              role="menuitemradio"
              aria-checked={gun === current}
              data-testid={`${pet}-gun-${gun}`}
              onClick={() => {
                assignPetGun(pet, gun);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left text-sm font-semibold text-white transition-colors hover:bg-white/15 ${gun === current ? 'bg-white/10' : ''}`}
            >
              <ItemArt id={gun} size={MENU_ART_SIZE} />
              <span className="flex-1 whitespace-nowrap">{labelFor(gun)}</span>
              <span className="tabular-nums text-[#7cf0a8]">{multBadge(GEAR_MULT[gun])}</span>
            </button>
          ))}
          {current && (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={false}
              data-testid={`${pet}-gun-none`}
              onClick={() => {
                assignPetGun(pet, null);
                setOpen(false);
              }}
              className="cursor-pointer rounded-lg px-2 py-1 text-left text-sm text-white/60 transition-colors hover:bg-white/15"
            >
              {GEAR_COPY.none}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
