'use client';

import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { useInventory } from '@/components/inventory';
import { ItemArt } from '@/components/inventory/item-art';
import { labelFor } from '@/components/inventory/items';
import {
  GEAR_COPY,
  GEAR_FROM_SCORE,
  GEAR_ITEMS,
  GEAR_LIFE_MS,
  GEAR_MULT,
  GEAR_SPAWN_CHANCE,
  GEAR_SPAWN_CHECK_MS,
  GEAR_SPAWN_MARGIN,
  GEAR_TICK_MS,
  GUN_HIT_RADIUS,
  RAY_POINTS,
  THUNDER_CHAIN,
  THUNDER_CHAIN_RADIUS,
  THUNDER_POINTS,
  AUTO_SHOT_MS,
  CANNON_FLIGHT_MS,
  CANNON_SHOT_MS,
  CANNON_SPLASH_POINTS,
  CANNON_SPLASH_RADIUS,
  GEAR_HOLDER_ATTR,
  PETS,
  addFreezeShot,
  createIce,
  icePhase,
  iceSpeedFactor,
  type GunId,
  type IcePhase,
  type PetId,
} from './gear';
import { petGun } from './pet-guns';
import type { JevPoint } from './jev-helper';

export interface GearControl {
  heldBy: (pet: PetId) => GunId | null;
  fire: (gun: GunId, from: JevPoint, at: JevPoint, scoring?: boolean) => void;
  mult: (pet: PetId) => number;
  freezeFactor: (now: number) => number;
  spawn: (id: GunId) => void;
}

interface GearLayerProps {
  controlRef: RefObject<GearControl | null>;
  playable: () => boolean;
  score: () => number;
  target: () => JevPoint;
  targets: () => JevPoint[];
  hit: (at: JevPoint, count: number) => void;
  burst: (at: JevPoint) => void;
}

interface Pickup {
  id: GunId;
  x: number;
  y: number;
}

const BOLT_SLOTS = Array.from({ length: 12 }, (_, i) => i);
const BOLT_MS = 120;
const BEAM_FLASH_MS = 220;
const BEAM_GUNS: ReadonlySet<GunId> = new Set(['ray-gun', 'thunder-gun']);
const BOLT_LOOK: Record<GunId, { size: number; background: string; shadow: string }> = {
  'ray-gun': { size: 18, background: 'linear-gradient(180deg,#d24dff,#fff 40%,#fff 60%,#7a2bff)', shadow: '0 0 24px 8px #b14dff, 0 0 52px 18px rgba(160,60,255,0.45)' },
  'thunder-gun': { size: 8, background: 'linear-gradient(180deg,#fff7b0,#fff 45%,#fff 55%,#ffd31a)', shadow: '0 0 16px 6px #ffe14d, 0 0 44px 16px rgba(120,170,255,0.5)' },
  'freeze-gun': { size: 10, background: 'radial-gradient(circle,#fff,#7fd6ff 70%)', shadow: '0 0 10px 3px #8fdcff' },
  cannon: { size: 40, background: 'radial-gradient(circle at 35% 35%,#6b7078,#1a1c20 70%)', shadow: '0 0 14px 4px rgba(255,140,40,0.75)' },
};
const PICKUP_ART_SIZE = 84;
const PET_MUZZLE_Y = 0.25;

