'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChickenSvg } from './chicken-svg';
import { SKINS } from './chicken-skins';

export const BACKYARD_SRC = '/game/v3/backyard.webp';
const FLOCK_SIZE = 7;
const GRASS_TOP = 0.66;
const GRASS_BOTTOM = 0.9;
const EDGE_PAD = 60;
const WALK_SPEED = 0.035;
const PANIC_SPEED = 0.75;
const NEAR_SCALE = 1.25;
const FAR_SCALE = 0.8;
const CHICKEN_W = 64;
const FREEZE_MS = 1100;
const SCATTER_MS = 2200;
const TURN_MS = 900;
const MIN_ACT_MS = 900;
const ACT_SPREAD_MS = 2600;
const PECK_MS = 260;
const HOP_PX = 14;

type Act = 'walk' | 'peck' | 'idle' | 'look';
type Phase = 'meander' | 'frozen' | 'scatter' | 'alone' | 'turn' | 'gone';

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  act: Act;
  until: number;
  skin: string;
  distress: 0 | 1 | 2;
  fled: boolean;
}

interface BackyardFlockProps {
  squawk: () => void;
  onHandoff: (point: { x: number; y: number }) => void;
}

function scaleForY(y: number, vh: number): number {
  const t = (y / vh - GRASS_TOP) / (GRASS_BOTTOM - GRASS_TOP);
  return FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * Math.min(1, Math.max(0, t));
}

function pickAct(b: Bird, now: number): void {
  const r = Math.random();
  b.act = r < 0.45 ? 'walk' : r < 0.7 ? 'peck' : r < 0.85 ? 'look' : 'idle';
  b.until = now + MIN_ACT_MS + Math.random() * ACT_SPREAD_MS;
  if (b.act === 'walk') {
    const ang = Math.random() * Math.PI * 2;
    b.vx = Math.cos(ang) * WALK_SPEED;
    b.vy = Math.sin(ang) * WALK_SPEED * 0.35;
    b.facing = b.vx >= 0 ? 1 : -1;
  } else if (b.act === 'look') {
    b.facing = Math.random() < 0.5 ? 1 : -1;
  }
}

function makeFlock(vw: number, vh: number): Bird[] {
  return Array.from({ length: FLOCK_SIZE }, (_, i) => ({
    x: EDGE_PAD + Math.random() * (vw - EDGE_PAD * 2),
    y: vh * (GRASS_TOP + Math.random() * (GRASS_BOTTOM - GRASS_TOP)),
    vx: 0,
    vy: 0,
    facing: Math.random() < 0.5 ? 1 : -1,
    act: 'idle',
    until: performance.now() + Math.random() * ACT_SPREAD_MS,
    skin: i === 0 ? 'classic' : SKINS[i % SKINS.length].id,
    distress: 0,
    fled: false,
  }));
}

