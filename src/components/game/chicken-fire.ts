import type { OutlinePoint } from './chicken-outline';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export type LightningStyle = 'ramp' | 'red' | 'black-red';

export const LIGHTNING_RED_SCORE = 10_000;
export const LIGHTNING_BLACK_SCORE = 25_000;
export const FIRE_FLAMING_SCORE = 25_000;
export const FIRE_FULL_SCORE = 35_000;
export const MAX_EMBERS = 80;
export const IGNITION_MIN_MS = 1000;
export const IGNITION_SPREAD_MS = 1000;
export const IGNITION_GAP_MIN_MS = 1400;
export const IGNITION_GAP_SPREAD_MS = 1600;
export const FIRE_BODY_START = 0.5;
const INNER_FLAMES = 6;

const LIGHTNING_RED: Rgb = { r: 255, g: 48, b: 36 };
const LIGHTNING_RED_CORE: Rgb = { r: 255, g: 70, b: 50 };
const LIGHTNING_BLACK: Rgb = { r: 8, g: 4, b: 6 };
const EMBER_LIFE_MS = 1100;
const IGNITION_ATTACK_MS = 180;
const IGNITION_RELEASE_MS = 420;
const EMBER_GRAVITY = -0.00045;
const EMBER_DRAG = 0.996;
const FLAME_SPRITE_W = 48;
const FLAME_SPRITE_H = 96;
const FLAME_VARIANTS = 3;
const SPIKE_FLICK_A = 0.012;
const SPIKE_FLICK_B = 0.02;
const GLOW_OFFSETS = [4, 9, 16];
const GLOW_ALPHAS = [0.22, 0.12, 0.06];
const SHIMMER_BANDS = 3;
const SHIMMER_RISE_MS = 1400;

export function lightningStyleFor(score: number): LightningStyle {
  if (score >= LIGHTNING_BLACK_SCORE) return 'black-red';
  if (score >= LIGHTNING_RED_SCORE) return 'red';
  return 'ramp';
}

export function fireLevelFor(score: number): number {
  if (score < FIRE_FLAMING_SCORE) return 0;
  return Math.min(1, (score - FIRE_FLAMING_SCORE) / (FIRE_FULL_SCORE - FIRE_FLAMING_SCORE));
}

export function fireFilterFor(level: number, ignition: number): string | undefined {
  const f = Math.max(level, ignition * 0.6);
  if (f <= 0) return undefined;
  const glow = 8 + 20 * f;
  return `sepia(${(0.9 * f).toFixed(3)}) saturate(${(1 + 4 * f).toFixed(3)}) hue-rotate(${(-30 * f).toFixed(1)}deg) brightness(${(1 + 0.05 * f).toFixed(3)}) contrast(${(1 + 0.2 * f).toFixed(3)}) drop-shadow(0 0 ${glow.toFixed(1)}px rgba(255, 120, 24, ${(0.35 + 0.45 * f).toFixed(3)}))`;
}

