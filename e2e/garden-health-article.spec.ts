import { test, expect } from '@playwright/test';

const openPopout = async (page: import('@playwright/test').Page) => {
  const card = page.getByTestId('interesting-companies-card');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const popout = page.getByTestId('blueprint-popout');
  await expect(popout).toBeVisible({ timeout: 5000 });
  return popout;
};

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
  });

  test('clicking card opens blueprint popout with all bullets', async ({ page }) => {
    const popout = await openPopout(page);
    await expect(popout).toContainText('Interesting Companies');
    await expect(popout).toContainText('Blueprint');

    const bullets = popout.locator('li');
    const count = await bullets.count();
    expect(count).toBe(8);
  });

  test('popout bullets are concise and use correct tone', async ({ page }) => {
    const popout = await openPopout(page);

    await expect(popout).toContainText('Bryan grew out of Mormonism, I grew out of Islam');
    await expect(popout).toContainText('The interface is the product');
    await expect(popout).toContainText('10+ years of biohacking since 2015');
    await expect(popout).toContainText('Don\u2019t Die answers a real question');
    await expect(popout).toContainText('Hormozi, Naval, and Balaji');
    await expect(popout).toContainText('unifying framework');
    await expect(popout).toContainText('growing up on fast food');
    await expect(popout).toContainText('my own health was the most reliable anchor');

    await expect(popout).not.toContainText('Frontend engineering');
    await expect(popout).not.toContainText('Admires the team');
  });

  test('popout has exactly 2 article links', async ({ page }) => {
    const popout = await openPopout(page);

    const articleLinks = popout.locator('li button.text-\\[\\#039be5\\]');
    await expect(articleLinks).toHaveCount(2);

    await expect(articleLinks.nth(0)).toContainText('growing up on fast food');
    await expect(articleLinks.nth(1)).toContainText('my own health was the most reliable anchor');
  });

  test('first article link scrolls page to origin paragraph', async ({ page }) => {
    const popout = await openPopout(page);

    const scrollBefore = await page.evaluate(() => window.scrollY);

    const firstLink = popout.locator('li button.text-\\[\\#039be5\\]').first();
    await firstLink.click();

    await page.waitForTimeout(800);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).not.toBe(scrollBefore);

    const originVisible = await page.evaluate(() => {
      const el = document.getElementById('origin');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(originVisible).toBe(true);
  });

  test('second article link scrolls to adjacent-projects paragraph', async ({ page }) => {
    const popout = await openPopout(page);

    const scrollArea = popout.locator('.popout-scroll');
    await scrollArea.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);

    const secondLink = popout.locator('li button.text-\\[\\#039be5\\]').nth(1);
    await secondLink.click();

    await page.waitForTimeout(800);

    const visible = await page.evaluate(() => {
      const el = document.getElementById('adjacent-projects');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(visible).toBe(true);
  });

  test('article link auto-shrinks popout to minimized width', async ({ page }) => {
    const popout = await openPopout(page);

    const widthBefore = await popout.evaluate((el) => el.getBoundingClientRect().width);
    expect(widthBefore).toBeCloseTo(400, -1);

    const firstLink = popout.locator('li button.text-\\[\\#039be5\\]').first();
    await firstLink.click();

    await page.waitForTimeout(500);

    const widthAfter = await popout.evaluate((el) => el.getBoundingClientRect().width);
    expect(widthAfter).toBeCloseTo(240, -1);
  });

  test('article link repositions popout near top of viewport', async ({ page }) => {
    const popout = await openPopout(page);

    const firstLink = popout.locator('li button.text-\\[\\#039be5\\]').first();
    await firstLink.click();

    await page.waitForTimeout(500);

    const popoutTop = await popout.evaluate((el) => el.getBoundingClientRect().top);
    expect(popoutTop).toBeLessThanOrEqual(20);
  });

  test('popout stays open after clicking article link', async ({ page }) => {
    const popout = await openPopout(page);

    const firstLink = popout.locator('li button.text-\\[\\#039be5\\]').first();
    await firstLink.click();

    await page.waitForTimeout(500);
    await expect(popout).toBeVisible();
  });

  test('target paragraph gets highlight animation on link click', async ({ page }) => {
    const popout = await openPopout(page);

    const firstLink = popout.locator('li button.text-\\[\\#039be5\\]').first();
    await firstLink.click();

    await page.waitForTimeout(200);

    const hasHighlight = await page.evaluate(() => {
      const el = document.getElementById('origin');
      return el?.classList.contains('article-highlight') ?? false;
    });
    expect(hasHighlight).toBe(true);

    await page.waitForTimeout(1600);

    const stillHighlighted = await page.evaluate(() => {
      const el = document.getElementById('origin');
      return el?.classList.contains('article-highlight') ?? false;
    });
    expect(stillHighlighted).toBe(false);
  });

  test('expand/shrink toggle icon is visible next to close button', async ({ page }) => {
    const popout = await openPopout(page);

    const toggleBtn = popout.locator('button:has(span.flex svg)');
    await expect(toggleBtn).toBeVisible();

    const closeBtn = page.getByTestId('blueprint-popout-close');
    await expect(closeBtn).toBeVisible();

    const toggleRect = await toggleBtn.evaluate((el) => el.getBoundingClientRect());
    const closeRect = await closeBtn.evaluate((el) => el.getBoundingClientRect());
    expect(toggleRect.right).toBeLessThan(closeRect.left + 10);
  });

  test('expand/shrink toggle manually minimizes and restores popout', async ({ page }) => {
    const popout = await openPopout(page);

    const toggleBtn = popout.locator('button:has(span.flex svg)');

    const fullWidth = await popout.evaluate((el) => el.getBoundingClientRect().width);
    expect(fullWidth).toBeCloseTo(400, -1);

    await toggleBtn.click();
    await page.waitForTimeout(400);

    const miniWidth = await popout.evaluate((el) => el.getBoundingClientRect().width);
    expect(miniWidth).toBeCloseTo(240, -1);

    await toggleBtn.click();
    await page.waitForTimeout(400);

    const restoredWidth = await popout.evaluate((el) => el.getBoundingClientRect().width);
    expect(restoredWidth).toBeCloseTo(400, -1);
  });

  test('popout has globe icon and external link', async ({ page }) => {
    const popout = await openPopout(page);

    const link = popout.locator('a[href="https://blueprint.bryanjohnson.com"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');

    const globe = link.locator('svg');
    await expect(globe).toBeVisible();
  });

  test('popout closes with close button', async ({ page }) => {
    const popout = await openPopout(page);

    const closeBtn = page.getByTestId('blueprint-popout-close');
    await closeBtn.click();

    await expect(popout).not.toBeVisible();
  });

  test('popout closes with Escape key', async ({ page }) => {
    const popout = await openPopout(page);

    await page.keyboard.press('Escape');

    await expect(popout).not.toBeVisible();
  });
});

test.describe('about section expand/collapse icons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('expand icon is visible in about section', async ({ page }) => {
    await page.evaluate(() => {
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const expandButtons = page.locator('#about button:has(span.flex svg)');
    const count = await expandButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('clicking expand icon expands content', async ({ page }) => {
    await page.evaluate(() => {
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const firstExpand = page.locator('#about button:has(span.flex svg)').first();
    await firstExpand.scrollIntoViewIfNeeded();
    await firstExpand.click();
    await page.waitForTimeout(300);
  });
});
