'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChickenSvg } from './chicken-svg';
import { GameInfoPanel } from './game-info-panel';
import { GameScenery } from './game-scenery';
import { LeaderboardPanel } from './leaderboard-panel';
import { SoundLoader } from './sound-loader';
import { useChickenSounds } from '@/hooks/use-chicken-sounds';
import { AppProvider } from '@/context/app-context';
import {
  FINAL_TIER,
  MERCY_DELAY_MS,
  MERCY_FLOOR,
  MERCY_FOLLOW_PER_MS,
  MERCY_RAMP_MS,
  MERCY_RECOVERY_PER_MS,
  TIERS,
  mixHex,
  morphForScore,
  tierForScore,
  tierProgress,
} from './chicken-tiers';

const BASE_SPEED = 2.5;
const MIN_SPEED = 1.5;
const AVOIDANCE_RADIUS = 150;
const AVOIDANCE_STRENGTH = 0.3;
const ROTATION_SPRING = 0.02;
const ROTATION_DAMP = 0.16;
const MAX_BANK = 10;
const BANK_LERP = 0.08;
const SPIN_BOUNCE_CHANCE = 0.25;
const SPIN_BOUNCE_STRENGTH = 13;
const FACING_DEADZONE = 0.25;
const FLAP_BASE_MS = 470;
const FLAP_MIN_MS = 150;
const FLAP_MAX_MS = 680;
const FLAP_QUANTIZE_MS = 20;
const WOBBLE_AMPLITUDE = 3;
const WOBBLE_FREQUENCY = 0.002;
const BOUNCE_RANDOM = 0.3;
const MAX_DT = 32;
const CHICKEN_W = 70;
const CHICKEN_H = 140;
const PARTICLE_FADE = 0.02;
const MAX_PARTICLES = 200;
const MAX_SHARD_PARTICLES = 90;
const SHARDS_PER_CLICK = 7;
const SHARDS_PER_TRANSFORM = 26;
const SHARD_GRAVITY = 0.08;
const SHARD_FADE = 0.014;
const AURA_SPIKES = 12;
const TIER0_AURA_START = 0.55;
const TIER0_AURA_MAX = 0.28;
const ARC_LIFE_MS = 140;
const ARC_SEGMENTS = 7;
const MAX_ARCS_PER_BURST = 3;
const SCREAM_JITTER = 0.1;
const MERCY_CAPTION_THRESHOLD = 0.7;
const MIN_LOADER_MS = 700;
const LOADER_FADE_MS = 320;
const BRIDGE_LOG_CAP = 300;
const FEEDBACK_POP_MS = 150;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
}

interface ShardParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  alpha: number;
  size: number;
  color: string;
}

interface Arc {
  points: { x: number; y: number }[];
  born: number;
}

interface Physics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  bank: number;
}

export interface SoundEvent {
  type: 'scream' | 'powerup' | 'crackle';
  key?: string;
  rate?: number;
  synth?: boolean;
  at: number;
}

interface ChickenStateSnapshot {
  score: number;
  tier: number;
  mercy: number;
  morph: number;
  auraLevel: number;
  rotation: number;
  vx: number;
  vy: number;
}

interface ChickenBridge {
  plays: SoundEvent[];
  state: () => ChickenStateSnapshot;
  boost: (n: number) => void;
  spin: (v: number) => void;
}

declare global {
  interface Window {
    __chicken?: ChickenBridge;
  }
}