export function BackyardFlock({ squawk, onHandoff }: BackyardFlockProps) {
  const [flock, setFlock] = useState<Bird[]>([]);
  const [phase, setPhase] = useState<Phase>('meander');
  const [chosen, setChosen] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const flockRef = useRef<Bird[]>([]);
  const phaseRef = useRef<Phase>('meander');
  const chosenRef = useRef<number | null>(null);
  const elsRef = useRef<(HTMLDivElement | null)[]>([]);
  const timersRef = useRef<number[]>([]);
  const handoffRef = useRef(onHandoff);
  handoffRef.current = onHandoff;

  const later = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const birds = makeFlock(window.innerWidth, window.innerHeight);
    flockRef.current = birds;
    setFlock(birds);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const p = phaseRef.current;
      let distressChanged = false;
      flockRef.current.forEach((b, i) => {
        const el = elsRef.current[i];
        const isChosen = chosenRef.current === i;
        const still = p === 'frozen' || (p === 'turn' && isChosen);
        if (!still && p === 'scatter' && !isChosen) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (!b.fled && (b.x < -120 || b.x > vw + 120 || b.y > vh + 120)) {
            b.fled = true;
            distressChanged = true;
          }
        } else if (!still && (p === 'meander' || (p === 'alone' && isChosen))) {
          if (now > b.until) pickAct(b, now);
          if (b.act === 'walk') {
            const speed = p === 'alone' ? 1.6 : 1;
            b.x += b.vx * dt * speed;
            b.y += b.vy * dt * speed;
            if (b.x < EDGE_PAD || b.x > vw - EDGE_PAD) {
              b.vx = -b.vx;
              b.facing = b.vx >= 0 ? 1 : -1;
            }
            const top = vh * GRASS_TOP;
            const bottom = vh * GRASS_BOTTOM;
            if (b.y < top || b.y > bottom) b.vy = -b.vy;
            b.x = Math.min(vw - EDGE_PAD, Math.max(EDGE_PAD, b.x));
            b.y = Math.min(bottom, Math.max(top, b.y));
          }
        }
        if (!el) return;
        const s = scaleForY(b.y, vh);
        const peck = b.act === 'peck' && (p === 'meander' || p === 'alone') ? Math.max(0, Math.sin((now / PECK_MS) * Math.PI)) * 28 : 0;
        const hop = p === 'scatter' && !isChosen ? Math.abs(Math.sin(now / 70 + i)) * HOP_PX : 0;
        const walkBob = b.act === 'walk' && p !== 'frozen' ? Math.abs(Math.sin(now / 120 + i)) * 3 : 0;
        el.style.transform = `translate(${(b.x - (CHICKEN_W * s) / 2).toFixed(1)}px, ${(b.y - CHICKEN_W * 2 * s - hop - walkBob).toFixed(1)}px) scale(${s.toFixed(3)})`;
        el.style.zIndex = String(Math.round(b.y));
        const inner = el.firstElementChild as HTMLElement | null;
        if (inner) inner.style.transform = `scaleX(${b.facing}) rotate(${peck}deg)`;
      });
      if (distressChanged) setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const timers = timersRef.current;
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const scatterOthers = useCallback((from: Bird) => {
    flockRef.current.forEach((b, i) => {
      if (i === chosenRef.current) return;
      const dx = b.x - from.x || (Math.random() - 0.5);
      const dy = Math.abs(b.y - from.y) + 20;
      const d = Math.hypot(dx, dy);
      b.vx = (dx / d) * PANIC_SPEED * (0.8 + Math.random() * 0.5);
      b.vy = (dy / d) * PANIC_SPEED * 0.4;
      b.facing = b.vx >= 0 ? 1 : -1;
      b.distress = 2;
    });
  }, []);

  const squeeze = useCallback(
    (i: number) => {
      const p = phaseRef.current;
      const b = flockRef.current[i];
      if (!b) return;
      if (p === 'meander') {
        chosenRef.current = i;
        setChosen(i);
        squawk();
        b.distress = 1;
        goPhase('frozen');
        later(FREEZE_MS, () => {
          scatterOthers(b);
          goPhase('scatter');
          later(SCATTER_MS, () => {
            b.act = 'idle';
            b.until = performance.now() + MIN_ACT_MS;
            setCount(1);
            goPhase('alone');
          });
        });
        return;
      }
      if (p === 'alone' && i === chosenRef.current) {
        squawk();
        b.facing = b.facing === 1 ? -1 : 1;
        b.distress = 2;
        setCount(2);
        goPhase('turn');
        later(TURN_MS, () => {
          goPhase('gone');
          const s = scaleForY(b.y, window.innerHeight);
          handoffRef.current({ x: b.x, y: b.y - CHICKEN_W * s });
        });
      }
    },
    [goPhase, scatterOthers, squawk]
  );

  const cursorHidden = phase === 'frozen' || phase === 'scatter';

  return (
    <div
      data-testid="backyard-flock"
      data-phase={phase}
      className={`fixed inset-0 z-[55] overflow-hidden select-none ${cursorHidden ? 'cursor-none' : 'chicken-hand-cursor'}`}
    >
      <img src={BACKYARD_SRC} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full animate-[backyardSettle_6s_ease-out] object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.35),transparent_45%)]" />
      <div data-testid="backyard-label" className="pointer-events-none absolute top-[225px] left-1/2 -translate-x-1/2 text-lg font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8),0_2px_14px_rgba(0,0,0,0.6)]">
        Squeeze the chicken
      </div>
      {count !== null && (
        <div data-testid="backyard-count" className="pointer-events-none absolute top-[265px] left-1/2 -translate-x-1/2 text-5xl font-bold tabular-nums text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
          {count}
        </div>
      )}
      {flock.map((b, i) =>
        b.fled ? null : (
          <div
            key={i}
            ref={(el) => {
              elsRef.current[i] = el;
            }}
            data-testid={chosen === i ? 'backyard-chosen' : 'backyard-chicken'}
            onPointerDown={(e) => {
              e.stopPropagation();
              squeeze(i);
            }}
            className={`absolute top-0 left-0 origin-bottom will-change-transform ${phase === 'meander' || (phase === 'alone' && chosen === i) ? 'cursor-pointer' : 'pointer-events-none'}`}
            style={{ width: CHICKEN_W }}
          >
            <div className="origin-bottom transition-transform duration-300">
              <ChickenSvg className="block w-full drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)]" skin={b.skin} eyes="calm" distress={b.distress} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