export function GearLayer({ controlRef, playable, score, target, targets, hit, burst }: GearLayerProps) {
  const { items, grant } = useInventory();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [phase, setPhase] = useState<IcePhase>('none');
  const portsRef = useRef({ playable, score, target, targets, hit, burst, grant, items });
  portsRef.current = { playable, score, target, targets, hit, burst, grant, items };
  const lastCannonRef = useRef(0);
  const autoAtRef = useRef(new Map<PetId, number>());
  const autoPickRef = useRef(0);
  const splashRef = useRef<HTMLDivElement>(null);
  const iceRef = useRef(createIce());
  const boltRef = useRef(0);
  const boltsRef = useRef<(HTMLDivElement | null)[]>([]);
  const iceElRef = useRef<HTMLDivElement>(null);
  const pickupTimerRef = useRef(0);

  const placePickup = (id: GunId) => {
    const m = GEAR_SPAWN_MARGIN;
    setPickup({ id, x: m + Math.random() * (window.innerWidth - m * 2), y: m + Math.random() * (window.innerHeight - m * 2.5) });
    window.clearTimeout(pickupTimerRef.current);
    pickupTimerRef.current = window.setTimeout(() => setPickup(null), GEAR_LIFE_MS);
  };
  const placeRef = useRef(placePickup);
  placeRef.current = placePickup;

  const armed = (pet: PetId): GunId | null => {
    const gun = petGun(pet);
    return gun && portsRef.current.items.some((i) => i.id === gun) ? gun : null;
  };
  const armedRef = useRef(armed);
  armedRef.current = armed;

  const splash = (at: JevPoint) => {
    for (const t of portsRef.current.targets()) {
      if (Math.hypot(t.x - at.x, t.y - at.y) <= CANNON_SPLASH_RADIUS) portsRef.current.hit(t, CANNON_SPLASH_POINTS);
    }
    const ring = splashRef.current;
    if (ring) {
      const d = CANNON_SPLASH_RADIUS * 2;
      ring.animate(
        [
          { transform: `translate(${at.x - d / 2}px, ${at.y - d / 2}px) scale(0.2)`, opacity: 0.95 },
          { transform: `translate(${at.x - d / 2}px, ${at.y - d / 2}px) scale(1)`, opacity: 0 },
        ],
        { duration: 450, easing: 'ease-out' }
      );
    }
    portsRef.current.burst(at);
  };

  const bolt = (gun: GunId, from: JevPoint, at: JevPoint) => {
    const el = boltsRef.current[boltRef.current];
    boltRef.current = (boltRef.current + 1) % BOLT_SLOTS.length;
    if (!el) return;
    const length = Math.hypot(at.x - from.x, at.y - from.y);
    const angle = Math.atan2(at.y - from.y, at.x - from.x);
    const beam = BEAM_GUNS.has(gun);
    const look = BOLT_LOOK[gun];
    el.style.width = `${beam ? length : look.size}px`;
    el.style.height = `${look.size}px`;
    el.style.background = look.background;
    el.style.boxShadow = look.shadow;
    const start = `translate(${from.x}px, ${from.y}px) rotate(${angle}rad)`;
    el.animate(
      beam
        ? [{ transform: `${start} scaleY(1.6)`, opacity: 1 }, { transform: `${start} scaleY(0.4)`, opacity: 0 }]
        : [{ transform: start, opacity: 1 }, { transform: `translate(${at.x}px, ${at.y}px) rotate(${angle}rad)`, opacity: 1 }],
      { duration: beam ? BEAM_FLASH_MS : gun === 'cannon' ? CANNON_FLIGHT_MS : BOLT_MS, easing: beam ? 'ease-out' : 'linear' }
    );
  };

  const thunder = (at: JevPoint, scoring: boolean) => {
    const near = portsRef.current
      .targets()
      .filter((t) => Math.hypot(t.x - at.x, t.y - at.y) <= THUNDER_CHAIN_RADIUS)
      .sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y))
      .slice(0, THUNDER_CHAIN + 1);
    let from = at;
    for (const t of near) {
      if (t !== near[0]) bolt('thunder-gun', from, t);
      if (scoring) portsRef.current.hit(t, THUNDER_POINTS);
      from = t;
    }
  };

  const fire = (gun: GunId, from: JevPoint, at: JevPoint, scoring = true) => {
    if (gun === 'cannon' && !scoring) {
      const now = performance.now();
      if (now - lastCannonRef.current < CANNON_SHOT_MS) return;
      lastCannonRef.current = now;
    }
    bolt(gun, from, at);
    if (gun === 'cannon') {
      window.setTimeout(() => splash(at), CANNON_FLIGHT_MS);
      return;
    }
    if (gun === 'thunder-gun') return thunder(at, scoring);
    const chicken = portsRef.current.target();
    if (Math.hypot(at.x - chicken.x, at.y - chicken.y) > GUN_HIT_RADIUS) return;
    if (gun === 'ray-gun') {
      if (scoring) portsRef.current.hit(chicken, RAY_POINTS);
    } else addFreezeShot(iceRef.current, performance.now(), Math.random);
  };
  const fireRef = useRef(fire);
  fireRef.current = fire;

  useImperativeHandle(
    controlRef,
    () => ({
      heldBy: (pet) => armedRef.current(pet),
      fire: (gun, from, at, scoring) => fireRef.current(gun, from, at, scoring),
      mult: (pet) => {
        const gun = armedRef.current(pet);
        return gun ? GEAR_MULT[gun] : 1;
      },
      freezeFactor: (now) => iceSpeedFactor(iceRef.current, now),
      spawn: (id) => placeRef.current(id),
    }),
    []
  );

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = performance.now();
      const ice = iceRef.current;
      if (ice.blockUntil > 0 && now >= ice.blockUntil) {
        iceRef.current = createIce();
        portsRef.current.burst(portsRef.current.target());
      } else if (ice.iceMs > 0 && ice.blockUntil === 0 && now >= ice.slowUntil) {
        ice.iceMs = 0;
      }
      setPhase(icePhase(iceRef.current, now));
      if (!portsRef.current.playable()) return;
      for (const pet of PETS) {
        const gun = armedRef.current(pet);
        if (!gun || now < (autoAtRef.current.get(pet) ?? 0)) continue;
        autoAtRef.current.set(pet, now + AUTO_SHOT_MS[gun]);
        const body = document.querySelector(`[${GEAR_HOLDER_ATTR}="${pet}"]`)?.getBoundingClientRect();
        const list = portsRef.current.targets();
        if (!body || list.length === 0) continue;
        autoPickRef.current += 1;
        const at = list[autoPickRef.current % list.length];
        fireRef.current(gun, { x: body.left + body.width / 2, y: body.top + body.height * PET_MUZZLE_Y }, at, true);
      }
    }, GEAR_TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const roll = window.setInterval(() => {
      const ports = portsRef.current;
      if (!ports.playable() || ports.score() < GEAR_FROM_SCORE || Math.random() > GEAR_SPAWN_CHANCE) return;
      const missing = GEAR_ITEMS.filter((id) => !ports.items.some((i) => i.id === id));
      if (missing.length > 0) placeRef.current(missing[Math.floor(Math.random() * missing.length)]);
    }, GEAR_SPAWN_CHECK_MS);
    return () => {
      window.clearInterval(roll);
      window.clearTimeout(pickupTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'none') return;
    let raf = 0;
    const follow = () => {
      const at = portsRef.current.target();
      if (iceElRef.current) iceElRef.current.style.transform = `translate(${at.x}px, ${at.y}px)`;
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const blocked = phase === 'solid' || phase === 'cracking' || phase === 'heating';
  const cracked = phase === 'cracking' || phase === 'heating';
  const heating = phase === 'heating';

  return (
    <>
      {pickup && (
        <button
          type="button"
          data-testid="gear-pickup"
          data-item={pickup.id}
          aria-label={GEAR_COPY.pickup(labelFor(pickup.id))}
          style={{ left: pickup.x, top: pickup.y }}
          onClick={(e) => {
            portsRef.current.grant(pickup.id, { x: e.clientX, y: e.clientY });
            setPickup(null);
          }}
          className="fixed z-[35] flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 shadow-[0_0_24px_6px_rgba(120,200,255,0.45)] animate-[chickenBob_1.6s_ease-in-out_infinite]"
        >
          <ItemArt id={pickup.id} size={PICKUP_ART_SIZE} />
        </button>
      )}
      <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
        {BOLT_SLOTS.map((slot) => (
          <div
            key={slot}
            ref={(el) => {
              boltsRef.current[slot] = el;
            }}
            data-testid="gear-bolt"
            style={{ transformOrigin: 'left center' }}
            className="absolute left-0 top-0 rounded-full opacity-0"
          />
        ))}
        <div ref={splashRef} data-testid="gear-splash" className="absolute left-0 top-0 rounded-full border-4 border-[#ffb347] bg-[radial-gradient(circle,rgba(255,180,70,0.45),rgba(255,120,30,0.15)_60%,transparent_70%)] opacity-0" style={{ width: CANNON_SPLASH_RADIUS * 2, height: CANNON_SPLASH_RADIUS * 2 }} />
      </div>
      {phase !== 'none' && (
        <div ref={iceElRef} data-testid="chicken-ice" data-phase={phase} className="pointer-events-none fixed left-0 top-0 z-[45] h-0 w-0">
          {!blocked && <div className="absolute -left-14 -top-20 h-40 w-28 rounded-full bg-[#9fdcff]/15 shadow-[0_0_30px_10px_rgba(150,220,255,0.35)]" />}
          {blocked && (
            <div className="absolute -left-[68px] -top-[100px] h-[200px] w-[136px] overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(145deg,rgba(235,250,255,0.72),rgba(130,205,255,0.5)_45%,rgba(190,235,255,0.68))] shadow-[0_0_26px_6px_rgba(150,220,255,0.5),inset_0_0_24px_rgba(255,255,255,0.65)]">
              <div className="absolute left-3 top-3 h-20 w-3 rotate-12 rounded-full bg-white/70" />
              <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,120,20,0.9),rgba(255,50,0,0.45)_45%,transparent_72%)] transition-opacity duration-[3000ms] ${heating ? 'opacity-100' : 'opacity-0'}`} />
              {cracked && (
                <svg viewBox="0 0 136 200" className="absolute inset-0 h-full w-full" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
                  <path d="M20 0 L44 46 L30 84 L62 118 L48 162 L70 200" />
                  <path d="M136 40 L96 66 L104 104 L62 118" />
                  <path d="M44 46 L84 34 M30 84 L0 96 M104 104 L136 132 M48 162 L92 170" />
                </svg>
              )}
              {heating && (
                <svg viewBox="0 0 136 200" className="absolute inset-0 h-full w-full animate-pulse" fill="none" stroke="#ff2a00" strokeWidth="3" aria-hidden="true">
                  <path d="M62 56 L0 12 M62 56 L24 0 M74 56 L136 12 M74 56 L112 0" />
                </svg>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
