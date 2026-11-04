export const HUD_SAFE_TOP = 200;
export const HUD_SAFE_BOTTOM = 356;
export const HUD_SAFE_HALF_W = 170;
export const HUD_SAFE_PAD = 70;

export interface HudZone {
  cx: number;
  cy: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Push {
  dx: number;
  dy: number;
}

export function hudZone(vw: number): HudZone {
  const cx = vw / 2;
  const halfW = Math.min(HUD_SAFE_HALF_W, vw / 2);
  return {
    cx,
    cy: (HUD_SAFE_TOP + HUD_SAFE_BOTTOM) / 2,
    left: cx - halfW,
    right: cx + halfW,
    top: HUD_SAFE_TOP,
    bottom: HUD_SAFE_BOTTOM,
  };
}

export function hudDistance(zone: HudZone, x: number, y: number): number {
  const dx = Math.max(zone.left - x, 0, x - zone.right);
  const dy = Math.max(zone.top - y, 0, y - zone.bottom);
  return Math.hypot(dx, dy);
}

export function hudPenetration(zone: HudZone, x: number, y: number, pad: number): number {
  return Math.max(0, Math.min(1, 1 - hudDistance(zone, x, y) / pad));
}

export function hudPushOut(zone: HudZone, cx: number, cy: number, halfW: number, halfH: number): Push {
  const overlapX = Math.min(cx + halfW - zone.left, zone.right - (cx - halfW));
  const overlapY = Math.min(cy + halfH - zone.top, zone.bottom - (cy - halfH));
  if (overlapX <= 0 || overlapY <= 0) return { dx: 0, dy: 0 };
  if (overlapX < overlapY) return { dx: cx < zone.cx ? -overlapX : overlapX, dy: 0 };
  return { dx: 0, dy: cy < zone.cy ? -overlapY : overlapY };
}

export function keepOutOfHud(
  zone: HudZone,
  body: { x: number; y: number; vx: number; vy: number },
  halfW: number,
  halfH: number,
  center: boolean
): void {
  const cx = center ? body.x : body.x + halfW;
  const cy = center ? body.y : body.y + halfH;
  const push = hudPushOut(zone, cx, cy, halfW, halfH);
  if (push.dx === 0 && push.dy === 0) return;
  body.x += push.dx;
  body.y += push.dy;
  if (push.dx !== 0 && Math.sign(body.vx) !== Math.sign(push.dx)) body.vx = -body.vx;
  if (push.dy !== 0 && Math.sign(body.vy) !== Math.sign(push.dy)) body.vy = -body.vy;
}
