'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { ITEM_DRAG_TYPE, useInventory } from '@/components/inventory';
import { GEAR_HOLDER_ATTR, multLabel } from './gear';
import type { GearControl } from './gear-layer';
import type { CursorOffset } from './chicken-orbs';
import { HelperCrosshairs, activeCursors, type HelperAim } from './helper-crosshairs';
import { HelperMult, useHelperMult } from './helper-mult';
import {
  HELPER_GAP_PX,
  HELPER_WAKE_HOP,
  HELPER_WAKE_MS,
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
  hasLaser: () => boolean;
}

interface MonkeyLayerProps {
  controlRef: RefObject<MonkeyControl | null>;
  jungle: boolean;
  dartSound: () => void;
  speak: () => void;
  targets: () => JevPoint[];
  paused: boolean;
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
const LASER_FLASH_MS = 240;

export function MonkeyLayer({ controlRef, jungle, dartSound, speak, targets, paused, cursors, click, gearRef }: MonkeyLayerProps) {
  const { items, grant } = useInventory();
  const [phase, setPhase] = useState<MonkeyPhase>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [grabbed, setGrabbed] = useState(false);
  const portsRef = useRef({ targets, paused, cursors, click, grant, dartSound, speak });
  portsRef.current = { targets, paused, cursors, click, grant, dartSound, speak };
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
  const mult = useHelperMult(gearRef, 'monkey', owned || phase !== 'idle');
  const ownedRef = useRef(owned);
  ownedRef.current = owned;

  const wake = useCallback(() => {
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
  }, []);

  useImperativeHandle(
    controlRef,
    () => ({
      wake,
      busy: () => phaseRef.current !== 'idle',
      equipLaser: () => {
        laserRef.current = true;
      },
      hasLaser: () => laserRef.current,
    }),
    [wake]
  );

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

  useEffect(() => {
    if (owned || phase !== 'idle') setGrabbed(false);
  }, [owned, phase]);

  useEffect(() => {
    if (owned && phase === 'idle') setPhase('active');
  }, [owned, phase]);

  useEffect(() => {
    if (phase !== 'rising' && phase !== 'leaving') return;
    const rising = phase === 'rising';
    const move = ownedRef.current
      ? bodyRef.current?.animate(HELPER_WAKE_HOP, { duration: HELPER_WAKE_MS, easing: 'ease-out' })
      : bodyRef.current?.animate(
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
    let endsAt = Number.POSITIVE_INFINITY;
    callsRef.current += 1;
    let nextShot = begin;
    let dart = 0;
    let raf = 0;
    let last = begin;
    let pick = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (portsRef.current.paused) {
        endsAt += dt;
        nextShot += dt;
        raf = requestAnimationFrame(tick);
        return;
      }
      const list = portsRef.current.targets();
      const at = list[pick % list.length];
      const aimed = activeCursors(portsRef.current.cursors());
      aimRef.current?.(at, aimed, false);
      if (now >= nextShot) {
        const box = bodyRef.current?.getBoundingClientRect();
        const gun = gearRef.current?.heldBy('monkey');
        nextShot = now + MONKEY_SHOT_MS;
        pick += 1;
        portsRef.current.click(at, aimed.length * (gearRef.current?.mult('monkey') ?? 1));
        if (gun) {
          if (box) gearRef.current?.fire(gun, { x: box.left + box.width * (flipRef.current ? 1 - MOUTH_X : MOUTH_X), y: box.top + box.height * MOUTH_Y }, at, false);
        } else if (laserRef.current) {
          if (box && beamRef.current) {
            const eye = { x: box.left + box.width * (flipRef.current ? 1 - EYE_X : EYE_X), y: box.top + box.height * EYE_Y };
            const beam = beamRef.current;
            beam.style.width = `${Math.hypot(at.x - eye.x, at.y - eye.y)}px`;
            const start = `translate(${eye.x}px, ${eye.y}px) rotate(${Math.atan2(at.y - eye.y, at.x - eye.x)}rad)`;
            beam.animate(
              [
                { transform: `${start} scaleY(1.6)`, opacity: 1 },
                { transform: `${start} scaleY(0.3)`, opacity: 0 },
              ],
              { duration: LASER_FLASH_MS, easing: 'ease-out' }
            );
          }
        } else {
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

  const shown = phase !== 'idle' || owned;
  const sleeping = phase === 'idle';
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
        <div data-testid="monkey" data-phase={phase} className={`pointer-events-none fixed inset-0 z-[90] overflow-hidden ${paused ? 'invisible' : ''}`}>
          {phase === 'active' && <HelperCrosshairs aimRef={aimRef} tag={MONKEY_COPY.tag} testId="monkey-crosshair" />}
          <div ref={beamRef} data-testid="monkey-beam" style={{ transformOrigin: 'left center' }} className="absolute left-0 top-0 h-[9px] -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#ff2020,#fff_40%,#fff_60%,#ff2020)] opacity-0 shadow-[0_0_16px_6px_#ff2020,0_0_40px_14px_rgba(255,30,30,0.45)]" />
          {DART_SLOTS.map((slot) => (
            <div
              key={slot}
              ref={(el) => {
                dartsRef.current[slot] = el;
              }}
              data-testid="monkey-dart"
              className="absolute left-0 top-0 h-[6px] w-[38px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#d9c08a,#ff3b3b)] opacity-0 shadow-[0_0_6px_rgba(255,59,59,0.6)]"
            />
          ))}
          <div
            ref={bodyRef}
            data-hud
            data-testid="monkey-body"
            {...{ [GEAR_HOLDER_ATTR]: 'monkey' }}
            onMouseEnter={() => portsRef.current.speak()}
            onClick={() => (sleeping ? wake() : portsRef.current.speak())}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => gearRef.current?.give(e.dataTransfer.getData(ITEM_DRAG_TYPE), 'monkey')}
            style={{ width: box.h, height: box.h, ...(monkeyOnLeft ? { left: JEV_RIGHT_PX } : { right: monkeyRight }), transform: phase === 'rising' && !owned ? 'translateY(105%)' : undefined }}
            className="pointer-events-auto absolute bottom-0"
          >
            {sleeping && <span className="absolute -top-6 left-1/2 text-lg font-bold text-white/80 animate-pulse">z z z</span>}
            {mult > 1 && <HelperMult mult={mult} testId="monkey-mult" />}
            <img src={phase === 'active' ? MONKEY_ART.shoot : MONKEY_ART.sit} alt="" draggable={false} className={`h-full w-full object-contain object-bottom ${monkeyOnLeft ? '-scale-x-100' : ''} ${sleeping ? 'brightness-75' : ''}`} />
          </div>
        </div>
      )}
    </>
  );
}
