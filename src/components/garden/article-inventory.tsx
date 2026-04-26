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
  replace: (next: InventoryItem[]) => void;
};

const InventoryContext = createContext<InventoryCtx | null>(null);

const STORAGE_KEY = "article-inventory-v1";
const ITEM_MAX: Record<string, number> = {
  "easter-egg": 12,
  "id-card": 1,
};
const DEFAULT_MAX = 12;
const maxFor = (id: string) => ITEM_MAX[id] ?? DEFAULT_MAX;
const SHOW_MAX_LABEL: Set<string> = new Set(["easter-egg"]);

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
        if (existing.count >= maxFor(item.id)) return prev;
        return prev.map((i) =>
          i.id === item.id ? { ...i, count: i.count + 1 } : i,
        );
      }
      return [...prev, { id: item.id, label: item.label, count: 1 }];
    });
  }, []);

  const replace = useCallback((next: InventoryItem[]) => {
    setItems(next);
  }, []);

  return (
    <InventoryContext.Provider
      value={{ items, hydrated, countOf, add, replace }}
    >
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

function IdCardArt({
  width,
  height,
  rotate = 0,
  glow = true,
}: {
  width: number;
  height: number;
  rotate?: number;
  glow?: boolean;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      style={{
        transform: `rotate(${rotate}deg)`,
        filter: glow
          ? "drop-shadow(0 0 3px rgba(255,225,140,0.9)) drop-shadow(0 0 6px rgba(255,200,80,0.55))"
          : "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
        overflow: "visible",
      }}
    >
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="15"
        rx="1.6"
        fill="#fef9e6"
        stroke="#7a4a16"
        strokeWidth="0.6"
      />
      <rect
        x="2"
        y="2.4"
        width="6"
        height="7"
        rx="0.5"
        fill="#b48050"
        opacity="0.7"
      />
      <circle cx="5" cy="5" r="1.2" fill="#7a4a16" opacity="0.55" />
      <path
        d="M2.6 9.1 Q5 7.2 7.4 9.1"
        fill="#7a4a16"
        opacity="0.55"
      />
      <line x1="9.5" y1="3.2" x2="22" y2="3.2" stroke="#7a4a16" strokeWidth="0.7" opacity="0.55" />
      <line x1="9.5" y1="5.2" x2="20" y2="5.2" stroke="#7a4a16" strokeWidth="0.55" opacity="0.45" />
      <line x1="9.5" y1="7.2" x2="22" y2="7.2" stroke="#7a4a16" strokeWidth="0.55" opacity="0.45" />
      <line x1="2" y1="11.3" x2="22" y2="11.3" stroke="#7a4a16" strokeWidth="0.4" opacity="0.35" />
      <line x1="2" y1="13" x2="22" y2="13" stroke="#7a4a16" strokeWidth="0.4" opacity="0.35" />
    </svg>
  );
}

function MiniIdCard({ size }: { size: number }) {
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: size, height: Math.round((size * 2) / 3) }}
    >
      <IdCardArt width={size} height={Math.round((size * 2) / 3)} glow={false} />
    </span>
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
  if (eggCount >= maxFor("easter-egg")) return null;
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

export function IdCardCollectible({ rotate = -78 }: { rotate?: number }) {
  const { countOf, add, hydrated } = useInventory();
  const [hover, setHover] = useState(false);
  const [flyFrom, setFlyFrom] = useState<DOMRect | null>(null);
  const [sessionCollected, setSessionCollected] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const idCount = countOf("id-card");

  if (!hydrated) return null;
  if (idCount >= maxFor("id-card")) return null;
  if (sessionCollected && !flyFrom) return null;

  const handleClick = () => {
    if (!buttonRef.current || flyFrom) return;
    setFlyFrom(buttonRef.current.getBoundingClientRect());
    setHover(false);
  };

  const W = 17;
  const H = 11;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={!!flyFrom}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={handleClick}
        aria-label="ID card — tap to claim"
        data-testid="id-card"
        className="absolute z-10 cursor-pointer p-1 -m-1 group"
        style={{
          visibility: flyFrom ? "hidden" : "visible",
          width: W,
          height: H,
        }}
      >
        <span
          className="block relative"
          style={{ width: W, height: H }}
        >
          <IdCardArt width={W} height={H} rotate={rotate} glow />
        </span>
        {hover && (
          <span
            role="tooltip"
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-center text-[10px] px-2 py-1 rounded bg-black/90 text-white pointer-events-none whitespace-nowrap leading-tight"
          >
            <span className="block">ID Card</span>
            <span className="block">Tap to claim</span>
          </span>
        )}
      </button>
      {flyFrom && (
        <FlyingIdCard
          from={flyFrom}
          rotate={rotate}
          onDone={() => {
            add({ id: "id-card", label: "ID Card" });
            setSessionCollected(true);
            setFlyFrom(null);
          }}
        />
      )}
    </>
  );
}

