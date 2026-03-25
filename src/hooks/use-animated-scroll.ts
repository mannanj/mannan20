'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';

export function useAnimatedScroll() {
  const rafRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scrollTo = useCallback((targetY: number, duration: number) => {
    cancel();
    const scrollStart = window.scrollY;
    const scrollDelta = targetY - scrollStart;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      window.scrollTo(0, scrollStart + scrollDelta * ease);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ scrollTo, cancel }), [scrollTo, cancel]);
}
