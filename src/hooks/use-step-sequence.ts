'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';

interface Step {
  duration: number;
  action: () => void;
}

export function useStepSequence() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const run = useCallback((steps: Step[]) => {
    cancel();
    let index = 0;

    const advance = () => {
      if (index >= steps.length) {
        timeoutRef.current = null;
        return;
      }
      const step = steps[index];
      index++;
      step.action();
      timeoutRef.current = setTimeout(advance, step.duration);
    };

    advance();
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ run, cancel }), [run, cancel]);
}
