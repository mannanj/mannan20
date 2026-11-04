import {
  BIG_EGG_CHANCE,
  BIG_EGG_POINTS,
  CHAIN_DURATION_MS,
  CHAIN_MAX_ARCS,
  CURSOR_BUFF_MS,
  CURSOR_CAP_MS,
  CURSOR_EXTEND_PER_CLICK_MS,
  EGG_HATCH_MS,
  EGG_LAY_COUNT,
  EGG_LAY_INTERVAL_MS,
  EGG_POINTS,
  GOLDEN_HIT_VALUE,
  GOLDEN_LIFE_MS,
  MAX_CHICKENS_ON_SCREEN,
  MAX_GOLDEN_CHICKENS,
  ORB_THRESHOLDS,
  multiplyDurationMs,
  multiplyFactor,
} from '../src/components/game/chicken-orbs.ts';
import {
  FRENZY_CAP_MS,
  FRENZY_DURATION_MS,
  FRENZY_EXTEND_PER_CLICK_MS,
  FRENZY_FACTOR,
  ORB_FIRST_GAP_MS,
  ORB_REGISTRY,
  PACE_END_SCORE,
  SCHEDULE_TICK_MS,
  behindFraction,
  isAhead,
  orbGapMs,
  paceTarget,
  pickOrbKind,
  talonNeed,
} from '../src/components/game/chicken-pacing.ts';
import { skinMultiplier } from '../src/components/game/chicken-skins.ts';

const STEP_S = 0.1;
const ORB_PICKUP_DELAY_S = 3;
const ORB_PICKUP_RATE = 0.9;
const LANDING = { none: 1, x5: 4.2, x3: 2.55, both: 9.4 };
const CLONE_OVERLAP = 0.2;
const GOLDEN_HIT_RATE = 0.7;
const EGG_CLICK_DELAY_S = 1.2;
const EGGS_LEFT_TO_HATCH = 3;
const BIRDS = [
  { at: 2000, kind: 'hawk', clicks: 25, feather: 25, overheadS: 14, scaled: false },
  { at: 10_000, kind: 'eagle', clicks: 50, feather: 25, overheadS: 16, scaled: true },
  { at: PACE_END_SCORE, kind: 'phoenix', clicks: 100, feather: 0, overheadS: 14, scaled: true },
];
const ROCKET_AT = 700;
const MARTIAN_AT = 17_000;
const MARTIAN_CLICKS = 100;
const SEQUENCE_S = 1.8 + 4.8 + 4 + 5.5 + 1.9 + 22;
const MAX_HOURS = 2;

