'use client';

import { useEffect, useState } from 'react';
import { CAST_KEYS, CAST_LABELS, coolingSeconds, type CastId } from './cannon';
import { formatJevWait } from './jev-helper';

export interface CastStatus {
  id: CastId;
  leftMs: number;
  active: boolean;
}

const POLL_MS = 200;
const FULL_SPIN_MS = 5000;

interface ChipProps extends CastStatus {
  onCast: (id: CastId) => void;
}

function Chip({ id, leftMs, active, onCast }: ChipProps) {
  const cooling = leftMs > 0;
  const seconds = coolingSeconds(leftMs);
  return (
    <button
      type="button"
      data-testid={`cast-${id}`}
      data-cooling={cooling ? '1' : '0'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onCast(id);
      }}
      className="pointer-events-auto flex cursor-pointer touch-manipulation items-center gap-1.5 p-1.5 text-xs font-semibold text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
      <span className={`relative flex h-6 min-w-6 items-center justify-center rounded-md border px-1 text-[13px] tabular-nums ${cooling ? 'border-white/30 bg-transparent text-white/60' : active ? 'border-[#ffe28a] bg-[#ffe28a] text-black' : 'border-white/80 bg-white text-black'}`}>
        {cooling && <span className="absolute inset-[-3px] animate-spin rounded-lg border-2 border-transparent border-t-white/80" style={{ animationDuration: `${FULL_SPIN_MS / 5}ms` }} />}
        {CAST_KEYS[id]}
      </span>
      <span>{cooling ? (seconds >= 60 ? formatJevWait(leftMs) : `${seconds}s`) : CAST_LABELS[id]}</span>
    </button>
  );
}

const POP_OUT_MIN = 6;

function PopIcon({ out }: { out: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {out ? <path d="M10 2.5 H13.5 V6 M13.5 2.5 L8 8 M12 9.5 V13.5 H2.5 V4 H6.5" /> : <path d="M6 13.5 H2.5 V10 M2.5 13.5 L8 8 M4 6.5 V2.5 H13.5 V12 H9.5" />}
    </svg>
  );
}

export function CastHud({ read, onCast }: { read: () => CastStatus[]; onCast: (id: CastId) => void }) {
  const [cast, setCast] = useState<CastStatus[]>([]);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const next = read();
      setCast((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, POLL_MS);
    return () => window.clearInterval(tick);
  }, [read]);

  if (cast.length === 0) return null;
  const canPop = cast.length >= POP_OUT_MIN;
  const chips = cast.map((c) => <Chip key={c.id} {...c} onCast={onCast} />);
  if (popped && canPop) {
    return (
      <div data-testid="cast-popout" data-hud className="fixed right-6 top-1/3 z-[60] flex flex-col gap-1 rounded-xl border border-white/15 bg-black/70 p-2 backdrop-blur-md">
        <button type="button" data-testid="cast-dock" aria-label="Dock pet controls" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setPopped(false); }} className="self-end cursor-pointer rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
          <PopIcon out={false} />
        </button>
        {chips}
      </div>
    );
  }
  return (
    <div data-testid="cast-hud" className="relative">
      <div className="pointer-events-auto flex max-w-[min(90vw,640px)] items-center gap-2 overflow-x-auto [scrollbar-width:none]">{chips}</div>
      {canPop && (
        <button type="button" data-testid="cast-popout-toggle" aria-label="Pop out pet controls" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setPopped(true); }} className="absolute -right-2 -top-5 cursor-pointer rounded-md bg-black/60 p-1 text-white/70 hover:bg-black/80 hover:text-white">
          <PopIcon out />
        </button>
      )}
    </div>
  );
}
