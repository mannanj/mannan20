import { test, expect } from '@playwright/test';

test.describe('header controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home button is visible in header', async ({ page }) => {
    const homeBtn = page.getByTestId('header-home-button');
    await expect(homeBtn).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/header-initial.png' });
  });

  test('clicking home button scrolls to top of page', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(200);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(800);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(50);
    await page.screenshot({ path: 'e2e/screenshots/header-scrolled-to-top.png' });
  });

  test('home button scrolls on first click without delay', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(800);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(50);
  });

  test('home button shows "Return to Home" tooltip on hover', async ({ page }) => {
    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.hover();
    await expect(page.getByText('Return to Home')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/header-home-tooltip.png' });
  });

  test('hovering header controls expands social links', async ({ page }) => {
    const controls = page.getByTestId('header-controls');
    const linkedin = page.getByTestId('header-linkedin-link');
    const github = page.getByTestId('header-github-link');

    await expect(linkedin).toBeVisible();
    await expect(github).toBeVisible();

    const beforeLinkedin = await linkedin.boundingBox();
    await controls.hover();
    await page.waitForTimeout(400);
    const afterLinkedin = await linkedin.boundingBox();

    expect(afterLinkedin!.x).toBeGreaterThan(beforeLinkedin!.x);
    await page.screenshot({ path: 'e2e/screenshots/header-expanded.png' });
  });

  test('linkedin link has correct href', async ({ page }) => {
    const linkedin = page.getByTestId('header-linkedin-link');
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/mannanjavid/');
    await expect(linkedin).toHaveAttribute('target', '_blank');
  });

  test('github link has correct href', async ({ page }) => {
    const github = page.getByTestId('header-github-link');
    await expect(github).toHaveAttribute('href', 'https://github.com/mannanj');
    await expect(github).toHaveAttribute('target', '_blank');
  });

  test('nav links scroll to sections', async ({ page }) => {
    const aboutLink = page.getByTestId('header-nav-about');
    await aboutLink.click();
    await page.waitForTimeout(800);
    const aboutY = await page.evaluate(() => window.scrollY);
    expect(aboutY).toBeGreaterThan(100);

    const homeLink = page.getByTestId('header-nav-home');
    await homeLink.click();
    await page.waitForTimeout(800);
    const homeY = await page.evaluate(() => window.scrollY);
    expect(homeY).toBeLessThan(aboutY);
    await page.screenshot({ path: 'e2e/screenshots/header-nav-scroll.png' });
  });

  test('clicking home button from contact section returns to top', async ({ page }) => {
    const contactLink = page.getByTestId('header-nav-contact');
    await contactLink.click();
    await page.waitForTimeout(800);
    const contactY = await page.evaluate(() => window.scrollY);
    expect(contactY).toBeGreaterThan(200);

    const homeBtn = page.getByTestId('header-home-button');
    await homeBtn.click();
    await page.waitForTimeout(800);

    const finalY = await page.evaluate(() => window.scrollY);
    expect(finalY).toBeLessThan(50);
  });

  test('social links show tooltips on hover after expand', async ({ page }) => {
    const controls = page.getByTestId('header-controls');
    await controls.hover();
    await page.waitForTimeout(1100);

    const linkedin = page.getByTestId('header-linkedin-link');
    await linkedin.hover();
    await expect(page.getByText('View my LinkedIn')).toBeVisible();

    const github = page.getByTestId('header-github-link');
    await github.hover();
    await expect(page.getByText('View my GitHub')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/header-tooltips.png' });
  });

  test('header is usable at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByTestId('header-home-button')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/header-mobile.png' });
  });

  test('holding the head image opens the continue with email menu', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      }),
    );
    await page.route('**/api/auth/request', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      }),
    );

    const homeBtn = page.getByTestId('header-home-button');
    const box = await homeBtn.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();

    await expect(page.getByTestId('auth-easter-egg-menu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible();

    await page.getByLabel('Email').fill('person@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
  });
});

