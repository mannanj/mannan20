import { expect, type Page } from '@playwright/test';

export async function openModal(page: Page) {
  await page.goto('/');
  const masked = page.getByTestId('contact-email-masked');
  await masked.scrollIntoViewIfNeeded();
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
}

export function stubTurnstile(page: Page, verifyResult: { success: boolean } = { success: true }) {
  return Promise.all([
    page.route('**/turnstile/v0/api.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.turnstile = {
  render: (container, options) => {
    setTimeout(() => options.callback('e2e-fake-token'), 10);
    return 'e2e-fake-widget-id';
  },
  reset: () => {},
  remove: () => {},
};`,
      })
    ),
    page.route('**/turnstile-siteverify-mannan20**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(verifyResult),
      })
    ),
  ]);
}

export async function openRevealedModal(page: Page) {
  await stubTurnstile(page);
  await openModal(page);
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
}

export function mockIntentApi(page: Page, body: string, status = 200) {
  return page.route('**/api/contact-intent', (route) =>
    route.fulfill({ status, contentType: 'application/json', body })
  );
}
