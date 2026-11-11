import { test, expect, type Page } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildHandClip, CLIP_PATH, FLICK_POINT, hasFfmpeg, PINCH_POINTS, screenPointFor } from './fixtures/hand-clip';

const FIXTURES = join(__dirname, 'fixtures');
const OPEN_IMAGE = join(FIXTURES, 'hand-open.jpg');
const PINCH_IMAGE = join(FIXTURES, 'hand-pinch.jpg');
const VIEWPORT = { width: 1280, height: 720 };
const LIVE_WATCH_MS = 26_000;
const POSITION_TOLERANCE_PX = 90;
const CLICK_LAG_MS = 400;
const canRun = hasFfmpeg() && existsSync(OPEN_IMAGE) && existsSync(PINCH_IMAGE);

interface Sample {
  t: number;
  x: number;
  y: number;
  pinched: boolean;
  score: number;
}

interface HandWindow {
  __handSamples?: Sample[];
  __chicken?: { state: () => { score: number }; placeChicken: (x: number, y: number) => void };
}

test.use({
  viewport: VIEWPORT,
  video: { mode: 'on', size: VIEWPORT },
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${CLIP_PATH}`,
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  },
});

test.beforeAll(() => {
  test.skip(!canRun, 'needs ffmpeg and the hand fixtures');
  buildHandClip(OPEN_IMAGE, PINCH_IMAGE);
});

const scoreOf = (page: Page) => page.evaluate(() => (window as unknown as HandWindow).__chicken!.state().score);
const chickenTransform = (page: Page) => page.getByTestId('chicken').evaluate((el) => (el as HTMLElement).style.transform);

async function openGame(page: Page) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  await page.goto('/game?variant=3');
  await page.waitForFunction(() => (window as unknown as HandWindow).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
}

function watchLive(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as HandWindow;
    const game = w.__chicken!;
    const samples: Sample[] = [];
    w.__handSamples = samples;
    const cursor = document.querySelector<HTMLElement>('[data-testid="hand-cursor"]');
    const half = (cursor?.offsetWidth ?? 0) / 2;
    const tick = () => {
      if (!document.contains(cursor)) return;
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(cursor?.style.transform ?? '');
      if (m) {
        const x = Number(m[1]) + half;
        const y = Number(m[2]) + half;
        game.placeChicken(x, y);
        samples.push({ t: performance.timeOrigin + performance.now(), x, y, pinched: cursor?.dataset.pinched === '1', score: game.state().score });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= POSITION_TOLERANCE_PX;

test.describe('hand control with a real hand through the real tracker', () => {
  test.setTimeout(180_000);

  test('calibrates, pauses, then pinches and flicks squeeze the chicken where the finger points', async ({ page }, testInfo) => {
    await openGame(page);
    const startedAt = Date.now();
    await page.evaluate(() => (window as unknown as HandWindow).__chicken!.placeChicken(640, 200));
    const toggle = page.getByTestId('hand-toggle');
    await expect(toggle).toHaveAttribute('data-phase', 'off');
    await toggle.click();
    await expect(page.getByTestId('hand-ask')).toBeVisible();
    await page.getByTestId('hand-yes').click();
    await expect(page.getByTestId('hand-check')).toBeVisible();
    await expect(page.getByTestId('hand-step-camera')).toHaveAttribute('data-done', '1', { timeout: 90_000 });
    await expect(page.getByTestId('hand-video')).toHaveJSProperty('readyState', 4, { timeout: 15_000 });

    const frozenScore = await scoreOf(page);
    const frozenTransform = await chickenTransform(page);
    await page.waitForTimeout(800);
    expect(await chickenTransform(page)).toBe(frozenTransform);
    expect(await scoreOf(page)).toBe(frozenScore);

    await expect(page.getByTestId('hand-step-hand')).toHaveAttribute('data-done', '1', { timeout: 30_000 });
    await expect(page.getByTestId('hand-step-pinch')).toHaveAttribute('data-done', '1', { timeout: 30_000 });
    await expect(page.getByTestId('hand-start')).toBeEnabled();
    expect(await scoreOf(page)).toBe(frozenScore);
    await page.getByTestId('hand-start').click();
    await expect(page.getByTestId('hand-countdown')).toBeVisible();
    const countdownStart = Date.now();
    await expect(toggle).toHaveAttribute('data-phase', 'on', { timeout: 30_000 });
    console.log('countdown took ms', Date.now() - countdownStart);
    await expect(page.getByTestId('hand-countdown')).toHaveCount(0);
    await expect(page.getByTestId('hand-preview')).toBeVisible();
    await expect(page.getByTestId('hand-cursor')).toBeVisible();

    await watchLive(page);
    await page.waitForTimeout(800);
    expect(await chickenTransform(page)).not.toBe(frozenTransform);
    await page.waitForTimeout(LIVE_WATCH_MS);
    const samples = await page.evaluate(() => (window as unknown as HandWindow).__handSamples ?? []);
    expect(samples.length).toBeGreaterThan(100);
    console.log('samples', samples.length, 'score', samples.at(-1)?.score, 'pinched frames', samples.filter((s) => s.pinched).length);

    const xs = samples.map((s) => s.x);
    const ys = samples.map((s) => s.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(250);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(150);

    const pinchTargets = PINCH_POINTS.map((p) => screenPointFor(p, VIEWPORT.width, VIEWPORT.height));
    const flickTarget = screenPointFor(FLICK_POINT, VIEWPORT.width, VIEWPORT.height);
    const releases = samples.filter((s, i) => i > 0 && samples[i - 1].pinched && !s.pinched);
    const scoreUps = samples.filter((s, i) => i > 0 && s.score > samples[i - 1].score);
    const pinchClicks = releases.filter((r) => scoreUps.some((u) => u.t >= r.t && u.t - r.t <= CLICK_LAG_MS));
    const flickClicks = scoreUps.filter((u) => !releases.some((r) => Math.abs(u.t - r.t) <= CLICK_LAG_MS));

    const presses = samples.filter((s, i) => i > 0 && !samples[i - 1].pinched && s.pinched);
    const sinceStart = (s: Sample) => Number(((s.t - startedAt) / 1000).toFixed(2));
    writeFileSync(testInfo.outputPath('hand-events.json'), JSON.stringify({ presses: presses.map(sinceStart), pinchClicks: pinchClicks.map(sinceStart), flickClicks: flickClicks.map(sinceStart) }));
    expect(pinchClicks.length).toBeGreaterThanOrEqual(1);
    for (const r of pinchClicks) expect(pinchTargets.some((target) => near(r, target))).toBe(true);
    expect(flickClicks.length).toBeGreaterThanOrEqual(1);
    expect(flickClicks.some((u) => near(u, flickTarget))).toBe(true);

    await toggle.click();
    await expect(toggle).toHaveAttribute('data-phase', 'off');
    await expect(page.getByTestId('hand-cursor')).toHaveCount(0);
  });
});
