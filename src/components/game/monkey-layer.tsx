'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { ITEM_DRAG_TYPE, useInventory } from '@/components/inventory';
import { GUN_SHOT_MS, LASER_POINTS } from './gear';
import type { GearControl } from './gear-layer';
import type { CursorOffset } from './chicken-orbs';
import { HelperCrosshairs, activeCursors, type HelperAim } from './helper-crosshairs';
import {
  HELPER_GAP_PX,
  JEV_NOTE_MS,
  JEV_RIGHT_PX,
  MONKEY_ART,
  MONKEY_COOLDOWN_MS,
  MONKEY_COPY,
  MONKEY_DARTS,
  MONKEY_DART_MS,
  MONKEY_ITEM_ID,
  MONKEY_LEAVE_MS,
  MONKEY_READY_KEY,
  MONKEY_RISE_MS,
  MONKEY_SHOT_MS,
  formatJevWait,
  helperPlayMs,
  jevBox,
  readJevReadyAt,
  writeJevReadyAt,
  type JevPoint,
} from './jev-helper';

export interface MonkeyControl {
  wake: () => void;
  busy: () => boolean;
  equipLaser: () => void;
}

interface MonkeyLayerProps {
  controlRef: RefObject<MonkeyControl | null>;
  jungle: boolean;
  dartSound: () => void;
  speak: () => void;
  target: () => JevPoint;
  cursors: () => CursorOffset[];
  click: (at: JevPoint, count: number) => void;
  gearRef: RefObject<GearControl | null>;
}

type MonkeyPhase = 'idle' | 'rising' | 'active' | 'leaving';

const MOUTH_X = 0.12;
const MOUTH_Y = 0.3;
const EYE_X = 0.3;
const EYE_Y = 0.14;
const DART_SLOTS = Array.from({ length: MONKEY_DARTS }, (_, i) => i);
const LEADERBOARD_CLEAR_PX = 64;

