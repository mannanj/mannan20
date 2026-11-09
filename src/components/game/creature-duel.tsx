'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CreatureSoundKey } from '@/lib/chicken-audio';
import { fighterSprites, type CreatureKind, type CreatureSpec, type FighterSprite } from './creature-event';

export interface DuelDef {
  rival: CreatureKind;
  winner: CreatureKind;
  banner: string;
}

interface CreatureDuelProps {
  duel: DuelDef;
  specs: Record<CreatureKind, CreatureSpec>;
  groundY: (vh: number) => number;
  chickenX: () => number;
  paused: () => boolean;
  sound: (key: CreatureSoundKey) => void;
  onDone: (winner: CreatureKind) => void;
}

type Side = 'left' | 'right';

const ENTER_MS = 2200;
const CLASH_MS = 900;
const CLASHES = 6;
const KO_MS = 1500;
const WIN_MS = 1300;
const EXIT_MS = 1500;
const FIGHT_FROM = ENTER_MS;
const KO_FROM = FIGHT_FROM + CLASH_MS * CLASHES;
const WIN_FROM = KO_FROM + KO_MS;
const EXIT_FROM = WIN_FROM + WIN_MS;
const DUEL_MS = EXIT_FROM + EXIT_MS;
const GAP_FRAC = 0.05;
const BODY_OVERLAP = 0.32;
const LUNGE_FRAC = 0.22;
const RECOIL_FRAC = 0.5;
const STRIKE_FROM = 0.2;
const STRIKE_TO = 0.75;
const IMPACT_AT = 0.5;
const SHAKE_PX = 6;
const KO_SPIN_DEG = 110;
const KO_LIFT_FRAC = 0.5;
const KO_TRAVEL_FRAC = 0.55;
const WIN_SWELL = 0.08;
const BOB_PX = 4;
const BOB_MS = 220;
const FADE_MASK = 'linear-gradient(180deg, #000 72%, transparent 97%)';
const HYDRA_HEAD_FILE = '/game/creatures/snake-head.webp';
const HYDRA_HEAD_ASPECT = 2.82;
const HYDRA_HEAD_W_FRAC = 0.62;
const HYDRA_STUMPS = [
  { x: 0.27, y: 0.06, rest: -72 },
  { x: 0.5, y: 0.02, rest: -52 },
  { x: 0.63, y: 0.08, rest: -30 },
];
const HYDRA_STRIKE_DEG = 58;
const HYDRA_SWAY_DEG = 7;
const HYDRA_SWAY_MS = 380;
const SHADOW_W = 0.6;
const SHADOW_H = 0.12;
const BURST_PX = 120;

interface Fighter {
  kind: CreatureKind;
  side: Side;
  walk: FighterSprite;
  strike: FighterSprite;
  sound: CreatureSoundKey | null;
}

interface FighterEls {
  root: HTMLDivElement | null;
  flip: HTMLDivElement | null;
  walk: HTMLImageElement | null;
  strike: HTMLImageElement | null;
  heads: (HTMLImageElement | null)[];
  shadow: HTMLDivElement | null;
}

