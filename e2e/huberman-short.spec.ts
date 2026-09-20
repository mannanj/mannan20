import { test, expect } from '@playwright/test';

const ARTICLE_PATH = '/garden/article/what-huberman-didnt-say';

test.describe('huberman short', () => {
  test('article page renders', async ({ page }) => {
    await page.goto(ARTICLE_PATH);

    await expect(page.getByRole('heading', { name: "What Andrew Huberman Didn't Say" })).toBeVisible();
    await expect(page.getByText('your biology follows nature')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/huberman-short-renders.png', fullPage: true });
  });

  test('inline youtube button opens video popout', async ({ page }) => {
    await page.goto(ARTICLE_PATH);

    const ytBtn = page.getByTestId('youtube-inline-button');
    await ytBtn.scrollIntoViewIfNeeded();
    await ytBtn.click();

    const popout = page.getByTestId('video-popout');
    await expect(popout).toBeVisible();
    await expect(page.getByTestId('video-popout-iframe')).toHaveAttribute('src', /youtube\.com\/embed\/29ArZHkx2Z0/);

    await page.screenshot({ path: 'e2e/screenshots/huberman-short-popout-open.png', fullPage: false });
  });

  test('close button dismisses video popout', async ({ page }) => {
    await page.goto(ARTICLE_PATH);

    await page.getByTestId('youtube-inline-button').click();
    const popout = page.getByTestId('video-popout');
    await expect(popout).toBeVisible();

    await page.getByTestId('video-popout-close').click();
    await expect(popout).not.toBeVisible();
  });

  test('escape key closes video popout', async ({ page }) => {
    await page.goto(ARTICLE_PATH);

    await page.getByTestId('youtube-inline-button').click();
    const popout = page.getByTestId('video-popout');
    await expect(popout).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(popout).not.toBeVisible();
  });

  test('shorts section on /garden links to the article', async ({ page }) => {
    await page.goto('/garden');

    const shorts = page.getByTestId('garden-shorts');
    await expect(shorts).toBeVisible();
    await expect(shorts.getByRole('heading', { name: 'Shorts' })).toBeVisible();

    const link = shorts.locator(`a[href="${ARTICLE_PATH}"]`);
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(ARTICLE_PATH));

    await page.screenshot({ path: 'e2e/screenshots/huberman-short-garden-shorts.png', fullPage: false });
  });
});
