import { test, expect, type Page } from '@playwright/test';

const GUARD_MS = 900;

async function gotoGame(page: Page, query: string) {
  await page.route('**/*.mp3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/game/leaderboard', (route) =>
    route.fulfill({ json: { human: [], agent: [] } })
  );
  await page.goto(`/game${query}`);
  await page.waitForFunction(() => (window as unknown as { __chicken?: unknown }).__chicken !== undefined);
  await page.getByTestId('chicken-loader').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
}

const sheet = (page: Page) => page.getByTestId('chicken-leaderboard-panel').or(page.locator('#chicken-leaderboard-panel'));

async function sheetOpen(page: Page) {
  return (await page.locator('#chicken-leaderboard-panel').getAttribute('aria-hidden')) === 'false';
}

async function squeeze(page: Page) {
  await page.evaluate(() => (window as unknown as { __chicken: { boost: (n: number) => void } }).__chicken.boost(1));
}

test.describe('chicken game v2 leaderboard hardening', () => {
  test('variant 2 is served only for ?variant=2', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await expect(page.getByTestId('chicken-stage')).toHaveAttribute('data-variant', '2');
    await gotoGame(page, '');
    await expect(page.getByTestId('chicken-stage')).not.toHaveAttribute('data-variant', '2');
  });

  test('a toggle click right after a squeeze is ignored as accidental', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 100);
    await squeeze(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(false);
  });

  test('a deliberate toggle opens it once play has paused', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await squeeze(page);
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
    await expect(sheet(page).first()).toBeVisible();
  });

  test('clicking the play area closes an open leaderboard', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
    await page.mouse.click(200, 150);
    expect(await sheetOpen(page)).toBe(false);
  });

  test('clicks inside the open leaderboard keep it open', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    await page.getByTestId('chicken-leaderboard-link').click();
    await page.getByTestId('leaderboard-tab-agent').click();
    expect(await sheetOpen(page)).toBe(true);
  });

  test('repeated toggles never stack views: one panel, last state wins', async ({ page }) => {
    await gotoGame(page, '?variant=2');
    await page.waitForTimeout(GUARD_MS + 150);
    for (let i = 0; i < 5; i++) await page.getByTestId('chicken-leaderboard-link').click();
    await expect(page.locator('#chicken-leaderboard-panel')).toHaveCount(1);
    expect(await sheetOpen(page)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await sheetOpen(page)).toBe(false);
  });

  test('the default game keeps the original toggle behavior', async ({ page }) => {
    await gotoGame(page, '');
    await squeeze(page);
    await page.getByTestId('chicken-leaderboard-link').click();
    expect(await sheetOpen(page)).toBe(true);
  });
});
