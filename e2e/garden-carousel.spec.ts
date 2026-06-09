import { test, expect, type Page } from '@playwright/test';

async function gotoGarden(page: Page) {
  await page.goto('/garden');
  await expect(page.getByTestId('garden-active-panel')).toBeVisible();
}

test.describe('Garden carousel', () => {
  test('the global header bar is removed on the garden index', async ({ page }) => {
    await gotoGarden(page);
    await expect(page.getByTestId('header-controls')).toHaveCount(0);
    await expect(page.getByTestId('garden-wrapper')).toHaveCount(0);
  });

  test('the global header is still present on article pages', async ({ page }) => {
    await page.goto('/garden/article/seeking-community');
    await expect(page.getByTestId('header-controls')).toHaveCount(1);
  });

  test('the page-magnifier tool does not render on the garden index', async ({ page }) => {
    await gotoGarden(page);
    await expect(page.locator('[data-page-magnifier-root]')).toHaveCount(0);
  });

  test('Writings is the default selected tab', async ({ page }) => {
    await gotoGarden(page);
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
    await expect(page.getByTestId('garden-tab-writings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'false');
  });

  test('selecting Products swivels to the five product cards', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-panel="products"] a')).toHaveCount(5);
  });

  test('product cards link to the correct destinations', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    const cards = page.locator('[data-panel="products"] a');

    const mannan = cards.filter({ hasText: 'Mannan' });
    await expect(mannan).toHaveAttribute('href', '/');
    await expect(mannan).not.toHaveAttribute('target', /.+/);

    const readAlong = cards.filter({ hasText: 'Read Along' });
    await expect(readAlong).toHaveAttribute('href', 'https://tryreadalong.com');
    await expect(readAlong).toHaveAttribute('target', '_blank');
    await expect(readAlong).toHaveAttribute('rel', /noopener/);

    const summon = cards.filter({ hasText: 'Summon It' });
    await expect(summon).toHaveAttribute('href', 'https://summonit.app');
    await expect(summon).toHaveAttribute('target', '_blank');
    await expect(summon).toHaveAttribute('rel', /noopener/);

    const skillguard = cards.filter({ hasText: 'SkillGuard' });
    await expect(skillguard).toHaveAttribute('href', 'https://skillguard.sh');
    await expect(skillguard).toHaveAttribute('target', '_blank');
    await expect(skillguard).toHaveAttribute('rel', /noopener/);

    const mealFairy = cards.filter({ hasText: 'Meal Fairy' });
    await expect(mealFairy).toHaveAttribute('href', 'https://meal-fairy-ce3bf.web.app');
    await expect(mealFairy).toHaveAttribute('target', '_blank');
    await expect(mealFairy).toContainText('(retired)');
  });

  test('products render as a single grid in the configured order with no filters or headers', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    const panel = page.getByTestId('garden-active-panel');

    await expect(panel.getByTestId('products-sort-alpha')).toHaveCount(0);
    await expect(panel.getByTestId('products-sort-date')).toHaveCount(0);
    await expect(panel.getByTestId('products-search')).toHaveCount(0);
    await expect(panel).not.toContainText('2026');
    await expect(panel).not.toContainText('2018');

    const orderedTitles = await panel
      .locator('a')
      .evaluateAll((els) => els.map((el) => el.querySelector('span')?.textContent?.trim() ?? ''));
    expect(orderedTitles).toEqual([
      'Mannan',
      'Read Along',
      'SkillGuard',
      'Summon It',
      'Meal Fairy (retired)',
    ]);
  });

  test('selecting Writings swivels to the stacked writing cards', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await page.getByTestId('garden-tab-writings').click();

    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
    await expect(page.getByTestId('garden-tab-writings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('[data-panel="writings"] a')).toHaveCount(4);
  });

  test('Work is disabled and cannot become the active category', async ({ page }) => {
    await gotoGarden(page);
    const work = page.getByTestId('garden-tab-work');
    await expect(work).toHaveAttribute('aria-disabled', 'true');
    await expect(work).toContainText('coming soon');
    await work.click({ force: true });
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
  });
});
