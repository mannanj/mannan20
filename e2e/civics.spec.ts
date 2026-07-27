import { test, expect } from '@playwright/test';

test.describe('civics report', () => {
  test('does not load the civic bundle from the homepage', async ({ page }) => {
    const civicRequests: string[] = [];

    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/civics')) {
        civicRequests.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(civicRequests).toEqual([]);
  });

  test('loads the report data and exposes both slide decks', async ({ page }) => {
    const response = await page.goto('/civics');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: 'Civic Participation Under Survival Demands',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Civic slides"] a')).toHaveText([
      'Custom slides',
      'Triangle slides',
    ]);
    await expect(page.getByRole('link', { name: 'Custom slides' })).toHaveAttribute('href', '/civics/custom-slides.html');
    await expect(page.getByRole('link', { name: 'Triangle slides' })).toHaveAttribute('href', '/civics/slides.html');
    await expect(page.getByRole('heading', { name: 'Web map' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Themes', exact: true }).first()).toBeVisible();
  });

  test('serves the linked custom deck and advances slides', async ({ page }) => {
    const response = await page.goto('/civics/custom-slides.html');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: 'Civic Participation Under Survival Demands and Uncertain Influence',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('#nav')).toHaveText('Slide 1 of 6');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#nav')).toHaveText('Slide 2 of 6');
    await expect(page.locator('[data-slide-id="evidence"]')).toBeVisible();
  });

  test('serves the distinct triangle deck and advances slides', async ({ page }) => {
    const response = await page.goto('/civics/slides.html');

    expect(response?.status()).toBe(200);
    await expect(page.locator('.brand')).toContainText('Meet the Pod');
    await expect(page.locator('.dot')).toHaveCount(7);
    await expect(page.locator('.slide.cover')).toBeVisible();

    await page.locator('#next').click();
    await expect(page.locator('.slide[data-i="1"]')).toBeVisible();
  });
});
