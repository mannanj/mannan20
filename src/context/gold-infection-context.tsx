'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';

export type GoldPhase = 'idle' | 'spreading' | 'retracting';

export interface GoldInfectionState {
  originX: number;
  originY: number;
  phase: GoldPhase;
  radius: number;
  intensity: number;
}

interface GoldInfectionContextValue {
  stateRef: MutableRefObject<GoldInfectionState>;
  enterScene: (x: number, y: number) => void;
  moveInScene: (x: number, y: number) => void;
  leaveScene: () => void;
  subscribe: (fn: () => void) => () => void;
}

const GoldInfectionContext = createContext<GoldInfectionContextValue | null>(null);

const MAX_RADIUS = 2600;
const SPREAD_RATE = 4.5;
const RETRACT_DECAY = 0.98;
const RETRACT_FLOOR_PULL = 0.67;

export function GoldInfectionProvider({ children }: { children: React.ReactNode }) {
  const stateRef = useRef<GoldInfectionState>({
    originX: 0,
    originY: 0,
    phase: 'idle',
    radius: 0,
    intensity: 0,
  });
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const root = document.documentElement;

    const tick = () => {
      const s = stateRef.current;

      if (s.phase === 'spreading') {
        s.radius = Math.min(s.radius + SPREAD_RATE, MAX_RADIUS);
        s.intensity = Math.min(s.intensity + 0.0175, 1);
      } else if (s.phase === 'retracting') {
        s.radius = Math.max(s.radius * RETRACT_DECAY - RETRACT_FLOOR_PULL, 0);
        s.intensity = s.radius / MAX_RADIUS;
        if (s.radius <= 0.5) {
          s.radius = 0;
          s.intensity = 0;
          s.phase = 'idle';
        }
      }

      root.style.setProperty('--gx', `${s.originX - window.scrollX}px`);
      root.style.setProperty('--gy', `${s.originY - window.scrollY}px`);
      root.style.setProperty('--gr', `${s.radius}px`);
      root.style.setProperty('--gi', `${s.intensity}`);

      for (const fn of subscribersRef.current) fn();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      root.style.removeProperty('--gx');
      root.style.removeProperty('--gy');
      root.style.removeProperty('--gr');
      root.style.removeProperty('--gi');
    };
  }, []);

  const enterScene = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    s.originX = x + window.scrollX;
    s.originY = y + window.scrollY;
    s.phase = 'spreading';
  }, []);

  const moveInScene = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    s.originX = x + window.scrollX;
    s.originY = y + window.scrollY;
  }, []);

  const leaveScene = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'spreading') s.phase = 'retracting';
  }, []);

  const subscribe = useCallback((fn: () => void) => {
    subscribersRef.current.add(fn);
    return () => {
      subscribersRef.current.delete(fn);
    };
  }, []);

  const value = useMemo<GoldInfectionContextValue>(
    () => ({ stateRef, enterScene, moveInScene, leaveScene, subscribe }),
    [enterScene, moveInScene, leaveScene, subscribe],
  );

  return <GoldInfectionContext.Provider value={value}>{children}</GoldInfectionContext.Provider>;
}

export function useGoldInfection(): GoldInfectionContextValue {
  const ctx = useContext(GoldInfectionContext);
  if (!ctx) throw new Error('useGoldInfection must be used within <GoldInfectionProvider>');
  return ctx;
}

export function useOptionalGoldInfection(): GoldInfectionContextValue | null {
  return useContext(GoldInfectionContext);
}
