'use client';

import { useEffect, useRef } from 'react';
import { useGoldInfection } from '@/context/gold-infection-context';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  tangent: number;
}

const MAX_PARTICLES = 60;
const SPAWN_PER_FRAME = 1;
const SPAWN_PROBABILITY = 0.3;

export function GoldParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stateRef, subscribe } = useGoldInfection();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const s = stateRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;

      if (
        s.phase === 'spreading' &&
        particles.length < MAX_PARTICLES &&
        Math.random() < SPAWN_PROBABILITY
      ) {
        for (let i = 0; i < SPAWN_PER_FRAME; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.3 + Math.random() * 1.1;
          particles.push({
            x: s.originX + (Math.random() - 0.5) * 4,
            y: s.originY + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: 80 + Math.random() * 160,
            size: 0.6 + Math.random() * 1.0,
            hue: 44 + Math.random() * 10,
            tangent: (Math.random() - 0.5) * 0.05,
          });
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (s.phase === 'retracting') {
          const dx = s.originX - p.x;
          const dy = s.originY - p.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 5) {
            particles.splice(i, 1);
            continue;
          }
          const nx = dx / d;
          const ny = dy / d;
          p.vx += nx * 0.133 + -ny * p.tangent;
          p.vy += ny * 0.133 + nx * p.tangent;
          p.vx *= 0.965;
          p.vy *= 0.965;
        } else {
          p.vx *= 0.995;
          p.vy *= 0.995;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const lifeT = p.life / p.maxLife;
        const alphaBase =
          s.phase === 'retracting'
            ? 0.55
            : Math.max(0, 1 - lifeT) * 0.6;

        const px = p.x - scrollX;
        const py = p.y - scrollY;

        const glowR = p.size * 2.6;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 82%, ${alphaBase})`);
        grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${alphaBase * 0.35})`);
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue + 8}, 100%, 92%, ${alphaBase})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      if (s.phase === 'idle' && particles.length === 0) {
        ctx.clearRect(0, 0, W, H);
      }
    };

    const unsubscribe = subscribe(render);

    return () => {
      window.removeEventListener('resize', resize);
      unsubscribe();
    };
  }, [stateRef, subscribe]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2000 }}
      aria-hidden
    />
  );
}
