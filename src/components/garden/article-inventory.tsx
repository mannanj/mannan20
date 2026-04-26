"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Modal } from "../modal";

type InventoryItem = { id: string; label: string; count: number };

type InventoryCtx = {
  items: InventoryItem[];
  hydrated: boolean;
  countOf: (id: string) => number;
  add: (item: { id: string; label: string }) => void;
};

const InventoryContext = createContext<InventoryCtx | null>(null);

const STORAGE_KEY = "article-inventory-v1";
const MAX_COUNT = 12;

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const countOf = useCallback(
    (id: string) => items.find((i) => i.id === id)?.count ?? 0,
    [items],
  );

  const add = useCallback((item: { id: string; label: string }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        if (existing.count >= MAX_COUNT) return prev;
        return prev.map((i) =>
          i.id === item.id ? { ...i, count: i.count + 1 } : i,
        );
      }
      return [...prev, { id: item.id, label: item.label, count: 1 }];
    });
  }, []);

  return (
    <InventoryContext.Provider value={{ items, hydrated, countOf, add }}>
      {children}
      <InventoryBag />
    </InventoryContext.Provider>
  );
}

function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside InventoryProvider");
  return ctx;
}

const EGG_GRADIENT =
  "linear-gradient(135deg, #5eead4 0%, #f9a8d4 50%, #fde68a 100%)";
const EGG_SHADOW =
  "0 1px 3px rgba(0,0,0,0.2), inset -1px -2px 3px rgba(0,0,0,0.08), inset 1px 1px 3px rgba(255,255,255,0.4)";
const EGG_RADIUS = "50% 50% 50% 50% / 60% 60% 40% 40%";

function MiniEgg({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{
        width: size,
        height: Math.round((size * 4) / 3),
        background: EGG_GRADIENT,
        borderRadius: EGG_RADIUS,
        boxShadow: EGG_SHADOW,
      }}
    />
  );
}

export function EasterEgg() {
  const { countOf, add, hydrated } = useInventory();
  const [hover, setHover] = useState(false);
  const [flyFrom, setFlyFrom] = useState<DOMRect | null>(null);
  const [sessionCollected, setSessionCollected] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const eggCount = countOf("easter-egg");

  if (!hydrated) return null;
  if (eggCount >= MAX_COUNT) return null;
  if (sessionCollected && !flyFrom) return null;

  const handleClick = () => {
    if (!buttonRef.current || flyFrom) return;
    setFlyFrom(buttonRef.current.getBoundingClientRect());
    setHover(false);
  };

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={buttonRef}
        type="button"
        disabled={!!flyFrom}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={handleClick}
        aria-label="Easter egg — tap to claim"
        data-testid="easter-egg"
        className="relative inline-flex items-center justify-center p-3 -m-2 cursor-pointer group"
        style={{ visibility: flyFrom ? "hidden" : "visible" }}
      >
        <span
          className="block"
          style={{
            animation: "eggPulse 3.5s ease-in-out infinite",
            transformOrigin: "center",
          }}
        >
          <span
            className="block w-[12px] h-[16px] transition-transform duration-300 group-hover:scale-150"
            style={{
              background: EGG_GRADIENT,
              borderRadius: EGG_RADIUS,
              boxShadow: EGG_SHADOW,
              animation: "spin 11.5s linear infinite",
            }}
          />
        </span>
      </button>
      {hover && !flyFrom && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-center text-[11px] px-2 py-1 rounded bg-black/85 text-white pointer-events-none z-20 leading-tight"
        >
          <span className="block whitespace-nowrap">Easter egg</span>
          <span className="block whitespace-nowrap">Tap to claim</span>
        </span>
      )}
      {flyFrom && (
        <FlyingEgg
          from={flyFrom}
          onDone={() => {
            add({ id: "easter-egg", label: "Egg" });
            setSessionCollected(true);
            setFlyFrom(null);
          }}
        />
      )}
    </span>
  );
}

function FlyingEgg({
  from,
  onDone,
}: {
  from: DOMRect;
  onDone: () => void;
}) {
  const targetX = window.innerWidth - 24 - 20;
  const targetY = window.innerHeight - 24 - 20;
  const dx = targetX - (from.left + from.width / 2);
  const dy = targetY - (from.top + from.height / 2);
  const ctrlX = dx * 0.4;
  const ctrlY = -120;

  return createPortal(
    <div
      onAnimationEnd={onDone}
      data-testid="flying-egg"
      style={{
        position: "fixed",
        left: from.left + from.width / 2 - 6,
        top: from.top + from.height / 2 - 8,
        width: 12,
        height: 16,
        background: EGG_GRADIENT,
        borderRadius: EGG_RADIUS,
        boxShadow: EGG_SHADOW,
        zIndex: 200,
        pointerEvents: "none",
        offsetPath: `path('M 0 0 Q ${ctrlX} ${ctrlY} ${dx} ${dy}')`,
        offsetRotate: "0deg",
        animation: "eggFly 1.6s linear forwards",
      }}
    />,
    document.body,
  );
}

function BagIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bagBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3a16" />
          <stop offset="1" stopColor="#4a230d" />
        </linearGradient>
        <linearGradient id="bagFlap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4a22" />
          <stop offset="1" stopColor="#5a2c12" />
        </linearGradient>
      </defs>
      <path
        d="M16 7 Q20 5 24 7 L24 11 L16 11 Z"
        fill="#3a1c08"
      />
      <path
        d="M6 19 Q6 14 12 13 Q20 11 28 13 Q34 14 34 19 L36 28 Q36 36 28 36 Q20 38 12 36 Q4 36 4 28 Z"
        fill="url(#bagBody)"
        stroke="#2a1305"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 14 Q8 9 14 8 Q20 7 26 8 Q32 9 32 14 L33 22 Q33 25 30 26 Q20 28 10 26 Q7 25 7 22 Z"
        fill="url(#bagFlap)"
        stroke="#2a1305"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 22 L19 33 M20 22 L21 33"
        stroke="#2a1305"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <circle cx="20" cy="22" r="1.4" fill="#2a1305" />
      <path
        d="M10 12 Q14 10 20 10 Q26 10 30 12"
        fill="none"
        stroke="#3a1c08"
        strokeWidth="0.5"
        opacity="0.6"
      />
    </svg>
  );
}

function InventoryBag() {
  const { items, hydrated } = useInventory();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [addedLabel, setAddedLabel] = useState<string | null>(null);
  const prevTotal = useRef<number | null>(null);

  const total = items.reduce((sum, i) => sum + i.count, 0);

  useEffect(() => {
    if (!hydrated) return;
    if (prevTotal.current === null) {
      prevTotal.current = total;
      return;
    }
    if (total > prevTotal.current) {
      const newest = items[items.length - 1];
      setAddedLabel(newest?.label ?? null);
      prevTotal.current = total;
      const t = setTimeout(() => setAddedLabel(null), 3000);
      return () => clearTimeout(t);
    }
    prevTotal.current = total;
  }, [total, items, hydrated]);

  if (!hydrated) return null;
  if (items.length === 0) return null;

  const showLabel = !!addedLabel || hover || open;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100]">
      {open && <InventoryHud items={items} />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={open ? "Close inventory" : "Open inventory"}
        data-testid="inventory-bag"
        className={`relative block transition-transform duration-300 cursor-pointer ${
          open ? "scale-[1.08]" : "scale-[0.9] hover:scale-[1.08]"
        }`}
      >
        <BagIcon size={40} />
      </button>
      {showLabel && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 text-center text-[11px] px-2 py-1 rounded bg-black/85 text-white pointer-events-none leading-tight"
          style={{ bottom: 36 }}
        >
          {addedLabel ? (
            <span className="whitespace-nowrap font-medium text-amber-200">
              {addedLabel} +1
            </span>
          ) : (
            <span className="whitespace-nowrap">Inventory</span>
          )}
        </span>
      )}
    </div>,
    document.body,
  );
}

function InventoryHud({ items }: { items: InventoryItem[] }) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [panelSize, setPanelSize] = useState({ w: 180, h: 90 });
  const panelRef = useRef<HTMLDivElement>(null);

  const W = 320;
  const H = 240;
  const PANEL_LEFT = 90;
  const PANEL_BOTTOM_FROM_BOTTOM = 36;
  const PANEL_BOTTOM_Y = H - PANEL_BOTTOM_FROM_BOTTOM;
  const BAG_EXIT_X = W - 36;
  const BAG_EXIT_Y = H - 18;

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPanelSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const END_X = PANEL_LEFT + panelSize.w / 2;
  const END_Y = PANEL_BOTTOM_Y;
  const dx = END_X - BAG_EXIT_X;
  const dy = END_Y - BAG_EXIT_Y;
  const leg1Angle = (5 * Math.PI) / 180;
  const cosA = Math.cos(leg1Angle);
  const sinA = Math.sin(leg1Angle);
  const denom = 2 * (cosA * dx + sinA * dy);
  const legLen = denom !== 0 ? -(dx * dx + dy * dy) / denom : 60;
  const BEND_X = BAG_EXIT_X - legLen * cosA;
  const BEND_Y = BAG_EXIT_Y - legLen * sinA;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ right: 0, bottom: 0, width: W, height: H }}
    >
      <div
        ref={panelRef}
        className="absolute text-white text-[11px] leading-snug bg-black/85 px-3 py-2 rounded"
        style={{
          left: PANEL_LEFT,
          bottom: PANEL_BOTTOM_FROM_BOTTOM,
          width: "max-content",
          maxWidth: 240,
          zIndex: 1,
        }}
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              {item.id === "easter-egg" ? (
                <MiniEgg size={9} />
              ) : (
                <span className="text-amber-300/80">•</span>
              )}
              <span>
                {item.label}{" "}
                {item.count >= MAX_COUNT
                  ? `(${MAX_COUNT}) (max)`
                  : `x${item.count}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-white/70 leading-relaxed">
          Items grant perks and privileges.
        </p>
        <button
          type="button"
          onClick={() => setSaveModalOpen(true)}
          className="mt-1.5 text-[10px] text-[#039be5] hover:text-[#4fc3f7] underline-offset-2 hover:underline pointer-events-auto cursor-pointer"
        >
          Save inventory
        </button>
      </div>
      <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)}>
        <div className="text-white p-2 min-w-[280px]">
          <h3 className="text-lg font-medium mb-2">Save inventory</h3>
          <p className="text-white/70 text-sm">To be added soon.</p>
        </div>
      </Modal>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          zIndex: 10,
        }}
        aria-hidden="true"
      >
        <polyline
          points={`${BAG_EXIT_X},${BAG_EXIT_Y} ${BEND_X},${BEND_Y} ${END_X},${END_Y}`}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
