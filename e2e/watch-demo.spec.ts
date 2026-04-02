import { test, expect } from '@playwright/test';

test.describe('watch demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('watch demo button opens video popout', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const popout = page.locator('[data-testid="video-popout"]');
    await expect(popout).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-opens-popout.png', fullPage: false });
  });

  test('close button dismisses video popout', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const popout = page.locator('[data-testid="video-popout"]');
    await expect(popout).toBeVisible();

    const closeBtn = page.locator('[data-testid="video-popout-close"]');
    await closeBtn.click();
    await expect(popout).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-close-button.png', fullPage: false });
  });

  test('escape key closes video popout', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const popout = page.locator('[data-testid="video-popout"]');
    await expect(popout).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(popout).not.toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-escape-close.png', fullPage: false });
  });

  test('click outside popout does not close it', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const popout = page.locator('[data-testid="video-popout"]');
    await expect(popout).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(popout).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-click-outside.png', fullPage: false });
  });

  test('video iframe has youtube embed src', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const iframe = page.locator('[data-testid="video-popout-iframe"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /youtube\.com\/embed/);

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-iframe-src.png', fullPage: false });
  });

  test('screenshot: popout open state', async ({ page }) => {
    const watchBtn = page.locator('[data-testid="watch-demo-btn"]').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();

    const popout = page.locator('[data-testid="video-popout"]');
    await expect(popout).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/watch-demo-popout-open.png', fullPage: true });
  });
});
