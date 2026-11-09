import { test, expect, type Page } from '@playwright/test';
import { CANNON_DOCKED_KEY } from '../src/components/game/cannon';

const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);
const scoreOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: { state: () => { score: number } } }).__chicken.state().score);

async function openWithHelpers(page: Page) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  await page.addInitScript((key) => localStorage.setItem(key, '1'), CANNON_DOCKED_KEY);
  await page.goto('/game?variant=3');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
  await bridge(page, 'grantItem', 'monkey');
  await expect(page.getByTestId('cast-monkey')).toBeVisible({ timeout: 4000 });
  await expect(page.getByTestId('cast-cannon')).toHaveAttribute('data-cooling', '0');
}

test.describe('v3 helper keys', () => {
  test('key 2 calls the monkey and key 3 arms the cannon', async ({ page }) => {
    await openWithHelpers(page);
    await page.keyboard.press('2');
    await expect(page.getByTestId('monkey')).toBeAttached();
    await page.keyboard.press('3');
    await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '1');
    await page.keyboard.press('3');
    await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '0');
  });
});

test.describe('v3 helper keys on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('tapping the 2 and 3 chips works like the keys, without squeezing or firing', async ({ page }) => {
    await openWithHelpers(page);
    const before = await scoreOf(page);
    await page.getByTestId('cast-monkey').tap();
    await expect(page.getByTestId('monkey')).toBeAttached();
    await page.getByTestId('cast-cannon').tap();
    await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '1');
    await page.getByTestId('cast-cannon').tap();
    await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '0');
    await expect(page.getByTestId('cast-cannon')).toHaveAttribute('data-cooling', '0');
    expect(await scoreOf(page)).toBe(before);
    await page.getByTestId('cast-hud').screenshot({ path: 'test-results/cast-hud-touch.png' });
  });
});
