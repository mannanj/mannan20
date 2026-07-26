import { test, expect } from '@playwright/test';

test.describe('civics report', () => {
  test('loads the report data and exposes both slide decks', async ({ page }) => {
    await page.goto('/civics');

    await expect(
      page.getByRole('heading', { name: 'Civic Participation Under Survival Demands' }),
    ).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Custom slides' })).toHaveAttribute(
      'href',
      '/civics/custom-slides.html',
    );
    await expect(page.getByRole('link', { name: 'Triangle slides' })).toHaveAttribute(
      'href',
      '/civics/slides.html',
    );
    await expect(page.getByRole('heading', { name: 'Web map' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Themes' })).toBeVisible();
  });
});
