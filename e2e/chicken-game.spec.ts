import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

interface SoundEvent {
  type: 'scream' | 'powerup' | 'crackle';
  key?: string;
  rate?: number;
  synth?: boolean;
  at: number;
}

interface ChickenState {
  score: number;
  tier: number;
  mercy: number;
  shards: number;
  auraLevel: number;
}

interface ChickenBridge {
  plays: SoundEvent[];
  state: () => ChickenState;
  boost: (n: number) => void;
}

const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds', 'chicken');
const R2_GLOB = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/sounds/chicken/*';

function bridge(page: Page) {
  return {
    state: () =>
      page.evaluate(() =>
        (window as unknown as { __chicken: ChickenBridge }).__chicken.state()
      ),
    plays: () =>
      page.evaluate(() =>
        (window as unknown as { __chicken: ChickenBridge }).__chicken.plays
      ),
    boost: (n: number) =>
      page.evaluate(
        (count) =>
          (window as unknown as { __chicken: ChickenBridge }).__chicken.boost(count),
        n
      ),
    ready: () =>
      page.waitForFunction(
        () => (window as unknown as { __chicken?: ChickenBridge }).__chicken !== undefined
      ),
  };
}

async function serveSoundsLocally(page: Page) {
  await page.route(R2_GLOB, (route) => {
    const name = route.request().url().split('/').pop() ?? '';
    return route.fulfill({
      path: path.join(SOUNDS_DIR, path.basename(name)),
      contentType: 'audio/mpeg',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
}

async function gotoGame(page: Page) {
  await serveSoundsLocally(page);
  await page.goto('/game');
  const loader = page.getByTestId('chicken-loader');
  await expect(loader).toBeVisible();
  await loader.waitFor({ state: 'detached', timeout: 15_000 });
  await bridge(page).ready();
}

test.describe('chicken game', () => {
  test('preloads sounds behind the chicken loading bar', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await serveSoundsLocally(page);
    await page.goto('/game');
    const loader = page.getByTestId('chicken-loader');
    await expect(loader).toBeVisible();
    await expect(page.getByTestId('chicken-loader-fill')).toBeVisible();
    await loader.waitFor({ state: 'detached', timeout: 15_000 });
    await bridge(page).ready();
    const state = await bridge(page).state();
    expect(state.score).toBe(0);
    expect(state.tier).toBe(0);
    expect(errors).toEqual([]);
  });

  test('clicking the chicken plays a scream at base pitch', async ({ page }) => {
    await gotoGame(page);
    await page.getByTestId('chicken').click({ force: true });
    await expect
      .poll(async () => (await bridge(page).plays()).filter((p) => p.type === 'scream').length)
      .toBeGreaterThan(0);
    const screams = (await bridge(page).plays()).filter((p) => p.type === 'scream');
    expect(screams[0].rate).toBeGreaterThanOrEqual(0.93);
    expect(screams[0].rate).toBeLessThanOrEqual(1.07);
    expect((await bridge(page).state()).score).toBe(1);
  });

  test('screams are randomized across clicks', async ({ page }) => {
    await gotoGame(page);
    await bridge(page).boost(12);
    const screams = (await bridge(page).plays()).filter((p) => p.type === 'scream');
    expect(screams.length).toBe(12);
    const unique = new Set(screams.map((s) => s.key));
    expect(unique.size).toBeGreaterThanOrEqual(3);
    const consecutive = screams.filter((s, i) => i > 0 && s.key === screams[i - 1].key);
    expect(consecutive).toEqual([]);
  });

  test('evolves through tiers with power-ups, saiyan hair, and deeper screams', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);

    await b.boost(20);
    const chicken = page.getByTestId('chicken');
    await expect(chicken).toHaveAttribute('data-tier', '1');
    await expect(page.getByTestId('chicken-hair')).toBeVisible();
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-hair', 'dark');
    await expect(page.getByTestId('chicken-form-label')).toHaveText('Azure Comet');
    let powerups = (await b.plays()).filter((p) => p.type === 'powerup');
    expect(powerups.length).toBe(1);
    expect((await b.state()).auraLevel).toBeGreaterThan(0);

    await b.boost(90);
    await expect(chicken).toHaveAttribute('data-tier', '4');
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-hair', 'gold');
    await expect(page.getByTestId('chicken-form-label')).toHaveText('Golden God');
    powerups = (await b.plays()).filter((p) => p.type === 'powerup');
    expect(powerups.length).toBe(4);

    await chicken.click({ force: true });
    await expect
      .poll(async () => (await b.plays()).filter((p) => p.type === 'scream').length)
      .toBeGreaterThan(0);
    const screams = (await b.plays()).filter((p) => p.type === 'scream');
    const last = screams[screams.length - 1];
    expect(last.rate).toBeLessThanOrEqual(0.75);
  });

  test('skin shards crack off toward the next tier', async ({ page }) => {
    await gotoGame(page);
    const b = bridge(page);
    await b.boost(10);
    expect((await b.state()).shards).toBe(6);
    await expect(page.getByTestId('chicken-shard')).toHaveCount(6);
    await expect(page.getByTestId('chicken-svg')).toHaveAttribute('data-shards', '6');
  });

  test('mercy slowdown kicks in when idle and resets on hit', async ({ page }) => {
    test.slow();
    await gotoGame(page);
    const b = bridge(page);
    await b.boost(3);
    expect((await b.state()).mercy).toBe(1);
    await page.waitForTimeout(8500);
    const slowed = (await b.state()).mercy;
    expect(slowed).toBeLessThan(0.99);
    expect(slowed).toBeGreaterThan(0.4);
    await page.getByTestId('chicken').click({ force: true });
    await expect.poll(async () => (await b.state()).mercy).toBeGreaterThan(0.99);
  });

  test('game survives total sound failure', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/sounds/chicken/**', (route) => route.fulfill({ status: 404 }));
    await page.route(R2_GLOB, (route) => route.fulfill({ status: 404 }));
    await page.goto('/game');
    const loader = page.getByTestId('chicken-loader');
    await loader.waitFor({ state: 'detached', timeout: 20_000 });
    await bridge(page).ready();
    await page.getByTestId('chicken').click({ force: true });
    await expect.poll(async () => (await bridge(page).state()).score).toBe(1);
    const screams = (await bridge(page).plays()).filter((p) => p.type === 'scream');
    expect(screams).toEqual([]);
    expect(errors).toEqual([]);
  });
});
