'use client';

import { useEffect, useState, type RefObject } from 'react';
import { multLabel, type GunHolder } from './gear';
import type { GearControl } from './gear-layer';

const MULT_POLL_MS = 250;

export function useHelperMult(gearRef: RefObject<GearControl | null>, holder: GunHolder, enabled: boolean): number {
  const [mult, setMult] = useState(1);
  useEffect(() => {
    if (!enabled) return;
    const read = () => setMult(gearRef.current?.mult(holder) ?? 1);
    read();
    const id = window.setInterval(read, MULT_POLL_MS);
    return () => window.clearInterval(id);
  }, [gearRef, holder, enabled]);
  return enabled ? mult : 1;
}

export function HelperMult({ mult, testId }: { mult: number; testId: string }) {
  return (
    <span data-testid={testId} className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 text-sm font-bold tabular-nums text-[#ffd84d]">
      {multLabel(mult)}
    </span>
  );
}
