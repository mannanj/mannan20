import { test, expect, type Page } from '@playwright/test';
import { GEAR_MULT, multBadge } from '../src/components/game/gear';
import { INVENTORY_STORAGE_KEY } from '../src/components/inventory/items';

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
const scoreOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: Bridge }).__chicken.state().score);
const owned = (page: Page) => bridge(page, 'inventory').then((i) => (i as { id: string }[]).map((x) => x.id));

async function openGame(page: Page) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.goto('/game?variant=2&mute=1');
  await page.waitForFunction(() => (window as unknown as { __chicken?: Bridge }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached' });
}

async function arm(page: Page, pet: string, gun: string) {
  await page.getByTestId(`${pet}-gun-toggle`).click();
  await page.getByTestId(`${pet}-gun-${gun}`).click();
  await expect(page.getByTestId(`${pet}-gun-toggle`)).toContainText(multBadge(GEAR_MULT[gun as keyof typeof GEAR_MULT]));
}

test('a pickup goes to the bag, and using a gun hands it to a pet that fires on its own', async ({ page }) => {
  await openGame(page);
  await bridge(page, 'grantItem', 'jev');
  await bridge(page, 'spawnGear', 'ray-gun');
  await page.getByTestId('gear-pickup').click({ force: true });
  await expect.poll(() => owned(page)).toContain('ray-gun');
  await bridge(page, 'useItem', 'ray-gun');
  await expect(page.getByTestId('jev-gun-toggle')).toContainText(multBadge(GEAR_MULT['ray-gun']));
  await expect(page.getByTestId('gear-cursor')).toHaveCount(0);
  const before = await scoreOf(page);
  await expect.poll(() => scoreOf(page), { timeout: 8000 }).toBeGreaterThan(before + 10);
});

test('one gun can arm every pet, the menu shows each multiplier, and guns never cool down', async ({ page }) => {
  test.setTimeout(60_000);
  await openGame(page);
  for (const id of ['jev', 'monkey', 'thunder-gun', 'ray-gun', 'cannon']) await bridge(page, 'grantItem', id);
  await expect.poll(() => owned(page).then((ids) => ids.length)).toBe(5);
  await page.getByTestId('jev-gun-toggle').click();
  for (const gun of ['thunder-gun', 'ray-gun', 'cannon'] as const) {
    await expect(page.getByTestId(`jev-gun-${gun}`)).toContainText(multBadge(GEAR_MULT[gun]));
  }
  await page.getByTestId('jev-gun-thunder-gun').click();
  await arm(page, 'monkey', 'thunder-gun');
  await page.screenshot({ path: 'test-results/pets-thunder.png' });
  const start = await scoreOf(page);
  await page.waitForTimeout(20_000);
  const mid = await scoreOf(page);
  await page.waitForTimeout(3000);
  expect(mid).toBeGreaterThan(start);
  expect(await scoreOf(page)).toBeGreaterThan(mid);
  await expect(page.getByTestId('jev-gun-toggle')).toContainText(multBadge(GEAR_MULT['thunder-gun']));
});

test('freeze shots from a pet slow the chicken, lock it in ice, and it breaks out', async ({ page }) => {
  test.setTimeout(90_000);
  await openGame(page);
  await bridge(page, 'grantItem', 'monkey');
  await bridge(page, 'grantItem', 'freeze-gun');
  await expect.poll(() => owned(page).then((ids) => ids.length)).toBe(2);
  await arm(page, 'monkey', 'freeze-gun');
  await bridge(page, 'placeChicken', 500, 300);
  await expect(page.getByTestId('chicken-ice')).toHaveAttribute('data-phase', 'chilled', { timeout: 5000 });
  await expect(page.getByTestId('chicken-ice')).toHaveAttribute('data-phase', 'solid', { timeout: 30_000 });
  await page.getByTestId('monkey-gun-toggle').click();
  await page.getByTestId('monkey-gun-none').click();
  await page.screenshot({ path: 'test-results/ice-solid.png' });
  await expect(page.getByTestId('chicken-ice')).toHaveCount(0, { timeout: 30_000 });
});

test('the retired laser stays saved but no longer shows in the bag', async ({ page }) => {
  await page.addInitScript(([key]) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(key, JSON.stringify([{ id: 'laser', label: 'Laser', count: 1 }, { id: 'ray-gun', label: 'Ray gun', count: 1 }]));
    }
  }, [INVENTORY_STORAGE_KEY]);
  await openGame(page);
  await page.getByTestId('inventory-bag').click();
  await expect(page.getByTestId('inventory-item-ray-gun')).toBeVisible();
  await expect(page.getByTestId('inventory-item-laser')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key) ?? '', INVENTORY_STORAGE_KEY)).toContain('laser');
});
