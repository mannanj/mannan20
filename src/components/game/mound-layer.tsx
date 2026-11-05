'use client';

import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { useInventory } from '@/components/inventory';
import type { CursorOffset } from './chicken-orbs';
import { ChickenSvg } from './chicken-svg';
import { JEV_NOTE_MS, formatJevWait, readJevReadyAt, writeJevReadyAt } from './jev-helper';
import {
  MONGOOSE_ART,
  MONGOOSE_COOLDOWN_MS,
  MONGOOSE_GRAVITY,
  MONGOOSE_POINTS_PER_SECOND,
  MONGOOSE_READY_KEY,
  MONGOOSE_RUN_PX_PER_MS,
  MONGOOSE_SIZE,
  MONGOOSE_STAY_MS,
  MONGOOSE_WANDER_MS,
  MOUND_ART,
  MOUND_ART_H,
  MOUND_ART_W,
  MOUND_BREAK_GAP_MS,
  MOUND_COPY,
  MOUND_COUNT,
  MOUND_ENTER_MS,
  MOUND_HEAD_POINTS,
  MOUND_HIT_RADIUS,
  MOUND_ITEM_ID,
  MOUND_MONGOOSE_AT_MS,
  MOUND_POP_GAP_MIN_MS,
  MOUND_POP_GAP_SPREAD_MS,
  MOUND_POP_MS,
  MOUND_SCENE_MS,
  MOUND_SCORE,
  MOUND_SPLIT_AT_MS,
  MOUND_SPLIT_MS,
  MOUND_SPLIT_ORB_MS,
  MOUND_SWARM_CHANCE,
  MOUND_SWARM_COOLDOWN_MS,
  MOUND_SWARM_MS,
  moundLayout,
  moundPhaseAt,
  splitShape,
  tossHitsChicken,
  type MoundPhase,
  type MoundPoint,
} from './mounds';

export interface MoundControl {
  start: () => void;
  active: () => boolean;
  holdsScene: (score: number) => boolean;
  shouldStart: (score: number) => boolean;
  pull: () => MoundPoint | null;
  hitAt: (x: number, y: number) => boolean;
  wakePet: () => void;
  skip: () => void;
}

interface MoundLayerProps {
  controlRef: RefObject<MoundControl | null>;
  groundY: () => number;
  target: () => MoundPoint;
  skin: string;
  tier: number;
  hit: (at: MoundPoint, count: number) => void;
  bite: (at: MoundPoint) => void;
  setCursorShape: (shape: CursorOffset[] | null) => void;
  burst: (at: MoundPoint) => void;
  onDone: () => void;
}

type PetPhase = 'none' | 'wander' | 'held' | 'flying' | 'friend';

const HEARTS = [0, 1, 2, 3];
const HEAD_W = 46;
const HEAD_CLIP_H = 62;
const MONGOOSE_LAP_MS = 1400;
const MONGOOSE_LAP_STEP_MS = 170;

