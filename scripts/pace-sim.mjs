import {
  CATCHUP_BEHIND_MIN,
  CATCHUP_CHECK_MS,
  CATCHUP_COOLDOWN_MS,
  FRENZY_CAP_MS,
  FRENZY_DURATION_MS,
  FRENZY_EXTEND_PER_CLICK_MS,
  FRENZY_FACTOR,
  PACE_END_SCORE,
  behindFraction,
  catchUpKind,
  paceTarget,
  talonNeed,
} from '../src/components/game/chicken-pacing.ts';

const STEP_S = 0.1;
const ORB_PICKUP_DELAY_S = 3;
const ORB_PICKUP_RATE = 0.9;
const NATURAL_ORBS = [
  { at: 500, kind: 'multiply' },
  { at: 750, kind: 'cursor5' },
  { at: 1250, kind: 'cursor3' },
];
const BUFFS = {
  cursor5: { factor: 3, seconds: 30, extendPerClick: 0.1, capSeconds: 60 },
  cursor3: { factor: 2, seconds: 30, extendPerClick: 0.1, capSeconds: 60 },
  multiply: { factor: 2.2, seconds: 13, extendPerClick: 0, capSeconds: 15 },
  frenzy: { factor: FRENZY_FACTOR, seconds: FRENZY_DURATION_MS / 1000, extendPerClick: FRENZY_EXTEND_PER_CLICK_MS / 1000, capSeconds: FRENZY_CAP_MS / 1000 },
};
const BIRDS = [
  { at: 2000, clicks: 25, feather: 25, overheadS: 14, skin: 1.25, scaled: false },
  { at: 10_000, clicks: 50, feather: 25, overheadS: 16, skin: 2, scaled: true },
  { at: 25_000, clicks: 100, feather: 0, overheadS: 14, skin: 3, scaled: true },
];
const ROCKET_AT = 700;
const MARTIAN_AT = 17_000;
const MARTIAN_CLICKS = 100;
const MARTIAN_SKIN = 3;
const SEQUENCE_BEFORE_S = 1.8 + 2.6 + 7.5 + 11 + 3.8 + 22;
const SEQUENCE_AFTER_S = 1.8 + 4.8 + 4 + 5.5 + 1.9 + 22;
const MAX_HOURS = 3;

function simulate(cps, { catchUp, scaleTalons, sequenceS }) {
  let t = 0;
  let play = 0;
  let score = 0;
  let skin = 1;
  let buff = null;
  let lastCheck = 0;
  let lastCatchUp = -Infinity;
  let spawns = 0;
  let pending = null;
  let rocketDone = false;
  let martianDone = false;
  const birdsDone = new Set();
  const naturalDone = new Set();
  const spawn = (kind) => {
    pending = { kind, at: t + ORB_PICKUP_DELAY_S, take: Math.random() < ORB_PICKUP_RATE };
  };
  while (t < MAX_HOURS * 3600) {
    if (pending && t >= pending.at) {
      if (pending.take) {
        const def = BUFFS[pending.kind];
        buff = { ...def, left: Math.min(def.capSeconds, (buff ? buff.left : 0) + def.seconds), factor: def.factor };
      }
      pending = null;
    }
    for (const o of NATURAL_ORBS) {
      if (!naturalDone.has(o.at) && score >= o.at && !pending) {
        naturalDone.add(o.at);
        spawn(o.kind);
      }
    }
    if (!rocketDone && score >= ROCKET_AT) {
      rocketDone = true;
      t += sequenceS;
      play += sequenceS;
      continue;
    }
    if (!martianDone && score >= MARTIAN_AT) {
      martianDone = true;
      skin = MARTIAN_SKIN;
      t += MARTIAN_CLICKS / cps;
      play += MARTIAN_CLICKS / cps;
      continue;
    }
    const bird = BIRDS.find((b) => score >= b.at && !birdsDone.has(b.at));
    if (bird) {
      birdsDone.add(bird.at);
      const weight = scaleTalons && bird.scaled ? skin : 1;
      const clicks = 2 * talonNeed(bird.clicks, weight) + bird.feather;
      const dur = clicks / cps + bird.overheadS;
      t += dur;
      play += dur;
      score += clicks * skin;
      skin = bird.skin;
      if (bird.at === PACE_END_SCORE) return t;
      continue;
    }
    const factor = buff && buff.left > 0 ? buff.factor : 1;
    const clicks = cps * STEP_S;
    score += clicks * skin * factor;
    if (buff && buff.left > 0) buff.left = Math.min(buff.capSeconds, buff.left - STEP_S + clicks * buff.extendPerClick);
    t += STEP_S;
    play += STEP_S;
    if (catchUp && play - lastCheck >= CATCHUP_CHECK_MS / 1000) {
      lastCheck = play;
      const behind = behindFraction(paceTarget(play * 1000), score);
      if (!pending && play - lastCatchUp >= CATCHUP_COOLDOWN_MS / 1000 && behind > CATCHUP_BEHIND_MIN) {
        const kind = catchUpKind(behind, spawns);
        if (kind) {
          spawns += 1;
          lastCatchUp = play;
          spawn(kind);
        }
      }
    }
  }
  return Infinity;
}

function average(cps, config, runs = 40) {
  let sum = 0;
  for (let i = 0; i < runs; i++) sum += simulate(cps, config);
  return sum / runs / 60;
}

const rates = [3, 5, 8];
const rows = [
  ['Before (old talons and sequences, no catch-up)', { catchUp: false, scaleTalons: false, sequenceS: SEQUENCE_BEFORE_S }],
  ['New talons and sequences, no catch-up', { catchUp: false, scaleTalons: true, sequenceS: SEQUENCE_AFTER_S }],
  ['After (catch-up orbs on)', { catchUp: true, scaleTalons: true, sequenceS: SEQUENCE_AFTER_S }],
];
console.log('| Scenario | 3 clicks/s | 5 clicks/s | 8 clicks/s |');
console.log('|---|---|---|---|');
for (const [name, cfg] of rows) {
  console.log(`| ${name} | ${rates.map((r) => `${average(r, cfg).toFixed(1)} min`).join(' | ')} |`);
}