function simulate(cps, { scheduler = true, log = false } = {}) {
  const rng = Math.random;
  let t = 0;
  let score = 0;
  let skin = 1;
  let x5Left = 0;
  let x3Left = 0;
  let frenzyLeft = 0;
  let chainLeft = 0;
  let clones = 0;
  let multiplyLeft = 0;
  let multiplyEndedAt = -Infinity;
  let goldens = [];
  let eggs = [];
  let layLeft = 0;
  let layNextAt = 0;
  let orb = null;
  let nextSpawnAt = ORB_FIRST_GAP_MS / 1000;
  let lastTick = 0;
  let lastKinds = [];
  let lastBigAt = -Infinity;
  let clickBank = 0;
  let rocketDone = false;
  let martianDone = false;
  const birdsDone = new Set();
  const fired = new Set();
  const events = [];
  const note = (m) => log && events.push(`${(t / 60).toFixed(1).padStart(4)} ${Math.round(score).toString().padStart(5)} ${m}`);

  const applyOrb = (kind) => {
    lastKinds = [kind, ...lastKinds].slice(0, 2);
    const f = multiplyFactor(kind);
    if (f) {
      if (ORB_REGISTRY[kind].big) lastBigAt = t;
      const total = Math.min(MAX_CHICKENS_ON_SCREEN, (1 + clones + goldens.length) * f);
      clones = total - 1 - goldens.length;
      multiplyLeft = multiplyDurationMs(kind) / 1000;
    } else if (kind === 'cursor5') x5Left = Math.min(CURSOR_CAP_MS / 1000, x5Left + CURSOR_BUFF_MS / 1000);
    else if (kind === 'cursor3') x3Left = Math.min(CURSOR_CAP_MS / 1000, x3Left + CURSOR_BUFF_MS / 1000);
    else if (kind === 'frenzy') frenzyLeft = Math.min(FRENZY_CAP_MS / 1000, frenzyLeft + FRENZY_DURATION_MS / 1000);
    else if (kind === 'chain') chainLeft = CHAIN_DURATION_MS / 1000;
    else if (kind === 'eggs') {
      layLeft = EGG_LAY_COUNT;
      layNextAt = t;
    }
    note(`orb ${kind}`);
  };

  const clearField = () => {
    clones = 0;
    goldens = [];
    eggs = [];
    layLeft = 0;
    orb = null;
    chainLeft = 0;
  };

  while (t < MAX_HOURS * 3600) {
    const frenzy = frenzyLeft > 0 ? FRENZY_FACTOR : 1;
    if (!rocketDone && score >= ROCKET_AT) {
      rocketDone = true;
      clearField();
      t += SEQUENCE_S;
      continue;
    }
    if (!martianDone && score >= MARTIAN_AT) {
      martianDone = true;
      skin = skinMultiplier('martian');
      note('martians');
      t += MARTIAN_CLICKS / cps;
      continue;
    }
    const bird = BIRDS.find((b) => score >= b.at && !birdsDone.has(b.at));
    if (bird) {
      birdsDone.add(bird.at);
      clearField();
      const weight = bird.scaled ? skin : 1;
      const clicks = 2 * talonNeed(bird.clicks, weight) + bird.feather;
      const dur = clicks / cps + bird.overheadS;
      note(`${bird.kind} ${dur.toFixed(0)}s`);
      t += dur;
      score += clicks * skin;
      skin = skinMultiplier(bird.kind);
      if (bird.at === PACE_END_SCORE) return { minutes: t / 60, events };
      continue;
    }

    for (const kind of Object.keys(ORB_THRESHOLDS)) {
      if (!fired.has(kind) && Number.isFinite(ORB_THRESHOLDS[kind]) && score >= ORB_THRESHOLDS[kind] && !orb) {
        fired.add(kind);
        orb = { kind, at: t + ORB_PICKUP_DELAY_S, take: true, expiresAt: t + ORB_REGISTRY[kind].lifetimeMs / 1000 };
      }
    }
    const target = paceTarget(t * 1000);
    const behind = behindFraction(target, score);
    const ahead = isAhead(target, score);
    if (scheduler && t - lastTick >= SCHEDULE_TICK_MS / 1000) {
      lastTick = t;
      if (!orb && t >= nextSpawnAt) {
        const kind = pickOrbKind({
          score,
          behind,
          ahead,
          lastKinds,
          activeKinds: [x5Left > 0 && 'cursor5', x3Left > 0 && 'cursor3', frenzyLeft > 0 && 'frenzy', chainLeft > 0 && 'chain'].filter(Boolean),
          clones,
          goldens: goldens.length,
          sinceBigMs: (t - lastBigAt) * 1000,
          sinceMultiplyEndMs: (t - multiplyEndedAt) * 1000,
          rng,
        });
        if (kind) orb = { kind, at: t + ORB_PICKUP_DELAY_S, take: rng() < ORB_PICKUP_RATE, expiresAt: t + ORB_REGISTRY[kind].lifetimeMs / 1000 };
      }
    }
    if (orb && ((orb.take && t >= orb.at) || t >= orb.expiresAt)) {
      if (orb.take) applyOrb(orb.kind);
      orb = null;
      nextSpawnAt = t + orbGapMs(behind, ahead, rng) / 1000;
    }

    if (layLeft > 0 && t >= layNextAt) {
      layLeft -= 1;
      layNextAt = t + EGG_LAY_INTERVAL_MS / 1000;
      const keep = goldens.length + eggs.filter((e) => e.keep).length < MAX_GOLDEN_CHICKENS && eggs.filter((e) => e.keep).length < EGGS_LEFT_TO_HATCH;
      eggs.push({ bornAt: t, big: rng() < BIG_EGG_CHANCE, keep });
    }

    clickBank += cps * STEP_S;
    let clicksLeft = cps * STEP_S;
    for (let i = eggs.length - 1; i >= 0; i--) {
      const egg = eggs[i];
      if (egg.keep && t - egg.bornAt >= EGG_HATCH_MS / 1000) {
        eggs.splice(i, 1);
        if (goldens.length < MAX_GOLDEN_CHICKENS) goldens.push(t + GOLDEN_LIFE_MS / 1000);
        continue;
      }
      if (!egg.keep && t - egg.bornAt >= EGG_CLICK_DELAY_S && clickBank >= 1) {
        eggs.splice(i, 1);
        clickBank -= 1;
        clicksLeft = Math.max(0, clicksLeft - 1);
        score += egg.big ? BIG_EGG_POINTS : EGG_POINTS;
      }
    }
    goldens = goldens.filter((until) => until > t);

    const landing = x5Left > 0 && x3Left > 0 ? LANDING.both : x5Left > 0 ? LANDING.x5 : x3Left > 0 ? LANDING.x3 : LANDING.none;
    const targetValue = goldens.length > 0 ? 1 + (GOLDEN_HIT_VALUE - 1) * GOLDEN_HIT_RATE : 1;
    const arcs = chainLeft > 0 ? Math.min(CHAIN_MAX_ARCS, clones + goldens.length) : 0;
    const raw = landing * (targetValue + clones * CLONE_OVERLAP) + arcs;
    score += clicksLeft * raw * skin * frenzy;

    clickBank = Math.min(clickBank, 1);
    const clicks = cps * STEP_S;
    if (x5Left > 0) x5Left = Math.min(CURSOR_CAP_MS / 1000, x5Left - STEP_S + (clicks * CURSOR_EXTEND_PER_CLICK_MS) / 1000);
    if (x3Left > 0) x3Left = Math.min(CURSOR_CAP_MS / 1000, x3Left - STEP_S + (clicks * CURSOR_EXTEND_PER_CLICK_MS) / 1000);
    if (frenzyLeft > 0) frenzyLeft = Math.min(FRENZY_CAP_MS / 1000, frenzyLeft - STEP_S + (clicks * FRENZY_EXTEND_PER_CLICK_MS) / 1000);
    if (chainLeft > 0) chainLeft -= STEP_S;
    if (multiplyLeft > 0) {
      multiplyLeft -= STEP_S;
      if (multiplyLeft <= 0) {
        clones = 0;
        multiplyEndedAt = t;
      }
    }
    t += STEP_S;
  }
  return { minutes: Infinity, events };
}

function stats(cps, config, runs = 100) {
  const mins = [];
  for (let i = 0; i < runs; i++) mins.push(simulate(cps, config).minutes);
  mins.sort((a, b) => a - b);
  const mean = mins.reduce((a, b) => a + b, 0) / runs;
  return { mean, p10: mins[Math.floor(runs * 0.1)], p90: mins[Math.floor(runs * 0.9)] };
}

const rates = [3, 5, 8];
const rows = [
  ['Fixed orbs only, no scheduler', { scheduler: false }],
  ['Scheduler on (shipped)', { scheduler: true }],
];
console.log('| Scenario | 3 clicks/s | 5 clicks/s | 8 clicks/s |');
console.log('|---|---|---|---|');
for (const [name, cfg] of rows) {
  const cells = rates.map((r) => {
    const s = stats(r, cfg);
    return `${s.mean.toFixed(1)} min (${s.p10.toFixed(1)}–${s.p90.toFixed(1)})`;
  });
  console.log(`| ${name} | ${cells.join(' | ')} |`);
}
if (process.argv.includes('--log')) {
  const cps = Number(process.argv[process.argv.indexOf('--log') + 1] || 5);
  for (const line of simulate(cps, { log: true }).events) console.log(line);
}
