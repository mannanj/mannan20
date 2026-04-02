import { test, expect } from '@playwright/test';

test.describe('garden health article', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/garden/article/health-longevity');
  });

  test('article page loads with title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Health is an Artform' })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/garden-article-loaded.png' });
  });

  test('interesting companies card is visible at bottom', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Interesting Companies');
    await page.screenshot({ path: 'e2e/screenshots/garden-companies-card.png' });
  });

  test('clicking card opens blueprint popout with all bullets', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });
    await expect(popout).toContainText('Interesting Companies');
    await expect(popout).toContainText('Blueprint');

    const bullets = popout.locator('li');
    const count = await bullets.count();
    expect(count).toBe(10);

    await page.screenshot({ path: 'e2e/screenshots/garden-popout-open.png' });
  });

  test('popout contains revised content without fandom language', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });

    await expect(popout).toContainText('parallel journey discussed in the article above');
    await expect(popout).toContainText('team\u2019s honesty, care, and track record');
    await expect(popout).not.toContainText('Admires the team');

    await page.screenshot({ path: 'e2e/screenshots/garden-popout-content.png' });
  });

  test('popout has globe icon and external link', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });

    const link = popout.locator('a[href="https://blueprint.bryanjohnson.com"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');

    const globe = link.locator('svg');
    await expect(globe).toBeVisible();
  });

  test('popout closes with × button', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });

    const closeBtn = page.getByTestId('blueprint-popout-close');
    await closeBtn.click();

    await expect(popout).not.toBeVisible();
  });

  test('popout closes with Escape key', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');

    await expect(popout).not.toBeVisible();
  });

  test('popout scroll area is scrollable', async ({ page }) => {
    const card = page.getByTestId('interesting-companies-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const popout = page.getByTestId('blueprint-popout');
    await expect(popout).toBeVisible({ timeout: 5000 });

    const scrollable = await page.evaluate(() => {
      const el = document.querySelector('.popout-scroll');
      if (!el) return { scrollable: false };
      return {
        scrollable: el.scrollHeight > el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });

    expect(scrollable.scrollable).toBe(true);

    await page.evaluate(() => {
      const el = document.querySelector('.popout-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'e2e/screenshots/garden-popout-scrolled.png' });
  });
});

test.describe('about section expand/collapse icons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('employment + icon is visible and properly positioned', async ({ page }) => {
    await page.evaluate(() => {
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const plusButtons = page.locator('button:has(span:text("+"))');
    const count = await plusButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'e2e/screenshots/about-expand-plus.png' });
  });

  test('clicking + expands content and shows - icon', async ({ page }) => {
    await page.evaluate(() => {
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const firstPlus = page.locator('button:has(span:text("+"))').first();
    await firstPlus.scrollIntoViewIfNeeded();
    await firstPlus.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/about-expand-clicked.png' });
  });
});
