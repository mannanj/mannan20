import { test, expect, type Page } from '@playwright/test';

const SETTLE_MS = 1500;
const EGG_FAST_FORWARD_MS = 11_000;
const MEASURE_MS = 8000;
const CLICK_GAP_MS = 180;
const P95_BUDGET_MS = 40;
const SLOW_FRAME_MS = 33;
const SLOW_FRAME_BUDGET_PCT = 10;
const MIN_CHICKENS = 12;

declare global {
  interface Window {
    __frames: number[];
  }
}

test.use({ browserName: 'webkit', viewport: { width: 1280, height: 800 } });

async function bridge(page: Page, fn: string, ...args: unknown[]) {
  await page.evaluate(([f, a]) => {
    const w = window as unknown as { __chicken: Record<string, (...x: unknown[]) => unknown> };
    w.__chicken[f](...a);
  }, [fn, args] as const);
}

async function collect(page: Page, kind: string) {
  await bridge(page, 'forceOrb', kind);
  await page.waitForTimeout(150);
  await bridge(page, 'collectOrb', kind);
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

test('crowded fire-era scene keeps frame times under budget on WebKit', async ({ page }) => {
  test.slow();
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  await page.addInitScript(() => {
    localStorage.setItem('chicken-aimbot-level', '1');
    window.__frames = [];
    let last = 0;
    const tick = (ts: number) => {
      if (last) window.__frames.push(ts - last);
      last = ts;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/game?mute=1');
  await page.waitForFunction(() => '__chicken' in window);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 60_000 });
  await page.waitForTimeout(SETTLE_MS);

  await bridge(page, 'setScore', 2500);
  await page.waitForTimeout(SETTLE_MS);
  await bridge(page, 'placeChicken', 600, 420);
  for (const id of ['jev', 'monkey', 'ray-gun', 'cannon']) await bridge(page, 'grantItem', id);
  await collect(page, 'eggs');
  await page.waitForTimeout(4500);
  await bridge(page, 'fastForward', EGG_FAST_FORWARD_MS);
  await page.waitForTimeout(1200);
  await collect(page, 'multiply5');
  await collect(page, 'cursor5');
  await collect(page, 'cursor3');
  await collect(page, 'scatter');
  for (let i = 0; i < 3; i++) await bridge(page, 'spawnMartian');
  await page.waitForTimeout(800);

  const scene = await page.evaluate(() => {
    const w = window as unknown as { __chicken: { state: () => { chickens: number; cursors: number; goldens: unknown[] } } };
    const s = w.__chicken.state();
    return { chickens: s.chickens, cursors: s.cursors, goldens: s.goldens.length };
  });
  expect(scene.chickens).toBeGreaterThanOrEqual(MIN_CHICKENS);
  expect(scene.cursors).toBeGreaterThan(1);

  await page.evaluate(() => {
    window.__frames.length = 0;
  });
  const start = Date.now();
  while (Date.now() - start < MEASURE_MS) {
    const box = await page.locator('[data-testid="chicken"]').boundingBox();
    if (box && box.width > 4) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(CLICK_GAP_MS);
  }
  const frames = await page.evaluate(() => window.__frames.slice());
  const p95 = percentile(frames, 95);
  const slowPct = (100 * frames.filter((f) => f > SLOW_FRAME_MS).length) / frames.length;
  test.info().annotations.push({ type: 'perf', description: `frames=${frames.length} p50=${percentile(frames, 50).toFixed(1)} p95=${p95.toFixed(1)} slow=${slowPct.toFixed(1)}% scene=${JSON.stringify(scene)}` });
  expect(frames.length).toBeGreaterThan(100);
  expect(p95).toBeLessThan(P95_BUDGET_MS);
  expect(slowPct).toBeLessThan(SLOW_FRAME_BUDGET_PCT);
});
