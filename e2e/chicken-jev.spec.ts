import { test, expect, type Page } from '@playwright/test';
import { JEV_ACTIVE_MS, JEV_COPY, JEV_READY_KEY } from '../src/components/game/jev-helper';

interface Bridge {
  forceOrb: (kind: string) => void;
  setScore: (n: number) => void;
  snapshot?: () => { score: number };
}

async function openGame(page: Page) {
  await page.goto('/game?variant=2');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
}

const scoreText = async (page: Page) => Number((await page.locator('[data-testid="chicken-score"]').first().innerText()).replace(/\D/g, ''));

test('the Jev orb asks first, then Jev plays, sleeps, and waits out his cooldown in the bag', async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page);
  await page.evaluate(() => (window as unknown as { __chicken: Bridge }).__chicken.forceOrb('jev'));
  const orb = page.locator('[data-testid="chicken-orb"][data-kind="jev"]');
  await expect(orb).toBeVisible();
  expect((await orb.boundingBox())?.width).toBeGreaterThan(80);
  await orb.click({ force: true });
  await expect(page.getByTestId('jev-prompt')).toContainText(JEV_COPY.ask);
  await page.screenshot({ path: 'test-results/jev-1-prompt.png' });
  await page.getByTestId('jev-activate').click();
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'rising');
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active', { timeout: 6000 });
  const before = await scoreText(page);
  await page.waitForTimeout(2000);
  const gained = (await scoreText(page)) - before;
  expect(gained).toBeGreaterThan(30);
  await page.screenshot({ path: 'test-results/jev-2-active.png' });
  await expect(page.getByTestId('jev-crosshair')).toContainText(JEV_COPY.tag);
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'asleep', { timeout: JEV_ACTIVE_MS + 2000 });
  await page.screenshot({ path: 'test-results/jev-3-asleep.png' });
  await expect(page.getByTestId('jev')).toHaveCount(0, { timeout: 6000 });
  await page.getByTestId('inventory-bag').click();
  await page.getByTestId('inventory-use-jev').click();
  await expect(page.getByTestId('jev-note')).toBeVisible();
  await expect(page.getByTestId('jev')).toHaveCount(0);
  await page.evaluate((key) => localStorage.setItem(key, '0'), JEV_READY_KEY);
  await page.getByTestId('inventory-use-jev').click();
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'rising');
  await expect(page.getByTestId('inventory-item-jev')).toHaveCount(0);
});

test('declining leaves Jev out of the game', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => (window as unknown as { __chicken: Bridge }).__chicken.forceOrb('jev'));
  await page.locator('[data-testid="chicken-orb"][data-kind="jev"]').click({ force: true });
  await page.getByTestId('jev-decline').click();
  await expect(page.getByTestId('jev-prompt')).toHaveCount(0);
  await expect(page.getByTestId('jev')).toHaveCount(0);
});
