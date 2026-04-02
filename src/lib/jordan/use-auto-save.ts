'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useJordanStore } from './store';

const SAVE_DEBOUNCE_MS = 2000;

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = useJordanStore.subscribe((state, prevState) => {
      if (!initializedRef.current) return;

      const changed =
        state.nodes !== prevState.nodes ||
        state.edges !== prevState.edges ||
        state.viewport !== prevState.viewport;

      if (!changed) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const { nodes, edges, viewport } = useJordanStore.getState();
        fetch('/api/jordan/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges, viewport }),
        }).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const markInitialized = useCallback(() => {
    initializedRef.current = true;
  }, []);

  return { markInitialized };
}
