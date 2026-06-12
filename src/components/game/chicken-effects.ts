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
}

export interface Streak {
  x: number;
  y: number;
  len: number;
  vy: number;
  width: number;
  born: number;
}

const FEATHER_GRAVITY = 0.016;
const FEATHER_TERMINAL_VY = 1.05;
const FEATHER_SWAY_FORCE = 0.014;
const FEATHER_FADE_MS = 600;
export const STREAK_LIFE_MS = 280;

export function makeFeather(cx: number, cy: number, color: string, now: number): Feather {
  return {
    x: cx + (Math.random() - 0.5) * 36,
    y: cy + (Math.random() - 0.5) * 56,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -0.5 - Math.random() * 1.1,
    rotation: Math.random() * Math.PI * 2,
    sway: Math.random() * Math.PI * 2,
    swayRate: 0.0035 + Math.random() * 0.0035,
    size: 9 + Math.random() * 6,
    color,
    born: now,
    life: 2200 + Math.random() * 1400,
  };
}

export function updateFeather(f: Feather, dt: number, ts: number): boolean {
  f.vy = Math.min(FEATHER_TERMINAL_VY, f.vy + FEATHER_GRAVITY * dt);
  f.vx += Math.sin(ts * f.swayRate + f.sway) * FEATHER_SWAY_FORCE * dt;
  f.vx *= 0.985;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  f.rotation = Math.sin(ts * f.swayRate + f.sway) * 0.7 + f.vx * 0.35;
  return ts - f.born < f.life;
}

export function featherAlpha(f: Feather, ts: number): number {
  const remaining = f.life - (ts - f.born);
  return remaining < FEATHER_FADE_MS ? Math.max(0, remaining / FEATHER_FADE_MS) : 1;
}

export function drawFeather(ctx: CanvasRenderingContext2D, f: Feather, ts: number): void {
  const alpha = featherAlpha(f, ts);
  if (alpha <= 0) return;
  const s = f.size;
  ctx.save();
  ctx.globalAlpha = alpha * 0.95;
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
