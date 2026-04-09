'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChickenSvg } from './chicken-svg';
import { useChickenSounds } from '@/hooks/use-chicken-sounds';

const BASE_SPEED = 2.5;
const MIN_SPEED = 1.5;
const AVOIDANCE_RADIUS = 150;
const AVOIDANCE_STRENGTH = 0.3;
const ROTATION_DAMPING = 0.98;
const WOBBLE_AMPLITUDE = 3;
const WOBBLE_FREQUENCY = 0.002;
const BOUNCE_RANDOM = 0.3;
const MAX_DT = 32;
const CHICKEN_W = 70;
const CHICKEN_H = 140;
const PARTICLE_FADE = 0.02;
const MAX_PARTICLES = 200;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
}

interface Physics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
}

function speedForScore(score: number): number {
  if (score <= 20) return 1 + score * 0.03;
  if (score <= 50) return 1.6 + (score - 20) * 0.06;
  if (score <= 80) return 3.4 + (score - 50) * 0.12;
  return 7.0 + (score - 80) * 0.2;
}

function particleHue(score: number): number {
  if (score < 30) return 45;
  if (score < 60) return 195;
  return 199;
}

export function ChickenGame() {
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const physicsRef = useRef<Physics>({
    x: 0, y: 0, vx: 0, vy: 0, rotation: 0, rv: 0,
  });
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(1);
  const chickenElRef = useRef<HTMLDivElement>(null);
  const feedbackElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { playRandom } = useChickenSounds();

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
      const dt = Math.min(rawDt, MAX_DT) / 16.67;
      lastTimeRef.current = ts;

      const p = physicsRef.current;
      const m = mouseRef.current;
      const sp = speedRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      p.x += p.vx * dt * sp;
      p.y += p.vy * dt * sp;

      if (p.x <= 0 || p.x >= vw - CHICKEN_W) {
        p.vx *= -1;
        p.vy += (Math.random() - 0.5) * BOUNCE_RANDOM;
        p.rv += (Math.random() - 0.5) * 2;
        p.x = Math.max(0, Math.min(p.x, vw - CHICKEN_W));
      }
      if (p.y <= 0 || p.y >= vh - CHICKEN_H) {
        p.vy *= -1;
        p.vx += (Math.random() - 0.5) * BOUNCE_RANDOM;
        p.rv += (Math.random() - 0.5) * 2;
        p.y = Math.max(0, Math.min(p.y, vh - CHICKEN_H));
      }

      p.rotation += p.rv * dt;
      p.rv *= ROTATION_DAMPING;
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

      if (chickenElRef.current) {
        chickenElRef.current.style.transform =
          `translate(${p.x}px, ${p.y}px) rotate(${p.rotation + wobble}deg)`;
      }

      const sc = scoreRef.current;
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
          hue: particleHue(sc),
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

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const pt of particles) {
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = `hsl(${pt.hue}, 80%, 60%)`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    const next = scoreRef.current + 1;
    scoreRef.current = next;
    setScore(next);
    speedRef.current = speedForScore(next);
    playRandom();

    const el = feedbackElRef.current;
    if (el) {
      el.style.transform = 'scale(1.3)';
      setTimeout(() => {
        if (el) el.style.transform = 'scale(1)';
      }, 150);
    }
  }, [playRandom]);

  const glowActive = score > 50;
  const glowRadius = glowActive ? Math.min((score - 50) * 0.5, 15) : 0;
  const glowAlpha = glowActive ? Math.min((score - 50) * 0.02, 0.6) : 0;

  return (
    <div className="fixed inset-0 bg-[#0b0b0b] overflow-hidden select-none cursor-crosshair">
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

      {score > 80 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${Math.min((score - 80) * 0.01, 0.4)}) 100%)`,
          }}
        />
      )}

      <div
        ref={chickenElRef}
        className="absolute will-change-transform cursor-pointer"
        style={{ left: 0, top: 0 }}
        onClick={handleClick}
      >
        <div
          ref={feedbackElRef}
          style={{ transition: 'transform 150ms ease-out' }}
        >
          <ChickenSvg
            className="w-[70px]"
            style={
              glowActive
                ? { filter: `drop-shadow(0 0 ${glowRadius}px rgba(79, 195, 247, ${glowAlpha}))` }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
