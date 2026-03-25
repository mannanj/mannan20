import { test, expect } from '@playwright/test';

test.describe('watch demo video popout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('published works watch demo link opens and closes video popout', async ({ page }) => {
    const heading = page.locator('#published-works');
    await heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const watchDemo = page.locator('text=Watch demo').first();
    await watchDemo.scrollIntoViewIfNeeded();
    await expect(watchDemo).toBeVisible();
    await watchDemo.click();

    const iframe = page.locator('iframe[src*="youtube.com/embed"]');
    await expect(iframe).toBeVisible();

    await page.locator('button:has-text("×")').click();
    await expect(iframe).not.toBeVisible();
  });

  test('education section watch demo link opens video popout', async ({ page }) => {
    const educationHeading = page.locator('#education');
    await educationHeading.scrollIntoViewIfNeeded();

    const plusButtons = page.locator('button:has-text("+")');
    const count = await plusButtons.count();
    const educationPlus = plusButtons.nth(count - 1);
    await educationPlus.scrollIntoViewIfNeeded();
    await educationPlus.click();
    await page.waitForTimeout(300);

    const educationWatchDemo = page.locator('#more-education').getByRole('button', { name: /watch demo/i });
    await educationWatchDemo.scrollIntoViewIfNeeded();
    await expect(educationWatchDemo).toBeVisible();
    await educationWatchDemo.click();

    const iframe = page.locator('iframe[src*="youtube.com/embed"]');
    await expect(iframe).toBeVisible();
  });

  test('watch demo links have identical font size in both sections', async ({ page }) => {
    const firstWatchDemo = page.getByRole('button', { name: /watch demo/i }).first();
    await firstWatchDemo.scrollIntoViewIfNeeded();
    const publishedFontSize = await firstWatchDemo.evaluate((el) => getComputedStyle(el).fontSize);

    const educationHeading = page.locator('#education');
    await educationHeading.scrollIntoViewIfNeeded();
    const plusButtons = page.locator('button:has-text("+")');
    const count = await plusButtons.count();
    await plusButtons.nth(count - 1).click();
    await page.waitForTimeout(300);

    const educationWatchDemo = page.locator('#more-education').getByRole('button', { name: /watch demo/i });
    await educationWatchDemo.scrollIntoViewIfNeeded();
    const educationFontSize = await educationWatchDemo.evaluate((el) => getComputedStyle(el).fontSize);

    expect(publishedFontSize).toBe(educationFontSize);
  });
});
