import { test, expect, type Page } from '@playwright/test';

const VIEW = { w: 1280, h: 720 };
const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);

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
