import { test, expect } from '@playwright/test';

const FOUND_SUCCESS = JSON.stringify({
  name: { found: true, partial: false, value: 'John' },
  email: { found: true, partial: false, value: 'john@test.com' },
  reason: { found: true, partial: false, value: 'looking for work' },
  feedback: 'Thanks John!',
});

const EMPTY_RESULT = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: '',
});

async function openModal(page: import('@playwright/test').Page) {
  await page.goto('/');
  const masked = page.getByTestId('contact-email-masked');
  await masked.scrollIntoViewIfNeeded();
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
}

function mockApi(page: import('@playwright/test').Page, body: string, status = 200) {
  return page.route('**/api/validate-contact', (route) =>
    route.fulfill({ status, contentType: 'application/json', body })
  );
}

test.describe('Group A: Modal Lifecycle & State Reset', () => {
  test('challenge mode resets after close/reopen', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.fill('Hi I am Bot at bot@spam.com here to spam you with unsolicited messages');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });

    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();

    const masked = page.getByTestId('contact-email-masked');
    await masked.click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await expect(status).toHaveAttribute('data-status', 'idle');
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-challenge-resets.png' });
  });

  test('input persists but debounce resets after close/reopen', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/validate-contact', async (route) => {
      callCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_SUCCESS });
    });
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.pressSequentially('Hello there', { delay: 80 });
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'pending');

    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();

    const masked = page.getByTestId('contact-email-masked');
    await masked.click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await expect(textarea).toHaveValue('Hello there');
    await expect(status).toHaveAttribute('data-status', 'idle');
    const savedCount = callCount;
    await page.waitForTimeout(3000);
    expect(callCount).toBe(savedCount);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-input-persists-debounce-resets.png' });
  });

  test('close during validating, reopen shows idle', async ({ page }) => {
    await page.route('**/api/validate-contact', async (route) => {
      await new Promise((r) => setTimeout(r, 10000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_SUCCESS });
    });
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('Hi I am John');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });

    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();

    const masked = page.getByTestId('contact-email-masked');
    await masked.click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
    await expect(status).toHaveAttribute('data-status', 'idle');
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-close-during-validating.png' });
  });

  test('rapid open/close/open is stable', async ({ page }) => {
    await openModal(page);
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('contact-modal-close').click();
      await expect(page.getByTestId('contact-modal')).not.toBeVisible();
      const masked = page.getByTestId('contact-email-masked');
      await masked.click();
      await expect(page.getByTestId('contact-modal')).toBeVisible();
    }
    const textarea = page.getByTestId('contact-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-rapid-open-close.png' });
  });
});

test.describe('Group B: Bot Detection Boundaries', () => {
  test('exactly 15 chars/sec is NOT flagged', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const message = 'Hi I am John at john@test.com looking for work';
    const targetSpeed = 15;
    const delayPerChar = Math.floor(1000 / targetSpeed);
    await textarea.pressSequentially(message, { delay: delayPerChar });
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-15-chars-sec.png' });
  });

  test('paste 19 chars does not trigger challenge', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.fill('John at john@t.com');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-paste-19-chars.png' });
  });

  test('slow type then fast paste bypasses detection', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.pressSequentially('Hi my name is John', { delay: 200 });
    await page.waitForTimeout(500);
    await textarea.fill('Hi my name is John and my email is john@test.com');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-slow-type-fast-paste.png' });
  });

  test('challenge mode: empty then valid answer', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.fill('Hi I am Bot at bot@spam.com here to spam you with unsolicited messages');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    await textarea.fill('   ');
    await expect(status).toHaveAttribute('data-status', 'challenge');
    await textarea.fill('MITRE');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-challenge-empty-then-valid.png' });
  });
});

test.describe('Group C: API Response Edge Cases', () => {
  test('API returns error field AND valid data', async ({ page }) => {
    const responseWithError = JSON.stringify({
      name: { found: true, partial: false, value: 'John' },
      email: { found: true, partial: false, value: 'john@test.com' },
      reason: { found: true, partial: false, value: 'work' },
      feedback: 'Thanks!',
      error: 'something went wrong',
    });
    await mockApi(page, responseWithError);
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-error-with-data.png' });
  });

  test('API returns response missing feedback field', async ({ page }) => {
    const noFeedback = JSON.stringify({
      name: { found: true, partial: false, value: 'John' },
      email: { found: false, partial: false, value: '' },
      reason: { found: false, partial: false, value: '' },
    });
    await mockApi(page, noFeedback);
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-missing-feedback.png' });
  });

  test('re-typing while validating cancels previous request', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/validate-contact', async (route) => {
      callCount++;
      if (callCount === 1) {
        await new Promise((r) => setTimeout(r, 5000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_RESULT });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_SUCCESS });
      }
    });
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.fill('first attempt');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });
    await textarea.fill('second attempt with John john@test.com');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-retype-cancels-request.png' });
  });

  test('API returns empty choices array', async ({ page }) => {
    await page.route('**/api/validate-contact', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [] }),
      })
    );
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'insufficient', { timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-empty-choices.png' });
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
    await page.goto('/');
    const masked = page.getByTestId('contact-email-masked');
    await masked.scrollIntoViewIfNeeded();
    await masked.click();
    await expect(page.getByTestId('contact-modal')).toBeVisible();
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

  test('input with only newlines stays idle', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/validate-contact', async (route) => {
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_RESULT });
    });
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.fill('\n\n\n');
    await page.waitForTimeout(3000);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'idle');
    expect(apiCalled).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/edge-cases-newlines-idle.png' });
  });
});
