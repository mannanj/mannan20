import { test, expect } from '@playwright/test';

const FOUND_RESPONSE = JSON.stringify({
  name: { found: true, value: 'John' },
  email: { found: true, value: 'john@test.com' },
  reason: { found: true, value: 'looking for work' },
});

const EMPTY_RESPONSE = JSON.stringify({
  name: { found: false, value: '' },
  email: { found: false, value: '' },
  reason: { found: false, value: '' },
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: FOUND_RESPONSE });
  });
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com looking for work');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'validating', { timeout: 10000 });
  resolve!();
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
});

test('success flow with auto-close', async ({ page }) => {
  await mockApi(page, FOUND_RESPONSE);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com looking for work');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 10000 });
  await expect(page.getByTestId('contact-modal')).not.toBeVisible({ timeout: 10000 });
});

test('error flow on 500', async ({ page }) => {
  await mockApi(page, JSON.stringify({ error: 'fail' }), 500);
  await openModal(page);
  await page.getByTestId('contact-textarea').fill('Hi I am John at john@test.com');
  const status = page.getByTestId('contact-status');
  await expect(status).toHaveAttribute('data-status', 'error', { timeout: 10000 });
});

test('no fields found returns to idle', async ({ page }) => {
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
  await expect(status).toHaveAttribute('data-status', 'idle', { timeout: 10000 });
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
