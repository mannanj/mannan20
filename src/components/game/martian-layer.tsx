'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  MARTIAN_CLICKS_GOAL,
  MARTIAN_FIRST_SPAWN_MS,
  MARTIAN_KINDS,
  MARTIAN_LABEL_MS,
  MARTIAN_MAX_ON_SCREEN,
  MARTIAN_REWARD_STAY_MS,
  MARTIAN_SLOTS,
  MARTIAN_SPAWN_MIN_MS,
  MARTIAN_SPAWN_SPREAD_MS,
  MARTIAN_SPECS,
  MARTIAN_STAY_MS,
  MARTIAN_WALK_MS,
  readMartianClicks,
  setMartianSpawnHandler,
  writeMartianClicks,
  type MartianKind,
} from './martians';

type WalkPhase = 'enter' | 'idle' | 'leave';

interface Walker {
  id: number;
  kind: MartianKind;
  slot: number;
  scale: number;
  side: 1 | -1;
  phase: WalkPhase;
  hop: number;
}

interface MartianLayerProps {
  active: boolean;
  blocked: boolean;
  onReward: (x: number, y: number) => void;
  avoidXFrac?: () => number | null;
  occupiedRef?: MutableRefObject<MartianSpot[]>;
}

const RING_R = 22;
const RING_LEN = 2 * Math.PI * RING_R;
const SPAWN_ID_START = 1;
const MARTIAN_CHICKEN_GAP_FRAC = 0.16;

export interface MartianSpot {
  xFrac: number;
  width: number;
}
const MARTIAN_CHICKEN_GAP_PX = 170;
const MARTIAN_MIN_SCALE = 0.4;
const MARTIAN_MAX_SCALE = 4;

function pickKind(): MartianKind {
  return MARTIAN_KINDS[Math.floor(Math.random() * MARTIAN_KINDS.length)];
}

function offscreenClass(side: 1 | -1): string {
  return side === 1 ? 'translate-x-[110vw]' : '-translate-x-[110vw]';
}

interface FriendProps {
  walker: Walker;
  count: number;
  labelOn: boolean;
  onPoke: (id: number, el: HTMLElement) => void;
}

