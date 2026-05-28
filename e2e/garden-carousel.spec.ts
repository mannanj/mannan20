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

  test('Apps is the default selected tab and shows three app cards', async ({ page }) => {
    await gotoGarden(page);
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'apps');
    await expect(page.getByTestId('garden-tab-apps')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-panel="apps"] a')).toHaveCount(3);
  });

  test('app cards link to the correct destinations', async ({ page }) => {
    await gotoGarden(page);
    const cards = page.locator('[data-panel="apps"] a');

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
  });

  test('selecting Writings swivels to three stacked writing cards', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-writings').click();

    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
    await expect(page.getByTestId('garden-tab-writings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('garden-tab-apps')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('[data-panel="writings"] a')).toHaveCount(3);
  });

  test('selecting Apps again swivels back', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-writings').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
    await page.getByTestId('garden-tab-apps').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'apps');
  });

  test('Work is disabled and cannot become the active category', async ({ page }) => {
    await gotoGarden(page);
    const work = page.getByTestId('garden-tab-work');
    await expect(work).toHaveAttribute('aria-disabled', 'true');
    await expect(work).toContainText('coming soon');
    await work.click({ force: true });
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'apps');
  });
});
