import { test, expect, type Page } from '@playwright/test';
import { JEV_ACTIVE_MS, JEV_CLICK_INTERVAL_MS, JEV_COPY } from '../src/components/game/jev-helper';

interface Bridge {
  forceOrb: (kind: string) => void;
  setScore: (n: number) => void;
  snapshot?: () => { score: number };
}

async function openGame(page: Page) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.goto('/game?variant=2&mute=1');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
}

const scoreText = async (page: Page) => Number((await page.locator('[data-testid="chicken-score"]').first().innerText()).replace(/\D/g, ''));

test('the Jev orb puts Jev straight to work at the bottom, and he never falls asleep', async ({ page }) => {
  test.setTimeout(90_000);
  await openGame(page);
  await page.evaluate(() => (window as unknown as { __chicken: Bridge }).__chicken.forceOrb('jev'));
  const orb = page.locator('[data-testid="chicken-orb"][data-kind="jev"]');
  await expect(orb).toBeVisible();
  expect((await orb.boundingBox())?.width).toBeGreaterThan(80);
  await orb.click({ force: true });
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active', { timeout: 6000 });
  const before = await scoreText(page);
  await page.waitForTimeout(2000);
  expect((await scoreText(page)) - before).toBeGreaterThanOrEqual(Math.floor(2000 / JEV_CLICK_INTERVAL_MS) - 1);
  await page.screenshot({ path: 'test-results/jev-active.png' });
  await expect(page.getByTestId('jev-crosshair')).toContainText(JEV_COPY.tag);
  await page.waitForTimeout(JEV_ACTIVE_MS + 2000);
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active');
});
