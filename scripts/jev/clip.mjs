import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { play } from './player.mjs';

const LOCAL = process.env.GAME_BASE ?? 'http://localhost:3861';
const OUT = process.env.OUT_DIR ?? path.join(os.homedir(), 'Desktop', 'jev-clips');
const DEFAULT_SECONDS = 10;

const at = (start) => `${LOCAL}/game?variant=2&start=${start}`;
const stageIs = (stage, phase) => (s) => s.stage === stage && (!phase || s.stagePhase === phase);

export const SCENARIOS = {
  'surf-entry': {
    title: 'enter the surf stage',
    start: 245,
    seconds: 12,
    stopWhen: stageIs('surf', 'live'),
  },
  'pilot-intro': {
    title: 'goggles gag + plane arrives',
    start: 345,
    seconds: 15,
    stopWhen: stageIs('pilot', 'live'),
  },
  'rocket-zoom': {
    title: 'rocket launch + zoom-out',
    start: 445,
    seconds: 20,
  },
  'moon-landing': {
    title: 'moon descent + chicken climbs out',
    start: 535,
    seconds: 15,
    stopWhen: (s) => s.stage === 'moon' && s.stagePhase === 'live',
  },
  'leaderboard-close': {
    title: 'leaderboard opens, Jev closes it first',
    start: 100,
    seconds: 8,
    setup: async (page) => {
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.__chicken.openSheet?.());
    },
    stopWhen: (s, stats) => stats.boardClosed >= 1,
  },
  'orb-multiply': {
    title: 'Multiply x3 orb',
    start: 495,
    seconds: 20,
    stopWhen: (s) => (s.clones ?? 0) > 0,
  },
  'cursor-x5': {
    title: 'Cursor x5 orb',
    start: 745,
    seconds: 20,
    stopWhen: (s) => (s.cursors ?? 1) >= 5,
  },
};

export async function clip(name, overrides = {}) {
  const sc = SCENARIOS[name];
  if (!sc) throw new Error(`unknown scenario "${name}". Known: ${Object.keys(SCENARIOS).join(', ')}`);
  return play({
    url: at(sc.start),
    seconds: sc.seconds ?? DEFAULT_SECONDS,
    title: sc.title,
    setup: sc.setup,
    stopWhen: sc.stopWhen,
    submit: false,
    outDir: OUT,
    label: `clip-${name}`,
    ...overrides,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.log(`usage: node scripts/jev/clip.mjs <scenario...>\nscenarios: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(0);
  }
  for (const n of names) await clip(n);
}
