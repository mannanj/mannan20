import { test, expect, type Page } from '@playwright/test';
import { CANNON_COOLDOWN_MS, CANNON_POINTS, cannonHome } from '../src/components/game/cannon';

const VIEW = { w: 1280, h: 720 };
const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);
const scoreOf = async (page: Page) => Number((await page.getByTestId('chicken-score').first().innerText()).replace(/\D/g, ''));

test('drag the chicken to the silhouette, then fire a 100 point blast on key 3', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/game?variant=2');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
  await bridge(page, 'forceCannon');
  await expect(page.getByTestId('cannon-invite')).toBeVisible();
  await bridge(page, 'placeChicken', 400, 200);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/cannon-invite.png' });
  const box = await page.getByTestId('chicken').boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  const home = cannonHome(VIEW.w, VIEW.h);
  await page.mouse.move(home.x, home.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('cannon')).toBeVisible();
  await expect(page.getByTestId('cannon-invite')).toHaveCount(0);
  await expect(page.getByTestId('cast-cannon')).toHaveAttribute('data-cooling', '0');

  await page.keyboard.press('3');
  await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '1');
  await bridge(page, 'placeChicken', 500, 200);
  const before = await scoreOf(page);
  await page.mouse.move(535, 270);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '0');
  await expect(page.getByTestId('cast-cannon')).toHaveAttribute('data-cooling', '1');
  await expect.poll(() => scoreOf(page), { timeout: 3000 }).toBeGreaterThanOrEqual(before + CANNON_POINTS);
  await page.screenshot({ path: 'test-results/cannon-hit.png' });
  await page.keyboard.press('3');
  await expect(page.getByTestId('cannon')).toHaveAttribute('data-armed', '0');
  await expect(page.getByTestId('cast-cannon')).toHaveAttribute('data-cooling', '0', { timeout: CANNON_COOLDOWN_MS + 1000 });
});

test('number keys call the helpers from the bag and the chicken stays above their zone', async ({ page }) => {
  await page.goto('/game?variant=2');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
  await bridge(page, 'grantItem', 'jev');
  await bridge(page, 'grantItem', 'monkey');
  await expect(page.getByTestId('cast-monkey')).toBeVisible({ timeout: 4000 });
  await page.keyboard.press('1');
  await expect(page.getByTestId('jev')).toBeAttached();
  await page.keyboard.press('2');
  await expect(page.getByTestId('monkey')).toBeAttached();
  await bridge(page, 'placeChicken', 500, 600);
  await page.waitForTimeout(300);
  const box = await page.getByTestId('chicken').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(VIEW.h - 150);
});
