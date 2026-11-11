'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AboveStack } from './above-badge';

export const AIMBOT_ON_MS = 20_000;
export const AIMBOT_COOLDOWN_MS = 20_000;
const POLL_MS = 200;
const MARKER_PX = 56;
const STAGGER_PX = 16;
const EXTRA_MARKERS = 2;

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

interface AimPoint {
  x: number;
  y: number;
}

interface AimbotProps {
  clock: AimbotClock;
  level: number;
  targets: () => AimPoint[];
  pointsRef: MutableRefObject<() => AimPoint[]>;
}

export function AimbotIcon({ dim = false, size = 18 }: { dim?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={dim ? 'opacity-40' : ''}>
      <circle cx="12" cy="12" r="8.5" stroke="#ff4d4d" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4" stroke="#ffd84d" strokeWidth="2" />
      <path d="M12 1.5 V6 M12 18 V22.5 M1.5 12 H6 M18 12 H22.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="#ff4d4d" />
    </svg>
  );
}

export function Aimbot({ clock, level, targets, pointsRef }: AimbotProps) {
  const [phase, setPhase] = useState<AimbotPhase>('ready');
  const phaseRef = useRef<AimbotPhase>('ready');
  const [left, setLeft] = useState(0);
  const [extras, setExtras] = useState<boolean[]>(Array.from({ length: EXTRA_MARKERS }, () => false));
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pointsNowRef = useRef<AimPoint[]>([]);
  const portsRef = useRef({ targets });
  portsRef.current = { targets };
  const active = [true, ...extras.map((on, i) => on && level >= i + 2)];

  useEffect(() => {
    pointsRef.current = () => (phaseRef.current === 'on' ? pointsNowRef.current : []);
  }, [pointsRef]);

  useEffect(() => {
    const read = () => {
      const now = performance.now();
      const next = aimbotPhase(clock, now);
      if (next !== phaseRef.current) {
        phaseRef.current = next;
        setPhase(next);
      }
      setLeft(Math.ceil(Math.max(0, (next === 'on' ? clock.until : clock.coolUntil) - now) / 1000));
    };
    read();
    const id = window.setInterval(read, POLL_MS);
    return () => window.clearInterval(id);
  }, [clock]);

  const activeKey = active.map((a) => (a ? '1' : '0')).join('');
  useEffect(() => {
    if (phase !== 'on') return;
    const on = activeKey.split('').map((c) => c === '1');
    let raf = 0;
    const follow = () => {
      const list = portsRef.current.targets();
      const points: AimPoint[] = [];
      on.forEach((isOn, i) => {
        if (!isOn || list.length === 0) return;
        const own = list[i];
        const at = own ?? { x: list[0].x + i * STAGGER_PX, y: list[0].y - i * STAGGER_PX };
        points.push(at);
        const el = markerRefs.current[i];
        if (el) el.style.transform = `translate(${at.x - MARKER_PX / 2}px, ${at.y - MARKER_PX / 2}px)`;
      });
      pointsNowRef.current = points;
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(raf);
      pointsNowRef.current = [];
    };
  }, [phase, activeKey]);

  const flip = () => {
    toggleAimbot(clock, performance.now());
    const next = aimbotPhase(clock, performance.now());
    phaseRef.current = next;
    setPhase(next);
  };

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <>
      <div data-hud data-testid="aimbot" className="relative flex items-center gap-1.5" onPointerDown={stop} onClick={stop}>
        {phase !== 'ready' && (
          <AboveStack>
            {phase === 'on' && (
              <span data-testid="aimbot-hint" className="whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-semibold text-white/90">
                Click or press Space
              </span>
            )}
            <span data-testid="aimbot-timer" className={`rounded-full bg-black/75 px-2.5 text-lg font-bold tabular-nums leading-6 ${phase === 'on' ? 'text-[#ff4040]' : 'text-white/55'}`}>
              {left}s
            </span>
          </AboveStack>
        )}
        <button
          type="button"
          data-testid="aimbot-toggle"
          data-phase={phase}
          aria-pressed={phase === 'on'}
          disabled={phase === 'cooling'}
          onClick={flip}
          className={`flex cursor-pointer touch-manipulation items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed ${phase === 'cooling' ? 'bg-black/60 text-white/45' : 'bg-black/70 text-white hover:bg-black/85'}`}
        >
          <AimbotIcon dim={phase === 'cooling'} />
          Aimbot
          {phase === 'on' && <span data-testid="aimbot-active" className="text-xs font-semibold text-[#7cf0a8]">Active</span>}
        </button>
        {extras.map((on, i) =>
          level >= i + 2 ? (
            <button
              key={i}
              type="button"
              data-testid={`aimbot-extra-${i + 2}`}
              aria-pressed={on}
              onClick={() => setExtras((prev) => prev.map((v, k) => (k === i ? !v : v)))}
              className={`flex h-8 min-w-8 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/70 px-2 text-xs font-bold tabular-nums transition-colors hover:bg-black/85 ${on ? 'text-[#7cf0a8] ring-1 ring-[#7cf0a8]/60' : 'text-white/70'}`}
            >
              #{i + 2}
            </button>
          ) : null
        )}
      </div>
      {phase === 'on' &&
        active.map((isOn, i) =>
          isOn ? (
            <div
              key={i}
              ref={(el) => {
                markerRefs.current[i] = el;
              }}
              data-testid={i === 0 ? 'aimbot-marker' : `aimbot-marker-${i + 1}`}
              className="pointer-events-none fixed left-0 top-0 z-[58] will-change-transform"
              style={{ width: MARKER_PX, height: MARKER_PX }}
            >
              <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" fill="none" stroke="#ff3b3b" strokeWidth="2.5" aria-hidden="true">
                <circle cx="28" cy="28" r="20" />
                <path d="M28 2 V14 M28 42 V54 M2 28 H14 M42 28 H54" strokeLinecap="round" />
                <circle cx="28" cy="28" r="2.5" fill="#ff3b3b" />
              </svg>
              {i > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#ff3b3b] px-1 text-[10px] font-bold text-white">#{i + 1}</span>}
            </div>
          ) : null
        )}
    </>
  );
}