test.describe('header right stack (garden + mcp)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('garden and mcp icons render together in the right stack', async ({ page }) => {
    await expect(page.getByTestId('header-right-stack')).toBeVisible();
    await expect(page.getByTestId('garden-wrapper')).toBeVisible();
    await expect(page.getByTestId('mcp-header-button')).toBeVisible();
  });

  test('collapsed mcp preview is visible without reserving stack width', async ({ page }) => {
    const preview = page.getByTestId('mcp-collapsed-preview');
    const reveal = page.getByTestId('mcp-reveal');
    const garden = page.getByTestId('header-garden-link');
    const stack = page.getByTestId('header-right-stack');
    const mcp = page.getByTestId('mcp-header-button');

    await expect(preview).toBeVisible();
    await expect(reveal).toHaveCSS('opacity', '0');
    expect((await reveal.boundingBox())!.width).toBe(0);

    const previewBox = await preview.boundingBox();
    const gardenBox = await garden.boundingBox();

    expect(previewBox!.x + previewBox!.width).toBeLessThan(gardenBox!.x + 23);

    await stack.hover();
    await page.waitForTimeout(400);
    const expandedMcpBox = await mcp.boundingBox();
    expect(Math.abs(previewBox!.y - (expandedMcpBox!.y + 6))).toBeLessThan(4);
  });

  test('hovering the right stack fans the mcp icon out to the left (into the page)', async ({ page }) => {
    const stack = page.getByTestId('header-right-stack');
    const mcp = page.getByTestId('mcp-header-button');

    const before = await mcp.boundingBox();
    await stack.hover();
    await page.waitForTimeout(400);
    const after = await mcp.boundingBox();

    expect(after!.x).toBeLessThan(before!.x);
    await page.screenshot({ path: 'e2e/screenshots/right-stack-expanded.png' });
  });

  test('mcp stays on-screen when revealed (anchored to the right, fans inward)', async ({ page }) => {
    await page.getByTestId('header-right-stack').hover();
    await page.waitForTimeout(400);
    const mcp = await page.getByTestId('mcp-header-button').boundingBox();
    expect(mcp!.x + mcp!.width).toBeLessThanOrEqual(1280);
    expect(mcp!.x).toBeGreaterThan(0);
  });

  test('garden anchor stays horizontally in place when the stack opens', async ({ page }) => {
    const garden = page.getByTestId('header-garden-link');

    const before = await garden.boundingBox();
    await page.getByTestId('header-right-stack').hover();
    await page.waitForTimeout(500);
    const after = await garden.boundingBox();

    expect(Math.abs(after!.x - before!.x)).toBeLessThan(6);
  });

  test('garden stays expanded when moving from the plant onto the mcp icon', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    const mcp = page.getByTestId('mcp-header-button');

    await garden.hover();
    await page.waitForTimeout(400);
    const gardenTipBefore = await page
      .getByTestId('garden-tooltip')
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(gardenTipBefore)).toBeGreaterThan(0.5);

    const box = await mcp.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(500);

    const gardenTipAfter = await page
      .getByTestId('garden-tooltip')
      .evaluate((el) => getComputedStyle(el).opacity);
    const mcpTipAfter = await page
      .getByTestId('mcp-header-tooltip')
      .evaluate((el) => getComputedStyle(el).opacity);
    await expect(page.getByTestId('mcp-reveal')).toHaveCSS('opacity', '1');
    expect(Number(gardenTipAfter)).toBeLessThan(0.1);
    expect(Number(mcpTipAfter)).toBeGreaterThan(0.5);

    const after = await mcp.boundingBox();
    expect(Math.abs(after!.x - box!.x)).toBeLessThan(6);
  });

  test('hovering the revealed mcp icon switches the tooltip from garden to mcp', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    const mcp = page.getByTestId('mcp-header-button');

    await garden.hover();
    await page.waitForTimeout(400);

    const box = await mcp.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(300);

    const gardenTooltipOpacity = await page
      .getByTestId('garden-tooltip')
      .evaluate((el) => getComputedStyle(el).opacity);
    const mcpTooltipOpacity = await page
      .getByTestId('mcp-header-tooltip')
      .evaluate((el) => getComputedStyle(el).opacity);

    expect(Number(gardenTooltipOpacity)).toBeLessThan(0.1);
    expect(Number(mcpTooltipOpacity)).toBeGreaterThan(0.5);
  });

  test('clicking the revealed mcp icon keeps the popover and cluster open', async ({ page }) => {
    const garden = page.getByTestId('garden-wrapper');
    const reveal = page.getByTestId('mcp-reveal');
    const mcp = page.getByTestId('mcp-header-button');

    await garden.hover();
    await page.waitForTimeout(400);
    await mcp.click();
    await page.waitForTimeout(400);
    await page.mouse.move(100, 300);
    await page.waitForTimeout(500);

    await expect(page.getByTestId('mcp-popover')).toBeVisible();
    await expect(reveal).toHaveCSS('opacity', '1');
    expect((await reveal.boundingBox())!.width).toBeGreaterThan(20);
  });

  test('clicking the garden plant navigates to the garden', async ({ page }) => {
    const garden = page.getByTestId('header-garden-link');
    await garden.hover();
    await page.waitForTimeout(150);
    await garden.click();
    await expect(page).toHaveURL(/\/garden/);
  });
});

test.describe('garden + mcp tap gate on touch (no hover available)', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('mcp is collapsed and inert until the cluster is revealed', async ({ page }) => {
    const reveal = page.getByTestId('mcp-reveal');
    await expect(page.getByTestId('mcp-collapsed-preview')).toBeVisible();
    await expect(reveal).toHaveCSS('opacity', '0');
    await expect(reveal).toHaveCSS('pointer-events', 'none');
    expect((await reveal.boundingBox())!.width).toBe(0);
  });

  test('first tap on the plant reveals the mcp instead of navigating', async ({ page }) => {
    const plant = page.getByTestId('header-garden-link');
    await plant.tap();
    await expect(page.getByTestId('mcp-reveal')).toHaveCSS('opacity', '1');
    expect((await page.getByTestId('mcp-reveal').boundingBox())!.width).toBeGreaterThan(20);
    await expect(page).toHaveURL(/\/$/);
  });

  test('the revealed mcp icon opens its popover on tap', async ({ page }) => {
    await page.getByTestId('header-garden-link').tap();
    await expect(page.getByTestId('mcp-header-button')).toBeVisible();
    await page.getByTestId('mcp-header-button').tap();
    await expect(page.getByTestId('mcp-popover')).toBeVisible();
  });

  test('second tap on the plant navigates to the garden', async ({ page }) => {
    const plant = page.getByTestId('header-garden-link');
    await plant.tap();
    await expect(page.getByTestId('mcp-header-button')).toBeVisible();
    await plant.tap();
    await expect(page).toHaveURL(/\/garden/);
  });
});
