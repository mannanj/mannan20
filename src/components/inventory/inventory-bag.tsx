'use client';

import { useEffect, useRef, useState } from 'react';
import { BagIcon } from './bag-icon';
import { useInventory } from './inventory-context';
import { ItemArt } from './item-art';
import { ITEM_DRAG_TYPE, definitionFor } from './items';

const BAG_SIZE = 40;
const ROW_ART_SIZE = 28;
const TOOLTIP_MS = 3000;
const BOUNCE_MS = 250;
const BOUNCE_PEAK = 1.15;

interface InventoryBagProps {
  forceClosed?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InventoryBag({ forceClosed = false, onOpenChange }: InventoryBagProps = {}) {
  const { items, hydrated, bounceKey, lastAdded, use } = useInventory();
  const [open, setOpen] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (forceClosed) setOpen(false);
  }, [forceClosed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    onOpenChangeRef.current?.(open);
  }, [open]);
  const [hover, setHover] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const bagRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (bounceKey === 0) return;
    bagRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${BOUNCE_PEAK})` }, { transform: 'scale(1)' }],
      { duration: BOUNCE_MS, easing: 'ease-out' }
    );
  }, [bounceKey]);

  useEffect(() => {
    if (!lastAdded) return;
    setTooltip(lastAdded.label);
    const id = setTimeout(() => setTooltip(null), TOOLTIP_MS);
    return () => clearTimeout(id);
  }, [lastAdded]);

  if (!hydrated) return null;

  const showLabel = tooltip !== null || hover || open;

  return (
    <div className="fixed bottom-6 right-6 z-[100]" data-testid="inventory-root">
      {open && (
        <div
          data-testid="inventory-panel"
          className="absolute bottom-12 right-0 flex max-h-[60vh] w-56 flex-col gap-1 overflow-y-auto rounded-xl border border-[#2a1305] bg-[#2a1708]/95 p-2 text-[#f3e3c7] shadow-xl backdrop-blur-md"
        >
          {items.length === 0 && <div className="px-2 py-3 text-center text-xs text-[#f3e3c7]/60">Empty</div>}
          {items.map((item) => {
            const usable = definitionFor(item.id)?.usable ?? false;
            return (
              <div
                key={item.id}
                data-testid={`inventory-item-${item.id}`}
                draggable={definitionFor(item.id)?.draggable ?? false}
                onDragStart={(e) => e.dataTransfer.setData(ITEM_DRAG_TYPE, item.id)}
                className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5"
              >
                <ItemArt id={item.id} size={ROW_ART_SIZE} />
                <span className="flex-1 text-xs font-medium">{item.label}</span>
                <span data-testid={`inventory-count-${item.id}`} className="text-xs tabular-nums text-[#f3e3c7]/70">
                  x{item.count}
                </span>
                {usable && (
                  <button
                    type="button"
                    onClick={() => use(item.id)}
                    data-testid={`inventory-use-${item.id}`}
                    className="cursor-pointer rounded-md bg-[#8a4a22] px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-[#a35a2a]"
                  >
                    Use
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button
        ref={bagRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={open ? 'Close inventory' : 'Open inventory'}
        aria-expanded={open}
        data-testid="inventory-bag"
        className={`relative block cursor-pointer transition-transform duration-300 ${
          open ? 'scale-[1.08]' : 'scale-[0.9] hover:scale-[1.08]'
        }`}
      >
        <BagIcon size={BAG_SIZE} />
        {items.length > 0 && (
          <span
            data-testid="inventory-total"
            className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#f3e3c7] px-1 text-center text-[10px] font-semibold leading-4 text-[#2a1305]"
          >
            {items.reduce((sum, i) => sum + i.count, 0)}
          </span>
        )}
      </button>
      {showLabel && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-9 right-0 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-center text-[11px] leading-tight text-white"
        >
          {tooltip ? <span className="font-medium text-amber-200">{tooltip} +1</span> : 'Inventory'}
        </span>
      )}
    </div>
  );
}
