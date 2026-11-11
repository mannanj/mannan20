'use client';

import { useEffect, useRef, useState } from 'react';

export const AIMBOT_ON_MS = 20_000;
export const AIMBOT_COOLDOWN_MS = 20_000;
const POLL_MS = 200;
const MARKER_PX = 56;

export interface AimbotClock {
  until: number;
  coolUntil: number;
}

export type AimbotPhase = 'ready' | 'on' | 'cooling';

export function aimbotPhase(clock: AimbotClock, now: number): AimbotPhase {
  if (now < clock.until) return 'on';
  return now < clock.coolUntil ? 'cooling' : 'ready';
}

export function toggleAimbot(clock: AimbotClock, now: number): void {
  const phase = aimbotPhase(clock, now);
  if (phase === 'cooling') return;
  if (phase === 'on') {
    clock.until = now;
    clock.coolUntil = now + AIMBOT_COOLDOWN_MS;
    return;
  }
  clock.until = now + AIMBOT_ON_MS;
  clock.coolUntil = clock.until + AIMBOT_COOLDOWN_MS;
}

interface AimbotProps {
  clock: AimbotClock;
  target: () => { x: number; y: number };
  onPhase: (phase: AimbotPhase) => void;
}

export function Aimbot({ clock, target, onPhase }: AimbotProps) {
  const [phase, setPhase] = useState<AimbotPhase>('ready');
  const phaseRef = useRef<AimbotPhase>('ready');
  const [left, setLeft] = useState(0);
  const markerRef = useRef<HTMLDivElement>(null);
  const portsRef = useRef({ target, onPhase });
  portsRef.current = { target, onPhase };

  useEffect(() => {
    const read = () => {
      const now = performance.now();
      const next = aimbotPhase(clock, now);
      if (next !== phaseRef.current) {
        phaseRef.current = next;
        portsRef.current.onPhase(next);
        setPhase(next);
      }
      setLeft(Math.ceil(Math.max(0, (next === 'on' ? clock.until : clock.coolUntil) - now) / 1000));
    };
    read();
    const id = window.setInterval(read, POLL_MS);
    return () => window.clearInterval(id);
  }, [clock]);

  useEffect(() => {
    if (phase !== 'on') return;
    let raf = 0;
    const follow = () => {
      const at = portsRef.current.target();
      if (markerRef.current) markerRef.current.style.transform = `translate(${at.x - MARKER_PX / 2}px, ${at.y - MARKER_PX / 2}px)`;
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const flip = () => {
    toggleAimbot(clock, performance.now());
    const next = aimbotPhase(clock, performance.now());
    phaseRef.current = next;
    portsRef.current.onPhase(next);
    setPhase(next);
  };

  return (
    <>
      <button
        type="button"
        data-hud
        data-testid="aimbot-toggle"
        data-phase={phase}
        aria-pressed={phase === 'on'}
        disabled={phase === 'cooling'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          flip();
        }}
        className={`fixed bottom-[7.25rem] left-6 z-[60] flex cursor-pointer touch-manipulation items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed ${phase === 'on' ? 'bg-[#ff3b3b] text-white' : phase === 'cooling' ? 'bg-black/60 text-white/45' : 'bg-black/70 text-white hover:bg-black/85'}`}
      >
        <span className={`h-2 w-2 rounded-full ${phase === 'on' ? 'bg-white' : phase === 'cooling' ? 'bg-white/30' : 'bg-[#ff3b3b]'}`} />
        Aimbot
        {phase !== 'ready' && <span className="tabular-nums text-xs opacity-80">{left}s</span>}
      </button>
      {phase === 'on' && (
        <div ref={markerRef} data-testid="aimbot-marker" className="pointer-events-none fixed left-0 top-0 z-[58] will-change-transform" style={{ width: MARKER_PX, height: MARKER_PX }}>
          <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" fill="none" stroke="#ff3b3b" strokeWidth="2.5" aria-hidden="true">
            <circle cx="28" cy="28" r="20" />
            <path d="M28 2 V14 M28 42 V54 M2 28 H14 M42 28 H54" strokeLinecap="round" />
            <circle cx="28" cy="28" r="2.5" fill="#ff3b3b" />
          </svg>
        </div>
      )}
    </>
  );
}
