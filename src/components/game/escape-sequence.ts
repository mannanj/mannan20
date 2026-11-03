export type RocketSeq =
  | 'none'
  | 'planeExit'
  | 'explode'
  | 'drift'
  | 'rocketApproach'
  | 'boarding'
  | 'flight3d';

export type FlightKind = 'none' | 'plane' | 'float' | 'scripted';

export const PLANE_EXIT_MS = 1800;
export const EXPLODE_CLICKS = 3;
export const EXPLODE_FALLBACK_MS = 7000;
export const EXPLODE_MS = 2600;
export const DRIFT_MS = 7500;
export const DRIFT_SLOW_MS = 4000;
export const DRIFT_SLOW_SCALE = 0.22;
export const APPROACH_MS = 11000;
export const BOARDING_MS = 3800;
export const DOOR_CLOSE_AT_MS = 2700;
export const CLIMB_START_MS = 900;
export const CLIMB_END_MS = 2500;
export const FLIGHT_MS = 22000;
export const LIFTOFF_HOLD_MS = 700;
export const LIFTOFF_RISE_MS = 1900;
export const CANVAS_FADE_OUT_MS = 2600;
export const INSIDE_FADE_MS = 600;

export const FLIGHT_PX_PER_MS = 0.3;
export const PLANE_EXIT_SCALE = 0.4;
export const EXPLODE_SCALE = 0.3;
export const FLIGHT_MARGIN_MAX = 200;
export const FLIGHT_MARGIN_FRAC = 0.24;
export const FLIGHT_LOOKAHEAD_MS = 520;
export const FLIGHT_MAX_TURN = 1.5;
export const FLIGHT_AVOID_TURN = 2.7;
export const FLIGHT_TURN_LERP = 0.006;
export const FLIGHT_TURN_MIN_MS = 700;
export const FLIGHT_TURN_SPREAD_MS = 1500;
export const FLIGHT_AVOID_GAIN = 3;
export const FLIGHT_AVOID_RAMP = 3;
export const PITCH_GAIN = 0.55;
export const BANK_DEG_PER_RAD = 15;
export const BANK_MAX_DEG = 28;
export const ROLL_SQUASH_MAX_DEG = 42;
export const BARREL_MS = 950;
export const BARREL_DELAY_MIN_MS = 2800;
export const BARREL_DELAY_SPREAD_MS = 3200;
export const BARREL_MIN_ROLL = 0.18;
export const BARREL_CALM_PENETRATION = 0.25;
export const PLANE_BODY_SCALE = 0.95;
export const PUSH_DECAY_PER_MS = 0.0035;
export const PUSH_RADIUS = 420;
export const PUSH_PX_PER_MS = 0.55;

export const ROCKET_BG_X_FRAC = 0.7;
export const ROCKET_BG_Y_FRAC = 0.5;
export const ROCKET_BG_MIN_SCALE = 0.2;
export const ROCKET_BG_MID_SCALE = 0.45;
export const ROCKET_BG_MAX_SCALE = 0.9;
export const ROCKET_BG_PEEK_OPACITY = 0.6;
export const ROCKET_DOOR_OFFSET_Y = 48;
export const BOARD_CHICKEN_SCALE = 0.5;
export const BOARD_INSIDE_SCALE = 0.3;
export const APPROACH_SWAY_PX = 90;
export const APPROACH_SWAY_CYCLES = 2.5;
export const FLIGHT_TARGET_X_FRAC = 0.5;
export const FLIGHT_TARGET_Y_FRAC = 0.58;
export const FLIGHT_SWAY_X = 14;
export const FLIGHT_SWAY_Y = 8;
export const FLIGHT_SWAY_ROT = 3;
export const LIFTOFF_SHAKE_PX = 2.2;

export interface PlaneFlight {
  heading: number;
  turn: number;
  turnTarget: number;
  nextTurnAt: number;
  nextBarrelAt: number;
  barrelStart: number;
  barrelKind: 'roll' | 'loop';
  barrelDir: number;
  nextBarrelKind: 'roll' | 'loop';
}

export interface FlightOutput {
  dx: number;
  dy: number;
  rotation: number;
  rollY: number;
  facing: 1 | -1;
}

export interface FlightOptions {
  barrels: boolean;
  tiltScale: number;
}

export function createFlight(heading: number): PlaneFlight {
  return {
    heading,
    turn: 0,
    turnTarget: 0,
    nextTurnAt: 0,
    nextBarrelAt: 0,
    barrelStart: -Infinity,
    barrelKind: 'roll',
    barrelDir: 1,
    nextBarrelKind: 'roll',
  };
}

