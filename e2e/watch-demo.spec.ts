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

  test('ARCHR deep link reveals its resume experience and opens the video', async ({ page }) => {
    await page.goto('/?video=archr#archr');

    const project = page.getByTestId('archr-project');
    await expect(project).toBeVisible();
    await expect(page.getByTestId('video-popout')).toBeVisible();
    await expect(page.getByTestId('video-popout-iframe')).toHaveAttribute('src', /GSx22ggePHw/);
    await expect
      .poll(() => project.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }))
      .toBe(true);
  });

  test('share control opens the native share sheet with the ARCHR deep link', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          window.localStorage.setItem('shared-url', data.url?.toString() ?? '');
        },
      });
    });
    await page.goto('/');

    const watchBtn = page.getByTestId('watch-demo-btn').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();
    await page.getByTestId('video-popout-share').click();

    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('shared-url')))
      .toBe('http://localhost:3847/?video=archr#archr');
  });

  test('share control copies the ARCHR deep link when native sharing is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (url: string) => window.localStorage.setItem('copied-url', url),
        },
      });
    });
    await page.goto('/');

    const watchBtn = page.getByTestId('watch-demo-btn').first();
    await watchBtn.scrollIntoViewIfNeeded();
    await watchBtn.click();
    const shareButton = page.getByTestId('video-popout-share');
    await shareButton.click();

    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('copied-url')))
      .toBe('http://localhost:3847/?video=archr#archr');
    await expect(shareButton).toHaveAttribute('aria-label', 'Link copied');
  });
});
