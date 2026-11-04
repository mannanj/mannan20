import { pathToFileURL } from 'node:url';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { play } from './player.mjs';

const LOCAL = process.env.GAME_BASE ?? 'http://localhost:3861';
const OUT = process.env.OUT_DIR ?? path.join(os.homedir(), 'Desktop', 'jev-clips', 'strategy');
const DEFAULT_SECONDS = 10;
const FREED_PHASES = ['hover', 'depart', 'recede', 'done'];
const HAWK_FREE_MAX_S = 25;
const EAGLE_FREE_MAX_S = 45;
const PHOENIX_FREE_MAX_S = 80;
const GRANT_DELAY_MS = 12000;
const CLIP_STUCK_SECONDS = 45;
const ORB_SETUP_DELAY_MS = 800;

const at = (start) => `${LOCAL}/game?variant=2&start=${start}`;
const stageIs = (stage, phase) => (s) => s.stage === stage && (!phase || s.stagePhase === phase);
const freed = (s) => FREED_PHASES.includes(s.bird?.phase);
const skinIs = (skin) => (s) => s.skin === skin;

const phaseT = (r, phases) => r.birdPhases.find((p) => phases.includes(p.phase))?.t;
export const freeSeconds = (r) => {
  const grab = phaseT(r, ['grab', 'right']);
  const done = phaseT(r, FREED_PHASES);
  return grab !== undefined && done !== undefined ? +(done - grab).toFixed(1) : null;
};
const freeUnder = (max) => (r) => {
  const t = freeSeconds(r);
  return { pass: t !== null && t < max, metric: { timeToFreeS: t, maxS: max } };
};
const skinEnds = (skin, mult) => (r) => ({
  pass: r.finalState.skin === skin && r.skinUpgrades.some((u) => u.skin === skin && u.mult === mult),
  metric: { skin: r.finalState.skin, upgrades: r.skinUpgrades.map((u) => u.skin), itemsUsed: r.itemsUsed.map((i) => i.item) },
});

const forceOrb = (kind) => async (page) => {
  await page.waitForTimeout(ORB_SETUP_DELAY_MS);
  await page.evaluate((k) => window.__chicken.forceOrb(k), kind);
};

const multiplyClip = (start, kind) => ({
  title: `${start} orb`,
  start,
  setup: forceOrb(kind),
  seconds: 40,
  stopWhen: (s) => (s.clones ?? 0) > 0,
  check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds } }),
});