export function wrapAngle(a: number): number {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function smooth01(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function edgePenetration(x: number, y: number, vw: number, vh: number, margin: number): number {
  return Math.max(
    0,
    (margin - x) / margin,
    (x - (vw - margin)) / margin,
    (margin - y) / margin,
    (y - (vh - margin)) / margin
  );
}

export function stepFlight(
  f: PlaneFlight,
  cx: number,
  cy: number,
  vw: number,
  vh: number,
  dtMs: number,
  ts: number,
  speedPxPerMs: number,
  opts: FlightOptions
): FlightOutput {
  const margin = Math.min(FLIGHT_MARGIN_MAX, Math.min(vw, vh) * FLIGHT_MARGIN_FRAC);
  const lookX = cx + Math.cos(f.heading) * speedPxPerMs * FLIGHT_LOOKAHEAD_MS;
  const lookY = cy + Math.sin(f.heading) * speedPxPerMs * FLIGHT_LOOKAHEAD_MS;
  const penetration = clamp(
    Math.max(edgePenetration(lookX, lookY, vw, vh, margin), edgePenetration(cx, cy, vw, vh, margin)),
    0,
    1
  );
  if (ts >= f.nextTurnAt) {
    f.nextTurnAt = ts + FLIGHT_TURN_MIN_MS + Math.random() * FLIGHT_TURN_SPREAD_MS;
    f.turnTarget = (Math.random() - 0.5) * 2 * FLIGHT_MAX_TURN * (0.4 + Math.random() * 0.6);
  }
  const inward = Math.atan2(vh / 2 - cy, vw / 2 - cx);
  const diff = wrapAngle(inward - f.heading);
  const avoid = clamp(diff * FLIGHT_AVOID_GAIN, -FLIGHT_AVOID_TURN, FLIGHT_AVOID_TURN);
  const weight = clamp(penetration * FLIGHT_AVOID_RAMP, 0, 1);
  const steer = f.turnTarget * (1 - weight) + avoid * weight;
  f.turn += (steer - f.turn) * Math.min(1, FLIGHT_TURN_LERP * dtMs);
  f.heading = wrapAngle(f.heading + (f.turn * dtMs) / 1000);

  if (opts.barrels && !f.nextBarrelAt) {
    f.nextBarrelAt = ts + BARREL_DELAY_MIN_MS + Math.random() * BARREL_DELAY_SPREAD_MS;
  }
  if (opts.barrels && ts >= f.nextBarrelAt && penetration < BARREL_CALM_PENETRATION) {
    f.barrelStart = ts;
    f.barrelKind = f.nextBarrelKind;
    f.nextBarrelKind = f.nextBarrelKind === 'roll' ? 'loop' : 'roll';
    f.barrelDir = Math.cos(f.heading) >= 0 ? 1 : -1;
    f.nextBarrelAt = ts + BARREL_MS + BARREL_DELAY_MIN_MS + Math.random() * BARREL_DELAY_SPREAD_MS;
  }
  const barrelU = (ts - f.barrelStart) / BARREL_MS;
  const barrelActive = barrelU >= 0 && barrelU < 1;
  const cosH = Math.cos(f.heading);
  const facing: 1 | -1 = cosH >= 0 ? 1 : -1;
  const pitch = (Math.atan2(Math.sin(f.heading), Math.abs(cosH)) * 180) / Math.PI;
  const bankDeg = clamp(f.turn * BANK_DEG_PER_RAD * facing, -BANK_MAX_DEG, BANK_MAX_DEG);
  let rotation = (pitch * PITCH_GAIN + bankDeg * 0.5) * opts.tiltScale;
  const squashDeg = clamp(Math.abs(f.turn) * 28, 0, ROLL_SQUASH_MAX_DEG);
  let rollY = Math.cos((squashDeg * Math.PI) / 180);
  if (barrelActive) {
    const eased = smooth01(barrelU);
    if (f.barrelKind === 'roll') {
      const c = Math.cos(eased * Math.PI * 2);
      rollY = Math.sign(c || 1) * Math.max(BARREL_MIN_ROLL, Math.abs(c));
    } else {
      rotation += eased * 360 * f.barrelDir * facing;
    }
  }
  return {
    dx: cosH * speedPxPerMs * dtMs,
    dy: Math.sin(f.heading) * speedPxPerMs * dtMs,
    rotation,
    rollY,
    facing,
  };
}

export function driftSpeedScale(se: number): number {
  const t = (se - DRIFT_SLOW_MS) / (DRIFT_MS - DRIFT_SLOW_MS);
  return DRIFT_SLOW_SCALE + (1 - DRIFT_SLOW_SCALE) * smooth01(t);
}

export interface RocketLook {
  opacity: number;
  scale: number;
}

export function rocketLook(seq: RocketSeq, se: number): RocketLook {
  if (seq === 'drift') {
    const t = smooth01((se - DRIFT_SLOW_MS) / (DRIFT_MS - DRIFT_SLOW_MS));
    return {
      opacity: ROCKET_BG_PEEK_OPACITY * t,
      scale: ROCKET_BG_MIN_SCALE + (ROCKET_BG_MID_SCALE - ROCKET_BG_MIN_SCALE) * t,
    };
  }
  if (seq === 'rocketApproach') {
    const u = clamp(se / APPROACH_MS, 0, 1);
    return {
      opacity: ROCKET_BG_PEEK_OPACITY + (1 - ROCKET_BG_PEEK_OPACITY) * smooth01(u * 2),
      scale: ROCKET_BG_MID_SCALE + (ROCKET_BG_MAX_SCALE - ROCKET_BG_MID_SCALE) * smooth01(u),
    };
  }
  if (seq === 'boarding' || seq === 'flight3d') return { opacity: 1, scale: ROCKET_BG_MAX_SCALE };
  return { opacity: 0, scale: ROCKET_BG_MIN_SCALE };
}

export function doorOpenAt(se: number): boolean {
  return se >= 0 && se < DOOR_CLOSE_AT_MS;
}
export const FLIGHT_SKIP_MS = 7000;
export const GATE_COUNT_FROM = 3;
export const GATE_COUNT_TICK_MS = 1000;