function Friend({ walker, count, labelOn, onPoke }: FriendProps) {
  const spec = MARTIAN_SPECS[walker.kind];
  const height = spec.height * walker.scale;
  const width = height * spec.aspect;
  const moving = walker.phase !== 'idle';
  const shifted = walker.phase === 'enter' ? offscreenClass(walker.side) : walker.phase === 'leave' ? offscreenClass(walker.side) : 'translate-x-0';
  const facing = walker.side === 1 ? 1 : -1;
  return (
    <div
      className="absolute bottom-[11%] z-[3] pointer-events-none"
      style={{ left: `${walker.slot}%`, width }}
      data-testid="martian-slot"
    >
      <div
        className={`relative transition-transform ease-out ${shifted}`}
        style={{ transitionDuration: `${MARTIAN_WALK_MS}ms` }}
      >
        {walker.kind === 'zap' && (
          <div
            className={`absolute -top-[40vh] bottom-0 left-1/2 w-[120%] -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(190,220,255,0.35))] [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)] transition-opacity duration-[2500ms] ${walker.phase === 'idle' ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
        <button
          type="button"
          data-testid="martian"
          data-kind={walker.kind}
          aria-label={`${spec.label}, a Martian friend. Click to befriend.`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPoke(walker.id, e.currentTarget);
          }}
          className="pointer-events-auto relative block min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation"
          style={{ width, height }}
        >
          <div
            key={walker.hop}
            className={`h-full w-full ${walker.hop > 0 ? 'animate-[martianPoke_0.16s_ease-out]' : ''}`}
            style={{ transformOrigin: '50% 100%' }}
          >
            <div
              className={`h-full w-full ${moving ? 'animate-[martianWalk_0.55s_ease-in-out_infinite]' : 'animate-[martianIdle_3.2s_ease-in-out_infinite]'}`}
              style={{ transformOrigin: '50% 100%' }}
            >
              <img
                src={spec.src}
                alt=""
                draggable={false}
                className="h-full w-full object-contain drop-shadow-[0_10px_8px_rgba(30,12,6,0.55)]"
                style={{ transform: `scaleX(${facing})` }}
              />
            </div>
          </div>
        </button>
        <div className="pointer-events-none absolute -bottom-[14px] left-1/2 -translate-x-1/2" data-testid="martian-ring">
          <svg width="56" height="22" viewBox="0 0 56 22" className={`transition-opacity duration-500 ${labelOn ? 'opacity-100' : 'opacity-0'}`}>
            <ellipse cx="28" cy="11" rx="26" ry="8" fill="rgba(20,8,4,0.35)" />
            <ellipse
              cx="28"
              cy="11"
              rx="26"
              ry="8"
              fill="none"
              stroke="#ffd27a"
              strokeWidth="2.4"
              strokeLinecap="round"
              pathLength={RING_LEN}
              strokeDasharray={`${(count / MARTIAN_CLICKS_GOAL) * RING_LEN} ${RING_LEN}`}
            />
          </svg>
          <div
            data-testid="martian-progress"
            className={`absolute left-1/2 top-[22px] -translate-x-1/2 whitespace-nowrap text-[13px] font-medium tracking-wide text-white transition-opacity duration-500 ${labelOn ? 'opacity-100' : 'opacity-0'}`}
          >
            {count}/{MARTIAN_CLICKS_GOAL}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MartianLayer({ active, blocked, onReward, avoidXFrac, occupiedRef }: MartianLayerProps) {
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [count, setCount] = useState(0);
  const [labelOn, setLabelOn] = useState(false);
  const walkersRef = useRef<Walker[]>([]);
  const countRef = useRef(0);
  const nextIdRef = useRef(SPAWN_ID_START);
  const labelTimerRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const rewardRef = useRef(onReward);
  rewardRef.current = onReward;

  useEffect(() => {
    countRef.current = readMartianClicks();
    setCount(countRef.current);
  }, []);

  const commit = useCallback(
    (next: Walker[]) => {
      walkersRef.current = next;
      if (occupiedRef) {
        occupiedRef.current = next
          .filter((w) => w.phase !== 'leave')
          .map((w) => {
            const spec = MARTIAN_SPECS[w.kind];
            return { xFrac: w.slot / 100, width: spec.height * spec.aspect * w.scale };
          });
      }
      setWalkers(next);
    },
    [occupiedRef]
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const setPhase = useCallback(
    (id: number, phase: WalkPhase) => commit(walkersRef.current.map((w) => (w.id === id ? { ...w, phase } : w))),
    [commit]
  );

  const leave = useCallback(
    (id: number) => {
      setPhase(id, 'leave');
      later(() => commit(walkersRef.current.filter((w) => w.id !== id)), MARTIAN_WALK_MS + 200);
    },
    [setPhase, commit, later]
  );

  const spawn = useCallback(
    (kind?: MartianKind) => {
      const list = walkersRef.current;
      if (list.length >= MARTIAN_MAX_ON_SCREEN) return;
      const used = new Set(list.map((w) => w.slot));
      const free = MARTIAN_SLOTS.filter((s) => !used.has(s));
      const avoid = avoidXFrac?.() ?? null;
      const clear = avoid === null ? free : free.filter((s) => Math.abs(s / 100 - avoid) > Math.max(MARTIAN_CHICKEN_GAP_FRAC, MARTIAN_CHICKEN_GAP_PX / window.innerWidth));
      const pool = clear.length > 0 ? clear : free;
      const slot = pool[Math.floor(Math.random() * pool.length)];
      const id = nextIdRef.current++;
      const side: 1 | -1 = slot > 50 ? 1 : -1;
      commit([...list, { id, kind: kind ?? pickKind(), slot, scale: MARTIAN_MIN_SCALE + Math.random() * (MARTIAN_MAX_SCALE - MARTIAN_MIN_SCALE), side, phase: 'enter', hop: 0 }]);
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase(id, 'idle')));
      later(() => leave(id), MARTIAN_STAY_MS + MARTIAN_WALK_MS);
    },
    [commit, setPhase, leave, later, avoidXFrac]
  );

  useEffect(() => {
    if (!active) return;
    setMartianSpawnHandler(spawn);
    let id = 0;
    const schedule = (ms: number) => {
      id = window.setTimeout(() => {
        if (!blockedRef.current && !document.hidden) spawn();
        schedule(MARTIAN_SPAWN_MIN_MS + Math.random() * MARTIAN_SPAWN_SPREAD_MS);
      }, ms);
    };
    schedule(MARTIAN_FIRST_SPAWN_MS);
    return () => {
      clearTimeout(id);
      setMartianSpawnHandler(null);
    };
  }, [active, spawn]);

  useEffect(() => {
    if (active) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    commit([]);
  }, [active, commit]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      clearTimeout(labelTimerRef.current);
    },
    []
  );

  const poke = useCallback(
    (id: number, el: HTMLElement) => {
      if (countRef.current >= MARTIAN_CLICKS_GOAL) return;
      countRef.current += 1;
      writeMartianClicks(countRef.current);
      setCount(countRef.current);
      setLabelOn(true);
      clearTimeout(labelTimerRef.current);
      labelTimerRef.current = window.setTimeout(() => setLabelOn(false), MARTIAN_LABEL_MS);
      commit(walkersRef.current.map((w) => (w.id === id ? { ...w, hop: w.hop + 1 } : w)));
      if (countRef.current >= MARTIAN_CLICKS_GOAL) {
        const r = el.getBoundingClientRect();
        rewardRef.current(r.left + r.width / 2, r.top + r.height / 2);
        later(() => leave(id), MARTIAN_REWARD_STAY_MS);
      }
    },
    [commit, leave, later]
  );

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="martian-layer" data-count={count}>
      {walkers.map((w) => (
        <Friend key={w.id} walker={w} count={count} labelOn={labelOn} onPoke={poke} />
      ))}
    </div>
  );
}
