import { test, expect } from '@playwright/test';

const FOUND_ALL = JSON.stringify({
  name: { found: true, partial: false, value: 'John' },
  email: { found: true, partial: false, value: 'john@test.com' },
  reason: { found: true, partial: false, value: 'looking for work' },
  feedback: 'Thanks John!',
});

const FOUND_NAME = JSON.stringify({
  name: { found: true, partial: false, value: 'John' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: 'Thanks John!',
});

const FOUND_EMAIL = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: true, partial: false, value: 'john@test.com' },
  reason: { found: false, partial: false, value: '' },
  feedback: 'Got your email!',
});

const FOUND_REASON = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: true, partial: false, value: 'job inquiry' },
  feedback: 'Got your reason!',
});

const PARTIAL_NAME = JSON.stringify({
  name: { found: false, partial: true, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: '',
});

const EMPTY_RESPONSE = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: '',
});

const EMPTY_NO_FEEDBACK = JSON.stringify({
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

test('open modal via masked email', async ({ page }) => {
  await openModal(page);
  await expect(page.getByTestId('contact-modal')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-modal-open.png' });
});

test('idle state on open', async ({ page }) => {
  await openModal(page);
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'idle');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-idle-status.png' });
});

test('typing sets status to pending', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('hello');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'pending');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-pending-status.png' });
});

test('debounce triggers validating then reveals result', async ({ page }) => {
  let resolve: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  await page.route('**/api/validate-contact', async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_ALL });
  });
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });
  resolve!();
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-validating-then-result.png' });
});

test('success immediately reveals contact result', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-success-result.png' });
});

test('name found reveals result', async ({ page }) => {
  await mockApi(page, FOUND_NAME);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('John');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-name-found.png' });
});

test('email found reveals result', async ({ page }) => {
  await mockApi(page, FOUND_EMAIL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('j@t.com');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-email-found.png' });
});

test('reason found reveals result', async ({ page }) => {
  await mockApi(page, FOUND_REASON);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('job');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-reason-found.png' });
});

test('after success, contact info is revealed on page', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  await expect(page.getByTestId('contact-email-masked')).not.toBeVisible();
  await expect(page.getByTestId('contact-email-revealed')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/contact-form-info-revealed.png' });
});

test('error flow on 500', async ({ page }) => {
  await mockApi(page, JSON.stringify({ error: 'fail' }), 500);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-error-500.png' });
});

test('no fields found shows insufficient', async ({ page }) => {
  let resolve: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  await page.route('**/api/validate-contact', async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_RESPONSE });
  });
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('just some random text');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });
  resolve!();
  await expect(status).toHaveAttribute('data-status', 'insufficient', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-insufficient.png' });
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

test('rate limit flow', async ({ page }) => {
  await mockApi(page, JSON.stringify({ error: 'Too many requests.', remaining: 0, reset: Date.now() + 3600000 }), 429);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'rate-limited', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-rate-limited.png' });
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

test('partial name detected shows amber "Keep going..."', async ({ page }) => {
  await mockApi(page, PARTIAL_NAME);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('My name is');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Keep going...', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'insufficient');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-partial-name.png' });
});

test('nothing found shows amber fallback', async ({ page }) => {
  await mockApi(page, EMPTY_RESPONSE);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('asdf');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Include your name, email, or why you\'re here.', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'insufficient');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-nothing-found.png' });
});

test('network failure shows network-error', async ({ page }) => {
  await page.route('**/api/validate-contact', (route) => route.abort('connectionfailed'));
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'network-error', { timeout: 10000 });
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Network error');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-network-error.png' });
});

test('502 gateway error shows error status', async ({ page }) => {
  await mockApi(page, 'Bad Gateway', 502);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-error-502.png' });
});

test('malformed JSON response shows error status', async ({ page }) => {
  await page.route('**/api/validate-contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{invalid json' })
  );
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
  await page.screenshot({ path: 'e2e/screenshots/contact-form-malformed-json.png' });
});

test('whitespace-only input stays idle', async ({ page }) => {
  let apiCalled = false;
  await page.route('**/api/validate-contact', async (route) => {
    apiCalled = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_NO_FEEDBACK });
  });
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('   ');
  await page.waitForTimeout(3000);
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'idle');
  expect(apiCalled).toBe(false);
  await page.screenshot({ path: 'e2e/screenshots/contact-form-whitespace-idle.png' });
});

test('rapid re-typing only triggers one API call', async ({ page }) => {
  let callCount = 0;
  await page.route('**/api/validate-contact', async (route) => {
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_ALL });
  });
  await openModal(page);
  const textarea = page.getByTestId('contact-textarea');
  await textarea.fill('a');
  await page.waitForTimeout(500);
  await textarea.fill('ab');
  await page.waitForTimeout(500);
  await textarea.fill('abc');
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
  expect(callCount).toBe(1);
  await page.screenshot({ path: 'e2e/screenshots/contact-form-rapid-retype.png' });
});

test('close while validating does not crash', async ({ page }) => {
  await page.route('**/api/validate-contact', async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_ALL });
  });
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/screenshots/contact-form-close-while-validating.png' });
});

test('input persists on manual close and reopen', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  const textarea = page.getByTestId('contact-textarea');
  await textarea.fill('Hello there');
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  const masked = page.getByTestId('contact-email-masked');
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
  await expect(textarea).toHaveValue('Hello there');
  await page.screenshot({ path: 'e2e/screenshots/contact-form-input-persists.png' });
});
