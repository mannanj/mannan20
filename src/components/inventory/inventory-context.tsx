'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FlyToBag, type Point } from './fly-to-bag';
import {
  INVENTORY_STORAGE_KEY,
  labelFor,
  maxFor,
  parseStoredItems,
  type InventoryItem,
} from './items';

interface Flight {
  key: number;
  itemId: string;
  from: Point;
}

interface InventoryContextValue {
  items: InventoryItem[];
  hydrated: boolean;
  bounceKey: number;
  lastAdded: { id: string; label: string; key: number } | null;
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  use: (id: string) => void;
  grant: (id: string, from?: Point) => void;
}

interface InventoryProviderProps {
  children: ReactNode;
  onUse?: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children, onUse }: InventoryProviderProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bounceKey, setBounceKey] = useState(0);
  const [lastAdded, setLastAdded] = useState<InventoryContextValue['lastAdded']>(null);
  const flightKeyRef = useRef(0);
  const onUseRef = useRef(onUse);
  onUseRef.current = onUse;

  useEffect(() => {
    try {
      setItems(parseStoredItems(localStorage.getItem(INVENTORY_STORAGE_KEY)));
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback((id: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        if (existing.count >= maxFor(id)) return prev;
        return prev.map((i) => (i.id === id ? { ...i, count: i.count + 1 } : i));
      }
      return [...prev, { id, label: labelFor(id), count: 1 }];
    });
    setBounceKey((k) => k + 1);
    setLastAdded((prev) => ({ id, label: labelFor(id), key: (prev?.key ?? 0) + 1 }));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, count: i.count - 1 } : i)).filter((i) => i.count > 0)
    );
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id && i.count > 0), [items]);

  const use = useCallback((id: string) => {
    onUseRef.current?.(id);
  }, []);

  const grant = useCallback((id: string, from?: Point) => {
    const origin = from ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    flightKeyRef.current += 1;
    setFlights((prev) => [...prev, { key: flightKeyRef.current, itemId: id, from: origin }]);
  }, []);

  const landFlight = useCallback(
    (flight: Flight) => {
      setFlights((prev) => prev.filter((f) => f.key !== flight.key));
      add(flight.itemId);
    },
    [add]
  );

  const value = useMemo(
    () => ({ items, hydrated, bounceKey, lastAdded, add, remove, has, use, grant }),
    [items, hydrated, bounceKey, lastAdded, add, remove, has, use, grant]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
      {flights.map((flight) => (
        <FlyToBag
          key={flight.key}
          itemId={flight.itemId}
          from={flight.from}
          onDone={() => landFlight(flight)}
        />
      ))}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside InventoryProvider');
  return ctx;
}
