'use client';

import { useEffect } from 'react';

const POLL_MS = 100;
const GIVE_UP_MS = 20_000;

interface StartBridge {
  setScore?: (n: number) => void;
  boost: (n: number) => void;
  forceScene?: (name: string) => void;
}

interface TestStartMarkerProps {
  start: number;
  scene?: string;
}

export function TestStartMarker({ start, scene }: TestStartMarkerProps) {
  useEffect(() => {
    const began = performance.now();
    const id = setInterval(() => {
      const bridge = (window as unknown as { __chicken?: StartBridge }).__chicken;
      if (!bridge) {
        if (performance.now() - began > GIVE_UP_MS) clearInterval(id);
        return;
      }
      clearInterval(id);
      if (bridge.setScore) {
        bridge.setScore(Math.max(0, start - 1));
        bridge.boost(1);
        if (scene) bridge.forceScene?.(scene);
      } else {
        bridge.boost(start);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [start, scene]);
  return null;
}
