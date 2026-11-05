'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { ITEM_DRAG_TYPE, useInventory } from '@/components/inventory';
import { GUN_SHOT_MS } from './gear';
import type { GearControl } from './gear-layer';
import type { CursorOffset } from './chicken-orbs';
import { HelperCrosshairs, activeCursors, type HelperAim } from './helper-crosshairs';
import {
  JEV_ACTIVE_MS,
  JEV_ART,
  JEV_CLICK_INTERVAL_MS,
  JEV_COOLDOWN_MS,
  JEV_COPY,
  JEV_ITEM_ID,
  JEV_MAX_CLICKS_PER_FRAME,
  JEV_NOTE_MS,
  JEV_PROMPT_EDGE_PX,
  JEV_PROMPT_MS,
  JEV_REACH_MS,
  JEV_RIGHT_PX,
  JEV_RISE_MS,
  JEV_SLEEP_MS,
  JEV_SQUEEZE_MS,
  formatJevWait,
  helperPlayMs,
  jevArmAngle,
  jevArmLength,
  jevBox,
  jevClicksDue,
  readJevReadyAt,
  writeJevReadyAt,
  type JevPoint,
} from './jev-helper';

export interface JevControl {
  offer: (x: number, y: number) => void;
  wake: () => void;
  busy: () => boolean;
}

interface JevLayerProps {
  controlRef: RefObject<JevControl | null>;
  target: () => JevPoint;
  cursors: () => CursorOffset[];
  click: (at: JevPoint, count: number) => void;
  speak: () => void;
  gearRef: RefObject<GearControl | null>;
}

type JevPhase = 'idle' | 'rising' | 'active' | 'asleep';

const SHOULDER_X = 0.32;
const SHOULDER_Y = 0.82;