function speedForScore(score: number): number {
  if (score <= 20) return 1 + score * 0.028;
  if (score <= 50) return 1.56 + (score - 20) * 0.052;
  if (score <= 80) return 3.12 + (score - 50) * 0.095;
  return 5.97 + (score - 80) * 0.14;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function mercyTargetFor(idleMs: number): number {
  if (idleMs <= MERCY_DELAY_MS) return 1;
  const t = Math.min(1, (idleMs - MERCY_DELAY_MS) / MERCY_RAMP_MS);
  return 1 - (1 - MERCY_FLOOR) * smoothstep(t);
}

function auraLevelFor(score: number, mercy: number): number {
  const tier = tierForScore(score);
  const progress = tierProgress(score);
  const damp = 0.55 + 0.45 * mercy;
  if (tier === 0) {
    if (progress <= TIER0_AURA_START) return 0;
    return ((progress - TIER0_AURA_START) / (1 - TIER0_AURA_START)) * TIER0_AURA_MAX * damp;
  }
  const base = 0.35 + 0.13 * (tier - 1) + 0.25 * progress;
  return Math.min(1, base) * damp;
}

function auraRgbFor(score: number): { r: number; g: number; b: number } {
  const tier = tierForScore(score);
  const progress = tier === FINAL_TIER ? 0 : tierProgress(score);
  const nextAura = TIERS[Math.min(tier + 1, FINAL_TIER)].aura;
  const current = TIERS[tier].aura ?? nextAura;
  const next = nextAura ?? current;
  if (!current || !next) return { r: 255, g: 255, b: 255 };
  const channel = (a: number, b: number) => Math.round(a + (b - a) * progress);
  return {
    r: channel(current.r, next.r),
    g: channel(current.g, next.g),
    b: channel(current.b, next.b),
  };
}

function makeArc(cx: number, cy: number): Arc {
  const points: { x: number; y: number }[] = [];
  let angle = Math.random() * Math.PI * 2;
  for (let i = 0; i < ARC_SEGMENTS; i++) {
    angle += 0.22 + Math.random() * 0.34;
    const rx = 34 + Math.random() * 26;
    const ry = 62 + Math.random() * 34;
    points.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return { points, born: performance.now() };
}

function drawAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ts: number,
  tier: number,
  level: number,
  rgb: { r: number; g: number; b: number }
): void {
  if (level <= 0) return;
  const { r, g, b } = rgb;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 80 + 30 * level);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.22 * level})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 70 + 26 * level, 100 + 34 * level, 0, 0, Math.PI * 2);
  ctx.fill();
  const baseRx = 36 + tier * 2;
  const baseRy = 66 + tier * 3;
  const flickerSpeed = 1 + tier * 0.12;
  for (let k = 0; k < AURA_SPIKES; k++) {
    const angle = (k / AURA_SPIKES) * Math.PI * 2;
    const flick =
      0.5 +
      0.5 *
        Math.sin(ts * 0.013 * flickerSpeed + k * 2.7) *
        Math.sin(ts * 0.007 * flickerSpeed + k * 1.3);
    const len = (26 + 36 * level) * (0.55 + 0.55 * flick);
    const bx = cx + Math.cos(angle) * baseRx * 0.8;
    const by = cy + Math.sin(angle) * baseRy * 0.8;
    const tx = cx + Math.cos(angle) * (baseRx * 0.8 + len);
    const ty = cy + Math.sin(angle) * (baseRy * 0.8 + len * 1.4);
    const w = 6 + 5 * level;
    const px = Math.cos(angle + Math.PI / 2) * w;
    const py = Math.sin(angle + Math.PI / 2) * w;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + 0.35 * level * flick})`;
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - px, by - py);
    ctx.closePath();
    ctx.fill();
    const hr = Math.min(255, r + 110);
    const hg = Math.min(255, g + 110);
    const hb = Math.min(255, b + 110);
    ctx.fillStyle = `rgba(${hr}, ${hg}, ${hb}, ${0.35 + 0.3 * level * flick})`;
    ctx.beginPath();
    ctx.moveTo(bx + px * 0.5, by + py * 0.5);
    ctx.lineTo(cx + Math.cos(angle) * (baseRx * 0.8 + len * 0.6), cy + Math.sin(angle) * (baseRy * 0.8 + len * 0.8));
    ctx.lineTo(bx - px * 0.5, by - py * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function ChickenGameInner() {
  const [score, setScore] = useState(0);
  const [tier, setTier] = useState(0);
  const [flashTier, setFlashTier] = useState<number | null>(null);
  const [mercyCaption, setMercyCaption] = useState(false);
  const [sheet, setSheet] = useState<'info' | 'board' | null>(null);
  const [loaderPhase, setLoaderPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const scoreRef = useRef(0);
  const tierRef = useRef(0);
  const physicsRef = useRef<Physics>({
    x: 0, y: 0, vx: 0, vy: 0, rotation: 0, rv: 0, bank: 0,
  });
  const facingRef = useRef(1);
  const flapMsRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const shardParticlesRef = useRef<ShardParticle[]>([]);
  const arcsRef = useRef<Arc[]>([]);
  const nextArcAtRef = useRef(0);
  const speedRef = useRef(1);
  const mercyRef = useRef(1);
  const mercyCaptionRef = useRef(false);
  const lastHitRef = useRef(0);
  const playsRef = useRef<SoundEvent[]>([]);
  const mountAtRef = useRef(0);
  const chickenElRef = useRef<HTMLDivElement>(null);
  const facingElRef = useRef<HTMLDivElement>(null);
  const feedbackElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { progress, playScream, playPowerUp, crackle } = useChickenSounds();

  const recordPlay = useCallback((event: SoundEvent) => {
    const log = playsRef.current;
    log.push(event);
    if (log.length > BRIDGE_LOG_CAP) log.shift();
  }, []);

  const spawnShards = useCallback((cx: number, cy: number, count: number, color: string) => {
    const shards = shardParticlesRef.current;
    for (let i = 0; i < count && shards.length < MAX_SHARD_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      shards.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        rotation: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.4,
        alpha: 1,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  }, []);

  const hit = useCallback(() => {
    const next = scoreRef.current + 1;
    scoreRef.current = next;
    setScore(next);
    speedRef.current = speedForScore(next);
    lastHitRef.current = performance.now();
    const p = physicsRef.current;
    const cx = p.x + CHICKEN_W / 2;
    const cy = p.y + CHICKEN_H / 2;
    const previousTier = tierRef.current;
    const newTier = tierForScore(next);
    if (newTier !== previousTier) {
      tierRef.current = newTier;
      setTier(newTier);
      setFlashTier(newTier);
      const riser = playPowerUp(newTier === FINAL_TIER);
      recordPlay({ type: 'powerup', key: riser.key, synth: riser.synth, at: Date.now() });
      spawnShards(cx, cy, SHARDS_PER_TRANSFORM, TIERS[previousTier].body);
    } else {
      const rate =
        TIERS[newTier].screamRate * (1 - SCREAM_JITTER / 2 + Math.random() * SCREAM_JITTER);
      const played = playScream(rate);
      if (played) {
        recordPlay({ type: 'scream', key: played.key, rate: played.rate, at: Date.now() });
      }
      const tierDef = TIERS[newTier];
      const nextDef = TIERS[Math.min(newTier + 1, FINAL_TIER)];
      spawnShards(cx, cy, SHARDS_PER_CLICK, mixHex(tierDef.body, nextDef.body, morphForScore(next)));
    }
    const el = feedbackElRef.current;
    if (el) {
      el.style.transform = 'scale(1.3)';
      setTimeout(() => {
        if (el) el.style.transform = 'scale(1)';
      }, FEEDBACK_POP_MS);
    }
  }, [playPowerUp, playScream, recordPlay, spawnShards]);

  useEffect(() => {
    mountAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!progress.done || loaderPhase !== 'loading') return;
    const elapsed = performance.now() - mountAtRef.current;
    const id = setTimeout(
      () => setLoaderPhase('fading'),
      Math.max(0, MIN_LOADER_MS - elapsed)
    );
    return () => clearTimeout(id);
  }, [progress.done, loaderPhase]);

  useEffect(() => {
    if (loaderPhase !== 'fading') return;
    const id = setTimeout(() => setLoaderPhase('done'), LOADER_FADE_MS);
    return () => clearTimeout(id);
  }, [loaderPhase]);

  useEffect(() => {
    const bridge: ChickenBridge = {
      plays: playsRef.current,
      state: () => ({
        score: scoreRef.current,
        tier: tierRef.current,
        mercy: mercyRef.current,
        morph: morphForScore(scoreRef.current),
        auraLevel: auraLevelFor(scoreRef.current, mercyRef.current),
        rotation: physicsRef.current.rotation,
        vx: physicsRef.current.vx,
        vy: physicsRef.current.vy,
      }),
      boost: (n: number) => {
        for (let i = 0; i < n; i++) hit();
      },
      spin: (v: number) => {
        physicsRef.current.rv += v;
      },
    };
    window.__chicken = bridge;
    return () => {
      if (window.__chicken === bridge) delete window.__chicken;
    };
  }, [hit]);

  useEffect(() => {
    const p = physicsRef.current;
    p.x = window.innerWidth / 2 - CHICKEN_W / 2;
    p.y = window.innerHeight / 2 - CHICKEN_H / 2;
    const angle = Math.random() * Math.PI * 2;
    p.vx = Math.cos(angle) * BASE_SPEED;
    p.vy = Math.sin(angle) * BASE_SPEED;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const animate = (ts: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const rawDt = ts - lastTimeRef.current;
      const dtMs = Math.min(rawDt, MAX_DT);
      const dt = dtMs / 16.67;
      lastTimeRef.current = ts;

      if (!lastHitRef.current) lastHitRef.current = ts;
      const target = mercyTargetFor(ts - lastHitRef.current);
      const currentMercy = mercyRef.current;
      const mercy =
        target < currentMercy
          ? Math.max(target, currentMercy - MERCY_FOLLOW_PER_MS * dtMs)
          : Math.min(target, currentMercy + MERCY_RECOVERY_PER_MS * dtMs);
      mercyRef.current = mercy;
      const captionVisible = mercy < MERCY_CAPTION_THRESHOLD;
      if (captionVisible !== mercyCaptionRef.current) {
        mercyCaptionRef.current = captionVisible;
        setMercyCaption(captionVisible);
      }

      const p = physicsRef.current;
      const m = mouseRef.current;
      const sp = speedRef.current * mercy;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      p.x += p.vx * dt * sp;
      p.y += p.vy * dt * sp;

      if (p.x <= 0 || p.x >= vw - CHICKEN_W) {
        p.vx *= -1;
        p.vy += (Math.random() - 0.5) * BOUNCE_RANDOM;
        if (Math.random() < SPIN_BOUNCE_CHANCE) {
          p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
        }
        p.x = Math.max(0, Math.min(p.x, vw - CHICKEN_W));
      }
      if (p.y <= 0 || p.y >= vh - CHICKEN_H) {
        p.vy *= -1;
        p.vx += (Math.random() - 0.5) * BOUNCE_RANDOM;
        if (Math.random() < SPIN_BOUNCE_CHANCE) {
          p.rv += (Math.random() - 0.5) * SPIN_BOUNCE_STRENGTH;
        }
        p.y = Math.max(0, Math.min(p.y, vh - CHICKEN_H));
      }

      p.rv += (-p.rotation * ROTATION_SPRING - p.rv * ROTATION_DAMP) * dt;
      p.rotation += p.rv * dt;
      const wobble = Math.sin(ts * WOBBLE_FREQUENCY) * WOBBLE_AMPLITUDE;

      const cx = p.x + CHICKEN_W / 2;
      const cy = p.y + CHICKEN_H / 2;
      const dx = cx - m.x;
      const dy = cy - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < AVOIDANCE_RADIUS && dist > 0) {
        const force = ((AVOIDANCE_RADIUS - dist) / AVOIDANCE_RADIUS) * AVOIDANCE_STRENGTH * sp;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpd = BASE_SPEED * sp;
      const minSpd = MIN_SPEED * sp;
      if (speed > maxSpd) {
        p.vx = (p.vx / speed) * maxSpd;
        p.vy = (p.vy / speed) * maxSpd;
      } else if (speed < minSpd && speed > 0) {
        p.vx = (p.vx / speed) * minSpd;
        p.vy = (p.vy / speed) * minSpd;
      }

      const moveSpeed = Math.hypot(p.vx, p.vy);
      const horiz = moveSpeed > 0 ? p.vx / moveSpeed : 0;
      p.bank += (horiz * MAX_BANK - p.bank) * Math.min(1, BANK_LERP * dt);
      if (p.vx > FACING_DEADZONE) facingRef.current = 1;
      else if (p.vx < -FACING_DEADZONE) facingRef.current = -1;

      const flapMs =
        Math.round(
          Math.max(
            FLAP_MIN_MS,
            Math.min(FLAP_MAX_MS, FLAP_BASE_MS / Math.sqrt(Math.max(sp, 0.1)))
          ) / FLAP_QUANTIZE_MS
        ) * FLAP_QUANTIZE_MS;

      if (chickenElRef.current) {
        chickenElRef.current.style.transform =
          `translate(${p.x}px, ${p.y}px) rotate(${p.rotation + wobble + p.bank}deg)`;
        if (flapMs !== flapMsRef.current) {
          flapMsRef.current = flapMs;
          chickenElRef.current.style.setProperty('--flap-ms', `${flapMs}ms`);
        }
      }
      if (facingElRef.current) {
        const sign = String(facingRef.current);
        if (facingElRef.current.dataset.facing !== sign) {
          facingElRef.current.dataset.facing = sign;
          facingElRef.current.style.transform =
            facingRef.current < 0 ? 'scaleX(-1)' : 'scaleX(1)';
        }
      }

      const sc = scoreRef.current;
      const currentTier = tierRef.current;
      const tierDef = TIERS[currentTier];
      const intensity = Math.min(1 + sc * 0.05, 5);
      const count = Math.ceil(intensity * dt);
      const particles = particlesRef.current;

      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          alpha: 0.4 + Math.random() * 0.3,
          size: 2 + Math.random() * 3,
          hue: tierDef.particleHue,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= PARTICLE_FADE * dt;
        pt.size *= 0.995;
        if (pt.alpha <= 0) particles.splice(i, 1);
      }

      const shards = shardParticlesRef.current;
      for (let i = shards.length - 1; i >= 0; i--) {
        const sh = shards[i];
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.vy += SHARD_GRAVITY * dt;
        sh.rotation += sh.rv * dt;
        sh.alpha -= SHARD_FADE * dt;
        if (sh.alpha <= 0) shards.splice(i, 1);
      }

      if (tierDef.electricityMs) {
        if (!nextArcAtRef.current) nextArcAtRef.current = ts + tierDef.electricityMs;
        if (ts >= nextArcAtRef.current) {
          nextArcAtRef.current = ts + tierDef.electricityMs * (0.5 + Math.random());
          const burst = 1 + Math.floor(Math.random() * MAX_ARCS_PER_BURST);
          for (let i = 0; i < burst; i++) arcsRef.current.push(makeArc(cx, cy));
          crackle();
          recordPlay({ type: 'crackle', at: Date.now() });
        }
      } else {
        nextArcAtRef.current = 0;
        arcsRef.current = [];
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const auraRgb = auraRgbFor(sc);
        drawAura(ctx, cx, cy, ts, currentTier, auraLevelFor(sc, mercy), auraRgb);

        const now = performance.now();
        const arcs = arcsRef.current;
        for (let i = arcs.length - 1; i >= 0; i--) {
          const age = now - arcs[i].born;
          if (age > ARC_LIFE_MS) {
            arcs.splice(i, 1);
            continue;
          }
          const alpha = 1 - age / ARC_LIFE_MS;
          const pts = arcs[i].points;
          ctx.strokeStyle = `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, ${0.45 * alpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }

        for (const pt of particles) {
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = `hsl(${pt.hue}, 80%, 60%)`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const sh of shards) {
          ctx.globalAlpha = sh.alpha;
          ctx.fillStyle = sh.color;
          ctx.save();
          ctx.translate(sh.x, sh.y);
          ctx.rotate(sh.rotation);
          ctx.beginPath();
          ctx.moveTo(0, -sh.size);
          ctx.lineTo(sh.size * 0.8, sh.size * 0.6);
          ctx.lineTo(-sh.size * 0.8, sh.size * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [crackle, recordPlay]);

  const morph = morphForScore(score);
  const renderAuraLevel = auraLevelFor(score, 1);
  const renderAuraRgb = auraRgbFor(score);
  const glowStyle =
    renderAuraLevel > 0
      ? {
          filter: `drop-shadow(0 0 ${6 + 10 * renderAuraLevel + tier * 2}px rgba(${renderAuraRgb.r}, ${renderAuraRgb.g}, ${renderAuraRgb.b}, ${Math.min(0.55, 0.15 + renderAuraLevel * 0.5)}))`,
        }
      : undefined;

  return (
    <div className="fixed inset-0 bg-[#0b0b0b] overflow-hidden select-none cursor-crosshair">
      <GameScenery />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <span className="absolute top-4 left-5 text-xs text-white/40 font-medium tracking-wide pointer-events-none">
        Floating Chicken Game
      </span>

      <div className="absolute top-[225px] left-1/2 -translate-x-1/2 text-base text-white/50 pointer-events-none">
        Click the chicken
      </div>

      <div className="absolute top-[265px] left-1/2 -translate-x-1/2 text-5xl font-bold text-white tabular-nums pointer-events-none">
        {score}
      </div>

      {mercyCaption && (
        <div
          data-testid="chicken-mercy-caption"
          className="absolute top-[330px] left-1/2 -translate-x-1/2 text-xs italic text-white/35 pointer-events-none animate-[fadeIn_0.6s_ease-out]"
        >
          the chicken grows smug… and slow
        </div>
      )}

      {score > 80 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${Math.min((score - 80) * 0.01, 0.4)}) 100%)`,
          }}
        />
      )}

      {flashTier !== null && (
        <div
          key={`flash-${flashTier}`}
          onAnimationEnd={() => setFlashTier(null)}
          className="absolute inset-0 pointer-events-none animate-[transformFlash_0.42s_ease-out_forwards]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 40%, transparent 75%)',
          }}
        />
      )}

      <div
        ref={chickenElRef}
        data-testid="chicken"
        data-tier={tier}
        className="absolute will-change-transform cursor-pointer"
        style={{ left: 0, top: 0 }}
        onClick={hit}
      >
        <div
          ref={facingElRef}
          data-testid="chicken-facing"
          data-facing="1"
          style={{ transition: 'transform 160ms ease-out', transformOrigin: 'center' }}
        >
          <div
            ref={feedbackElRef}
            style={{ transition: 'transform 150ms ease-out' }}
          >
            <ChickenSvg className="w-[70px]" style={glowStyle} tier={tier} morph={morph} />
          </div>
        </div>
      </div>

      <LeaderboardPanel
        open={sheet === 'board'}
        onToggle={() => setSheet((s) => (s === 'board' ? null : 'board'))}
        onClose={() => setSheet(null)}
        score={score}
      />

      <GameInfoPanel
        open={sheet === 'info'}
        onToggle={() => setSheet((s) => (s === 'info' ? null : 'info'))}
        onClose={() => setSheet(null)}
      />

      {loaderPhase !== 'done' && (
        <SoundLoader progress={progress} fading={loaderPhase === 'fading'} />
      )}
    </div>
  );
}

export function ChickenGame() {
  return (
    <AppProvider>
      <ChickenGameInner />
    </AppProvider>
  );
}
