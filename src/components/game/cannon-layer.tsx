'use client';

import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import {
  CANNON_COOLDOWN_MS,
  CANNON_COPY,
  CANNON_DOCKED_KEY,
  CANNON_HIT_RADIUS,
  CANNON_SCORE,
  CANNON_SIZE,
  CANNON_WAVES,
  CANNON_WAVE_GAP_MS,
  CANNON_WAVE_MS,
  CANNON_BOTTOM_PX,
  canDock,
  cannonHome,
  flatPoints,
  type CannonPoint,
} from './cannon';
import { ChickenSvg } from './chicken-svg';

export interface CannonControl {
  shouldInvite: (score: number) => boolean;
  invite: () => void;
  grabChicken: (x: number, y: number) => boolean;
  dragPoint: () => CannonPoint | null;
  docked: () => boolean;
  arm: () => void;
  leftMs: () => number;
  armed: () => boolean;
}

interface CannonLayerProps {
  controlRef: RefObject<CannonControl | null>;
  target: () => CannonPoint;
  pickChicken: (at: CannonPoint) => CannonPoint | null;
  mult: () => number;
  blast: (at: CannonPoint, raw: number) => void;
  onDocked: () => void;
  skin: string;
  tier: number;
}

type CannonPhase = 'idle' | 'invite' | 'drag' | 'docked';

const WAVE_SLOTS = Array.from({ length: CANNON_WAVES }, (_, i) => i);
const RIPPLE_SLOTS = [0, 1, 2];
const RIPPLE_MS = 620;
const INTERACTIVE = 'button, a, input, [data-hud], [data-testid^="inventory"]';

