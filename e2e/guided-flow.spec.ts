import { test, expect } from '@playwright/test';

test.describe('robots guided flow', () => {
  test('flow starts via hash and shows entering text', async ({ page }) => {
    await page.goto('/#robots-flow');
    const banner = page.getByTestId('guided-flow-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    const header = page.getByTestId('guided-flow-header');
    await expect(header).toContainText('Entering guided flow...');
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-entering.png' });
  });

  test('banner transitions to navigating text', async ({ page }) => {
    await page.goto('/#robots-flow');
    const header = page.getByTestId('guided-flow-header');
    await expect(header).toContainText('Navigating to section...', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-navigating.png' });
  });

  test('escape exits the flow', async ({ page }) => {
    await page.goto('/#robots-flow');
    await expect(page.getByTestId('guided-flow-banner')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('guided-flow-banner')).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-escaped.png' });
  });

  test('action item appears with active animated text', async ({ page }) => {
    await page.goto('/#robots-flow');
    const actionItem = page.getByTestId('flow-action-item');
    await expect(actionItem).toBeVisible({ timeout: 15000 });
    const actionText = actionItem.getByTestId('flow-action-text');
    await expect(actionText).toContainText('Showing robot video...');
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-action-active.png' });
  });

  test('header hides when action is active', async ({ page }) => {
    await page.goto('/#robots-flow');
    await expect(page.getByTestId('flow-action-item')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('guided-flow-header')).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-header-hidden.png' });
  });

  test('dismiss shows idle state with header', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    const header = page.getByTestId('guided-flow-header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('In guided flow...');

    const banner = page.getByTestId('guided-flow-banner');
    await expect(banner.getByRole('button', { name: /robot video/ })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-dismissed-idle.png' });
  });

  test('reopen returns to active state and hides header', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    const banner = page.getByTestId('guided-flow-banner');
    const watchBtn = banner.getByRole('button', { name: /robot video/ });
    await expect(watchBtn).toBeVisible();
    await watchBtn.click();

    await expect(page.getByTestId('guided-flow-header')).not.toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-reopened.png' });
  });

  test('gray checkmark shows after dismiss without watching', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    const indicator = page.getByTestId('flow-action-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveCSS('color', 'rgba(255, 255, 255, 0.3)');
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-gray-checkmark.png' });
  });

  test('escape exits flow and page returns to normal', async ({ page }) => {
    await page.goto('/#robots-flow');
    const banner = page.getByTestId('guided-flow-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(banner).not.toBeVisible();
    await expect(page.getByTestId('header-home-button')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-exited-normal.png' });
  });

  test('flow navigates to published works section', async ({ page }) => {
    await page.goto('/#robots-flow');
    const banner = page.getByTestId('guided-flow-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    const header = page.getByTestId('guided-flow-header');
    await expect(header).toContainText('Navigating to section...', { timeout: 10000 });

    const actionItem = page.getByTestId('flow-action-item');
    await expect(actionItem).toBeVisible({ timeout: 15000 });

    const publishedWorks = page.locator('#published-works');
    await expect(publishedWorks).toBeInViewport({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/guided-flow-navigated.png' });
  });
});
