import { DROP_GRAVITY, MAX_POOLS, POOL_FADE_MS, POOL_LIFE_MS, RAINBOW_STOPS } from './chicken-split';
export interface Feather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  sway: number;
  swayRate: number;
  size: number;
  color: string;
  born: number;
  life: number;
  alphaMul: number;
  gravityMul: number;
  drifter: boolean;
  elong: number;
  electric: boolean;
}

export interface Streak {
  x: number;
  y: number;
  len: number;
  vy: number;
  width: number;
  born: number;
}

export type PortalSide = 'left' | 'right' | 'top' | 'bottom';

export interface Portal {
  x: number;
  y: number;
  side: PortalSide;
  born: number;
  color: { r: number; g: number; b: number };
}

const FEATHER_GRAVITY = 0.016;
const FEATHER_TERMINAL_VY = 1.05;
const FEATHER_SWAY_FORCE = 0.02;
const FEATHER_FADE_MS = 900;
const FEATHER_BIG_CHANCE = 0.25;
const FEATHER_BIG_MIN = 1.6;
const FEATHER_BIG_SPREAD = 0.6;
const FEATHER_ELONG_CHANCE = 0.12;
const FEATHER_ELONG_MIN = 3;
const FEATHER_ELONG_SPREAD = 2;
const FEATHER_ELECTRIC_CHANCE = 0.15;
const FEATHER_LINGER_CHANCE = 0.22;
const FEATHER_DRIFTER_CHANCE = 0.12;
const FEATHER_ALPHA_MIN = 0.42;
const FEATHER_ALPHA_SPREAD = 0.26;
const DRIFTER_TERMINAL_VY = 0.22;
const DRIFTER_WANDER_FORCE = 0.012;
export const STREAK_LIFE_MS = 280;
export const PORTAL_LIFE_MS = 950;

export function makeFeather(cx: number, cy: number, color: string, now: number): Feather {
  const elong =
    Math.random() < FEATHER_ELONG_CHANCE
      ? FEATHER_ELONG_MIN + Math.random() * FEATHER_ELONG_SPREAD
      : 1;
  const big = elong === 1 && Math.random() < FEATHER_BIG_CHANCE;
  const drifter = Math.random() < FEATHER_DRIFTER_CHANCE;
  const size = (9 + Math.random() * 6) * (big ? FEATHER_BIG_MIN + Math.random() * FEATHER_BIG_SPREAD : 1);
  let life = 2400 + Math.random() * 1600;
  if (Math.random() < FEATHER_LINGER_CHANCE) life *= 3 + Math.random();
  if (drifter) life = 9000 + Math.random() * 7000;
  return {
    x: cx + (Math.random() - 0.5) * 110,
    y: cy + (Math.random() - 0.5) * 150,
    vx: (Math.random() - 0.5) * 2.6,
    vy: -0.5 - Math.random() * 1.1,
    rotation: Math.random() * Math.PI * 2,
    sway: Math.random() * Math.PI * 2,
    swayRate: 0.0035 + Math.random() * 0.0035,
    size,
    color,
    born: now,
    life,
    alphaMul: FEATHER_ALPHA_MIN + Math.random() * FEATHER_ALPHA_SPREAD,
    gravityMul: drifter ? 0.05 : 0.55 + Math.random() * 0.65,
    drifter,
    elong,
    electric: Math.random() < FEATHER_ELECTRIC_CHANCE,
  };
}

export function updateFeather(f: Feather, dt: number, ts: number): boolean {
  const terminal = f.drifter ? DRIFTER_TERMINAL_VY : FEATHER_TERMINAL_VY;
  f.vy = Math.min(terminal, f.vy + FEATHER_GRAVITY * f.gravityMul * dt);
  f.vx += Math.sin(ts * f.swayRate + f.sway) * FEATHER_SWAY_FORCE * dt;
  if (f.drifter) {
    f.vx += Math.cos(ts * f.swayRate * 0.6 + f.sway * 2) * DRIFTER_WANDER_FORCE * dt;
    f.vy += Math.sin(ts * f.swayRate * 0.8 + f.sway) * DRIFTER_WANDER_FORCE * 0.7 * dt;
  }
  f.vx *= 0.985;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  f.rotation = Math.sin(ts * f.swayRate + f.sway) * 0.7 + f.vx * 0.35;
  return ts - f.born < f.life;
}

