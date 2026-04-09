'use client';

import { createContext, useContext } from 'react';
import type { CanvasStore, CanvasStoreState } from './lib/create-canvas-store';

export interface CanvasConfig {
  apiBasePath: string;
  sessionCookieName: string;
  cookiePath: string;
  testIdPrefix: string;
  documentLabel: string;
  initialNode: {
    id: string;
    position: { x: number; y: number };
    data: { label: string };
  };
}

interface CanvasContextValue {
  store: CanvasStore;
  config: CanvasConfig;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({
  store,
  config,
  children,
}: {
  store: CanvasStore;
  config: CanvasConfig;
  children: React.ReactNode;
}) {
  return (
    <CanvasContext.Provider value={{ store, config }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasStore<T>(selector: (state: CanvasStoreState) => T): T {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvasStore must be used within CanvasProvider');
  return ctx.store(selector);
}

export function useCanvasStoreApi(): CanvasStore {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvasStoreApi must be used within CanvasProvider');
  return ctx.store;
}

export function useCanvasConfig(): CanvasConfig {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvasConfig must be used within CanvasProvider');
  return ctx.config;
}
