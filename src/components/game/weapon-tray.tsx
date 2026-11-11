'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useInventory } from '@/components/inventory';
import { ItemArt } from '@/components/inventory/item-art';
import { labelFor } from '@/components/inventory/items';
import { GEAR_HOLDER_ATTR, GEAR_MULT, isGearItem, multLabel, type GearId, type GunHolder } from './gear';

const TRAY_ART_SIZE = 34;
const DRAG_ART_SIZE = 48;
const DRAG_START_PX = 6;
const HOLDERS: GunHolder[] = ['jev', 'monkey'];

interface WeaponTrayProps {
  onGive: (id: GearId, holder: GunHolder) => void;
  onUse: (id: GearId) => void;
}

interface Drag {
  id: GearId;
  x: number;
  y: number;
  moved: boolean;
}

function holderAt(x: number, y: number): GunHolder | null {
  const el = document.elementFromPoint(x, y)?.closest(`[${GEAR_HOLDER_ATTR}]`);
  const holder = el?.getAttribute(GEAR_HOLDER_ATTR);
  return HOLDERS.find((h) => h === holder) ?? null;
}

export function WeaponTray({ onGive, onUse }: WeaponTrayProps) {
  const { items } = useInventory();
  const [drag, setDrag] = useState<Drag | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const weapons = items.map((i) => i.id).filter(isGearItem);
  if (weapons.length === 0) return null;

  const down = (id: GearId) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ id, x: e.clientX, y: e.clientY, moved: false });
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) > DRAG_START_PX;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!drag) return;
    setDrag(null);
    if (!drag.moved) return onUse(drag.id);
    const holder = holderAt(e.clientX, e.clientY);
    if (holder) onGive(drag.id, holder);
  };

  return (
    <>
      <div data-testid="weapon-tray" data-hud className="fixed bottom-6 right-[84px] z-[100] flex items-center gap-1.5 rounded-xl bg-black/45 p-1.5 backdrop-blur-sm">
        {weapons.map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`weapon-${id}`}
            title={`${labelFor(id)} · ${multLabel(GEAR_MULT[id])}`}
            onPointerDown={down(id)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => setDrag(null)}
            onClick={(e) => e.stopPropagation()}
            className="flex cursor-grab touch-none items-center justify-center rounded-lg bg-white/10 p-1 transition-colors hover:bg-white/20 active:cursor-grabbing"
          >
            <ItemArt id={id} size={TRAY_ART_SIZE} />
          </button>
        ))}
      </div>
      {drag?.moved && (
        <div data-testid="weapon-drag" className="pointer-events-none fixed z-[120] -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <ItemArt id={drag.id} size={DRAG_ART_SIZE} />
        </div>
      )}
    </>
  );
}