export function strokeLightning(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  style: LightningStyle,
  color: Rgb,
  alpha: number
): void {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (style === 'black-red') {
    ctx.strokeStyle = `rgba(${LIGHTNING_RED.r}, ${LIGHTNING_RED.g}, ${LIGHTNING_RED.b}, ${0.22 * alpha})`;
    ctx.lineWidth = 9;
    trace();
    ctx.strokeStyle = `rgba(${LIGHTNING_BLACK.r}, ${LIGHTNING_BLACK.g}, ${LIGHTNING_BLACK.b}, ${alpha})`;
    ctx.lineWidth = 5.2;
    trace();
    ctx.strokeStyle = `rgba(${LIGHTNING_RED_CORE.r}, ${LIGHTNING_RED_CORE.g}, ${LIGHTNING_RED_CORE.b}, ${alpha})`;
    ctx.lineWidth = 2.2;
    trace();
    ctx.strokeStyle = `rgba(255, 150, 130, ${0.8 * alpha})`;
    ctx.lineWidth = 0.8;
    trace();
    return;
  }
  const col = style === 'red' ? LIGHTNING_RED : color;
  ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.28 * alpha})`;
  ctx.lineWidth = 3.2;
  trace();
  ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.75 * alpha})`;
  ctx.lineWidth = 1.5;
  trace();
  ctx.strokeStyle = style === 'red' ? `rgba(255, 190, 170, ${0.9 * alpha})` : `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.lineWidth = 0.85;
  trace();
}

const flameSprites: HTMLCanvasElement[] = [];

function flameSprite(i: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (flameSprites.length === 0) {
    for (let v = 0; v < FLAME_VARIANTS; v++) {
      const c = document.createElement('canvas');
      c.width = FLAME_SPRITE_W;
      c.height = FLAME_SPRITE_H;
      const g = c.getContext('2d');
      if (!g) continue;
      const w = FLAME_SPRITE_W;
      const h = FLAME_SPRITE_H;
      const half = w / 2;
      const lean = (v - 1) * 6;
      const layers: [number, string, string, string][] = [
        [1, 'rgba(255, 40, 0, 0)', 'rgba(255, 90, 10, 0.55)', 'rgba(255, 150, 40, 0.75)'],
        [0.72, 'rgba(255, 120, 10, 0)', 'rgba(255, 170, 30, 0.8)', 'rgba(255, 215, 90, 0.95)'],
        [0.42, 'rgba(255, 220, 120, 0)', 'rgba(255, 245, 180, 0.9)', 'rgba(255, 255, 240, 1)'],
      ];
      for (const [scale, tip, mid, base] of layers) {
        const hw = half * 0.92 * scale;
        const top = h * (1 - scale) * 0.85;
        const grad = g.createLinearGradient(0, top, 0, h);
        grad.addColorStop(0, tip);
        grad.addColorStop(0.55, mid);
        grad.addColorStop(1, base);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(half + lean * scale, top);
        g.bezierCurveTo(half + hw * 1.1 + lean * 0.4, h * 0.45, half + hw, h * 0.92, half, h);
        g.bezierCurveTo(half - hw, h * 0.92, half - hw * 1.1 + lean * 0.4, h * 0.45, half + lean * scale, top);
        g.closePath();
        g.fill();
      }
      flameSprites.push(c);
    }
  }
  return flameSprites[i % flameSprites.length] ?? null;
}

function outlinePath(ctx: CanvasRenderingContext2D, pts: OutlinePoint[], offset: number): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const x = p.x + p.nx * offset;
    const y = p.y + p.ny * offset;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawSilhouetteAura(
  ctx: CanvasRenderingContext2D,
  pts: OutlinePoint[],
  ts: number,
  tier: number,
  level: number,
  rgb: Rgb
): void {
  if (level <= 0 || pts.length === 0) return;
  const { r, g, b } = rgb;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const breath = 0.9 + 0.1 * Math.sin(ts * 0.004);
  for (let i = GLOW_OFFSETS.length - 1; i >= 0; i--) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(GLOW_ALPHAS[i] * level * breath).toFixed(3)})`;
    outlinePath(ctx, pts, GLOW_OFFSETS[i] * (0.6 + 0.6 * level));
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${(0.08 * level).toFixed(3)})`;
  outlinePath(ctx, pts, 1);
  ctx.fill();

  const flickA = ts * SPIKE_FLICK_A;
  const flickB = ts * SPIKE_FLICK_B;
  const step = 2;
  const spikeLen = 6 + 34 * level;
  const w = 2.2 + 2.4 * level;
  for (let k = 0; k < pts.length; k += step) {
    const p = pts[k];
    const upFactor = 0.5 - 0.5 * p.ny;
    const flick = 0.55 + 0.45 * Math.sin(flickA + k * 2.3) * Math.sin(flickB + k * 1.1);
    const len = spikeLen * (0.3 + 0.7 * upFactor) * flick;
    const tx = p.x + p.nx * len;
    const ty = p.y + p.ny * len - len * 0.4 * upFactor;
    const px = -p.ny * w;
    const py = p.nx * w;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${((0.18 + 0.3 * level) * (0.6 + 0.4 * flick)).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(p.x + px, p.y + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(p.x - px, p.y - py);
    ctx.closePath();
    ctx.fill();
    if (k % 4 !== 0) continue;
    ctx.fillStyle = `rgba(255, 250, 235, ${((0.1 + 0.22 * level) * flick).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(p.x + px * 0.5, p.y + py * 0.5);
    ctx.lineTo(p.x + (tx - p.x) * 0.6, p.y + (ty - p.y) * 0.6);
    ctx.lineTo(p.x - px * 0.5, p.y - py * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawOutlineFlames(
  ctx: CanvasRenderingContext2D,
  pts: OutlinePoint[],
  ts: number,
  level: number,
  scale: number
): void {
  if (level <= 0 || pts.length === 0) return;
  const sprite0 = flameSprite(0);
  if (!sprite0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = pts.length;
  const stride = level > 0.5 ? 2 : 3;
  const drift = Math.floor(ts / 90);
  for (let k = 0; k < n; k += stride) {
    const p = pts[k];
    const upFactor = 0.5 - 0.5 * p.ny;
    const seed = (k * 7 + drift) % 11;
    const flick = 0.6 + 0.4 * Math.sin(ts * 0.011 + k * 1.7) * Math.cos(ts * 0.017 + k * 0.9);
    const height = (9 + 30 * level) * (0.5 + 0.5 * upFactor) * flick * scale;
    const width = height * (0.42 + 0.03 * seed);
    const lean = Math.atan2(p.nx, -p.ny) * (0.35 + 0.25 * upFactor);
    const sprite = flameSprite(k % FLAME_VARIANTS);
    if (!sprite) continue;
    ctx.save();
    ctx.translate(p.x, p.y + 1);
    ctx.rotate(lean + Math.sin(ts * 0.006 + k) * 0.12);
    ctx.globalAlpha = 0.55 + 0.4 * level;
    ctx.drawImage(sprite, -width / 2, -height, width, height);
    ctx.restore();
  }
  ctx.restore();
}

export function drawIgnition(ctx: CanvasRenderingContext2D, pts: OutlinePoint[], ts: number, envelope: number, scale: number): void {
  if (envelope <= 0 || pts.length === 0) return;
  const n = pts.length;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const burstSeed = Math.floor(ts / 140);
  for (let k = 0; k < n; k += 2) {
    const p = pts[k];
    const gate = Math.sin(k * 12.9898 + burstSeed * 78.233) * 43758.5453;
    const rnd = gate - Math.floor(gate);
    if (rnd > 0.12 + 0.4 * envelope) continue;
    const sprite = flameSprite(k % FLAME_VARIANTS);
    if (!sprite) continue;
    const inward = 0.25 + 0.45 * rnd;
    const x = p.x - p.nx * 10 * inward * scale;
    const y = p.y - p.ny * 10 * inward * scale;
    const height = (12 + 20 * envelope) * (0.7 + 0.6 * rnd) * scale;
    const width = height * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rnd - 0.5) * 0.9);
    ctx.globalAlpha = (0.5 + 0.5 * envelope) * (0.6 + 0.4 * rnd);
    ctx.drawImage(sprite, -width / 2, -height, width, height);
    ctx.restore();
  }
  ctx.restore();
}

export function drawFireBody(ctx: CanvasRenderingContext2D, pts: OutlinePoint[], ts: number, level: number): void {
  const a = Math.min(1, Math.max(0, (level - FIRE_BODY_START) / (1 - FIRE_BODY_START)));
  if (a <= 0 || pts.length === 0) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const flick = 0.92 + 0.08 * Math.sin(ts * 0.013);
  ctx.save();
  outlinePath(ctx, pts, -0.5);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, maxY, 0, minY);
  grad.addColorStop(0, `rgba(255, 36, 0, ${(0.7 * a * flick).toFixed(3)})`);
  grad.addColorStop(0.45, `rgba(255, 118, 0, ${(0.58 * a * flick).toFixed(3)})`);
  grad.addColorStop(1, `rgba(255, 222, 70, ${(0.34 * a).toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  ctx.globalCompositeOperation = 'lighter';
  const w = maxX - minX;
  const h = maxY - minY;
  for (let i = 0; i < INNER_FLAMES; i++) {
    const sprite = flameSprite(i);
    if (!sprite) break;
    const phase = ((ts * 0.00035 + i / INNER_FLAMES) % 1);
    const fx = minX + w * (0.25 + 0.5 * ((Math.sin(i * 2.7) + 1) / 2)) + Math.sin(ts * 0.004 + i) * w * 0.08;
    const fy = maxY - h * phase;
    const size = h * (0.28 + 0.1 * Math.sin(ts * 0.009 + i * 1.3)) * (1 - phase * 0.4);
    ctx.globalAlpha = a * 0.55 * (1 - phase);
    ctx.drawImage(sprite, fx - size * 0.25, fy - size, size * 0.5, size);
  }
  ctx.restore();
}

export function drawHeatShimmer(ctx: CanvasRenderingContext2D, cx: number, top: number, width: number, ts: number, level: number): void {
  if (level <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < SHIMMER_BANDS; i++) {
    const t = ((ts + i * (SHIMMER_RISE_MS / SHIMMER_BANDS)) % SHIMMER_RISE_MS) / SHIMMER_RISE_MS;
    const y = top - t * (40 + 30 * level);
    const alpha = (1 - t) * 0.07 * level;
    const wave = Math.sin(ts * 0.01 + i) * 4;
    ctx.strokeStyle = `rgba(255, 220, 180, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 2.5 + 2 * (1 - t);
    ctx.beginPath();
    ctx.moveTo(cx - width / 2 + wave, y);
    ctx.quadraticCurveTo(cx, y - 6 * (1 - t), cx + width / 2 + wave, y);
    ctx.stroke();
  }
  ctx.restore();
}

export interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  size: number;
  warm: number;
}

export function emitEmbers(embers: Ember[], pts: OutlinePoint[], count: number, flightVx: number, now: number): void {
  for (let i = 0; i < count && embers.length < MAX_EMBERS && pts.length > 0; i++) {
    const p = pts[Math.floor(Math.random() * pts.length)];
    embers.push({
      x: p.x + p.nx * 2,
      y: p.y + p.ny * 2,
      vx: p.nx * 0.03 + (Math.random() - 0.5) * 0.05 - flightVx * 0.15,
      vy: -0.04 - Math.random() * 0.06,
      born: now,
      size: 1.4 + Math.random() * 2.4,
      warm: Math.random(),
    });
  }
}

export function updateEmbers(embers: Ember[], dt: number, now: number): void {
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    if (now - e.born > EMBER_LIFE_MS) {
      embers.splice(i, 1);
      continue;
    }
    e.vy += EMBER_GRAVITY * dt;
    e.vx *= Math.pow(EMBER_DRAG, dt);
    e.x += e.vx * dt + Math.sin(now * 0.01 + e.warm * 10) * 0.08;
    e.y += e.vy * dt;
  }
}