function FlyingIdCard({
  from,
  rotate,
  onDone,
}: {
  from: DOMRect;
  rotate: number;
  onDone: () => void;
}) {
  const targetX = window.innerWidth - 24 - 20;
  const targetY = window.innerHeight - 24 - 20;
  const dx = targetX - (from.left + from.width / 2);
  const dy = targetY - (from.top + from.height / 2);
  const ctrlX = dx * 0.4;
  const ctrlY = -120;
  const W = 17;
  const H = 11;

  return createPortal(
    <div
      onAnimationEnd={onDone}
      style={{
        position: "fixed",
        left: from.left + from.width / 2 - W / 2,
        top: from.top + from.height / 2 - H / 2,
        width: W,
        height: H,
        zIndex: 200,
        pointerEvents: "none",
        offsetPath: `path('M 0 0 Q ${ctrlX} ${ctrlY} ${dx} ${dy}')`,
        offsetRotate: "0deg",
        animation: "eggFly 1.6s linear forwards",
      }}
    >
      <IdCardArt width={W} height={H} rotate={rotate} glow />
    </div>,
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
      <path d="M16 7 Q20 5 24 7 L24 11 L16 11 Z" fill="#3a1c08" />
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
  const { replace } = useInventory();
  const [panelSize, setPanelSize] = useState({ w: 180, h: 90 });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<InventoryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setDropdownOpen(false);
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    setDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((txt) => {
        const parsed = JSON.parse(txt);
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        const valid = parsed.every(
          (i) =>
            i &&
            typeof i.id === "string" &&
            typeof i.label === "string" &&
            typeof i.count === "number",
        );
        if (!valid) throw new Error("Invalid item shape");
        setConfirmLoad(parsed as InventoryItem[]);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Could not read file");
      })
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const confirmLoadApply = () => {
    if (confirmLoad) replace(confirmLoad);
    setConfirmLoad(null);
  };

  const W = 320;
  const H = 240;
  const PANEL_LEFT = 90;
  const PANEL_BOTTOM_FROM_BOTTOM = 80;
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
        className="absolute text-white text-[11px] leading-snug bg-black/85 rounded-md px-2 py-1"
        style={{
          left: PANEL_LEFT,
          bottom: PANEL_BOTTOM_FROM_BOTTOM,
          width: "max-content",
          maxWidth: 240,
          zIndex: 20,
        }}
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              {item.id === "easter-egg" ? (
                <MiniEgg size={9} />
              ) : item.id === "id-card" ? (
                <MiniIdCard size={14} />
              ) : (
                <span className="text-amber-300/80">•</span>
              )}
              <span>
                {item.label}
                {maxFor(item.id) > 1 && (
                  <>
                    {" "}
                    {item.count >= maxFor(item.id) &&
                    SHOW_MAX_LABEL.has(item.id)
                      ? `(${maxFor(item.id)}) (max)`
                      : `x${item.count}`}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-white/70 leading-relaxed">
          Items grant perks and privileges.
        </p>
        <div className="mt-1.5 relative pointer-events-auto inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            className="inline-flex items-center gap-1 text-[10px] text-[#039be5] hover:text-[#4fc3f7] underline-offset-2 hover:underline cursor-pointer"
          >
            Manage inventory
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{
                transform: dropdownOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <path
                d="M1 2 L4 6 L7 2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {dropdownOpen && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 flex flex-col bg-black/95 rounded overflow-hidden"
              style={{ zIndex: 5 }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleSave}
                className="whitespace-nowrap text-left text-[10px] text-[#039be5] hover:text-[#4fc3f7] hover:bg-white/5 px-2 py-1 cursor-pointer"
              >
                Save inventory
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLoadClick}
                className="whitespace-nowrap text-left text-[10px] text-[#039be5] hover:text-[#4fc3f7] hover:bg-white/5 px-2 py-1 cursor-pointer"
              >
                Load inventory
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {createPortal(
        <Modal
          isOpen={confirmLoad !== null}
          onClose={() => setConfirmLoad(null)}
        >
          <div className="text-white p-2 min-w-[300px]">
            <h3 className="text-lg font-medium mb-2">Load inventory?</h3>
            <p className="text-white/70 text-sm mb-4">
              This will replace your current inventory. Any unsaved progress
              will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmLoad(null)}
                className="text-sm px-3 py-1.5 rounded text-white/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLoadApply}
                className="text-sm px-3 py-1.5 rounded bg-[#039be5] hover:bg-[#4fc3f7] text-white cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </Modal>,
        document.body,
      )}
      {createPortal(
        <Modal isOpen={loadError !== null} onClose={() => setLoadError(null)}>
          <div className="text-white p-2 min-w-[280px]">
            <h3 className="text-lg font-medium mb-2">
              Couldn&apos;t load file
            </h3>
            <p className="text-white/70 text-sm">
              That file isn&apos;t a valid inventory export.
            </p>
          </div>
        </Modal>,
        document.body,
      )}
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
