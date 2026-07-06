import { test, expect, type Page } from '@playwright/test';
import { openModal, openRevealedModal, stubTurnstile } from './helpers/contact-form';

function stubTurnstileNeverResolves(page: Page) {
  return page.route('**/turnstile/v0/api.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.turnstile = {
  render: () => 'e2e-fake-widget-id',
  reset: () => {},
  remove: () => {},
};`,
    })
  );
}

const THANKS_RESPONSE = JSON.stringify({ message: 'Thanks!' });

test.describe('Group A: Modal Lifecycle & State Reset', () => {
  test('close while verifying resets cleanly on reopen', async ({ page }) => {
    await stubTurnstileNeverResolves(page);
    await openModal(page);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'verifying');

    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();

    await page.getByTestId('contact-email-masked').click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await expect(status).toHaveAttribute('data-status', 'verifying');
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-verifying-resets.png' });
  });

  test('post-reveal intent form resets after close/reopen', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE })
    );
    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('Hello there');

    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();

    await page.getByTestId('contact-ripple').click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await expect(page.getByTestId('contact-intent-textarea')).toHaveValue('');
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-intent-form-resets.png' });
  });

  test('close during intent sending does not crash', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE });
    });
    await page.getByTestId('contact-intent-textarea').fill('Hi I am John');
    const status = page.getByTestId('contact-intent-status');
    await expect(status).toHaveAttribute('data-status', 'sending', { timeout: 10000 });
    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-close-while-sending.png' });
  });

  test('rapid open/close/open is stable', async ({ page }) => {
    await stubTurnstile(page);
    await openModal(page);
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('contact-modal-close').click();
      await expect(page.getByTestId('contact-modal')).not.toBeVisible();
      await page.getByTestId('contact-ripple').click();
      await expect(page.getByTestId('contact-modal')).toBeVisible();
    }
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-rapid-open-close.png' });
  });
});

test.describe('Group B: Post-Reveal Intent Capture Debounce Behavior', () => {
  test('whitespace-only input stays idle, no API call', async ({ page }) => {
    let apiCalled = false;
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', async (route) => {
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE });
    });
    await page.getByTestId('contact-intent-textarea').fill('   ');
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'idle');
    expect(apiCalled).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-whitespace-idle.png' });
  });

  test('newlines-only input stays idle, no API call', async ({ page }) => {
    let apiCalled = false;
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', async (route) => {
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE });
    });
    await page.getByTestId('contact-intent-textarea').fill('\n\n\n');
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'idle');
    expect(apiCalled).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-newlines-idle.png' });
  });

  test('rapid re-typing only triggers one API call', async ({ page }) => {
    let callCount = 0;
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', async (route) => {
      callCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE });
    });
    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('a');
    await page.waitForTimeout(500);
    await textarea.fill('ab');
    await page.waitForTimeout(500);
    await textarea.fill('abc');
    await expect(page.getByTestId('contact-intent-turn-ai')).toBeVisible({ timeout: 10000 });
    expect(callCount).toBe(1);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-rapid-retype.png' });
  });

  test('turn locks and input disables the instant it sends, preventing overlapping requests', async ({ page }) => {
    let callCount = 0;
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', async (route) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'FRESH' }) });
    });
    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('first attempt');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'sending', { timeout: 10000 });

    // The turn is now locked into view-only history; the active textarea is disabled
    // for the whole in-flight window, so there is no way to fire a second overlapping request.
    await expect(page.getByTestId('contact-intent-turn-pending')).toHaveText('> first attempt');
    await expect(textarea).toBeDisabled();
    await expect(textarea).toHaveValue('');

    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText('FRESH', { timeout: 15000 });
    expect(callCount).toBe(1);
    await expect(textarea).toBeEnabled();
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-turn-locks-while-sending.png' });
  });
});

test.describe('Group C: Intent API Response Edge Cases', () => {
  test('response missing message field does not crash, stays idle', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.getByTestId('contact-intent-textarea').fill('test input');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'idle', { timeout: 10000 });
    await expect(page.getByTestId('contact-intent-turn-ai')).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-missing-message-field.png' });
  });

  test('malformed JSON response shows error status', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{invalid json' })
    );
    await page.getByTestId('contact-intent-textarea').fill('test input');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'error', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-malformed-json.png' });
  });
});

test.describe('Group D: Viewport & Layout', () => {
  test('modal on 320px viewport fits within screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openModal(page);
    const modal = page.getByTestId('contact-modal');
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-320px-viewport.png' });
  });

  test('modal position clamped near bottom of viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 400 });
    await openModal(page);
    const modal = page.getByTestId('contact-modal');
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThanOrEqual(400 - 300 + 50);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-bottom-viewport.png' });
  });

  test('open modal via ripple container', async ({ page }) => {
    await page.goto('/');
    const ripple = page.getByTestId('contact-ripple');
    await ripple.scrollIntoViewIfNeeded();
    await ripple.click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-ripple-open.png' });
  });
});

test.describe('Group E: Keyboard & Interaction', () => {
  test('escape key closes modal', async ({ page }) => {
    await openModal(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-escape-key.png' });
  });

  test('spam-click masked email is stable', async ({ page }) => {
    await page.goto('/');
    const masked = page.getByTestId('contact-email-masked');
    await masked.scrollIntoViewIfNeeded();
    const box = await masked.boundingBox();
    if (!box) throw new Error('masked email not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(cx, cy);
    }
    await page.waitForTimeout(500);
    const modalVisible = await page.getByTestId('contact-modal').isVisible();
    const maskedVisible = await masked.isVisible();
    expect(modalVisible || maskedVisible).toBe(true);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-spam-click.png' });
  });
});