export function MonkeyLayer({ controlRef, jungle, dartSound, speak, target, cursors, click, gearRef }: MonkeyLayerProps) {
  const { items, grant } = useInventory();
  const [phase, setPhase] = useState<MonkeyPhase>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [grabbed, setGrabbed] = useState(false);
  const portsRef = useRef({ target, cursors, click, grant, dartSound, speak });
  portsRef.current = { target, cursors, click, grant, dartSound, speak };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const noteTimerRef = useRef(0);
  const callsRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef(false);
  const aimRef = useRef<HelperAim | null>(null);
  const dartsRef = useRef<(HTMLDivElement | null)[]>([]);
  const laserRef = useRef(false);
  const beamRef = useRef<HTMLDivElement>(null);
  const owned = items.some((i) => i.id === MONKEY_ITEM_ID);

  useImperativeHandle(
    controlRef,
    () => ({
      wake: () => {
        if (phaseRef.current !== 'idle') return;
        const left = readJevReadyAt(MONKEY_READY_KEY) - Date.now();
        if (left > 0) {
          setNote(MONKEY_COPY.resting(formatJevWait(left)));
          window.clearTimeout(noteTimerRef.current);
          noteTimerRef.current = window.setTimeout(() => setNote(null), JEV_NOTE_MS);
          return;
        }
        portsRef.current.speak();
        setPhase('rising');
      },
      busy: () => phaseRef.current !== 'idle',
      equipLaser: () => {
        laserRef.current = true;
      },
    }),
    []
  );

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

  useEffect(() => {
    if (owned || phase !== 'idle') setGrabbed(false);
  }, [owned, phase]);

  useEffect(() => {
    if (phase !== 'rising' && phase !== 'leaving') return;
    const rising = phase === 'rising';
    const move = bodyRef.current?.animate(
      [{ transform: `translateY(${rising ? '105%' : '0'})` }, { transform: `translateY(${rising ? '0' : '105%'})` }],
      { duration: rising ? MONKEY_RISE_MS : MONKEY_LEAVE_MS, easing: 'ease-in-out', fill: 'both' }
    );
    if (!move) return;
    move.onfinish = () => {
      if (rising) {
        setPhase('active');
        return;
      }
      const box = bodyRef.current?.getBoundingClientRect();
      portsRef.current.grant(MONKEY_ITEM_ID, box ? { x: box.left + box.width / 2, y: window.innerHeight - box.height } : undefined);
      setPhase('idle');
    };
    return () => {
      move.onfinish = null;
      move.cancel();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    const begin = performance.now();
    const endsAt = begin + helperPlayMs(callsRef.current, Math.random);
    callsRef.current += 1;
    let nextShot = begin;
    let dart = 0;
    let raf = 0;
    const tick = (now: number) => {
      const at = portsRef.current.target();
      const aimed = activeCursors(portsRef.current.cursors());
      aimRef.current?.(at, aimed, false);
      if (now >= nextShot) {
        const box = bodyRef.current?.getBoundingClientRect();
        const gun = gearRef.current?.heldBy('monkey');
        nextShot = now + (gun ? GUN_SHOT_MS : MONKEY_SHOT_MS);
        if (gun) {
          if (box) gearRef.current?.fire(gun, { x: box.left + box.width * (flipRef.current ? 1 - MOUTH_X : MOUTH_X), y: box.top + box.height * MOUTH_Y }, at);
        } else if (laserRef.current) {
          portsRef.current.click(at, aimed.length * LASER_POINTS);
          if (box && beamRef.current) {
            const eye = { x: box.left + box.width * (flipRef.current ? 1 - EYE_X : EYE_X), y: box.top + box.height * EYE_Y };
            const beam = beamRef.current;
            beam.style.width = `${Math.hypot(at.x - eye.x, at.y - eye.y)}px`;
            const start = `translate(${eye.x}px, ${eye.y}px) rotate(${Math.atan2(at.y - eye.y, at.x - eye.x)}rad)`;
            beam.animate([{ transform: start, opacity: 1 }, { transform: start, opacity: 0 }], { duration: MONKEY_SHOT_MS, easing: 'ease-out' });
          }
        } else {
          portsRef.current.click(at, aimed.length);
          portsRef.current.dartSound();
        }
        const el = dartsRef.current[dart];
        dart = (dart + 1) % MONKEY_DARTS;
        if (box && el && !gun && !laserRef.current) {
          const from = { x: box.left + box.width * (flipRef.current ? 1 - MOUTH_X : MOUTH_X), y: box.top + box.height * MOUTH_Y };
          const angle = Math.atan2(at.y - from.y, at.x - from.x);
          el.animate(
            [
              { transform: `translate(${from.x}px, ${from.y}px) rotate(${angle}rad)`, opacity: 1 },
              { transform: `translate(${at.x}px, ${at.y}px) rotate(${angle}rad)`, opacity: 1 },
            ],
            { duration: MONKEY_DART_MS, easing: 'linear' }
          );
        }
      }
      if (now >= endsAt) {
        writeJevReadyAt(Date.now() + MONKEY_COOLDOWN_MS, MONKEY_READY_KEY);
        setPhase('leaving');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, gearRef]);

  const shown = phase !== 'idle';
  const box = shown ? jevBox(window.innerWidth, window.innerHeight) : null;
  const monkeyRight = box ? JEV_RIGHT_PX + box.w + HELPER_GAP_PX : 0;
  const monkeyOnLeft = box ? window.innerWidth - monkeyRight - box.h < window.innerWidth / 2 + LEADERBOARD_CLEAR_PX : false;
  flipRef.current = monkeyOnLeft;

  return (
    <>
      {jungle && !owned && !shown && !grabbed && (
        <button
          type="button"
          data-testid="jungle-monkey"
          aria-label={MONKEY_COPY.grab}
          onClick={(e) => {
            setGrabbed(true);
            portsRef.current.speak();
            portsRef.current.grant(MONKEY_ITEM_ID, { x: e.clientX, y: e.clientY });
          }}
          className="fixed right-[14%] top-[7%] z-[30] h-[120px] w-[120px] cursor-pointer animate-[chickenBob_1.6s_ease-in-out_infinite]"
        >
          <img src={MONKEY_ART.sit} alt="" draggable={false} className="h-full w-full object-contain" />
        </button>
      )}
      {note && (
        <div data-testid="monkey-note" className="pointer-events-none fixed bottom-32 right-6 z-[110] rounded-full bg-black/80 px-3 py-1 text-sm font-semibold text-white">
          {note}
        </div>
      )}
      {box && (
        <div data-testid="monkey" data-phase={phase} className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
          {phase === 'active' && <HelperCrosshairs aimRef={aimRef} tag={MONKEY_COPY.tag} testId="monkey-crosshair" />}
          <div ref={beamRef} data-testid="monkey-beam" style={{ transformOrigin: 'left center' }} className="absolute left-0 top-0 h-[3px] rounded-full bg-[#ff2020] opacity-0 shadow-[0_0_8px_2px_#ff2020]" />
          {DART_SLOTS.map((slot) => (
            <div
              key={slot}
              ref={(el) => {
                dartsRef.current[slot] = el;
              }}
              data-testid="monkey-dart"
              className="absolute left-0 top-0 h-[3px] w-[18px] rounded-full bg-[linear-gradient(90deg,#d9c08a,#ff3b3b)] opacity-0"
            />
          ))}
          <div
            ref={bodyRef}
            data-hud
            data-testid="monkey-body"
            onMouseEnter={() => portsRef.current.speak()}
            onClick={() => portsRef.current.speak()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => gearRef.current?.give(e.dataTransfer.getData(ITEM_DRAG_TYPE), 'monkey')}
            style={{ width: box.h, height: box.h, ...(monkeyOnLeft ? { left: JEV_RIGHT_PX } : { right: monkeyRight }), transform: phase === 'rising' ? 'translateY(105%)' : undefined }}
            className="pointer-events-auto absolute bottom-0"
          >
            <img src={phase === 'active' ? MONKEY_ART.shoot : MONKEY_ART.sit} alt="" draggable={false} className={`h-full w-full object-contain object-bottom ${monkeyOnLeft ? '-scale-x-100' : ''}`} />
          </div>
        </div>
      )}
    </>
  );
}
