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

  test('selecting Products swivels to the eight product cards', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-panel="products"] a')).toHaveCount(8);
  });

  test('product cards link to the correct destinations', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    const cards = page.locator('[data-panel="products"] a');

    const sunSignal = cards.filter({ hasText: 'Sun Signal' });
    await expect(sunSignal).toHaveAttribute('href', 'https://sunsignal.app');
    await expect(sunSignal).toHaveAttribute('target', '_blank');
    await expect(sunSignal).toHaveAttribute('rel', /noopener/);

    const readAlong = cards.filter({ hasText: 'Read Along' });
    await expect(readAlong).toHaveAttribute('href', 'https://tryreadalong.com');
    await expect(readAlong).toHaveAttribute('target', '_blank');
    await expect(readAlong).toHaveAttribute('rel', /noopener/);

    const poppy = cards.filter({ hasText: 'Poppy' });
    await expect(poppy).toHaveAttribute('href', 'https://getpoppy.io');
    await expect(poppy).toHaveAttribute('target', '_blank');
    await expect(poppy).toHaveAttribute('rel', /noopener/);

    const greenlights = cards.filter({ hasText: 'Greenlights' });
    await expect(greenlights).toHaveAttribute('href', 'https://www.gogo.green');
    await expect(greenlights).toHaveAttribute('target', '_blank');
    await expect(greenlights).toHaveAttribute('rel', /noopener/);

    const eventEvery = cards.filter({ hasText: 'Event Every' });
    await expect(eventEvery).toHaveAttribute('href', 'https://eventevery.com');
    await expect(eventEvery).toHaveAttribute('target', '_blank');
    await expect(eventEvery).toHaveAttribute('rel', /noopener/);

    const skillguard = cards.filter({ hasText: 'SkillGuard' });
    await expect(skillguard).toHaveAttribute('href', 'https://skillguard.sh');
    await expect(skillguard).toHaveAttribute('target', '_blank');
    await expect(skillguard).toHaveAttribute('rel', /noopener/);

    const claudeCues = cards.filter({ hasText: 'claude-cues' });
    await expect(claudeCues).toHaveAttribute('href', 'https://claude-cues.pages.dev');
    await expect(claudeCues).toHaveAttribute('target', '_blank');
    await expect(claudeCues).toHaveAttribute('rel', /noopener/);

    const mealFairy = cards.filter({ hasText: 'Meal Fairy' });
    await expect(mealFairy).toHaveAttribute('href', 'https://meal-fairy-ce3bf.web.app');
    await expect(mealFairy).toHaveAttribute('target', '_blank');
    await expect(mealFairy).toContainText('(retired)');
  });

  test('products render with separate Tools and AI-Designed subsections', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();
    const panel = page.getByTestId('garden-active-panel');

    await expect(panel.getByTestId('products-sort-alpha')).toHaveCount(0);
    await expect(panel.getByTestId('products-sort-date')).toHaveCount(0);
    await expect(panel.getByTestId('products-search')).toHaveCount(0);
    await expect(panel).not.toContainText('2026');
    await expect(panel).not.toContainText('2018');

    const headers = await panel
      .locator('h3')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));
    expect(headers).toEqual(['Tools', 'AI-Designed']);

    const tools = panel.getByTestId('products-subsection-tools');
    await expect(tools.locator('a')).toHaveCount(3);
    await expect(tools).toContainText('Poppy');
    await expect(tools).toContainText('Greenlights');
    await expect(tools).toContainText('Event Every');

    const aiDesigned = panel.getByTestId('products-subsection-ai-designed');
    await expect(aiDesigned.locator('a')).toHaveCount(2);
    await expect(aiDesigned).toContainText('SkillGuard');
    await expect(aiDesigned).toContainText('claude-cues');

    const orderedTitles = await panel
      .locator('a')
      .evaluateAll((els) => els.map((el) => el.querySelector('span')?.textContent?.trim() ?? ''));
    expect(orderedTitles).toEqual([
      'Sun Signal',
      'Read Along',
      'Meal Fairy (retired)',
      'Poppy',
      'Greenlights',
      'Event Every',
      'SkillGuard',
      'claude-cues',
    ]);
  });

  test('the AI-Designed disclosure opens on hover and click and closes with Escape', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-products').click();

    const button = page.getByTestId('ai-designed-info');
    const tooltip = page.getByTestId('ai-designed-tooltip');
    const disclosure = 'These apps were designed primarily with AI and have received limited human review or refinement.';

    await expect(tooltip).toBeHidden();
    await button.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText(disclosure);

    await button.click();
    await page.getByTestId('products-subsection-tools').hover();
    await expect(tooltip).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('selecting Writings swivels to the stacked writing cards', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-readings').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'readings');
    await page.getByTestId('garden-tab-writings').click();

    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'writings');
    await expect(page.getByTestId('garden-tab-writings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('[data-panel="writings"] a[href^="/garden/article"]')).toHaveCount(2);
    await expect(page.locator('[data-panel="writings"] a[href="/garden/article/taken"]')).toHaveCount(0);
  });

  test('selecting Readings swivels to the curated readings list', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-tab-readings').click();
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'readings');
    await expect(page.getByTestId('garden-tab-readings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-panel="readings"] a')).toHaveCount(3);
  });
});