export function MoundLayer({ controlRef, groundY, target, skin, tier, hit, bite, setCursorShape, burst, onDone }: MoundLayerProps) {
  const { grant } = useInventory();
  const portsRef = useRef({ groundY, target, hit, bite, setCursorShape, burst, onDone, grant });
  portsRef.current = { groundY, target, hit, bite, setCursorShape, burst, onDone, grant };
  const [phase, setPhase] = useState<MoundPhase>('idle');
  const [mounds, setMounds] = useState<MoundPoint[]>([]);
  const [up, setUp] = useState<boolean[]>([]);
  const [broken, setBroken] = useState<boolean[]>([]);
  const [splitOrb, setSplitOrb] = useState(false);
  const [pet, setPet] = useState<PetPhase>('none');
  const [note, setNote] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const petRef = useRef(pet);
  petRef.current = pet;
  const moundsRef = useRef(mounds);
  moundsRef.current = mounds;
  const upUntilRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const noteTimerRef = useRef(0);
  const petElRef = useRef<HTMLDivElement>(null);
  const petPosRef = useRef<MoundPoint>({ x: 0, y: 0 });
  const petVelRef = useRef<MoundPoint>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; at: number } | null>(null);

  useImperativeHandle(
    controlRef,
    () => ({
      start: () => {
        if (phaseRef.current !== 'idle' || doneRef.current) return;
        const layout = moundLayout(window.innerWidth, window.innerHeight);
        upUntilRef.current = layout.map(() => 0);
        setMounds(layout);
        setUp(layout.map(() => false));
        setBroken(layout.map(() => false));
        setPhase('enter');
      },
      active: () => phaseRef.current !== 'idle',
      holdsScene: (score) => score >= MOUND_SCORE && !doneRef.current,
      shouldStart: (score) => score >= MOUND_SCORE && !doneRef.current && phaseRef.current === 'idle',
      pull: () => (phaseRef.current === 'enter' && moundsRef.current.length > 0 ? moundsRef.current[Math.floor(MOUND_COUNT / 2)] : null),
      hitAt: (x, y) => {
        if (phaseRef.current !== 'whack' && phaseRef.current !== 'mongoose') return false;
        const now = performance.now();
        const index = moundsRef.current.findIndex((m, i) => upUntilRef.current[i] > now && Math.hypot(x - m.x, y - (m.y - MOUND_ART_H * 0.7)) <= MOUND_HIT_RADIUS);
        if (index < 0) return false;
        upUntilRef.current[index] = 0;
        const m = moundsRef.current[index];
        portsRef.current.hit({ x: m.x, y: m.y - MOUND_ART_H * 0.7 }, MOUND_HEAD_POINTS);
        return true;
      },
      skip: () => {
        doneRef.current = true;
        if (phaseRef.current === 'idle') return;
        portsRef.current.setCursorShape(null);
        setPhase('idle');
        setMounds([]);
        setSplitOrb(false);
        portsRef.current.onDone();
      },
      wakePet: () => {
        if (petRef.current !== 'none') return;
        const left = readJevReadyAt(MONGOOSE_READY_KEY) - Date.now();
        if (left > 0) {
          setNote(MOUND_COPY.resting(formatJevWait(left)));
          window.clearTimeout(noteTimerRef.current);
          noteTimerRef.current = window.setTimeout(() => setNote(null), JEV_NOTE_MS);
          return;
        }
        petPosRef.current = { x: window.innerWidth - 60, y: portsRef.current.groundY() };
        setPet('friend');
      },
    }),
    []
  );

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

  useEffect(() => {
    if (phase !== 'enter') return;
    const begin = performance.now();
    let nextPop = begin + MOUND_ENTER_MS;
    let swarmReadyAt = begin + MOUND_ENTER_MS + MOUND_SWARM_COOLDOWN_MS / 2;
    let nextBreak = begin + MOUND_MONGOOSE_AT_MS;
    let breakIndex = 0;
    let splitShown = false;
    let current: MoundPhase = 'enter';
    const breaks = moundsRef.current.map((_, i) => i).sort(() => Math.random() - 0.5);
    const tick = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - begin;
      const next = moundPhaseAt(elapsed);
      if (next !== current) {
        current = next;
        if (next !== 'gone') setPhase(next);
      }
      if (next === 'gone') {
        window.clearInterval(tick);
        doneRef.current = true;
        portsRef.current.setCursorShape(null);
        portsRef.current.burst(portsRef.current.target());
        setPhase('idle');
        setMounds([]);
        setSplitOrb(false);
        portsRef.current.onDone();
        petPosRef.current = { x: window.innerWidth * 0.7, y: portsRef.current.groundY() };
        setPet('wander');
        return;
      }
      if (!splitShown && elapsed >= MOUND_SPLIT_AT_MS) {
        splitShown = true;
        setSplitOrb(true);
        window.setTimeout(() => setSplitOrb(false), MOUND_SPLIT_ORB_MS);
      }
      const alive = moundsRef.current.map((_, i) => i).filter((i) => !breaks.slice(0, breakIndex).includes(i));
      if (next !== 'enter' && now >= nextPop && alive.length > 0) {
        if (now >= swarmReadyAt && Math.random() < MOUND_SWARM_CHANCE * 4) {
          for (const i of alive) upUntilRef.current[i] = now + MOUND_SWARM_MS;
          swarmReadyAt = now + MOUND_SWARM_COOLDOWN_MS;
          nextPop = now + MOUND_SWARM_MS;
        } else {
          upUntilRef.current[alive[Math.floor(Math.random() * alive.length)]] = now + MOUND_POP_MS;
          nextPop = now + MOUND_POP_GAP_MIN_MS + Math.random() * MOUND_POP_GAP_SPREAD_MS;
        }
      }
      if (next === 'mongoose' && now >= nextBreak && breakIndex < breaks.length) {
        const index = breaks[breakIndex];
        breakIndex += 1;
        nextBreak = now + MOUND_BREAK_GAP_MS;
        upUntilRef.current[index] = 0;
        setBroken((b) => b.map((v, i) => v || i === index));
        const m = moundsRef.current[index];
        if (m) portsRef.current.burst({ x: m.x, y: m.y - MOUND_ART_H / 2 });
      }
      setUp((prev) => {
        const nextUp = upUntilRef.current.map((until) => until > now);
        return nextUp.every((v, i) => v === prev[i]) ? prev : nextUp;
      });
    }, 60);
    return () => window.clearInterval(tick);
  }, [phase === 'idle']);

  useEffect(() => {
    if (pet === 'none' || pet === 'held') return;
    let last = performance.now();
    const begin = last;
    let raf = 0;
    let owed = 0;
    let dir = -1;
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const pos = petPosRef.current;
      const floor = portsRef.current.groundY();
      if (pet === 'wander') {
        pos.x += dir * MONGOOSE_RUN_PX_PER_MS * 0.5 * dt;
        pos.y = floor;
        if (pos.x < 80 || pos.x > window.innerWidth - 80) dir *= -1;
        if (now - begin > MONGOOSE_WANDER_MS) {
          setPet('none');
          return;
        }
      } else if (pet === 'flying') {
        const v = petVelRef.current;
        v.y += MONGOOSE_GRAVITY * dt;
        pos.x += v.x * dt;
        pos.y += v.y * dt;
        if (pos.y >= floor) {
          pos.y = floor;
          setPet('wander');
          return;
        }
      } else {
        const at = portsRef.current.target();
        const dist = Math.hypot(at.x - pos.x, at.y - pos.y);
        if (dist > 30) {
          const step = Math.min(dist, MONGOOSE_RUN_PX_PER_MS * 2 * dt);
          pos.x += ((at.x - pos.x) / dist) * step;
          pos.y += ((at.y - pos.y) / dist) * step;
        } else {
          owed += dt;
          const every = 1000 / MONGOOSE_POINTS_PER_SECOND;
          while (owed >= every) {
            owed -= every;
            portsRef.current.bite(at);
          }
        }
        if (now - begin > MONGOOSE_STAY_MS) {
          writeJevReadyAt(Date.now() + MONGOOSE_COOLDOWN_MS, MONGOOSE_READY_KEY);
          portsRef.current.grant(MOUND_ITEM_ID, { x: pos.x, y: pos.y });
          setPet('none');
          return;
        }
      }
      if (petElRef.current) petElRef.current.style.transform = `translate(${pos.x - MONGOOSE_SIZE / 2}px, ${pos.y - MONGOOSE_SIZE}px) scaleX(${pet === 'wander' && dir > 0 ? -1 : 1})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pet]);

  const grab = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (petRef.current !== 'wander' && petRef.current !== 'flying') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, at: performance.now() };
    petVelRef.current = { x: 0, y: 0 };
    setPet('held');
  };
  const drag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const last = dragRef.current;
    if (!last) return;
    const now = performance.now();
    const dt = Math.max(1, now - last.at);
    petVelRef.current = { x: (e.clientX - last.x) / dt, y: (e.clientY - last.y) / dt };
    dragRef.current = { x: e.clientX, y: e.clientY, at: now };
    petPosRef.current = { x: e.clientX, y: e.clientY + MONGOOSE_SIZE / 2 };
    if (petElRef.current) petElRef.current.style.transform = `translate(${e.clientX - MONGOOSE_SIZE / 2}px, ${e.clientY - MONGOOSE_SIZE / 2}px)`;
  };
  const toss = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    const from = { x: petPosRef.current.x, y: petPosRef.current.y - MONGOOSE_SIZE / 2 };
    setPet(tossHitsChicken(from, petVelRef.current, portsRef.current.target()) ? 'friend' : 'flying');
  };

  return (
    <>
      {note && (
        <div data-testid="mongoose-note" className="pointer-events-none fixed bottom-48 right-6 z-[110] rounded-full bg-black/80 px-3 py-1 text-sm font-semibold text-white">
          {note}
        </div>
      )}
      {phase !== 'idle' && (
        <div data-testid="mound-scene" data-phase={phase} className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
          {mounds.map((m, i) => (
            <div key={i} data-testid="mound" data-broken={broken[i] ? '1' : '0'} data-up={up[i] ? '1' : '0'} className="absolute" style={{ left: m.x - MOUND_ART_W / 2, top: m.y - MOUND_ART_H, width: MOUND_ART_W, height: MOUND_ART_H }}>
              <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden" style={{ top: -HEAD_CLIP_H + 26, width: HEAD_W + 14, height: HEAD_CLIP_H }}>
                <div className={`absolute left-[7px] transition-transform duration-150 ${up[i] && !broken[i] ? 'translate-y-0' : 'translate-y-[70px]'}`}>
                  <ChickenSvg className="w-[46px]" tier={tier} skin={skin} eyes="calm" />
                </div>
              </div>
              <img src={broken[i] ? MOUND_ART.broken : MOUND_ART.whole} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain object-bottom" />
            </div>
          ))}
          {phase === 'mongoose' &&
            mounds.map((m, i) => (
              <img
                key={i}
                ref={(el) => {
                  el?.animate(
                    [
                      { transform: 'translateX(-70px) scaleX(1)' },
                      { transform: 'translateX(70px) scaleX(1)', offset: 0.49 },
                      { transform: 'translateX(70px) scaleX(-1)', offset: 0.5 },
                      { transform: 'translateX(-70px) scaleX(-1)', offset: 0.99 },
                      { transform: 'translateX(-70px) scaleX(1)' },
                    ],
                    { duration: MONGOOSE_LAP_MS + i * MONGOOSE_LAP_STEP_MS, iterations: Infinity }
                  );
                }}
                data-testid="mound-mongoose"
                src={MONGOOSE_ART.run}
                alt=""
                draggable={false}
                className="absolute h-16 w-16 object-contain"
                style={{ left: m.x - 32, top: m.y - 54 }}
              />
            ))}
        </div>
      )}
      {splitOrb && mounds.length > 0 && (
        <button
          type="button"
          data-testid="mound-split-orb"
          onClick={() => {
            setSplitOrb(false);
            portsRef.current.setCursorShape(splitShape(moundsRef.current));
            window.setTimeout(() => portsRef.current.setCursorShape(null), MOUND_SPLIT_MS);
          }}
          className="fixed left-[72%] top-[40%] z-[60] flex h-[72px] w-[72px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-[conic-gradient(#ff3b3b,#ffb02e,#f6ec3a,#3ddc6a,#35b6ff,#8a5cff,#ff3b3b)] text-sm font-bold text-white shadow-[0_0_24px_6px_rgba(255,255,255,0.35)] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] animate-[chickenBob_1.2s_ease-in-out_infinite]"
        >
          {MOUND_COPY.split}
        </button>
      )}
      {pet !== 'none' && (
        <div
          ref={petElRef}
          data-testid="mongoose"
          data-phase={pet}
          data-hud
          onPointerDown={grab}
          onPointerMove={drag}
          onPointerUp={toss}
          onPointerCancel={toss}
          style={{ width: MONGOOSE_SIZE, height: MONGOOSE_SIZE, touchAction: 'none' }}
          className={`fixed left-0 top-0 z-[50] ${pet === 'friend' ? 'pointer-events-none' : 'cursor-grab'}`}
        >
          {pet === 'friend' &&
            HEARTS.map((h) => (
              <span key={h} data-testid="mongoose-heart" className="absolute text-xl text-[#ff2d55] animate-[bonusRise_1.8s_ease-out_infinite]" style={{ left: 8 + h * 18, top: -18 - (h % 2) * 10, animationDelay: `${h * 0.4}s` }}>
                ♥
              </span>
            ))}
          <img src={pet === 'friend' ? MONGOOSE_ART.bite : MONGOOSE_ART.run} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain" />
        </div>
      )}
    </>
  );
}
