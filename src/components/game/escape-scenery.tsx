'use client';

import { useEffect, useState } from 'react';
import type { RocketSeq } from './escape-sequence';
import type { EscapeStage } from './escape-stages';

const STAR_COUNT = 90;

function hash(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: hash(i) * 100,
  y: hash(i + 1000) * 100,
  size: hash(i + 2000) > 0.85 ? 3 : 2,
  opacity: 0.3 + hash(i + 3000) * 0.6,
}));

function Stars() {
  return (
    <div className="absolute inset-0">
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}

function SurfSky() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d1b2e_0%,#1d3a5c_55%,#2d5f86_70%)]" />
      <div className="absolute top-[18%] right-[16%] h-24 w-24 rounded-full bg-[#ffd27a]/80 shadow-[0_0_80px_30px_rgba(255,190,90,0.25)]" />
      <svg className="absolute top-[30%] left-0 h-[20%] w-full opacity-50" viewBox="0 0 1440 180" preserveAspectRatio="none">
        <path d="M80 60 q 12 -10 24 0 q 12 -10 24 0 M260 30 q 10 -8 20 0 q 10 -8 20 0 M1100 90 q 12 -10 24 0 q 12 -10 24 0" stroke="#cfe3f5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </>
  );
}

function PilotSky() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#14304f_0%,#3a6d9c_60%,#7fb0d6_100%)]" />
      <div className="escape-clouds absolute inset-0">
        {[12, 34, 58, 80].map((top, i) => (
          <div
            key={top}
            className="absolute h-10 rounded-full bg-white/25 blur-[1px]"
            style={{ top: `${top}%`, left: `${(i * 29) % 90}%`, width: `${120 + i * 40}px` }}
          />
        ))}
      </div>
      <svg className="absolute bottom-0 left-0 h-[14%] w-full opacity-40" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0 80 L 160 40 L 320 70 L 520 30 L 760 72 L 980 36 L 1220 70 L 1440 44 L 1440 120 L 0 120 Z" fill="#20425f" />
      </svg>
    </>
  );
}

const SPACE_FADE_SEQS: RocketSeq[] = ['rocketApproach', 'boarding', 'flight3d'];

function RocketSky({ seq }: { seq: RocketSeq }) {
  const spaceOn = SPACE_FADE_SEQS.includes(seq);
  return (
    <>
      <PilotSky />
      <div
        data-testid="launch-sky"
        data-on={spaceOn ? '1' : '0'}
        className={`absolute inset-0 transition-opacity duration-[9000ms] ease-in-out ${spaceOn ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#03050c_0%,#0b1630_65%,#1d3a66_100%)]" />
        <Stars />
      </div>
    </>
  );
}

function MoonScape() {
  return (
    <>
      <div className="absolute inset-0 bg-[#04060b]" />
      <Stars />
      <div className="absolute top-[12%] right-[12%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_35%,#6fc0f0,#2a6fa8_60%,#0c2340)] shadow-[0_0_30px_6px_rgba(90,170,255,0.3)]" />
      <div data-testid="moon-ground" className="absolute inset-x-0 top-[76%] bottom-0 bg-[linear-gradient(180deg,#8c8f96_0%,#5b5e66_40%,#34363c_100%)]">
        {[
          [8, 18, 90],
          [30, 42, 60],
          [55, 14, 120],
          [78, 50, 70],
          [90, 22, 46],
        ].map(([left, top, w]) => (
          <div
            key={left}
            className="absolute h-4 rounded-[50%] bg-[#2f3137]/70 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5)]"
            style={{ left: `${left}%`, top: `${top}%`, width: w }}
          />
        ))}
      </div>
    </>
  );
}

const CROSSFADE_MS = 1800;

export function EscapeScenery({ stage, seq = 'none' }: { stage: EscapeStage; seq?: RocketSeq }) {
  const [shown, setShown] = useState<EscapeStage[]>([stage]);
  const [prevStage, setPrevStage] = useState(stage);
  if (stage !== prevStage) {
    setPrevStage(stage);
    setShown((s) => [s[s.length - 1], stage]);
  }
  useEffect(() => {
    if (shown.length < 2) return;
    const id = setTimeout(() => setShown((s) => [s[s.length - 1]]), CROSSFADE_MS + 100);
    return () => clearTimeout(id);
  }, [shown]);

  return (
    <>
      {shown.map((layer, i) =>
        layer === 'none' ? null : (
          <div
            key={layer}
            data-testid="escape-scenery"
            data-stage={layer}
            aria-hidden
            className={`absolute inset-0 pointer-events-none overflow-hidden ${i > 0 ? 'animate-[fadeIn_1.8s_ease-out]' : ''}`}
          >
            {layer === 'surf' && <SurfSky />}
            {layer === 'pilot' && <PilotSky />}
            {layer === 'rocket' && <RocketSky seq={seq} />}
            {layer === 'moon' && <MoonScape />}
          </div>
        )
      )}
    </>
  );
}