export function JevLayer({ controlRef, target, cursors, click, speak, gearRef }: JevLayerProps) {
  const { grant } = useInventory();
  const [phase, setPhase] = useState<JevPhase>('idle');
  const [prompt, setPrompt] = useState<JevPoint | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const portsRef = useRef({ target, cursors, click, speak, grant });
  portsRef.current = { target, cursors, click, speak, grant };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const promptTimerRef = useRef(0);
  const callsRef = useRef(0);
  const noteTimerRef = useRef(0);
  const sleepTimerRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const reachRef = useRef<HTMLDivElement>(null);
  const fistRef = useRef<HTMLImageElement>(null);
  const openRef = useRef<HTMLImageElement>(null);
  const aimRef = useRef<HelperAim | null>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const start = useCallback(() => {
    portsRef.current.speak();
    setPhase('rising');
  }, []);

  useImperativeHandle(
    controlRef,
    () => ({
      offer: (x, y) => {
        portsRef.current.speak();
        const edge = JEV_PROMPT_EDGE_PX;
        setPrompt({ x: Math.min(Math.max(x, edge), window.innerWidth - edge), y: Math.min(Math.max(y, edge / 2), window.innerHeight - edge) });
        window.clearTimeout(promptTimerRef.current);
        promptTimerRef.current = window.setTimeout(() => setPrompt(null), JEV_PROMPT_MS);
      },
      wake: () => {
        if (phaseRef.current !== 'idle') return;
        const left = readJevReadyAt() - Date.now();
        if (left > 0) {
          setNote(JEV_COPY.sleeping(formatJevWait(left)));
          window.clearTimeout(noteTimerRef.current);
          noteTimerRef.current = window.setTimeout(() => setNote(null), JEV_NOTE_MS);
          return;
        }
        start();
      },
      busy: () => phaseRef.current !== 'idle',
    }),
    [start]
  );

  useEffect(
    () => () => {
      window.clearTimeout(promptTimerRef.current);
      window.clearTimeout(noteTimerRef.current);
      window.clearTimeout(sleepTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (phase !== 'rising') return;
    const rise = bodyRef.current?.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: JEV_RISE_MS, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
    if (!rise) return;
    rise.onfinish = () => setPhase('active');
    return () => {
      rise.onfinish = null;
      rise.cancel();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    reachRef.current?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: JEV_REACH_MS, easing: 'ease-out' });
    const begin = performance.now();
    const endsAt = begin + helperPlayMs(callsRef.current, Math.random);
    callsRef.current += 1;
    let last = begin;
    let owed = 0;
    let nextGunShot = 0;
    let raf = 0;
    const tick = (now: number) => {
      const at = portsRef.current.target();
      const box = bodyRef.current?.getBoundingClientRect();
      if (box && armRef.current) {
        const shoulder = { x: box.left + box.width * SHOULDER_X, y: box.top + box.height * SHOULDER_Y };
        const arm = armRef.current;
        arm.style.left = `${shoulder.x - arm.offsetWidth}px`;
        arm.style.top = `${shoulder.y - arm.offsetHeight / 2}px`;
        arm.style.transform = `rotate(${jevArmAngle(shoulder, at)}rad)`;
      }
      const squeezed = Math.floor(now / JEV_SQUEEZE_MS) % 2 === 0;
      if (fistRef.current && openRef.current) {
        fistRef.current.style.opacity = squeezed ? '1' : '0';
        openRef.current.style.opacity = squeezed ? '0' : '1';
      }
      const aimed = activeCursors(portsRef.current.cursors());
      aimRef.current?.(at, aimed, squeezed);
      owed += now - last;
      last = now;
      const due = jevClicksDue(owed);
      owed -= due * JEV_CLICK_INTERVAL_MS;
      const gun = gearRef.current?.heldBy('jev');
      if (gun) {
        if (now >= nextGunShot && box) {
          nextGunShot = now + GUN_SHOT_MS;
          gearRef.current?.fire(gun, { x: box.left, y: box.top }, at);
        }
      } else {
        for (let i = 0; i < Math.min(due, JEV_MAX_CLICKS_PER_FRAME); i++) portsRef.current.click(at, aimed.length);
      }
      if (countRef.current) countRef.current.textContent = String(Math.max(0, Math.ceil((endsAt - now) / 1000)));
      if (now >= endsAt) {
        writeJevReadyAt(Date.now() + JEV_COOLDOWN_MS);
        setPhase('asleep');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, gearRef]);

  useEffect(() => {
    if (phase !== 'asleep') return;
    sleepTimerRef.current = window.setTimeout(() => {
      const box = bodyRef.current?.getBoundingClientRect();
      portsRef.current.grant(JEV_ITEM_ID, box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined);
      setPhase('idle');
    }, JEV_SLEEP_MS);
  }, [phase]);

  const shown = phase !== 'idle';
  const box = shown ? jevBox(window.innerWidth, window.innerHeight) : null;
  const armLength = shown ? jevArmLength(window.innerWidth) : 0;

  return (
    <>
      {prompt && (
        <div
          data-testid="jev-prompt"
          data-hud
          style={{ left: prompt.x, top: prompt.y }}
          className="fixed z-[110] w-[260px] -translate-x-1/2 rounded-xl bg-black/85 p-3 text-center text-sm text-white shadow-[0_0_0_1px_rgba(255,59,59,0.6),0_0_24px_rgba(255,0,0,0.25)]"
        >
          <p className="mb-2 font-semibold">{JEV_COPY.ask}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              data-testid="jev-activate"
              onClick={() => {
                window.clearTimeout(promptTimerRef.current);
                setPrompt(null);
                setPhase('rising');
              }}
              className="cursor-pointer rounded-full bg-[#d11] px-4 py-1.5 font-semibold text-white"
            >
              {JEV_COPY.yes}
            </button>
            <button
              type="button"
              data-testid="jev-decline"
              onClick={() => {
                window.clearTimeout(promptTimerRef.current);
                setPrompt(null);
              }}
              className="cursor-pointer rounded-full bg-white/15 px-4 py-1.5 text-white"
            >
              {JEV_COPY.no}
            </button>
          </div>
        </div>
      )}
      {note && (
        <div data-testid="jev-note" className="pointer-events-none fixed bottom-24 right-6 z-[110] rounded-full bg-black/80 px-3 py-1 text-sm font-semibold text-white">
          {note}
        </div>
      )}
      {box && (
        <div data-testid="jev" data-phase={phase} className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
          {phase === 'active' && (
            <>
              <div ref={armRef} data-testid="jev-arm" style={{ width: armLength, height: armLength / 3, transformOrigin: 'right center' }} className="absolute left-0 top-0">
                <div ref={reachRef} style={{ transformOrigin: 'right center' }} className="relative h-full w-full">
                  <img ref={openRef} src={JEV_ART.armOpen} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
                  <img ref={fistRef} src={JEV_ART.armFist} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain opacity-0" />
                </div>
              </div>
              <HelperCrosshairs aimRef={aimRef} tag={JEV_COPY.tag} testId="jev-crosshair" />
            </>
          )}
          <div
            ref={bodyRef}
            data-hud
            data-testid="jev-body"
            onMouseEnter={() => portsRef.current.speak()}
            onClick={() => portsRef.current.speak()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => gearRef.current?.give(e.dataTransfer.getData(ITEM_DRAG_TYPE), 'jev')}
            style={{ width: box.w, height: box.h, right: JEV_RIGHT_PX, transform: phase === 'rising' ? 'translateY(105%)' : undefined }}
            className="pointer-events-auto absolute bottom-0"
          >
            {phase === 'active' && (
              <span ref={countRef} data-testid="jev-countdown" className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-2.5 text-lg font-bold tabular-nums leading-6 text-[#ff4040]">
                {JEV_ACTIVE_MS / 1000}
              </span>
            )}
            {phase === 'asleep' && <span className="absolute -top-6 left-1/2 text-lg font-bold text-white/80 animate-pulse">z z z</span>}
            <img src={phase === 'asleep' ? JEV_ART.sleep : JEV_ART.bust} alt="" draggable={false} className="h-full w-full object-contain object-bottom" />
          </div>
        </div>
      )}
    </>
  );
}
