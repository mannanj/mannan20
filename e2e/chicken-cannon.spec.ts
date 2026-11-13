import { test, expect, type Page } from '@playwright/test';

const VIEW = { w: 1280, h: 720 };
const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);

test('owned helpers work from the bottom and the chicken stays above their zone', async ({ page }) => {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.goto('/game?variant=2&mute=1');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
  await bridge(page, 'grantItem', 'jev');
  await bridge(page, 'grantItem', 'monkey');
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active', { timeout: 4000 });
  await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', 'active', { timeout: 4000 });
  await bridge(page, 'placeChicken', 500, 600);
  await page.waitForTimeout(300);
  const box = await page.getByTestId('chicken').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(VIEW.h - 150);
});