export function drawEmbers(ctx: CanvasRenderingContext2D, embers: Ember[], now: number): void {
  if (embers.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of embers) {
    const t = (now - e.born) / EMBER_LIFE_MS;
    const alpha = (1 - t) * (0.7 + 0.3 * e.warm);
    const g = Math.round(200 - 150 * t);
    ctx.fillStyle = `rgba(255, ${g}, ${Math.round(60 * (1 - t))}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * (1 - 0.5 * t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface IgnitionState {
  active: boolean;
  forced: boolean;
  start: number;
  until: number;
  nextAt: number;
  bursts: number;
}

export function makeIgnition(): IgnitionState {
  return { active: false, forced: false, start: 0, until: 0, nextAt: 0, bursts: 0 };
}

export function tickIgnition(state: IgnitionState, heat: boolean, ts: number): number {
  const hot = heat || (state.forced && ts < state.until);
  if (!hot) {
    state.active = false;
    state.forced = false;
    state.nextAt = 0;
    return 0;
  }
  if (!state.nextAt) state.nextAt = ts + IGNITION_GAP_MIN_MS * 0.5;
  if (state.active && ts >= state.until) {
    state.active = false;
    state.forced = false;
    state.nextAt = ts + IGNITION_GAP_MIN_MS + Math.random() * IGNITION_GAP_SPREAD_MS;
  }
  if (!state.active && ts >= state.nextAt) {
    state.active = true;
    state.bursts += 1;
    state.start = ts;
    state.until = ts + IGNITION_MIN_MS + Math.random() * IGNITION_SPREAD_MS;
  }
  if (!state.active) return 0;
  return Math.max(0, Math.min(1, (ts - state.start) / IGNITION_ATTACK_MS, (state.until - ts) / IGNITION_RELEASE_MS));
}
