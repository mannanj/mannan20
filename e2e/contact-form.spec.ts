import { test, expect } from '@playwright/test';
import { openModal, openRevealedModal, stubTurnstile } from './helpers/contact-form';

test('open modal via masked email', async ({ page }) => {
  await openModal(page);
  await expect(page.getByTestId('contact-modal')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-modal-open.png' });
});

test('verifying state on open', async ({ page }) => {
  await openModal(page);
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'verifying');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-verifying-status.png' });
});

test('Turnstile verifies silently and reveals contact info with no typing', async ({ page }) => {
  await stubTurnstile(page);
  await openModal(page);
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-auto-reveal.png' });
});

test('failed Turnstile verification blocks reveal', async ({ page }) => {
  await stubTurnstile(page, { success: false });
  await openModal(page);
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Verification failed', { timeout: 10000 });
  await expect(page.getByTestId('contact-result')).not.toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-turnstile-failed.png' });
});

test('after success, contact info is revealed on page', async ({ page }) => {
  await openRevealedModal(page);
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  await expect(page.getByTestId('contact-email-masked')).not.toBeVisible();
  await expect(page.getByTestId('contact-email-revealed')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-info-revealed.png' });
});

test('reopening after reveal shows result directly, skipping verification', async ({ page }) => {
  await openRevealedModal(page);
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();

  await page.getByTestId('contact-ripple').click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
  const verifyingStatusCount = await page.getByTestId('contact-status').count();
  expect(verifyingStatusCount).toBe(0);
  await expect(page.getByTestId('contact-result')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-reopen-still-revealed.png' });
});

test('close button hides modal', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-close-button.png' });
});

test('backdrop click hides modal', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-modal-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-backdrop-close.png' });
});

test('drag moves modal position', async ({ page }) => {
  await openModal(page);
  const modal = page.getByTestId('contact-modal');
  const box = await modal.boundingBox();
  if (!box) throw new Error('modal not found');

  const startX = box.x + box.width / 2;
  const startY = box.y + 5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 50, { steps: 5 });
  await page.mouse.up();

  const newBox = await modal.boundingBox();
  if (!newBox) throw new Error('modal not found after drag');
  expect(Math.abs(newBox.x - box.x)).toBeGreaterThan(30);
  await page.screenshot({ path: 'e2e/screenshots/contact-form-drag-modal.png' });
});
