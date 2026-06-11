'use client';

import { useEffect, useState } from 'react';
import { ChickenSvg } from './chicken-svg';
import type { LoadProgress } from '@/lib/chicken-audio';

const CAPTIONS = [
  'Rounding up the flock…',
  'Stretching vocal cords…',
  'Charging ki…',
  'Polishing the beak…',
  'Rehearsing screams…',
];
const CAPTION_INTERVAL_MS = 900;

interface SoundLoaderProps {
  progress: LoadProgress;
  fading: boolean;
}

export function SoundLoader({ progress, fading }: SoundLoaderProps) {
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setCaptionIndex((i) => (i + 1) % CAPTIONS.length),
      CAPTION_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, []);

  const settled = progress.loaded + progress.failed;
  const pct = progress.done
    ? 100
    : progress.total === 0
      ? 100
      : Math.round((settled / progress.total) * 100);

  return (
    <div
      data-testid="chicken-loader"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#0b0b0b] transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="animate-[chickenBob_0.9s_ease-in-out_infinite]">
        <ChickenSvg className="w-[52px]" />
      </div>
      <div className="relative w-72">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            data-testid="chicken-loader-fill"
            className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF8F00] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="absolute -top-[46px] transition-[left] duration-300 ease-out"
          style={{ left: `calc(${pct}% - 11px)` }}
        >
          <div className="animate-[chickenWaddle_0.5s_ease-in-out_infinite]">
            <ChickenSvg className="w-[22px]" />
          </div>
        </div>
      </div>
      <div key={captionIndex} className="h-5 animate-[fadeIn_0.4s_ease-out] text-sm text-white/50">
        {CAPTIONS[captionIndex]}
      </div>
      <div className="text-xs tabular-nums text-white/30">{pct}%</div>
    </div>
  );
}
