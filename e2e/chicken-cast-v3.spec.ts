import { test, expect, type Page } from '@playwright/test';
import { GEAR_MULT, multBadge } from '../src/components/game/gear';
import { PET_BAND, PET_NARROW_BOTTOM_PX } from '../src/components/game/jev-helper';

const bridge = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, rest]) => (window as unknown as { __chicken: Record<string, (...a: unknown[]) => unknown> }).__chicken[name as string](...(rest as unknown[])), [fn, args] as const);
const scoreOf = (page: Page) => page.evaluate(() => (window as unknown as { __chicken: { state: () => { score: number } } }).__chicken.state().score);

async function openV3(page: Page, query = '') {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) => route.fulfill({ json: { human: [], agent: [] } }));
  await page.goto(`/game?variant=3${query}`);
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
}

test.describe('v3 pets and weapons', () => {
  test('owned pets go straight to work across the middle of the bottom edge', async ({ page }) => {
    await openV3(page, '&mute=1');
    await bridge(page, 'grantItem', 'jev');
    await bridge(page, 'grantItem', 'monkey');
    await expect(page.getByTestId('jev')).toHaveAttribute('data-phase', 'active', { timeout: 4000 });
    await expect(page.getByTestId('monkey')).toHaveAttribute('data-phase', 'active', { timeout: 4000 });
    const vw = page.viewportSize()!.width;
    const band = { left: (vw * (1 - PET_BAND)) / 2, right: (vw * (1 + PET_BAND)) / 2 };
    for (const id of ['jev-body', 'monkey-body']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(band.left - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(band.right + 1);
    }
    await expect(page.getByTestId('cast-jev')).toHaveCount(0);
    await expect(page.getByTestId('weapon-tray')).toHaveCount(0);
  });

  test('aimbot is one icon: Space or a click anywhere hits the chicken, then it cools down', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('chicken-aimbot-level', '3'));
    await openV3(page, '&mute=1');
    const toggle = page.getByTestId('aimbot-toggle');
    await expect(toggle).toHaveAttribute('data-phase', 'ready');
    await expect(toggle).toHaveText('');
    await expect(page.getByTestId('aimbot-extra-2')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-phase', 'on');
    await expect(page.getByTestId('aimbot-marker')).toBeVisible();
    await expect(page.getByTestId('aimbot-hint')).toHaveText('Click or press Space');
    const before = await scoreOf(page);
    await page.keyboard.press(' ');
    await page.mouse.click(30, 300);
    await expect.poll(() => scoreOf(page)).toBeGreaterThanOrEqual(before + 2);
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-phase', 'cooling');
    await expect(page.getByTestId('aimbot-marker')).toHaveCount(0);
  });

  test('the sound toggle mutes the game and remembers it', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('chicken-sound-muted', '0');
      }
    });
    await openV3(page);
    const toggle = page.getByTestId('sound-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.waitForSelector('[data-testid="chicken-loader"]', { state: 'detached', timeout: 30_000 });
    await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('v3 pets on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('pets sit above the bottom controls and take a gun from their dropdown', async ({ page }) => {
    await openV3(page, '&mute=1');
    await bridge(page, 'grantItem', 'monkey');
    await bridge(page, 'grantItem', 'ray-gun');
    const body = page.getByTestId('monkey-body');
    await expect(body).toBeVisible({ timeout: 4000 });
    const box = (await body.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(844 - PET_NARROW_BOTTOM_PX + 1);
    await page.getByTestId('monkey-gun-toggle').tap();
    await page.getByTestId('monkey-gun-ray-gun').tap();
    await expect(page.getByTestId('monkey-gun-toggle')).toContainText(multBadge(GEAR_MULT['ray-gun']));
    await page.screenshot({ path: 'test-results/pets-phone.png' });
  });
});
