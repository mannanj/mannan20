'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GemGuessInput } from './gem-guess-input';

const SETTLED_SIZE = 8;
const FALLING_SIZE = 3;
const SPRITE_SOURCE = 48;
const TOTAL_DURATION_S = 213;
const GUESS_APPEAR_S = 30;
const LOCK_TIME_S = 71;
const GRAVITY = 0.12;
const HEADER_HEIGHT = 66;
const BURST_DELAY_MS = 500;
const INITIAL_BURST_PER_SOURCE = 40;
const INITIAL_BURST_FRAMES = 30;
const DECOR_PER_FRAME = 8;
const NUM_SHAPES = 6;

const GEM_HUES: { h: number; s: number; l: number }[] = [
  { h: 215, s: 85, l: 45 },
  { h: 350, s: 80, l: 42 },
  { h: 145, s: 75, l: 38 },
  { h: 280, s: 70, l: 48 },
  { h: 42, s: 88, l: 52 },
  { h: 335, s: 75, l: 55 },
  { h: 28, s: 85, l: 50 },
  { h: 178, s: 65, l: 55 },
  { h: 355, s: 78, l: 35 },
  { h: 85, s: 72, l: 42 },
  { h: 248, s: 72, l: 42 },
  { h: 190, s: 60, l: 60 },
];

const FALLING_COLORS = [
  '#4878cf', '#e03050', '#1a9e5a', '#8844cc',
  '#daa520', '#e06090', '#dd6622', '#44bbaa',
  '#cc2020', '#66aa22', '#5533bb', '#55bbcc',
];

interface FallingGem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  spriteIdx: number;
  isDecor: boolean;
  alpha: number;
}

interface GemSource {
  x: number;
  y: number;
  scale: number;
}

