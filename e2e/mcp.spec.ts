import { test, expect } from '@playwright/test';

test.describe('mcp page', () => {
  test('renders the guide with endpoint, copy snippets, and 10 tools', async ({ page }) => {
    await page.goto('/mcp');
    await expect(page.getByRole('heading', { name: 'Mannan MCP' })).toBeVisible();
    await expect(
      page.getByText('https://mcp.mannanteam.workers.dev/mcp').first(),
    ).toBeVisible();
    expect(await page.getByTestId('mcp-copy-snippet').count()).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId('mcp-tool-row')).toHaveCount(10);
  });
});

async function revealMcp(page: import('@playwright/test').Page) {
  await page.getByTestId('header-right-stack').hover();
  await page.waitForTimeout(1100);
}

test.describe('header mcp popover', () => {
  test('icon opens popover with connect snippets and guide link', async ({ page }) => {
    await page.goto('/');
    await revealMcp(page);
    const button = page.getByTestId('mcp-header-button');
    await expect(button).toBeVisible();
    await button.click();
    const popover = page.getByTestId('mcp-popover');
    await expect(popover).toBeVisible();
    await expect(
      popover.getByText('https://mcp.mannanteam.workers.dev/mcp').first(),
    ).toBeVisible();
    expect(await popover.getByTestId('mcp-copy-snippet').count()).toBe(3);
    await popover.getByTestId('mcp-popover-guide-link').click();
    await expect(page).toHaveURL(/\/mcp$/);
    await expect(page.getByRole('heading', { name: 'Mannan MCP' })).toBeVisible();
  });

  test('popover closes on outside click', async ({ page }) => {
    await page.goto('/');
    await revealMcp(page);
    await page.getByTestId('mcp-header-button').click();
    await expect(page.getByTestId('mcp-popover')).toBeVisible();
    await page.mouse.click(400, 400);
    await expect(page.getByTestId('mcp-popover')).toHaveCount(0);
  });
});

test.describe('header mcp popover on mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('icon is visible and popover fits the viewport', async ({ page }) => {
    await page.goto('/');
    await revealMcp(page);
    const button = page.getByTestId('mcp-header-button');
    await expect(button).toBeVisible();
    await button.click();
    const popover = page.getByTestId('mcp-popover');
    await expect(popover).toBeVisible();
    const box = await popover.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
