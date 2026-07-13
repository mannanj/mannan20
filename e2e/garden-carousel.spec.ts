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

  test('Products and Showcase are selected by default while every category remains available', async ({ page }) => {
    await gotoGarden(page);
    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('products-showcase')).toBeVisible();
    await expect(page.getByTestId('garden-tab-writings')).toBeVisible();
    await expect(page.getByTestId('garden-tab-readings')).toBeVisible();
  });

  test('returning to Products resets its view to Showcase', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-view-legacy').click();
    await expect(page.getByTestId('products-legacy')).toBeVisible();
    await page.getByTestId('garden-tab-writings').click();
    await page.getByTestId('garden-tab-products').click();

    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await expect(page.getByTestId('garden-tab-products')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('products-showcase')).toBeVisible();
    await expect(page.getByTestId('products-legacy')).toHaveCount(0);
  });

  test('Legacy product cards link to the correct destinations', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-view-legacy').click();
    const cards = page.getByTestId('products-legacy').locator('a');

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

  test('Legacy preserves the main grid, Tools subsection, and approved product order', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('garden-view-legacy').click();
    const panel = page.getByTestId('products-legacy');

    await expect(panel.getByTestId('products-sort-alpha')).toHaveCount(0);
    await expect(panel.getByTestId('products-sort-date')).toHaveCount(0);
    await expect(panel.getByTestId('products-search')).toHaveCount(0);
    await expect(panel).not.toContainText('2026');
    await expect(panel).not.toContainText('2018');

    const headers = await panel
      .locator('h3')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));
    expect(headers).toEqual(['Tools']);

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