function emptyEls(): FighterEls {
  return { root: null, flip: null, walk: null, strike: null, heads: [], shadow: null };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function attackerFor(clash: number): Side {
  return clash >= CLASHES - 2 ? 'right' : clash % 2 === 0 ? 'left' : 'right';
}

function spriteStyle(s: FighterSprite): CSSProperties {
  return { width: s.w, height: s.h, maskImage: s.fade ? FADE_MASK : undefined, WebkitMaskImage: s.fade ? FADE_MASK : undefined };
}

interface Pose {
  x: number;
  lift: number;
  rot: number;
  alpha: number;
  facing: 1 | -1;
  striking: boolean;
  shake: number;
  swell: number;
  headDeg: number;
}

function poseAt(f: Fighter, t: number, home: number, vw: number, exitDir: 1 | -1, loser: boolean): Pose {
  const dir: 1 | -1 = f.side === 'left' ? 1 : -1;
  const lunge = Math.min(f.walk.w, f.walk.h * 1.6) * LUNGE_FRAC;
  const start = f.side === 'left' ? -f.walk.w * 0.6 : vw + f.walk.w * 0.6;
  const base: Pose = { x: home, lift: 0, rot: 0, alpha: 1, facing: dir, striking: false, shake: 0, swell: 1, headDeg: 0 };
  if (t < FIGHT_FROM) return { ...base, x: start + (home - start) * ease(t / ENTER_MS), lift: Math.abs(Math.sin(t / BOB_MS)) * BOB_PX };
  if (t < KO_FROM) {
    const clash = Math.floor((t - FIGHT_FROM) / CLASH_MS);
    const u = ((t - FIGHT_FROM) % CLASH_MS) / CLASH_MS;
    if (attackerFor(clash) === f.side) {
      return { ...base, x: home + dir * Math.sin(Math.PI * u) * lunge, striking: u > STRIKE_FROM && u < STRIKE_TO, rot: dir * Math.sin(Math.PI * u) * 6, headDeg: Math.sin(Math.PI * u) * HYDRA_STRIKE_DEG };
    }
    const hit = clamp01((u - IMPACT_AT + 0.05) / (1 - IMPACT_AT));
    const recoil = Math.sin(Math.PI * hit) * lunge * RECOIL_FRAC;
    return { ...base, x: home - dir * recoil, shake: hit > 0 && hit < 0.4 ? SHAKE_PX : 0, rot: -dir * Math.sin(Math.PI * hit) * 5 };
  }
  if (loser) {
    const k = clamp01((t - KO_FROM) / KO_MS);
    return { ...base, x: home - dir * k * vw * KO_TRAVEL_FRAC, lift: Math.sin(Math.PI * k) * f.walk.h * KO_LIFT_FRAC, rot: -dir * k * KO_SPIN_DEG, alpha: 1 - k * k };
  }
  if (t < WIN_FROM) return { ...base, striking: true, headDeg: HYDRA_STRIKE_DEG * 0.4 };
  if (t < EXIT_FROM) {
    const w = (t - WIN_FROM) / WIN_MS;
    return { ...base, swell: 1 + Math.sin(Math.PI * w) * WIN_SWELL, striking: w < 0.6, headDeg: Math.sin(Math.PI * w) * HYDRA_STRIKE_DEG * 0.6 };
  }
  const e = clamp01((t - EXIT_FROM) / EXIT_MS);
  const edge = exitDir === 1 ? vw + f.walk.w * 0.7 : -f.walk.w * 0.7;
  return { ...base, facing: exitDir, x: home + (edge - home) * e * e, lift: Math.abs(Math.sin(t / BOB_MS)) * BOB_PX };
}

export function CreatureDuel({ duel, specs, groundY, chickenX, paused, sound, onDone }: CreatureDuelProps) {
  const [view, setView] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }));
  const fighters = useMemo<Fighter[]>(
    () =>
      ([
        [duel.rival, 'left'],
        [duel.winner, 'right'],
      ] as const).map(([kind, side]) => {
        const spec = specs[kind];
        const { walk, strike } = fighterSprites(spec, view.vw, view.vh);
        return { kind, side, walk, strike, sound: spec.sounds.act ?? spec.sounds.enter };
      }),
    [duel, specs, view]
  );
  const elsRef = useRef<FighterEls[]>([emptyEls(), emptyEls()]);
  const burstRef = useRef<HTMLDivElement | null>(null);
  const [winnerShown, setWinnerShown] = useState(false);
  const cbRef = useRef({ chickenX, paused, sound, onDone, groundY });
  cbRef.current = { chickenX, paused, sound, onDone, groundY };

  useEffect(() => {
    const onResize = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let firedClash = -1;
    let exitDir: 1 | -1 = 1;
    let exitChosen = false;
    let announced = false;
    let finished = false;
    const [left, right] = fighters;
    const gap = view.vw * GAP_FRAC;
    const homes = [view.vw / 2 - gap - left.walk.w * (0.5 - BODY_OVERLAP / 2), view.vw / 2 + gap + right.walk.w * (0.5 - BODY_OVERLAP / 2)];
    const floor = cbRef.current.groundY(view.vh);
    cbRef.current.sound(right.sound ?? 'roar');
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      if (!cbRef.current.paused()) t += dt;
      if (t >= EXIT_FROM && !exitChosen) {
        exitChosen = true;
        exitDir = cbRef.current.chickenX() >= view.vw / 2 ? -1 : 1;
      }
      if (t >= WIN_FROM && !announced) {
        announced = true;
        setWinnerShown(true);
        cbRef.current.sound(right.sound ?? 'roar');
      }
      if (t >= FIGHT_FROM && t < KO_FROM) {
        const clash = Math.floor((t - FIGHT_FROM) / CLASH_MS);
        const u = ((t - FIGHT_FROM) % CLASH_MS) / CLASH_MS;
        if (clash !== firedClash && u >= IMPACT_AT) {
          firedClash = clash;
          const attacker = fighters[attackerFor(clash) === 'left' ? 0 : 1];
          if (attacker.sound) cbRef.current.sound(attacker.sound);
        }
        const burst = burstRef.current;
        if (burst) {
          const flash = Math.max(0, 1 - Math.abs(u - IMPACT_AT) / 0.16);
          burst.style.opacity = String(flash);
          burst.style.transform = `translate(${view.vw / 2 - BURST_PX / 2}px, ${floor - Math.min(left.walk.h, right.walk.h) * 0.6 - BURST_PX / 2}px) scale(${0.6 + flash * 0.6}) rotate(${clash * 37}deg)`;
        }
      } else if (burstRef.current) {
        burstRef.current.style.opacity = '0';
      }
      fighters.forEach((f, i) => {
        const els = elsRef.current[i];
        if (!els.root || !els.flip) return;
        const p = poseAt(f, t, homes[i], view.vw, exitDir, i === 0);
        const shake = p.shake ? (Math.random() - 0.5) * 2 * p.shake : 0;
        const top = floor - f.walk.h + f.walk.h * f.walk.sink - p.lift;
        els.root.style.transform = `translate(${p.x - f.walk.w / 2 + shake}px, ${top}px) rotate(${p.rot}deg) scale(${p.swell})`;
        els.root.style.opacity = String(p.alpha);
        els.flip.style.transform = p.facing === f.walk.faces ? '' : 'scaleX(-1)';
        if (els.walk) els.walk.style.opacity = p.striking && f.strike.file !== f.walk.file ? '0' : '1';
        if (els.strike) els.strike.style.opacity = p.striking && f.strike.file !== f.walk.file ? '1' : '0';
        els.heads.forEach((h, k) => {
          if (!h) return;
          const stump = HYDRA_STUMPS[k];
          const sway = Math.sin(t / HYDRA_SWAY_MS + k * 1.7) * HYDRA_SWAY_DEG;
          h.style.transform = `rotate(${stump.rest + sway + p.headDeg * (1 - k * 0.15)}deg)`;
        });
        if (els.shadow) {
          els.shadow.style.transform = `translate(${p.x - (f.walk.w * SHADOW_W) / 2}px, ${floor - f.walk.h * SHADOW_H * 0.5}px)`;
          els.shadow.style.opacity = String(p.alpha * 0.5);
        }
      });
      if (t >= DUEL_MS && !finished) {
        finished = true;
        cbRef.current.onDone(right.kind);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fighters, view]);

  const winnerLabel = specs[duel.winner].label;
  return (
    <div data-testid="creature-duel" data-rival={duel.rival} data-winner={duel.winner} className="pointer-events-none contents">
      <div data-testid="duel-banner" className="pointer-events-none absolute left-1/2 top-[150px] z-[8] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-4 py-1.5 text-sm font-semibold tracking-wide text-white/90 backdrop-blur-sm">
        {winnerShown ? `the ${winnerLabel} wins… and turns to the chicken` : duel.banner}
      </div>
      {fighters.map((f, i) => (
        <div key={`shadow-${f.kind}`} ref={(el) => { elsRef.current[i].shadow = el; }} className="pointer-events-none absolute top-0 left-0 z-[3] rounded-[50%] bg-black/60 blur-[6px] will-change-transform" style={{ width: f.walk.w * SHADOW_W, height: f.walk.h * SHADOW_H }} />
      ))}
      {fighters.map((f, i) => (
        <div
          key={f.kind + f.side}
          ref={(el) => { elsRef.current[i].root = el; }}
          data-testid={`duel-${f.side}`}
          data-kind={f.kind}
          className="pointer-events-none absolute top-0 left-0 z-[4] origin-bottom will-change-transform"
          style={{ width: f.walk.w, height: f.walk.h }}
        >
          <div ref={(el) => { elsRef.current[i].flip = el; }} className="absolute inset-0">
            {f.kind === 'hydra' &&
              HYDRA_STUMPS.map((stump, k) => (
                <img
                  key={k}
                  ref={(el) => { elsRef.current[i].heads[k] = el; }}
                  src={HYDRA_HEAD_FILE}
                  alt=""
                  draggable={false}
                  className="absolute origin-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)]"
                  style={{ left: stump.x * f.walk.w, top: stump.y * f.walk.h - (f.walk.w * HYDRA_HEAD_W_FRAC) / HYDRA_HEAD_ASPECT / 2, width: f.walk.w * HYDRA_HEAD_W_FRAC, height: (f.walk.w * HYDRA_HEAD_W_FRAC) / HYDRA_HEAD_ASPECT }}
                />
              ))}
            <img ref={(el) => { elsRef.current[i].walk = el; }} src={f.walk.file} alt="" draggable={false} className="absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]" style={spriteStyle(f.walk)} />
            <img ref={(el) => { elsRef.current[i].strike = el; }} src={f.strike.file} alt="" draggable={false} className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]" style={spriteStyle(f.strike)} />
          </div>
        </div>
      ))}
      <div ref={burstRef} className="pointer-events-none absolute top-0 left-0 z-[5] opacity-0 will-change-transform" style={{ width: BURST_PX, height: BURST_PX }}>
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,250,220,0.95)_0%,rgba(255,200,80,0.7)_30%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[repeating-conic-gradient(rgba(255,240,190,0.9)_0_8deg,transparent_8deg_30deg)] [mask-image:radial-gradient(circle,#000_20%,transparent_62%)]" />
      </div>
    </div>
  );
}

export const DUEL_TOTAL_MS = DUEL_MS;
