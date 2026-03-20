import { test, expect } from '@playwright/test';

const FOUND_ALL = JSON.stringify({
  name: { found: true, partial: false, value: 'John' },
  email: { found: true, partial: false, value: 'john@test.com' },
  reason: { found: true, partial: false, value: 'looking for work' },
  feedback: 'Thanks John! Got your name, email, and reason.',
});

const FOUND_NAME = JSON.stringify({
  name: { found: true, partial: false, value: 'John' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: "Thanks for sharing your name, John! Feel free to add your email or reason for reaching out.",
});

const FOUND_EMAIL = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: true, partial: false, value: 'john@test.com' },
  reason: { found: false, partial: false, value: '' },
  feedback: 'Got your email! Want to share your name or reason for reaching out?',
});

const FOUND_REASON = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: true, partial: false, value: 'job inquiry' },
  feedback: 'Got your reason for reaching out! Feel free to add your name or email.',
});

const PARTIAL_NAME = JSON.stringify({
  name: { found: false, partial: true, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: "Looks like you started entering your name — go ahead and finish!",
});

const EMPTY_RESPONSE = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: 'Include your name, email, or why you\'re here.',
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
});

test('idle state on open', async ({ page }) => {
  await openModal(page);
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'idle');
});

test('typing sets status to pending', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('hello');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'pending');
});

test('debounce triggers validating then resolves', async ({ page }) => {
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
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
});

test('success flow with auto-close', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
  await expect(page.getByTestId('contact-modal')).not.toBeVisible({ timeout: 15000 });
});

test('error flow on 500', async ({ page }) => {
  await mockApi(page, JSON.stringify({ error: 'fail' }), 500);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
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
});

test('close button hides modal', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-modal-close').click();
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
});

test('backdrop click hides modal', async ({ page }) => {
  await openModal(page);
  await page.getByTestId('contact-modal-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('contact-modal')).not.toBeVisible();
});

test('rate limit flow', async ({ page }) => {
  await mockApi(page, JSON.stringify({ error: 'Too many requests.', remaining: 0, reset: Date.now() + 3600000 }), 429);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'rate-limited', { timeout: 10000 });
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
});

test('name found shows green "Thanks, John!"', async ({ page }) => {
  await mockApi(page, FOUND_NAME);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('John');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Thanks, John!', { timeout: 10000 });
  const color = await feedback.locator('span').first().evaluate(el => getComputedStyle(el).color);
  expect(color).toContain('74');
});

test('email found shows green "Got it!"', async ({ page }) => {
  await mockApi(page, FOUND_EMAIL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('j@t.com');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Got it!', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success');
});

test('reason found shows green "Got it!"', async ({ page }) => {
  await mockApi(page, FOUND_REASON);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('job');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Got it!', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success');
});

test('multiple fields shows "Thanks, John!" (name priority)', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Thanks, John!', { timeout: 10000 });
});

test('partial name detected shows amber "Keep going..."', async ({ page }) => {
  await mockApi(page, PARTIAL_NAME);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('My name is');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Keep going...', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'insufficient');
});

test('nothing found shows amber fallback', async ({ page }) => {
  await mockApi(page, EMPTY_RESPONSE);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('asdf');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Include your name, email, or why you\'re here.', { timeout: 10000 });
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'insufficient');
});

test('countdown appears after success feedback', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Thanks, John!', { timeout: 10000 });
  await expect(feedback).toContainText('Closing in', { timeout: 10000 });
});

test('countdown completes and modal closes', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Closing in', { timeout: 10000 });
  await expect(page.getByTestId('contact-modal')).not.toBeVisible({ timeout: 15000 });
});

test('interaction resets countdown back to feedback then countdown', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Closing in', { timeout: 10000 });
  await page.getByTestId('contact-textarea').dispatchEvent('mousedown');
  await expect(feedback).toContainText('Thanks, John!', { timeout: 5000 });
  await expect(feedback).toContainText('Closing in 3', { timeout: 10000 });
});

test('flicker guard: feedback text never empty during success flow', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });

  const texts: string[] = [];
  for (let i = 0; i < 60; i++) {
    const modalVisible = await page.getByTestId('contact-modal').isVisible();
    if (!modalVisible) break;
    const feedbackVisible = await page.getByTestId('contact-feedback').isVisible();
    if (!feedbackVisible) break;
    const text = await page.getByTestId('contact-feedback').textContent();
    texts.push(text ?? '');
    await page.waitForTimeout(100);
  }

  for (const t of texts) {
    expect(t).not.toBe('');
    expect(t).not.toBe('undefined');
  }
});

test('network failure shows network-error', async ({ page }) => {
  await page.route('**/api/validate-contact', (route) => route.abort('connectionfailed'));
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'network-error', { timeout: 10000 });
  const feedback = page.getByTestId('contact-feedback');
  await expect(feedback).toContainText('Network error');
});

test('502 gateway error shows error status', async ({ page }) => {
  await mockApi(page, 'Bad Gateway', 502);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
});

test('malformed JSON response shows error status', async ({ page }) => {
  await page.route('**/api/validate-contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{invalid json' })
  );
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
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
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
  expect(callCount).toBe(1);
});

test('clear textarea resets to idle', async ({ page }) => {
  await mockApi(page, FOUND_ALL);
  await openModal(page);
  const textarea = page.getByTestId('contact-textarea');
  await textarea.fill('Hi');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
  await textarea.fill('');
  await expect(status).toHaveAttribute('data-status', 'idle');
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
});