export const SCENARIOS = {
  'surf-entry': { title: 'enter the surf stage', start: 245, seconds: 12, stopWhen: stageIs('surf', 'live'), check: (r) => ({ pass: r.stagesSeen.includes('surf') }) },
  'pilot-intro': { title: 'goggles gag + plane arrives', start: 345, seconds: 15, stopWhen: stageIs('pilot', 'live'), check: (r) => ({ pass: r.stagesSeen.includes('pilot') }) },
  'plane-exit': {
    title: 'plane exit, rocket approach: keep clicking the chicken',
    start: 'plane-exit',
    seconds: 30,
    stopWhen: (s) => s.stage === 'rocket' && s.stagePhase === 'live',
    check: (r) => ({ pass: r.stopReason !== 'stuck' && r.stagesSeen.includes('rocket'), metric: { stages: r.stagesSeen, hitRate: r.hitRate } }),
  },
  'rocket-zoom': { title: 'rocket launch + zoom-out', start: 445, seconds: 20, check: (r) => ({ pass: r.stopReason !== 'stuck' && r.score > r.startScore }) },
  'gate-start': {
    title: 'scene ready: click the start arrow',
    start: 'rocket',
    seconds: 180,
    stopWhen: stageIs('moon', 'live'),
    check: (r) => ({ pass: r.stopReason === 'condition', metric: { gateStartFrames: r.rules['gate-start'] ?? 0, gateWaitFrames: r.rules['gate-wait'] ?? 0 } }),
  },
  'moon-landing': { title: 'moon descent + chicken climbs out', start: 'rocket', seconds: 180, stopWhen: stageIs('moon', 'live'), check: (r) => ({ pass: r.stopReason === 'condition' }) },
  'leaderboard-close': {
    title: 'leaderboard opens, Jev closes it first',
    start: 100,
    seconds: 8,
    setup: async (page) => {
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.__chicken.openSheet?.());
    },
    stopWhen: (s, stats) => stats.boardClosed >= 1,
    check: (r) => ({ pass: r.leaderboard.closed >= 1, metric: { closeMs: r.leaderboard.meanCloseMs } }),
  },
  'orb-collect': {
    title: 'Multiply x3 orb: collect it and use the buff',
    start: 'multiply',
    seconds: 30,
    stopWhen: (s) => (s.clones ?? 0) > 0,
    check: (r) => ({ pass: r.stopReason === 'condition', metric: { orbFrames: r.rules.orb ?? 0, seconds: r.seconds } }),
  },
  'cursor-x5': { title: 'Cursor x5 orb', start: 'cursor-x5', seconds: 30, stopWhen: (s) => (s.cursors ?? 1) >= 5, check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds } }) },
  frenzy: { title: 'Frenzy x2 orb', start: 'frenzy', setup: forceOrb('frenzy'), seconds: 40, stopWhen: (s) => (s.frenzyMs ?? 0) > 0, check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds } }) },
  chain: { title: 'Chain Lightning orb', start: 'chain', setup: forceOrb('chain'), seconds: 40, stopWhen: (s) => (s.chainMs ?? 0) > 0, check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds } }) },
  eggs: { title: 'Golden Eggs hatch into golden chickens', start: 'eggs', setup: forceOrb('eggs'), seconds: 60, stopWhen: (s) => (s.goldens?.length ?? 0) >= 2, check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds, goldenFrames: r.rules.golden ?? 0 } }) },
  'multiply-x5': multiplyClip('multiply-x5', 'multiply5'),
  'multiply-x10': multiplyClip('multiply-x10', 'multiply10'),
  'multiply-x25': multiplyClip('multiply-x25', 'multiply25'),
  'multiply-x100': multiplyClip('multiply-x100', 'multiply100'),
  'cursor-x3': { title: 'Cursor x3 orb', start: 'cursor-x3', seconds: 30, stopWhen: (s) => (s.cursors ?? 1) >= 3, check: (r) => ({ pass: r.stopReason === 'condition', metric: { seconds: r.seconds } }) },
  'hawk-free': { title: 'hawk grabs: free both claws', start: 'hawk', seconds: 60, stopWhen: freed, check: freeUnder(HAWK_FREE_MAX_S) },
  'hawk-feather': { title: 'hawk: feather, bag, skin x1.25', start: 'hawk', seconds: 90, stopWhen: skinIs('hawk'), check: skinEnds('hawk', 1.25) },
  'eagle-free': { title: 'eagle grabs: free both claws', start: 'eagle', seconds: 90, stopWhen: freed, check: freeUnder(EAGLE_FREE_MAX_S) },
  'eagle-feather': { title: 'eagle: feather, bag, skin x2', start: 'eagle', seconds: 120, stopWhen: skinIs('eagle'), check: skinEnds('eagle', 2) },
  'phoenix-free': { title: 'phoenix grabs: free both claws', start: 'phoenix', seconds: 130, stopWhen: freed, check: freeUnder(PHOENIX_FREE_MAX_S) },
  'phoenix-feather': { title: 'phoenix: feather, bag, skin x3', start: 'phoenix', seconds: 160, stopWhen: skinIs('phoenix'), check: skinEnds('phoenix', 3) },
  'rate-ground': { title: 'measure: score per minute on the ground', start: 150, seconds: 60, check: (r) => ({ pass: r.stopReason !== 'stuck', metric: { scorePerMin: r.scorePerMin, hitRate: r.hitRate, usdPerMin: r.usdPerMin } }) },
  'rate-orbit': { title: 'measure: score per minute after the moon', start: 900, seconds: 60, check: (r) => ({ pass: r.stopReason !== 'stuck', metric: { scorePerMin: r.scorePerMin, hitRate: r.hitRate, usdPerMin: r.usdPerMin } }) },
  cosmos: { title: 'plays through the cosmos', start: 'cosmos', seconds: 40, check: (r) => ({ pass: r.stopReason !== 'stuck' && r.score > r.startScore, metric: { stage: r.finalState.stage, scorePerMin: r.scorePerMin } }) },
  martian: {
    title: 'Jupiter: Martians give the martian-friend item, x3',
    start: 'jupiter',
    seconds: 150,
    stopWhen: skinIs('martian'),
    check: skinEnds('martian', 3),
  },
  'skin-upgrade': {
    title: 'always wears the highest skin it owns',
    start: 100,
    seconds: 60,
    setup: async (page) => {
      await page.evaluate(() => window.__chicken.grantItem('hawk-feather'));
      globalThis.__jevPickupAt = Date.now();
      setTimeout(() => {
        globalThis.__jevPickupAt = Date.now();
        page.evaluate(() => window.__chicken.grantItem('eagle-feather')).catch(() => {});
      }, GRANT_DELAY_MS);
    },
    stopWhen: skinIs('eagle'),
    check: (r) => ({ pass: r.finalState.skin === 'eagle' && r.skinUpgrades.length >= 2, metric: { upgrades: r.skinUpgrades.map((u) => u.skin) } }),
  },
};

export async function clip(name, overrides = {}) {
  const sc = SCENARIOS[name];
  if (!sc) throw new Error(`unknown scenario "${name}". Known: ${Object.keys(SCENARIOS).join(', ')}`);
  const report = await play({
    url: at(sc.start),
    seconds: sc.seconds ?? DEFAULT_SECONDS,
    title: sc.title,
    setup: sc.setup,
    stopWhen: sc.stopWhen,
    submit: false,
    outDir: OUT,
    label: `clip-${name}`,
    stuckSeconds: CLIP_STUCK_SECONDS,
    ...overrides,
  });
  const verdict = sc.check ? sc.check(report) : { pass: true };
  const row = { scenario: name, pass: verdict.pass, metric: verdict.metric ?? null, seconds: report.seconds, inputTokens: report.inputTokens, usd: report.costUsd, stopReason: report.stopReason, video: report.video };
  mkdirSync(OUT, { recursive: true });
  appendFileSync(path.join(OUT, 'results.jsonl'), `${JSON.stringify(row)}\n`);
  console.log(`${verdict.pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(row.metric)} tokens=${report.inputTokens} usd=${report.costUsd}`);
  return row;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.log(`usage: node scripts/jev/clip.mjs <scenario...>\nscenarios: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(0);
  }
  for (const n of names) await clip(n);
}
