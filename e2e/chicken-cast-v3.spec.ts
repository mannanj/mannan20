import { test, expect, type Page } from '@playwright/test';
import { GEAR_MULT, multLabel } from '../src/components/game/gear';

const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);
const scoreOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: { state: () => { score: number } } }).__chicken.state().score);

async function openV3(page: Page) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  await page.goto('/game?variant=3');
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
}

test.describe('v3 helpers and weapons', () => {
  test('Jev and the monkey sit asleep at the bottom once owned; key 2 wakes the monkey', async ({ page }) => {
    await openV3(page);
    await bridge(page, 'grantItem', 'jev');
    await bridge(page, 'grantItem', 'monkey');
    await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'idle', { timeout: 4000 });
    await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', 'idle');
    await expect(page.getByTestId('jev-body')).toBeVisible();
    await expect(page.getByTestId('monkey-body')).toBeVisible();
    await page.keyboard.press('2');
    await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', /rising|active/);
    await expect(page.getByTestId('cast-cannon')).toHaveCount(0);
  });

  test('dragging a weapon from the tray onto the monkey shows its multiplier', async ({ page }) => {
    await openV3(page);
    await bridge(page, 'grantItem', 'monkey');
    await bridge(page, 'grantItem', 'ray-gun');
    const weapon = page.getByTestId('weapon-ray-gun');
    await expect(weapon).toBeVisible({ timeout: 4000 });
    const from = await weapon.boundingBox();
    const to = await page.getByTestId('monkey-body').boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('monkey-mult')).toHaveText(multLabel(GEAR_MULT['ray-gun']), { timeout: 2000 });
    await page.getByTestId('weapon-tray').screenshot({ path: 'test-results/weapon-tray.png' });
  });

  test('aimbot locks on: Space or a click anywhere hits the chicken, then it cools down', async ({ page }) => {
    await openV3(page);
    const toggle = page.getByTestId('aimbot-toggle');
    await expect(toggle).toHaveAttribute('data-phase', 'ready');
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-phase', 'on');
    await expect(page.getByTestId('aimbot-marker')).toBeVisible();
    const before = await scoreOf(page);
    await page.keyboard.press(' ');
    await page.mouse.click(30, 300);
    await expect.poll(() => scoreOf(page)).toBeGreaterThanOrEqual(before + 2);
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-phase', 'cooling');
    await expect(page.getByTestId('aimbot-marker')).toHaveCount(0);
  });
});

test.describe('v3 helper keys on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('tapping the 2 chip works like the key, without squeezing', async ({ page }) => {
    await openV3(page);
    await bridge(page, 'grantItem', 'monkey');
    await expect(page.getByTestId('cast-monkey')).toBeVisible({ timeout: 4000 });
    const before = await scoreOf(page);
    await page.getByTestId('cast-monkey').tap();
    await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', /rising|active/);
    expect(await scoreOf(page)).toBe(before);
  });
});