test.describe('Garden product Showcase', () => {
  test('Products opens in the four-column Showcase by default', async ({ page }) => {
    await gotoGarden(page);

    await expect(page.getByTestId('garden-active-panel')).toHaveAttribute('data-panel', 'products');
    await expect(page.getByTestId('products-showcase')).toBeVisible();
    await expect(page.getByTestId('products-showcase-grid').first()).toHaveClass(/lg:grid-cols-4/);
    await expect(page.getByTestId('products-showcase-grid').first()).toHaveClass(/sm:grid-cols-2/);
    await expect(page.getByTestId('garden-view-globe')).toBeVisible();
    await expect(page.getByTestId('garden-view-legacy')).toBeVisible();
    await expect(page.getByTestId('garden-view-showcase')).toHaveCount(0);
    await expect(
      page.getByTestId('showcase-product-sun-signal').getByText(/WEB|MACOS/i),
    ).toHaveCount(0);
  });

  test('a selected product opens as one OpenSoftware-style split frame', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();

    const artwork = page.getByTestId('product-detail-artwork');
    const panel = page.getByTestId('product-detail-panel');
    await expect(artwork).toHaveCount(1);
    await expect(panel).toBeVisible();
    await expect(panel.locator('img')).toHaveCount(0);

    const artworkBounds = await artwork.boundingBox();
    const panelBounds = await panel.boundingBox();
    expect(artworkBounds?.width).toBeGreaterThan(panelBounds?.width ?? 0);
    expect((artworkBounds?.x ?? 0) + (artworkBounds?.width ?? 0)).toBeLessThanOrEqual(
      (panelBounds?.x ?? 0) + 1,
    );
  });

  test('a Showcase product opens its detail sheet with canonical actions', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();

    await expect(page.getByRole('dialog', { name: 'Sun Signal' })).toBeVisible();
    await expect(page.getByTestId('showcase-primary-action')).toHaveAttribute(
      'href',
      'https://github.com/mannanj/sun-signal',
    );
    await expect(page.getByTestId('showcase-secondary-action')).toHaveAttribute(
      'href',
      'https://sunsignal.app',
    );
  });

  test('Poppy exposes its direct download and Explore action', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('showcase-product-poppy').click();

    await expect(page.getByTestId('showcase-primary-action')).toHaveAttribute(
      'href',
      'https://getpoppy.io/download',
    );
    await expect(page.getByTestId('showcase-secondary-action')).toHaveAttribute(
      'href',
      'https://getpoppy.io',
    );
  });

  test('the product frame stays bounded and uses one artwork on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoGarden(page);
    await page.getByTestId('showcase-product-read-along').click();

    const sheet = page.getByTestId('product-showcase-sheet');
    await expect(sheet).toHaveCSS('position', 'fixed');
    const box = await sheet.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.y).toBeGreaterThanOrEqual(0);
    await expect(page.getByTestId('product-detail-artwork')).toHaveCount(1);
    await expect(page.getByTestId('product-detail-panel').locator('img')).toHaveCount(0);
  });

  test('source metadata links open products and labels closed products', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();
    await expect(page.getByTestId('product-detail-source').getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/mannanj/sun-signal',
    );
    await page.getByRole('button', { name: 'Close Sun Signal' }).click();
    await expect(page.getByRole('dialog', { name: 'Sun Signal' })).toHaveCount(0);

    await page.getByTestId('showcase-product-read-along').click();
    await expect(page.getByTestId('product-detail-source')).toHaveText('Closed');
    await expect(page.getByTestId('product-detail-source').getByRole('link')).toHaveCount(0);
  });

  test('the product sheet stays bounded to the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();

    const bounds = await page.getByTestId('product-showcase-sheet').evaluate((sheet) => {
      const rect = sheet.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });

    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(900);
    expect(bounds.height).toBeLessThanOrEqual(868);
  });

  test('the product sheet blocks the underlying view controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();

    const globeControl = page.getByTestId('garden-view-globe');
    const isControlOnTop = await globeControl.evaluate((control) => {
      const rect = control.getBoundingClientRect();
      const topmost = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return Boolean(topmost?.closest('[data-testid="garden-view-globe"]'));
    });

    expect(isControlOnTop).toBe(false);
  });

  test('Escape closes the sheet and restores focus to its product', async ({ page }) => {
    await gotoGarden(page);
    const trigger = page.getByTestId('showcase-product-read-along');
    await trigger.click();

    await expect(page.getByRole('button', { name: 'Close Read Along' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Read Along' })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('selecting the backdrop closes the sheet', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('showcase-product-greenlights').click();
    await page.getByTestId('product-showcase-backdrop').click({ position: { x: 4, y: 4 } });

    await expect(page.getByRole('dialog', { name: 'Greenlights' })).toHaveCount(0);
  });

  test('Tools is the only subsection and Meal Fairy is visibly retired', async ({ page }) => {
    await gotoGarden(page);
    const showcase = page.getByTestId('products-showcase');

    const subsectionHeaders = await showcase
      .locator('h3')
      .evaluateAll((elements) => elements.map((element) => element.textContent?.trim() ?? ''));
    expect(subsectionHeaders).toEqual(['Tools']);

    await page.getByTestId('showcase-product-meal-fairy').click();
    await expect(page.getByTestId('product-showcase-status')).toHaveText('Retired');
  });

  test('Showcase external actions use safe new-tab attributes', async ({ page }) => {
    await gotoGarden(page);
    await page.getByTestId('showcase-product-sun-signal').click();

    for (const testId of ['showcase-primary-action', 'showcase-secondary-action']) {
      const action = page.getByTestId(testId);
      await expect(action).toHaveAttribute('target', '_blank');
      await expect(action).toHaveAttribute('rel', /noopener/);
    }
  });

  test('Showcase sheet respects reduced-motion while opening and closing', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoGarden(page);
    await page.getByTestId('showcase-product-skillguard').click();
    await expect(page.getByRole('dialog', { name: 'SkillGuard' })).toBeVisible();
    await page.getByRole('button', { name: 'Close SkillGuard' }).click();

    await expect(page.getByRole('dialog', { name: 'SkillGuard' })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
