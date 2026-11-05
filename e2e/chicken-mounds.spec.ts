import { test, expect, type Page } from '@playwright/test';
import { MOUND_COUNT } from '../src/components/game/mounds';

const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);

const scoreOf = async (page: Page) => Number((await page.getByTestId('chicken-score').first().innerText()).replace(/\D/g, ''));

test('the mound scene plays through, then a tossed mongoose becomes a pet', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/game?variant=2&start=moon');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
  await bridge(page, 'forceMound');
  await expect(page.getByTestId('mound-scene')).toHaveAttribute('data-phase', 'enter');
  await expect(page.getByTestId('mound')).toHaveCount(MOUND_COUNT);
  await expect(page.getByTestId('mound-scene')).toHaveAttribute('data-phase', 'whack', { timeout: 5000 });
  await expect(page.getByTestId('chicken')).toBeHidden();

  const head = page.locator('[data-testid="mound"][data-up="1"]').first();
  await head.waitFor({ state: 'attached', timeout: 5000 });
  const box = await head.boundingBox();
  const before = await scoreOf(page);
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height * 0.3);
  await expect.poll(() => scoreOf(page)).toBeGreaterThan(before);
  await page.screenshot({ path: 'test-results/mound-whack.png' });

  await expect(page.getByTestId('mound-split-orb')).toBeVisible({ timeout: 14_000 });
  await page.getByTestId('mound-split-orb').click({ force: true });
  await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(MOUND_COUNT);
  await page.mouse.move(640, 500);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/mound-split.png' });

  await expect(page.getByTestId('mound-scene')).toHaveAttribute('data-phase', 'mongoose', { timeout: 26_000 });
  await expect(page.locator('[data-testid="mound"][data-broken="1"]').first()).toBeAttached({ timeout: 4000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/mound-break.png' });
  await expect(page.getByTestId('mound-scene')).toHaveCount(0, { timeout: 14_000 });
  await expect(page.getByTestId('chicken')).toBeVisible();
  await expect(page.getByTestId('chicken-extra-cursor')).toHaveCount(0);

  const pet = page.getByTestId('mongoose');
  await expect(pet).toHaveAttribute('data-phase', 'wander');
  await bridge(page, 'placeChicken', 300, 200);
  const p = await pet.boundingBox();
  await page.mouse.move(p!.x + 40, p!.y + 40);
  await page.mouse.down();
  await page.mouse.move(p!.x - 60, p!.y - 30, { steps: 3 });
  await page.mouse.move(p!.x - 200, p!.y - 90, { steps: 3 });
  await page.mouse.up();
  await expect(pet).toHaveAttribute('data-phase', 'friend');
  await expect(page.getByTestId('mongoose-heart')).toHaveCount(4);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'test-results/mongoose-friend.png' });
  const start = await scoreOf(page);
  await page.waitForTimeout(3000);
  expect(await scoreOf(page)).toBeGreaterThan(start);

  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as { id: string }[]).map((x) => x.id)), { timeout: 32_000 }).toContain('mongoose');
  await bridge(page, 'useItem', 'mongoose');
  await expect(page.getByTestId('mongoose-note')).toBeVisible();
});
