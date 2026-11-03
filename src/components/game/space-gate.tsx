'use client';

import { useEffect, useState } from 'react';
import { getSpaceProgress, type SpaceProgress } from './space-preload';

export type SpaceGateState = 'none' | 'downloading' | 'ready' | 'countdown';

const POLL_MS = 200;
const SECONDS_PER_MINUTE = 60;

function etaLabel(etaSec: number | null): string {
  if (etaSec === null) return 'estimating time';
  if (etaSec < SECONDS_PER_MINUTE) return `≈ ${Math.max(1, Math.ceil(etaSec))}s remaining`;
  return `≈ ${Math.ceil(etaSec / SECONDS_PER_MINUTE)}m remaining`;
}

interface SpaceGateProps {
  gate: SpaceGateState;
  count: number;
  onSkip: () => void;
  onStart: () => void;
}

function Downloading({ onSkip }: { onSkip: () => void }) {
  const [progress, setProgress] = useState<SpaceProgress>(() => getSpaceProgress());
  useEffect(() => {
    const id = setInterval(() => setProgress(getSpaceProgress()), POLL_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div data-testid="gate-eta" className="text-[13px] text-white/60">
        {etaLabel(progress.etaSec)}
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
        <span className="text-[15px] text-white">Downloading scene</span>
        <div className="flex items-center gap-3">
          <div className="h-2 w-[200px] overflow-hidden rounded-full bg-white/15">
            <div
              data-testid="gate-bar"
              className="h-full rounded-full bg-white/90 transition-[width] duration-200"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <span data-testid="gate-pct" className="w-10 text-right text-[13px] tabular-nums text-white/80">
            {progress.pct}%
          </span>
        </div>
      </div>
      <button
        type="button"
        data-testid="gate-skip"
        onClick={onSkip}
        className="cursor-pointer text-[13px] text-white/55 transition-colors hover:text-white"
      >
        skip instead?
      </button>
    </>
  );
}

function Ready({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 text-white">
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 text-[#34c759]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10.5 8.2 14.5 16 5.5" />
        </svg>
        <span className="text-[15px]">Scene ready</span>
        <button
          type="button"
          data-testid="gate-arrow"
          aria-label="Start scene"
          onClick={onStart}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h11M11 5l5 5-5 5" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        data-testid="gate-start"
        onClick={onStart}
        className="cursor-pointer text-[15px] text-[#4aa3ff] no-underline transition-opacity hover:opacity-80"
      >
        start?
      </button>
    </>
  );
}

export function SpaceGate({ gate, count, onSkip, onStart }: SpaceGateProps) {
  if (gate === 'none') return null;
  return (
    <div
      data-testid="space-gate"
      data-gate={gate}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px] animate-[fadeIn_0.4s_ease-out]"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {gate === 'downloading' && <Downloading onSkip={onSkip} />}
        {gate === 'ready' && <Ready onStart={onStart} />}
        {gate === 'countdown' && (
          <div data-testid="gate-count" className="text-[84px] font-light leading-none text-white tabular-nums">
            {Math.max(count, 1)}
          </div>
        )}
      </div>
    </div>
  );
}
