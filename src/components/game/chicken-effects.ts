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
const FEATHER_LINGER_CHANCE = 0.22;
const FEATHER_DRIFTER_CHANCE = 0.12;
const FEATHER_ALPHA_MIN = 0.42;
const FEATHER_ALPHA_SPREAD = 0.26;
const DRIFTER_TERMINAL_VY = 0.22;
const DRIFTER_WANDER_FORCE = 0.012;
export const STREAK_LIFE_MS = 280;
export const PORTAL_LIFE_MS = 950;

export function makeFeather(cx: number, cy: number, color: string, now: number): Feather {
  const big = Math.random() < FEATHER_BIG_CHANCE;
  const drifter = Math.random() < FEATHER_DRIFTER_CHANCE;
  const size = (9 + Math.random() * 6) * (big ? 2 + Math.random() : 1);
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
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.55);
  ctx.quadraticCurveTo(s * 0.46, -s * 0.12, 0, s * 0.66);
  ctx.quadraticCurveTo(-s * 0.46, -s * 0.12, 0, -s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(0, s * 0.62);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.1);
  ctx.lineTo(s * 0.26, -s * 0.26);
  ctx.moveTo(0, s * 0.18);
  ctx.lineTo(-s * 0.26, s * 0.02);
  ctx.stroke();
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
