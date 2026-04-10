import { test, expect } from '@playwright/test';

test.describe('garden icon hover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('garden icon is visible in header', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    await expect(garden).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/garden-initial.png' });
  });

  test('hovering garden icon expands and stays open', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    const gardenLink = page.getByTestId('header-garden-link');

    await garden.hover();
    await page.waitForTimeout(400);

    await expect(page.getByText('View my Garden')).toBeVisible();

    const box = await gardenLink.boundingBox();
    expect(box).not.toBeNull();
    await page.screenshot({ path: 'e2e/screenshots/garden-expanded.png' });
  });

  test('garden stays open when moving within the hover zone', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');

    await garden.hover();
    await page.waitForTimeout(400);
    await expect(page.getByText('View my Garden')).toBeVisible();

    const box = await garden.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height - 5);
    await page.waitForTimeout(300);

    await expect(page.getByText('View my Garden')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/garden-hover-within.png' });
  });

  test('garden collapses when mouse moves away', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');

    await garden.hover();
    await page.waitForTimeout(400);
    await expect(page.getByText('View my Garden')).toBeVisible();

    await page.mouse.move(100, 300);
    await page.waitForTimeout(1000);

    const opacity = await page.getByText('View my Garden').evaluate(
      el => getComputedStyle(el.parentElement!).opacity
    );
    expect(Number(opacity)).toBeLessThan(0.1);
    await page.screenshot({ path: 'e2e/screenshots/garden-collapsed.png' });
  });

  test('garden link navigates to /garden', async ({ page }) => {
    const gardenLink = page.getByTestId('header-garden-link');
    await expect(gardenLink).toHaveAttribute('href', '/garden');
  });

  test('no plant emoji cursor on garden root area', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    await garden.hover();
    await page.waitForTimeout(400);

    const hasCursorUrl = await page.evaluate(() => {
      const rootDiv = document.querySelector('[data-testid="garden-wrapper"] a > div:nth-child(4)');
      if (!rootDiv) return false;
      const style = (rootDiv as HTMLElement).style.cursor || '';
      return style.includes('url(');
    });

    expect(hasCursorUrl).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/garden-no-emoji-cursor.png' });
  });
});