export function CannonLayer({ controlRef, target, pickChicken, mult, blast, onDocked, skin, tier }: CannonLayerProps) {
  const [phase, setPhase] = useState<CannonPhase>('idle');
  const [armed, setArmed] = useState(false);
  const portsRef = useRef({ target, pickChicken, mult, blast, onDocked });
  portsRef.current = { target, pickChicken, mult, blast, onDocked };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const dragRef = useRef<CannonPoint | null>(null);
  const readyAtRef = useRef(0);
  const labelRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const aimRef = useRef<HTMLDivElement>(null);
  const gunRef = useRef<HTMLDivElement>(null);
  const wavesRef = useRef<(HTMLDivElement | null)[]>([]);
  const ripplesRef = useRef<(HTMLDivElement | null)[]>([]);
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(CANNON_DOCKED_KEY) === '1') setPhase('docked');
    } catch {}
  }, []);

  useImperativeHandle(
    controlRef,
    () => ({
      shouldInvite: (score) => score >= CANNON_SCORE && phaseRef.current === 'idle',
      invite: () => setPhase('invite'),
      grabChicken: (x, y) => {
        if (phaseRef.current !== 'invite') return false;
        dragRef.current = { x, y };
        setPhase('drag');
        return true;
      },
      dragPoint: () => (phaseRef.current === 'drag' ? dragRef.current : null),
      docked: () => phaseRef.current === 'docked',
      arm: () => {
        if (phaseRef.current === 'docked' && performance.now() >= readyAtRef.current) setArmed((a) => !a);
      },
      leftMs: () => Math.max(0, readyAtRef.current - performance.now()),
      armed: () => armedRef.current,
    }),
    []
  );

  useEffect(() => {
    if (phase !== 'invite' && phase !== 'drag') return;
    let raf = 0;
    const tick = () => {
      const at = dragRef.current && phaseRef.current === 'drag' ? dragRef.current : portsRef.current.target();
      const home = cannonHome(window.innerWidth, window.innerHeight);
      if (labelRef.current) labelRef.current.style.transform = `translate(${at.x}px, ${at.y - 104}px) translateX(-50%)`;
      const line = lineRef.current;
      if (line) {
        line.setAttribute('x1', String(at.x));
        line.setAttribute('y1', String(at.y + 70));
        line.setAttribute('x2', String(home.x));
        line.setAttribute('y2', String(home.y - CANNON_SIZE / 2 - 14));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'drag') return;
    const move = (e: PointerEvent) => {
      dragRef.current = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      dragRef.current = null;
      if (!canDock({ x: e.clientX, y: e.clientY }, window.innerWidth, window.innerHeight)) {
        setPhase('invite');
        return;
      }
      try {
        localStorage.setItem(CANNON_DOCKED_KEY, '1');
      } catch {}
      setPhase('docked');
      portsRef.current.onDocked();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [phase]);

  useEffect(() => {
    if (!armed) return;
    document.documentElement.setAttribute('data-gun-cursor', '1');
    const home = cannonHome(window.innerWidth, window.innerHeight);
    const aim = (x: number, y: number) => {
      if (aimRef.current) aimRef.current.style.transform = `translate(${x}px, ${y}px)`;
      if (gunRef.current) gunRef.current.style.transform = `rotate(${Math.atan2(y - home.y, x - home.x) + Math.PI / 2}rad)`;
    };
    const move = (e: PointerEvent) => aim(e.clientX, e.clientY);
    const fire = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return;
      const at = { x: e.clientX, y: e.clientY };
      const length = Math.hypot(at.x - home.x, at.y - home.y);
      WAVE_SLOTS.forEach((slot) => {
        wavesRef.current[slot]?.animate(
          [
            { transform: `translate(${home.x}px, ${home.y}px) scale(0.5)`, opacity: 0.95 },
            { transform: `translate(${at.x}px, ${at.y}px) scale(${1.2 + length / 500})`, opacity: 0.2 },
          ],
          { duration: CANNON_WAVE_MS, delay: slot * CANNON_WAVE_GAP_MS, easing: 'ease-out' }
        );
      });
      const struck = portsRef.current.pickChicken(at);
      if (struck) {
        window.setTimeout(() => {
          portsRef.current.blast(struck, flatPoints(portsRef.current.mult()));
          RIPPLE_SLOTS.forEach((slot) => {
            ripplesRef.current[slot]?.animate(
              [
                { transform: `translate(${struck.x}px, ${struck.y}px) scale(0.3)`, opacity: 0.9 },
                { transform: `translate(${struck.x}px, ${struck.y}px) scale(2.6)`, opacity: 0 },
              ],
              { duration: RIPPLE_MS, delay: slot * 110, easing: 'ease-out' }
            );
          });
          burstRef.current?.animate(
            [
              { transform: `translate(${struck.x}px, ${struck.y - 70}px) scale(0.8)`, opacity: 1 },
              { transform: `translate(${struck.x}px, ${struck.y - 150}px) scale(1.2)`, opacity: 0 },
            ],
            { duration: 900, easing: 'ease-out' }
          );
        }, CANNON_WAVE_MS);
      }
      readyAtRef.current = performance.now() + CANNON_COOLDOWN_MS;
      setArmed(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', fire);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', fire);
      document.documentElement.removeAttribute('data-gun-cursor');
      if (gunRef.current) gunRef.current.style.transform = '';
    };
  }, [armed]);

  if (phase === 'idle') return null;
  const docked = phase === 'docked';

  return (
    <>
      {!docked && (
        <div data-testid="cannon-invite" className="pointer-events-none fixed inset-0 z-[70]">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <marker id="cannon-arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill="#fff" />
              </marker>
            </defs>
            <line ref={lineRef} stroke="#fff" strokeWidth="2.5" strokeDasharray="9 8" markerEnd="url(#cannon-arrow)" />
          </svg>
          <div ref={labelRef} className="absolute left-0 top-0 whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-sm font-semibold text-white">
            {CANNON_COPY.invite}
          </div>
          <div data-testid="cannon-silhouette" className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-dashed border-white/70 p-1 opacity-70 brightness-0 invert" style={{ bottom: CANNON_BOTTOM_PX }}>
            <ChickenSvg className="w-[42px] opacity-40" eyes="calm" />
          </div>
        </div>
      )}
      {docked && (
        <button
          type="button"
          data-testid="cannon"
          data-armed={armed ? '1' : '0'}
          data-hud
          aria-label={CANNON_COPY.name}
          onClick={() => {
            if (performance.now() >= readyAtRef.current) setArmed((a) => !a);
          }}
          style={{ bottom: CANNON_BOTTOM_PX, width: CANNON_SIZE, height: CANNON_SIZE }}
          className="fixed left-1/2 z-[60] flex -translate-x-1/2 cursor-pointer items-end justify-center"
        >
          <div className="absolute bottom-0 left-1/2 h-4 w-[70px] -translate-x-1/2 rounded-t-lg bg-[linear-gradient(180deg,#59606e,#232730)] shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <div ref={gunRef} style={{ transformOrigin: '50% 90%' }} className="relative mb-2 transition-transform duration-75">
            <ChickenSvg className="w-[34px]" tier={tier} skin={skin} eyes="calm" />
          </div>
        </button>
      )}
      <div className="pointer-events-none fixed inset-0 z-[96] overflow-hidden">
        {WAVE_SLOTS.map((slot) => (
          <div
            key={slot}
            ref={(el) => {
              wavesRef.current[slot] = el;
            }}
            data-testid="cannon-wave"
            className="absolute -left-6 -top-6 h-12 w-12 rounded-full border-[3px] border-[#ffe28a] opacity-0 shadow-[0_0_10px_2px_rgba(255,226,138,0.6)]"
          />
        ))}
        {RIPPLE_SLOTS.map((slot) => (
          <div
            key={slot}
            ref={(el) => {
              ripplesRef.current[slot] = el;
            }}
            data-testid="cannon-ripple"
            className="absolute -left-[60px] -top-[60px] h-[120px] w-[120px] rounded-full border-4 border-white opacity-0"
          />
        ))}
        <div ref={burstRef} data-testid="cannon-burst" className="absolute left-0 top-0 -translate-x-1/2 text-3xl font-bold text-[#ffe28a] opacity-0 [text-shadow:0_2px_6px_rgba(0,0,0,0.8)]">
          {CANNON_COPY.burst}
        </div>
        {armed && (
          <div ref={aimRef} data-testid="cannon-aim" className="absolute left-0 top-0 h-0 w-0">
            <div className="absolute rounded-full border-2 border-dashed border-[#ffe28a]" style={{ left: -CANNON_HIT_RADIUS / 2, top: -CANNON_HIT_RADIUS / 2, width: CANNON_HIT_RADIUS, height: CANNON_HIT_RADIUS }} />
          </div>
        )}
      </div>
    </>
  );
}
