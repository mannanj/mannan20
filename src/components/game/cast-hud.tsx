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

export function CastHud({ read, onCast }: { read: () => CastStatus[]; onCast: (id: CastId) => void }) {
  const [cast, setCast] = useState<CastStatus[]>([]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const next = read();
      setCast((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, POLL_MS);
    return () => window.clearInterval(tick);
  }, [read]);

  if (cast.length === 0) return null;
  return (
    <div data-testid="cast-hud" className="pointer-events-none fixed bottom-[124px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2">
      {cast.map((c) => (
        <Chip key={c.id} {...c} onCast={onCast} />
      ))}
    </div>
  );
}
