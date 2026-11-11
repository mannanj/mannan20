'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { ITEM_DRAG_TYPE, useInventory } from '@/components/inventory';
import { GEAR_HOLDER_ATTR, GUN_SHOT_MS } from './gear';
import { HelperMult, useHelperMult } from './helper-mult';
import { AboveBadge } from './above-badge';
import type { GearControl } from './gear-layer';
import type { CursorOffset } from './chicken-orbs';
import { HelperCrosshairs, activeCursors, type HelperAim } from './helper-crosshairs';
import {
  HELPER_WAKE_HOP,
  HELPER_WAKE_MS,
  JEV_ACTIVE_MS,
  JEV_ART,
  JEV_CLICK_INTERVAL_MS,
  JEV_COOLDOWN_MS,
  JEV_COPY,
  JEV_ITEM_ID,
  JEV_MAX_CLICKS_PER_FRAME,
  JEV_NOTE_MS,
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
  targets: () => JevPoint[];
  paused: boolean;
  cursors: () => CursorOffset[];
  click: (at: JevPoint, count: number) => void;
  speak: () => void;
  gearRef: RefObject<GearControl | null>;
}

type JevPhase = 'idle' | 'rising' | 'active' | 'asleep';

const JEV_CALLED_KEY = 'chicken-jev-called';

function jevCalledBefore(): boolean {
  try {
    return localStorage.getItem(JEV_CALLED_KEY) === '1';
  } catch {
    return false;
  }
}

function markJevCalled(): void {
  try {
    localStorage.setItem(JEV_CALLED_KEY, '1');
  } catch {}
}

const SHOULDER_X = 0.32;
const SHOULDER_Y = 0.82;
const JEV_RETARGET_MS = 700;

export function JevLayer({ controlRef, targets, paused, cursors, click, speak, gearRef }: JevLayerProps) {
  const { items, grant } = useInventory();
  const owned = items.some((i) => i.id === JEV_ITEM_ID);
  const ownedRef = useRef(owned);
  ownedRef.current = owned;
  const [phase, setPhase] = useState<JevPhase>('idle');
  const mult = useHelperMult(gearRef, 'jev', owned || phase !== 'idle');
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const portsRef = useRef({ targets, paused, cursors, click, speak, grant });
  portsRef.current = { targets, paused, cursors, click, speak, grant };
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
    markJevCalled();
    portsRef.current.speak();
    setPhase('rising');
  }, []);

  const wake = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    const left = readJevReadyAt() - Date.now();
    if (left > 0) {
      setNote(JEV_COPY.sleeping(formatJevWait(left)));
      window.clearTimeout(noteTimerRef.current);
      noteTimerRef.current = window.setTimeout(() => setNote(null), JEV_NOTE_MS);
      return;
    }
    start();
  }, [start]);

  useImperativeHandle(
    controlRef,
    () => ({
      offer: (x, y) => {
        portsRef.current.speak();
        if (!ownedRef.current) portsRef.current.grant(JEV_ITEM_ID, { x, y });
        if (jevCalledBefore()) return;
        setAsking(true);
        window.clearTimeout(promptTimerRef.current);
        promptTimerRef.current = window.setTimeout(() => setAsking(false), JEV_PROMPT_MS);
      },
      wake,
      busy: () => phaseRef.current !== 'idle',
    }),
    [wake]
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
    if (owned && phase === 'idle' && jevCalledBefore()) setPhase('active');
  }, [owned, phase]);

  useEffect(() => {
    if (phase !== 'rising') return;
    const rise = ownedRef.current
      ? bodyRef.current?.animate(HELPER_WAKE_HOP, { duration: HELPER_WAKE_MS, easing: 'ease-out' })
      : bodyRef.current?.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: JEV_RISE_MS, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
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
    let endsAt = Number.POSITIVE_INFINITY;
    callsRef.current += 1;
    let last = begin;
    let owed = 0;
    let nextGunShot = 0;
    let raf = 0;
    let pick = 0;
    let nextSwitch = begin + JEV_RETARGET_MS;
    const tick = (now: number) => {
      if (portsRef.current.paused) {
        endsAt += now - last;
        nextSwitch += now - last;
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (now >= nextSwitch) {
        pick += 1;
        nextSwitch = now + JEV_RETARGET_MS;
      }
      const list = portsRef.current.targets();
      const at = list[pick % list.length];
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
      if (gun && now >= nextGunShot && box) {
        nextGunShot = now + GUN_SHOT_MS;
        gearRef.current?.fire(gun, { x: box.left, y: box.top }, at, false);
      }
      const mult = gearRef.current?.mult('jev') ?? 1;
      for (let i = 0; i < Math.min(due, JEV_MAX_CLICKS_PER_FRAME); i++) portsRef.current.click(at, aimed.length * mult);
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

  const shown = phase !== 'idle' || owned;
  const sleeping = phase === 'asleep' || phase === 'idle';
  const box = shown ? jevBox(window.innerWidth, window.innerHeight) : null;
  const armLength = shown ? jevArmLength(window.innerWidth) : 0;

  return (
    <>
      {note && (
        <div data-testid="jev-note" className="pointer-events-none fixed bottom-24 right-6 z-[110] rounded-full bg-black/80 px-3 py-1 text-sm font-semibold text-white">
          {note}
        </div>
      )}
      {box && (
        <div data-testid="jev" data-phase={phase} className={`pointer-events-none fixed inset-0 z-[90] overflow-hidden ${paused ? 'invisible' : ''}`}>
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
            {...{ [GEAR_HOLDER_ATTR]: 'jev' }}
            onMouseEnter={() => portsRef.current.speak()}
            onClick={() => (phase === 'idle' ? wake() : portsRef.current.speak())}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => gearRef.current?.give(e.dataTransfer.getData(ITEM_DRAG_TYPE), 'jev')}
            style={{ width: box.w, height: box.h, right: JEV_RIGHT_PX, transform: phase === 'rising' && !owned ? 'translateY(105%)' : undefined }}
            className="pointer-events-auto absolute bottom-0"
          >
            {mult > 1 && <HelperMult mult={mult} testId="jev-mult" />}
            {asking && phase === 'idle' && (
              <div
                data-testid="jev-prompt"
                data-hud
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto absolute bottom-full left-1/2 mb-3 w-[240px] -translate-x-1/2 rounded-xl bg-black/85 p-3 text-center text-sm text-white shadow-[0_0_0_1px_rgba(255,59,59,0.6),0_0_24px_rgba(255,0,0,0.25)]"
              >
                <p className="mb-2 font-semibold">{JEV_COPY.ask}</p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    data-testid="jev-activate"
                    onClick={() => {
                      window.clearTimeout(promptTimerRef.current);
                      setAsking(false);
                      markJevCalled();
                      start();
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
                      setAsking(false);
                    }}
                    className="cursor-pointer rounded-full bg-white/15 px-4 py-1.5 text-white"
                  >
                    {JEV_COPY.no}
                  </button>
                </div>
              </div>
            )}
            <img src={sleeping ? JEV_ART.sleep : JEV_ART.bust} alt="" draggable={false} className="h-full w-full object-contain object-bottom" />
          </div>
        </div>
      )}
    </>
  );
}
