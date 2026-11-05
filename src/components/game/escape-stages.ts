export type EscapeStage = 'none' | 'surf' | 'pilot' | 'rocket' | 'moon' | 'cosmos' | 'jupiter';

export const ESCAPE_STAGES: { stage: EscapeStage; threshold: number; introMs: number }[] = [
  { stage: 'none', threshold: 0, introMs: 0 },
  { stage: 'surf', threshold: 125, introMs: 1100 },
  { stage: 'pilot', threshold: 200, introMs: 2400 },
  { stage: 'rocket', threshold: 350, introMs: 0 },
  { stage: 'moon', threshold: 400, introMs: 3400 },
  { stage: 'cosmos', threshold: 1000, introMs: 0 },
  { stage: 'jupiter', threshold: 1500, introMs: 0 },
];

export const COSMOS_START_SCORE = 1000;
export const COSMOS_FORCE_SCORE = 1100;
export const JUPITER_SCORE = 1500;
export const LIFTOFF_MS = 1400;
export const DESCENT_MS = 6000;

export type CosmosBand = 'earth' | 'moon' | 'mars' | 'belt' | 'jupiter-approach';

const COSMOS_BAND_STARTS: { band: CosmosBand; from: number }[] = [
  { band: 'earth', from: 0 },
  { band: 'moon', from: 0.1 },
  { band: 'mars', from: 0.2 },
  { band: 'belt', from: 0.43 },
  { band: 'jupiter-approach', from: 0.71 },
];

export function cosmosProgress(score: number): number {
  return Math.max(0, Math.min(1, (score - COSMOS_START_SCORE) / (JUPITER_SCORE - COSMOS_START_SCORE)));
}

export function cosmosBand(p: number): CosmosBand {
  let band: CosmosBand = 'earth';
  for (const b of COSMOS_BAND_STARTS) if (p >= b.from) band = b.band;
  return band;
}

export function isSpaceStage(stage: EscapeStage): boolean {
  return stage === 'cosmos' || stage === 'jupiter';
}

export const SURF_LINE_FRAC = 0.7;
export const SURF_AMPLITUDE = 22;
export const SURF_INTENSITY_GAIN = 0.9;
export const SURF_WAVELENGTH = 340;
export const SURF_SPEED = 0.0016;
export const SURF_PULL = 0.14;
export const SURF_TILT = 0.5;
export const SURF_BOARD_BOTTOM = 140;
export const ROCKET_LEG_BOTTOM = 165;
export const ROCKET_MIN_SCALE = 0.42;
export const ROCKET_ZOOM_MS = 7000;
export const MOON_DESCENT_FRAC = 0.62;
export const GOGGLE_PHASE_FRAC = 0.66;

export function stageForScore(score: number): EscapeStage {
  let current: EscapeStage = 'none';
  for (const s of ESCAPE_STAGES) {
    if (score >= s.threshold) current = s.stage;
  }
  return current;
}

export function introMsFor(stage: EscapeStage): number {
  return ESCAPE_STAGES.find((s) => s.stage === stage)?.introMs ?? 0;
}

export function surfAmplitude(intensity: number): number {
  return SURF_AMPLITUDE * (1 + intensity * SURF_INTENSITY_GAIN);
}

export function surfSurfaceY(x: number, ts: number, vh: number, intensity: number): number {
  const phase = (x / SURF_WAVELENGTH) * Math.PI * 2 - ts * SURF_SPEED;
  return vh * SURF_LINE_FRAC + Math.sin(phase) * surfAmplitude(intensity);
}

export function surfSlopeDeg(x: number, ts: number, intensity: number): number {
  const phase = (x / SURF_WAVELENGTH) * Math.PI * 2 - ts * SURF_SPEED;
  const k = (Math.PI * 2) / SURF_WAVELENGTH;
  return (Math.atan(Math.cos(phase) * surfAmplitude(intensity) * k) * 180) / Math.PI;
}

export function drawSurf(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  ts: number,
  intensity: number
) {
  const step = 12;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, vh);
  for (let x = 0; x <= vw + step; x += step) ctx.lineTo(x, surfSurfaceY(x, ts, vh, intensity));
  ctx.lineTo(vw, vh);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, vh * SURF_LINE_FRAC - 40, 0, vh);
  grad.addColorStop(0, 'rgba(64, 140, 200, 0.32)');
  grad.addColorStop(1, 'rgba(10, 30, 60, 0.55)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  for (let x = 0; x <= vw + step; x += step) {
    const y = surfSurfaceY(x, ts, vh, intensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(200, 235, 255, 0.75)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200, 235, 255, 0.18)';
  ctx.lineWidth = 1.6;
  for (let row = 1; row <= 3; row++) {
    ctx.beginPath();
    for (let x = 0; x <= vw + step; x += step) {
      const y = surfSurfaceY(x + row * 90, ts * (1 - row * 0.15), vh, intensity * 0.4) + row * 34;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function stageRank(stage: EscapeStage): number {
  return ESCAPE_STAGES.findIndex((s) => s.stage === stage);
}