interface GemRainProps {
  sources: GemSource[];
  onLockChange: (locked: boolean) => void;
  onStop: () => void;
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function drawRoundBrilliant(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const C = S / 2;
  const R = C - 2;

  const bodyGrad = ctx.createRadialGradient(C - 4, C - 4, 1, C, C, R);
  bodyGrad.addColorStop(0, `hsl(${h}, ${clamp(s + 10, 0, 100)}%, ${clamp(l + 28, 0, 92)}%)`);
  bodyGrad.addColorStop(0.35, `hsl(${h}, ${s}%, ${clamp(l + 8, 0, 85)}%)`);
  bodyGrad.addColorStop(0.75, `hsl(${h}, ${s}%, ${l}%)`);
  bodyGrad.addColorStop(1, `hsl(${h}, ${clamp(s + 5, 0, 100)}%, ${clamp(l - 18, 5, 100)}%)`);

  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 18, 0, 90)}%, 0.35)`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + R * Math.cos(a), C + R * Math.sin(a));
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    const r = R * 0.38;
    const px = C + r * Math.cos(a);
    const py = C + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `hsl(${h}, ${clamp(s - 5, 0, 100)}%, ${clamp(l + 20, 0, 88)}%)`;
  ctx.fill();
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(C - R * 0.3, C - R * 0.35, 0, C - R * 0.3, C - R * 0.35, R * 0.28);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  hlGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(C - R * 0.3, C - R * 0.35, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 22, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawOvalGem(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const C = S / 2;
  const rx = C - 2;
  const ry = C * 0.72;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(C, C, rx, ry, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(C - 3, C - 3, 1, C, C, rx);
  grad.addColorStop(0, `hsl(${h}, ${clamp(s + 10, 0, 100)}%, ${clamp(l + 26, 0, 90)}%)`);
  grad.addColorStop(0.4, `hsl(${h}, ${s}%, ${clamp(l + 5, 0, 85)}%)`);
  grad.addColorStop(1, `hsl(${h}, ${s}%, ${clamp(l - 16, 5, 100)}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(C, C, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 15, 0, 90)}%, 0.3)`;
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + rx * Math.cos(a), C + ry * Math.sin(a));
    ctx.stroke();
  }
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(C - rx * 0.25, C - ry * 0.3, 0, C - rx * 0.25, C - ry * 0.3, rx * 0.22);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(C - rx * 0.25, C - ry * 0.3, rx * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(C, C, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 20, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawEmeraldCut(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const m = 3;
  const c = 6;
  const w = S - m * 2;
  const ht = S * 0.75;
  const y0 = (S - ht) / 2;

  ctx.beginPath();
  ctx.moveTo(m + c, y0);
  ctx.lineTo(m + w - c, y0);
  ctx.lineTo(m + w, y0 + c);
  ctx.lineTo(m + w, y0 + ht - c);
  ctx.lineTo(m + w - c, y0 + ht);
  ctx.lineTo(m + c, y0 + ht);
  ctx.lineTo(m, y0 + ht - c);
  ctx.lineTo(m, y0 + c);
  ctx.closePath();

  const grad = ctx.createLinearGradient(m, y0, m + w, y0 + ht);
  grad.addColorStop(0, `hsl(${h}, ${clamp(s + 5, 0, 100)}%, ${clamp(l + 22, 0, 88)}%)`);
  grad.addColorStop(0.3, `hsl(${h}, ${s}%, ${clamp(l + 5, 0, 85)}%)`);
  grad.addColorStop(0.7, `hsl(${h}, ${s}%, ${l}%)`);
  grad.addColorStop(1, `hsl(${h}, ${s}%, ${clamp(l - 18, 5, 100)}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(m + c, y0);
  ctx.lineTo(m + w - c, y0);
  ctx.lineTo(m + w, y0 + c);
  ctx.lineTo(m + w, y0 + ht - c);
  ctx.lineTo(m + w - c, y0 + ht);
  ctx.lineTo(m + c, y0 + ht);
  ctx.lineTo(m, y0 + ht - c);
  ctx.lineTo(m, y0 + c);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 15, 0, 90)}%, 0.3)`;
  ctx.lineWidth = 0.7;
  const insets = [4, 8, 12];
  for (const ins of insets) {
    ctx.strokeRect(m + ins, y0 + ins * 0.75, w - ins * 2, ht - ins * 1.5);
  }
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(S * 0.35, S * 0.32, 0, S * 0.35, S * 0.32, 6);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hlGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.beginPath();
  ctx.moveTo(m + c, y0);
  ctx.lineTo(m + w - c, y0);
  ctx.lineTo(m + w, y0 + c);
  ctx.lineTo(m + w, y0 + ht - c);
  ctx.lineTo(m + w - c, y0 + ht);
  ctx.lineTo(m + c, y0 + ht);
  ctx.lineTo(m, y0 + ht - c);
  ctx.lineTo(m, y0 + c);
  ctx.closePath();
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 22, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCushionGem(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const C = S / 2;
  const r = C - 3;
  const cr = 8;

  ctx.beginPath();
  ctx.moveTo(C - r + cr, C - r);
  ctx.lineTo(C + r - cr, C - r);
  ctx.quadraticCurveTo(C + r, C - r, C + r, C - r + cr);
  ctx.lineTo(C + r, C + r - cr);
  ctx.quadraticCurveTo(C + r, C + r, C + r - cr, C + r);
  ctx.lineTo(C - r + cr, C + r);
  ctx.quadraticCurveTo(C - r, C + r, C - r, C + r - cr);
  ctx.lineTo(C - r, C - r + cr);
  ctx.quadraticCurveTo(C - r, C - r, C - r + cr, C - r);
  ctx.closePath();

  const grad = ctx.createRadialGradient(C - 4, C - 4, 1, C, C, r * 1.2);
  grad.addColorStop(0, `hsl(${h}, ${clamp(s + 10, 0, 100)}%, ${clamp(l + 26, 0, 90)}%)`);
  grad.addColorStop(0.35, `hsl(${h}, ${s}%, ${clamp(l + 6, 0, 85)}%)`);
  grad.addColorStop(0.8, `hsl(${h}, ${s}%, ${l}%)`);
  grad.addColorStop(1, `hsl(${h}, ${s}%, ${clamp(l - 16, 5, 100)}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(C - r + cr, C - r);
  ctx.lineTo(C + r - cr, C - r);
  ctx.quadraticCurveTo(C + r, C - r, C + r, C - r + cr);
  ctx.lineTo(C + r, C + r - cr);
  ctx.quadraticCurveTo(C + r, C + r, C + r - cr, C + r);
  ctx.lineTo(C - r + cr, C + r);
  ctx.quadraticCurveTo(C - r, C + r, C - r, C + r - cr);
  ctx.lineTo(C - r, C - r + cr);
  ctx.quadraticCurveTo(C - r, C - r, C - r + cr, C - r);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 15, 0, 90)}%, 0.3)`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(C - r, C - r);
  ctx.lineTo(C, C);
  ctx.lineTo(C + r, C - r);
  ctx.moveTo(C - r, C + r);
  ctx.lineTo(C, C);
  ctx.lineTo(C + r, C + r);
  ctx.stroke();
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(C - r * 0.3, C - r * 0.35, 0, C - r * 0.3, C - r * 0.35, r * 0.25);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(C - r * 0.3, C - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(C - r + cr, C - r);
  ctx.lineTo(C + r - cr, C - r);
  ctx.quadraticCurveTo(C + r, C - r, C + r, C - r + cr);
  ctx.lineTo(C + r, C + r - cr);
  ctx.quadraticCurveTo(C + r, C + r, C + r - cr, C + r);
  ctx.lineTo(C - r + cr, C + r);
  ctx.quadraticCurveTo(C - r, C + r, C - r, C + r - cr);
  ctx.lineTo(C - r, C - r + cr);
  ctx.quadraticCurveTo(C - r, C - r, C - r + cr, C - r);
  ctx.closePath();
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 22, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPearGem(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const C = S / 2;

  ctx.beginPath();
  ctx.moveTo(C, 4);
  ctx.bezierCurveTo(C + 18, 10, C + 20, 28, C + 16, 38);
  ctx.quadraticCurveTo(C + 12, 46, C, 46);
  ctx.quadraticCurveTo(C - 12, 46, C - 16, 38);
  ctx.bezierCurveTo(C - 20, 28, C - 18, 10, C, 4);
  ctx.closePath();

  const grad = ctx.createRadialGradient(C - 2, C - 2, 1, C, C + 4, 22);
  grad.addColorStop(0, `hsl(${h}, ${clamp(s + 10, 0, 100)}%, ${clamp(l + 26, 0, 90)}%)`);
  grad.addColorStop(0.4, `hsl(${h}, ${s}%, ${clamp(l + 5, 0, 85)}%)`);
  grad.addColorStop(1, `hsl(${h}, ${s}%, ${clamp(l - 16, 5, 100)}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(C, 4);
  ctx.bezierCurveTo(C + 18, 10, C + 20, 28, C + 16, 38);
  ctx.quadraticCurveTo(C + 12, 46, C, 46);
  ctx.quadraticCurveTo(C - 12, 46, C - 16, 38);
  ctx.bezierCurveTo(C - 20, 28, C - 18, 10, C, 4);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 15, 0, 90)}%, 0.3)`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(C, 4);
  ctx.lineTo(C - 10, 30);
  ctx.moveTo(C, 4);
  ctx.lineTo(C + 10, 30);
  ctx.moveTo(C, 4);
  ctx.lineTo(C, 40);
  ctx.stroke();
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(C - 4, 14, 0, C - 4, 14, 6);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(C - 4, 14, 6, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(C, 4);
  ctx.bezierCurveTo(C + 18, 10, C + 20, 28, C + 16, 38);
  ctx.quadraticCurveTo(C + 12, 46, C, 46);
  ctx.quadraticCurveTo(C - 12, 46, C - 16, 38);
  ctx.bezierCurveTo(C - 20, 28, C - 18, 10, C, 4);
  ctx.closePath();
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 22, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawMarquiseGem(ctx: CanvasRenderingContext2D, h: number, s: number, l: number) {
  const S = SPRITE_SOURCE;
  const C = S / 2;

  ctx.beginPath();
  ctx.moveTo(C, 3);
  ctx.bezierCurveTo(C + 22, 10, C + 22, 38, C, 45);
  ctx.bezierCurveTo(C - 22, 38, C - 22, 10, C, 3);
  ctx.closePath();

  const grad = ctx.createRadialGradient(C - 3, C - 3, 1, C, C, 22);
  grad.addColorStop(0, `hsl(${h}, ${clamp(s + 10, 0, 100)}%, ${clamp(l + 26, 0, 90)}%)`);
  grad.addColorStop(0.4, `hsl(${h}, ${s}%, ${clamp(l + 5, 0, 85)}%)`);
  grad.addColorStop(1, `hsl(${h}, ${s}%, ${clamp(l - 16, 5, 100)}%)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(C, 3);
  ctx.bezierCurveTo(C + 22, 10, C + 22, 38, C, 45);
  ctx.bezierCurveTo(C - 22, 38, C - 22, 10, C, 3);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = `hsla(${h}, ${clamp(s - 10, 0, 100)}%, ${clamp(l + 15, 0, 90)}%, 0.3)`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(C, 3);
  ctx.lineTo(C, 45);
  ctx.moveTo(C - 16, C);
  ctx.lineTo(C + 16, C);
  ctx.moveTo(C, 3);
  ctx.lineTo(C - 14, C);
  ctx.moveTo(C, 3);
  ctx.lineTo(C + 14, C);
  ctx.moveTo(C, 45);
  ctx.lineTo(C - 14, C);
  ctx.moveTo(C, 45);
  ctx.lineTo(C + 14, C);
  ctx.stroke();
  ctx.restore();

  const hlGrad = ctx.createRadialGradient(C - 5, C - 6, 0, C - 5, C - 6, 5);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(C - 5, C - 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(C, 3);
  ctx.bezierCurveTo(C + 22, 10, C + 22, 38, C, 45);
  ctx.bezierCurveTo(C - 22, 38, C - 22, 10, C, 3);
  ctx.closePath();
  ctx.strokeStyle = `hsl(${h}, ${s}%, ${clamp(l - 22, 5, 100)}%)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

const SHAPE_DRAWERS = [drawRoundBrilliant, drawOvalGem, drawEmeraldCut, drawCushionGem, drawPearGem, drawMarquiseGem];

function buildSprites(): HTMLCanvasElement[] {
  const sprites: HTMLCanvasElement[] = [];
  for (const color of GEM_HUES) {
    for (let shape = 0; shape < NUM_SHAPES; shape++) {
      const canvas = document.createElement('canvas');
      canvas.width = SPRITE_SOURCE;
      canvas.height = SPRITE_SOURCE;
      const ctx = canvas.getContext('2d');
      if (ctx) SHAPE_DRAWERS[shape](ctx, color.h, color.s, color.l);
      sprites.push(canvas);
    }
  }
  return sprites;
}

export function GemRain({ sources, onLockChange, onStop }: GemRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<HTMLCanvasElement[]>([]);
  const fallingRef = useRef<FallingGem[]>([]);
  const gemCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const rafRef = useRef(0);
  const lockedRef = useRef(false);
  const showGuessRef = useRef(false);
  const gemsPerFrameRef = useRef(0);

  const currentRowRef = useRef(0);
  const currentRowFilledRef = useRef<boolean[]>([]);
  const currentRowCountRef = useRef(0);
  const totalColsRef = useRef(0);
  const totalRowsRef = useRef(0);
  const screenRef = useRef({ w: 0, h: 0 });

  const [showGuessInput, setShowGuessInput] = useState(false);
  const [gemCount, setGemCount] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleDismiss = useCallback(() => {
    onStop();
  }, [onStop]);

  const getNextTarget = useCallback((): { col: number; x: number; y: number } | null => {
    const cols = totalColsRef.current;
    const rows = totalRowsRef.current;
    const row = currentRowRef.current;
    if (row >= rows) return null;

    const filled = currentRowFilledRef.current;
    const unfilled: number[] = [];
    for (let i = 0; i < cols; i++) {
      if (!filled[i]) unfilled.push(i);
    }
    if (unfilled.length === 0) return null;

    const col = unfilled[Math.floor(Math.random() * unfilled.length)];
    filled[col] = true;
    currentRowCountRef.current++;

    const { w: _w, h: sh } = screenRef.current;
    const targetY = sh - (row + 1) * SETTLED_SIZE;

    if (currentRowCountRef.current >= cols) {
      currentRowRef.current++;
      currentRowFilledRef.current = new Array(cols).fill(false);
      currentRowCountRef.current = 0;
    }

    return { col, x: col * SETTLED_SIZE, y: targetY };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    document.body.classList.add('gem-rain-active');

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    screenRef.current = { w, h };

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    offscreenRef.current = offscreen;

    const cols = Math.floor(w / SETTLED_SIZE);
    const availableHeight = h - HEADER_HEIGHT;
    const rows = Math.ceil(availableHeight / SETTLED_SIZE);
    totalColsRef.current = cols;
    totalRowsRef.current = rows;
    currentRowRef.current = 0;
    currentRowFilledRef.current = new Array(cols).fill(false);
    currentRowCountRef.current = 0;

    const sprites = buildSprites();
    spritesRef.current = sprites;

    const totalGems = cols * rows;
    const framesTotal = TOTAL_DURATION_S * 60;
    gemsPerFrameRef.current = totalGems / framesTotal;

    let burstDelayDone = false;
    const burstTimeout = setTimeout(() => {
      burstDelayDone = true;
      startTimeRef.current = performance.now();
    }, BURST_DELAY_MS);

    const animate = (now: number) => {
      if (!burstDelayDone) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = (now - startTimeRef.current) / 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (elapsed >= GUESS_APPEAR_S && !showGuessRef.current) {
        showGuessRef.current = true;
        setShowGuessInput(true);
      }

      if (elapsed >= LOCK_TIME_S && !lockedRef.current) {
        lockedRef.current = true;
        setLocked(true);
        onLockChange(true);
      }

      if (elapsed >= TOTAL_DURATION_S) {
        setAnimationComplete(true);
        setGemCount(gemCountRef.current);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(offscreenRef.current!, 0, 0);
        return;
      }

      const frame = frameCountRef.current;
      let settleSpawn = gemsPerFrameRef.current;
      if (frame < INITIAL_BURST_FRAMES) {
        settleSpawn += (INITIAL_BURST_PER_SOURCE * sources.length) / INITIAL_BURST_FRAMES;
      }

      const settleInt = Math.floor(settleSpawn);
      const settleFrac = settleSpawn - settleInt;
      const actualSettle = settleInt + (Math.random() < settleFrac ? 1 : 0);

      for (let i = 0; i < actualSettle; i++) {
        const target = getNextTarget();
        if (!target) break;
        const src = sources[Math.floor(Math.random() * sources.length)];
        const angle = Math.random() * Math.PI * 2;
        const isBurst = frame < INITIAL_BURST_FRAMES;
        const speed = isBurst ? 3 + Math.random() * 5 : 1 + Math.random() * 2;
        fallingRef.current.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (isBurst ? 3 : 1),
          targetX: target.x,
          targetY: target.y,
          spriteIdx: Math.floor(Math.random() * sprites.length),
          isDecor: false,
          alpha: 1,
        });
      }

      for (let i = 0; i < DECOR_PER_FRAME; i++) {
        const src = sources[Math.floor(Math.random() * sources.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        fallingRef.current.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          targetX: Math.random() * w,
          targetY: h + 50,
          spriteIdx: 0,
          isDecor: true,
          alpha: 1,
        });
      }

      const active = fallingRef.current;
      const remaining: FallingGem[] = [];
      const offCtx = offscreenRef.current!.getContext('2d')!;

      for (let i = 0; i < active.length; i++) {
        const gem = active[i];
        gem.vy += GRAVITY;
        gem.x += gem.vx;
        gem.y += gem.vy;

        if (!gem.isDecor) {
          const dx = gem.targetX + SETTLED_SIZE / 2 - gem.x;
          gem.vx += Math.sign(dx) * 0.08;
          gem.vx *= 0.97;

          if (gem.y >= gem.targetY) {
            offCtx.drawImage(sprites[gem.spriteIdx], gem.targetX, gem.targetY, SETTLED_SIZE, SETTLED_SIZE);
            gemCountRef.current++;
            continue;
          }
          remaining.push(gem);
        } else {
          const fillLevel = h - currentRowRef.current * SETTLED_SIZE;
          if (gem.y >= fillLevel - 20) {
            gem.alpha -= 0.08;
          }
          if (gem.alpha <= 0 || gem.y > h + 50 || gem.x < -100 || gem.x > w + 100) {
            continue;
          }
          remaining.push(gem);
        }
      }

      fallingRef.current = remaining;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(offscreenRef.current!, 0, 0);

      for (const gem of remaining) {
        if (gem.isDecor) {
          ctx.globalAlpha = gem.alpha * 0.8;
          ctx.fillStyle = FALLING_COLORS[Math.floor(Math.random() * FALLING_COLORS.length)];
          ctx.fillRect(gem.x, gem.y, FALLING_SIZE, FALLING_SIZE);
        } else {
          ctx.globalAlpha = 1;
          ctx.fillStyle = FALLING_COLORS[gem.spriteIdx % FALLING_COLORS.length];
          ctx.fillRect(gem.x, gem.y, FALLING_SIZE, FALLING_SIZE);
        }
      }
      ctx.globalAlpha = 1;

      if (frame % 60 === 0) {
        setGemCount(gemCountRef.current);
      }

      frameCountRef.current++;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(burstTimeout);
      cancelAnimationFrame(rafRef.current);
      document.body.classList.remove('gem-rain-active');
    };
  }, [sources, onLockChange, getNextTarget]);

  return (
    <>
      <div
        data-testid="gem-state"
        data-count={gemCount}
        data-locked={locked ? 'true' : 'false'}
        data-complete={animationComplete ? 'true' : 'false'}
        style={{ display: 'none' }}
      />
      <canvas
        data-testid="gem-canvas"
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1005,
          pointerEvents: 'none',
        }}
      />

      {sources.map((src, i) => (
        <div
          data-testid="gem-popper"
          key={i}
          style={{
            position: 'fixed',
            zIndex: 1006,
            left: src.x,
            top: src.y,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontSize: 32 * src.scale,
            animation: 'popper-appear 0.4s ease forwards',
            transformOrigin: 'center',
          }}>
            🎉
          </div>
        </div>
      ))}

      {showGuessInput && (
        <GemGuessInput
          gemCount={gemCount}
          complete={animationComplete}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}
