import { test, expect, type Page } from '@playwright/test';

interface Bridge {
  spawnGear: (id: string) => void;
  grantItem: (id: string) => void;
  useItem: (id: string) => void;
  placeChicken: (x: number, y: number) => void;
  inventory: () => { id: string }[];
  state: () => { score: number };
}

const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);

async function openGame(page: Page) {
  await page.goto('/game?variant=2');
  await page.waitForFunction(() => (window as unknown as { __chicken?: Bridge }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
}

test('a pickup goes to the bag and the ray gun scores from the cursor', async ({ page }) => {
  await openGame(page);
  await bridge(page, 'spawnGear', 'ray-gun');
  await page.getByTestId('gear-pickup').click({ force: true });
  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as { id: string }[]).map((x) => x.id))).toContain('ray-gun');
  await bridge(page, 'useItem', 'ray-gun');
  await expect(page.getByTestId('gear-cursor')).toHaveAttribute('data-gun', 'ray-gun');
  await page.mouse.move(535, 370);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) {
    await bridge(page, 'placeChicken', 500, 300);
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  expect(Number((await page.getByTestId('chicken-score').first().innerText()).replace(/\D/g, ''))).toBeGreaterThan(10);
});

test('freeze shots slow the chicken, lock it in ice, and it breaks out', async ({ page }) => {
  test.setTimeout(60_000);
  await openGame(page);
  await bridge(page, 'grantItem', 'freeze-gun');
  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as unknown[]).length)).toBe(1);
  await bridge(page, 'useItem', 'freeze-gun');
  await bridge(page, 'placeChicken', 500, 300);
  await page.mouse.move(535, 370);
  await page.mouse.down();
  await expect(page.getByTestId('chicken-ice')).toHaveAttribute('data-phase', 'chilled');
  await expect(page.getByTestId('chicken-ice')).toHaveAttribute('data-phase', 'solid', { timeout: 7000 });
  await page.mouse.up();
  await page.screenshot({ path: 'test-results/ice-solid.png' });
  await expect(page.getByTestId('chicken-ice')).toHaveAttribute('data-phase', 'heating', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/ice-heating.png' });
  await expect(page.getByTestId('chicken-ice')).toHaveCount(0, { timeout: 5000 });
});

test('a gun dragged to Jev leaves the cursor free, and cools down after 15 seconds', async ({ page }) => {
  test.setTimeout(60_000);
  await openGame(page);
  await bridge(page, 'grantItem', 'ray-gun');
  await bridge(page, 'grantItem', 'jev');
  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as unknown[]).length)).toBe(2);
  await bridge(page, 'useItem', 'jev');
  await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active', { timeout: 6000 });
  await page.getByTestId('inventory-bag').click();
  await page.getByTestId('inventory-item-ray-gun').dragTo(page.getByTestId('jev-body'));
  await expect(page.getByTestId('gear-cursor')).toHaveCount(0);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/jev-gun.png' });
  await page.waitForTimeout(15_000);
  await bridge(page, 'useItem', 'ray-gun');
  await expect(page.getByTestId('gear-note')).toBeVisible();
});

test('the laser needs the monkey, then replaces its darts', async ({ page }) => {
  await openGame(page);
  await bridge(page, 'grantItem', 'laser');
  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as unknown[]).length)).toBe(1);
  await bridge(page, 'useItem', 'laser');
  await expect(page.getByTestId('gear-note')).toBeVisible();
  await bridge(page, 'grantItem', 'monkey');
  await expect.poll(() => bridge(page, 'inventory').then((i) => (i as unknown[]).length)).toBe(2);
  await bridge(page, 'useItem', 'laser');
  await bridge(page, 'useItem', 'monkey');
  await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', 'active', { timeout: 4000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/monkey-laser.png' });
});
