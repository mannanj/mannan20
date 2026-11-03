'use client';

import type { RefObject } from 'react';

interface HoldTossHudProps {
  hudRef: RefObject<HTMLDivElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
  readoutRef: RefObject<HTMLSpanElement | null>;
}

export function HoldTossHud({ hudRef, labelRef, barRef, readoutRef }: HoldTossHudProps) {
  return (
    <div
      ref={hudRef}
      data-testid="hold-toss-hud"
      className="pointer-events-none absolute top-0 left-0 z-30 flex w-[140px] flex-col gap-1 text-[11px] font-semibold text-white/90 opacity-0"
    >
      <span ref={labelRef} data-testid="hold-toss-label">
        hold to toss
      </span>
      <div className="h-[5px] w-[56px] overflow-hidden rounded-full bg-white/25">
        <div ref={barRef} data-testid="hold-toss-bar" className="h-full w-0 rounded-full bg-[#ffd54a]" />
      </div>
      <span ref={readoutRef} data-testid="hold-toss-readout" className="tabular-nums text-white/70">
        0.0 / 1.5s
      </span>
    </div>
  );
}
