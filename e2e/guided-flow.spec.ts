import { test, expect } from '@playwright/test';

test.describe('robots guided flow', () => {
  test('flow starts via hash and shows entering text', async ({ page }) => {
    await page.goto('/#robots-flow');
    const banner = page.getByTestId('guided-flow-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Entering guided flow...')).toBeVisible();
  });

  test('banner transitions to navigating text', async ({ page }) => {
    await page.goto('/#robots-flow');
    await expect(page.getByText('Navigating to section...')).toBeVisible({ timeout: 10000 });
  });

  test('escape exits the flow', async ({ page }) => {
    await page.goto('/#robots-flow');
    await expect(page.getByTestId('guided-flow-banner')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('guided-flow-banner')).not.toBeVisible();
  });

  test('action item appears with active animated text', async ({ page }) => {
    await page.goto('/#robots-flow');
    const actionItem = page.getByTestId('flow-action-item');
    await expect(actionItem).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Showing robot video...')).toBeVisible();
  });

  test('header hides when action is active', async ({ page }) => {
    await page.goto('/#robots-flow');
    await expect(page.getByTestId('flow-action-item')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('guided-flow-header')).not.toBeVisible();
  });

  test('dismiss shows idle state with header', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    await expect(page.getByTestId('guided-flow-header')).toBeVisible();
    await expect(page.getByText('In guided flow...')).toBeVisible();

    const actionText = page.getByTestId('flow-action-text');
    await expect(actionText).toBeVisible();
    await expect(actionText).toHaveText('Watch robot video');
  });

  test('reopen returns to active state and hides header', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    const actionText = page.getByTestId('flow-action-text');
    await expect(actionText).toHaveText('Watch robot video');
    await actionText.click();

    await expect(page.getByText('Showing robot video...')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('guided-flow-header')).not.toBeVisible();
  });

  test('gray checkmark shows after dismiss without watching', async ({ page }) => {
    await page.goto('/#robots-flow');
    const dismiss = page.getByTestId('flow-action-dismiss');
    await expect(dismiss).toBeVisible({ timeout: 15000 });
    await dismiss.click();

    const indicator = page.getByTestId('flow-action-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveCSS('color', 'rgba(255, 255, 255, 0.3)');
  });
});