export function featherAlpha(f: Feather, ts: number): number {
  const remaining = f.life - (ts - f.born);
  const fade = remaining < FEATHER_FADE_MS ? Math.max(0, remaining / FEATHER_FADE_MS) : 1;
  return fade * f.alphaMul;
}

export function drawFeather(ctx: CanvasRenderingContext2D, f: Feather, ts: number): void {
  const alpha = featherAlpha(f, ts);
  if (alpha <= 0) return;
  const s = f.size;
  const sl = s * f.elong;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.moveTo(0, -sl * 0.55);
  ctx.quadraticCurveTo(s * 0.46, -sl * 0.12, 0, sl * 0.66);
  ctx.quadraticCurveTo(-s * 0.46, -sl * 0.12, 0, -sl * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -sl * 0.5);
  ctx.lineTo(0, sl * 0.62);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -sl * 0.1);
  ctx.lineTo(s * 0.26, -sl * 0.26);
  ctx.moveTo(0, sl * 0.18);
  ctx.lineTo(-s * 0.26, sl * 0.02);
  ctx.stroke();
  if (f.electric) {
    const flicker = 0.5 + 0.5 * Math.sin(ts * 0.02 + f.sway * 3);
    if (flicker > 0.25) {
      ctx.strokeStyle = `rgba(150, 205, 255, ${0.7 * alpha * flicker})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -sl * 0.3);
      ctx.lineTo(-s * 0.75, -sl * 0.12);
      ctx.lineTo(-s * 0.5, sl * 0.05);
      ctx.moveTo(s * 0.5, sl * 0.05);
      ctx.lineTo(s * 0.78, sl * 0.24);
      ctx.lineTo(s * 0.52, sl * 0.42);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * alpha * flicker})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -sl * 0.3);
      ctx.lineTo(-s * 0.75, -sl * 0.12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function makeTeleportStreaks(
  x: number,
  y: number,
  now: number,
  count = 10
): Streak[] {
  const streaks: Streak[] = [];
  for (let i = 0; i < count; i++) {
    const up = Math.random() < 0.5;
    streaks.push({
      x: x + (Math.random() - 0.5) * 56,
      y: y + (Math.random() - 0.5) * 120,
      len: 50 + Math.random() * 130,
      vy: (up ? -1 : 1) * (7 + Math.random() * 12),
      width: 1 + Math.random() * 1.6,
      born: now,
    });
  }
  return streaks;
}

export function drawStreaks(
  ctx: CanvasRenderingContext2D,
  streaks: Streak[],
  now: number,
  dt: number,
  color: { r: number; g: number; b: number }
): void {
  if (streaks.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = streaks.length - 1; i >= 0; i--) {
    const st = streaks[i];
    const age = now - st.born;
    if (age > STREAK_LIFE_MS) {
      streaks.splice(i, 1);
      continue;
    }
    st.y += st.vy * dt;
    const alpha = 1 - age / STREAK_LIFE_MS;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.55 * alpha})`;
    ctx.lineWidth = st.width;
    ctx.beginPath();
    ctx.moveTo(st.x, st.y - st.len / 2);
    ctx.lineTo(st.x, st.y + st.len / 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
    ctx.lineWidth = Math.max(0.6, st.width * 0.45);
    ctx.beginPath();
    ctx.moveTo(st.x, st.y - st.len * 0.3);
    ctx.lineTo(st.x, st.y + st.len * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPortals(
  ctx: CanvasRenderingContext2D,
  portals: Portal[],
  now: number
): void {
  for (let i = portals.length - 1; i >= 0; i--) {
    const portal = portals[i];
    const age = now - portal.born;
    if (age > PORTAL_LIFE_MS) {
      portals.splice(i, 1);
      continue;
    }
    const t = age / PORTAL_LIFE_MS;
    const alpha = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
    const vertical = portal.side === 'left' || portal.side === 'right';
    const rx = vertical ? 16 : 52;
    const ry = vertical ? 52 : 16;
    const { r, g, b } = portal.color;
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.globalCompositeOperation = 'lighter';
    const goop = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(rx, ry));
    goop.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * alpha})`);
    goop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = goop;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.4, ry * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 0; ring < 3; ring++) {
      const wobble = 1 + 0.12 * Math.sin(now * 0.012 + ring * 2.1);
      const spin = now * 0.004 * (ring % 2 === 0 ? 1 : -1) + ring;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.65 - ring * 0.16) * alpha})`;
      ctx.lineWidth = 2.4 - ring * 0.6;
      ctx.setLineDash([14 - ring * 3, 9]);
      ctx.lineDashOffset = -now * 0.05 * (ring + 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * (0.6 + ring * 0.3) * wobble, ry * (0.6 + ring * 0.3) * wobble, spin * 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export interface BlackHole {
  x: number;
  y: number;
  bornAt: number;
}

const BLACK_HOLE_SRC = '/game/fx/blackhole.webp';
const BLACK_HOLE_SPAN = 4.6;
const BLACK_HOLE_SHADOW = 0.62;
const BLACK_HOLE_SPIN = 0.0016;
const BLACK_HOLE_GROW_END = 0.25;
let blackHoleImg: HTMLImageElement | null = null;

function blackHoleSprite(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!blackHoleImg) {
    blackHoleImg = new Image();
    blackHoleImg.src = BLACK_HOLE_SRC;
  }
  return blackHoleImg.complete && blackHoleImg.naturalWidth > 0 ? blackHoleImg : null;
}

export function drawBlackHoles(
  ctx: CanvasRenderingContext2D,
  holes: BlackHole[],
  now: number,
  lifeMs: number,
  radius: number
): void {
  const sprite = blackHoleSprite();
  for (const hole of holes) {
    const t = (now - hole.bornAt) / lifeMs;
    if (t < 0 || t > 1) continue;
    const grow = t < BLACK_HOLE_GROW_END ? t / BLACK_HOLE_GROW_END : 1 - (t - BLACK_HOLE_GROW_END) / (1 - BLACK_HOLE_GROW_END);
    const r = radius * Math.max(0.05, grow);
    const alpha = Math.min(1, grow * 1.4);
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.globalAlpha = alpha;
    if (sprite) {
      const span = r * BLACK_HOLE_SPAN;
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.rotate(now * BLACK_HOLE_SPIN);
      ctx.drawImage(sprite, -span / 2, -span / 2, span, span);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    const shadow = r * BLACK_HOLE_SHADOW;
    const g = ctx.createRadialGradient(0, 0, shadow * 0.55, 0, 0, shadow);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.96)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, shadow, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export interface RainbowDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  r: number;
  born: number;
}

export interface Pool {
  x: number;
  y: number;
  rx: number;
  ry: number;
  born: number;
  seed: number;
  sprite: HTMLCanvasElement | null;
}

const DROP_HUE_STEP = 47;
const DROP_HUE_TIME_DIV = 6;
const DROP_R_MIN = 2;
const DROP_R_SPREAD = 2;
const DROP_SPEED_X = 3;
const DROP_SPEED_UP = 3;
const POOL_RX_MIN = 14;
const POOL_RX_SPREAD = 16;
const POOL_RY_MIN = 3;
const POOL_RY_SPREAD = 3;
const POOL_DEPTH_SCATTER = 10;
const POOL_ALPHA = 0.85;
const POOL_SHIMMER = 0.08;
const POOL_SHIMMER_FREQ = 0.004;

export function makeDrop(x: number, y: number, born: number, index: number): RainbowDrop {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 2 * DROP_SPEED_X,
    vy: -Math.random() * DROP_SPEED_UP,
    hue: (born / DROP_HUE_TIME_DIV + index * DROP_HUE_STEP) % 360,
    r: DROP_R_MIN + Math.random() * DROP_R_SPREAD,
    born,
  };
}

export function updateDrop(d: RainbowDrop, dt: number): void {
  d.vy += DROP_GRAVITY * dt;
  d.x += d.vx * dt;
  d.y += d.vy * dt;
}

export function makePool(x: number, groundY: number, born: number): Pool {
  return {
    x,
    y: groundY + Math.random() * POOL_DEPTH_SCATTER,
    rx: POOL_RX_MIN + Math.random() * POOL_RX_SPREAD,
    ry: POOL_RY_MIN + Math.random() * POOL_RY_SPREAD,
    born,
    seed: Math.random() * Math.PI * 2,
    sprite: null,
  };
}

export function addPool(pools: Pool[], pool: Pool): void {
  pools.push(pool);
  if (pools.length > MAX_POOLS) pools.shift();
}

const DROP_REFRACT_RIM = 0.45;
const DROP_GLOW_LIGHTNESS = 70;
const DROP_SPRITE_R = 12;
const DROP_HUE_BUCKETS = 24;
const POOL_PAD = 3;
const POOL_BODY_ALPHA = 0.72;
const POOL_EDGE_DARK = 'rgba(20,10,50,0.5)';
const dropSprites: HTMLCanvasElement[] = [];

function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

function renderDrop(hue: number): HTMLCanvasElement {
  const r = DROP_SPRITE_R;
  const c = newCanvas(r * 2 + 2, r * 2 + 2);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const x = r + 1;
  const y = r + 1;
  const body = ctx.createRadialGradient(x + r * 0.25, y + r * 0.3, r * 0.1, x, y, r);
  body.addColorStop(0, `hsla(${hue} 90% ${DROP_GLOW_LIGHTNESS}% / 0.55)`);
  body.addColorStop(0.7, `hsla(${hue} 85% 52% / 0.75)`);
  body.addColorStop(1, `hsla(${(hue + 40) % 360} 80% 28% / 0.95)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${DROP_REFRACT_RIM * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsla(${(hue + 60) % 360} 100% 80% / 0.55)`;
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * 0.4, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function drawDrops(ctx: CanvasRenderingContext2D, drops: RainbowDrop[]): void {
  for (const d of drops) {
    const bucket = Math.floor((((d.hue % 360) + 360) % 360) / (360 / DROP_HUE_BUCKETS));
    const sprite = (dropSprites[bucket] ??= renderDrop((bucket + 0.5) * (360 / DROP_HUE_BUCKETS)));
    const size = d.r * 2 * (1 + 2 / (DROP_SPRITE_R * 2));
    ctx.drawImage(sprite, d.x - size / 2, d.y - size / 2, size, size);
  }
}

function renderPool(pool: Pool): HTMLCanvasElement {
  const w = pool.rx * 2 + POOL_PAD * 2;
  const h = pool.ry * 2 + POOL_PAD * 2;
  const c = newCanvas(w, h);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const grad = ctx.createLinearGradient(cx - pool.rx, 0, cx + pool.rx, 0);
  RAINBOW_STOPS.forEach((col, i) => grad.addColorStop(i / (RAINBOW_STOPS.length - 1), col));
  ctx.globalAlpha = POOL_BODY_ALPHA;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, pool.rx, pool.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const depth = ctx.createRadialGradient(cx, cy - pool.ry * 0.2, pool.ry * 0.1, cx, cy, pool.rx);
  depth.addColorStop(0, 'rgba(255,255,255,0.28)');
  depth.addColorStop(0.65, 'rgba(255,255,255,0)');
  depth.addColorStop(1, POOL_EDGE_DARK);
  ctx.fillStyle = depth;
  ctx.beginPath();
  ctx.ellipse(cx, cy, pool.rx, pool.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, pool.rx, pool.ry, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(cx - pool.rx * 0.32, cy - pool.ry * 0.38, pool.rx * 0.3, pool.ry * 0.14, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + pool.rx * 0.28, cy + pool.ry * 0.3, pool.rx * 0.14, pool.ry * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function drawPools(ctx: CanvasRenderingContext2D, pools: Pool[], now: number): void {
  for (const pool of pools) {
    const age = now - pool.born;
    const fade = age > POOL_LIFE_MS - POOL_FADE_MS ? Math.max(0, (POOL_LIFE_MS - age) / POOL_FADE_MS) : 1;
    if (fade <= 0) continue;
    pool.sprite ??= renderPool(pool);
    const squash = 1 + POOL_SHIMMER * Math.sin(now * POOL_SHIMMER_FREQ + pool.seed);
    const w = pool.sprite.width;
    const h = pool.sprite.height * squash;
    ctx.globalAlpha = fade;
    ctx.drawImage(pool.sprite, pool.x - w / 2, pool.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}
