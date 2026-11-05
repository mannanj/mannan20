'use client';

import { useEffect, useRef } from 'react';

export type CameoKind = 'hawk' | 'eagle';

export const BIRD_CAMEO_SCORE: Record<CameoKind, number> = { hawk: 200, eagle: 600 };
const CAMEO_MS = 10_000;
const CAMEO_WIDTH: Record<CameoKind, number> = { hawk: 64, eagle: 110 };

export function cameoForScore(prev: number, next: number): CameoKind | null {
  for (const kind of ['hawk', 'eagle'] as const) {
    if (prev < BIRD_CAMEO_SCORE[kind] && next >= BIRD_CAMEO_SCORE[kind]) return kind;
  }
  return null;
}

export function BirdCameo({ kind, onDone }: { kind: CameoKind; onDone: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const flight = ref.current?.animate(
      [
        { transform: 'translate(40px, -60px)', opacity: 0 },
        { transform: 'translate(-90px, 30px)', opacity: 1, offset: 0.15 },
        { transform: 'translate(-220px, 70px)', opacity: 1, offset: 0.4 },
        { transform: 'translate(-120px, 110px)', opacity: 1, offset: 0.6 },
        { transform: 'translate(-260px, 40px)', opacity: 1, offset: 0.85 },
        { transform: 'translate(-340px, -80px)', opacity: 0 },
      ],
      { duration: CAMEO_MS, easing: 'ease-in-out', fill: 'both' }
    );
    if (!flight) return;
    flight.onfinish = () => doneRef.current();
    return () => {
      flight.onfinish = null;
      flight.cancel();
    };
  }, []);

  return <img ref={ref} data-testid="bird-cameo" data-kind={kind} src={`/game/birds/${kind}/fly-level.webp`} alt="" draggable={false} style={{ width: CAMEO_WIDTH[kind] }} className="pointer-events-none fixed right-0 top-16 z-[15]" />;
}
