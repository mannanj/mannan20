import { test, expect, type Page } from '@playwright/test';

const FOUND_REASON = JSON.stringify({
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: true, partial: false, value: 'dealer job inquiry' },
  feedback: 'Got it!',
});

const MESSAGE = 'I want to reach out for the dealer job';

const IPHONE = {
  viewport: { width: 393, height: 659 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
} as const;

async function openModal(page: Page) {
  await page.goto('/');
  const masked = page.getByTestId('contact-email-masked');
  await masked.scrollIntoViewIfNeeded();
  await masked.click();
  await expect(page.getByTestId('contact-modal')).toBeVisible();
}

function mockApi(page: Page, body: string, counter?: { n: number }, delayMs = 0) {
  return page.route('**/api/validate-contact', async (route) => {
    if (counter) counter.n += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}

async function fireSoftKeyboardEdit(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="contact-textarea"]') as HTMLTextAreaElement | null;
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    const base = el.value.replace(/\s+$/, '');
    setter.call(el, el.value.endsWith(' ') ? base : base + ' ');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function commitViaComposition(page: Page, text: string) {
  await page.evaluate((value) => {
    const el = document.querySelector('[data-testid="contact-textarea"]') as HTMLTextAreaElement | null;
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    el.focus();
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setter.call(el, value);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertCompositionText' }));
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
  }, text);
}

async function runStorm(page: Page, intervalMs: number, flag: { stop: boolean }) {
  while (!flag.stop) {
    await fireSoftKeyboardEdit(page).catch(() => {});
    await page.waitForTimeout(intervalMs).catch(() => {});
  }
}

test.describe('contact form — mobile soft-keyboard resilience', () => {
  test('continuous soft-keyboard events still trigger validation (max-wait ceiling)', async ({ page }) => {
    const counter = { n: 0 };
    await mockApi(page, FOUND_REASON, counter);
    await openModal(page);
    await page.getByTestId('contact-textarea').fill(MESSAGE);

    const flag = { stop: false };
    const storm = runStorm(page, 500, flag);

    await expect
      .poll(() => counter.n, {
        timeout: 6000,
        message: 'validation never fired while soft-keyboard events kept streaming in',
      })
      .toBeGreaterThanOrEqual(1);

    flag.stop = true;
    await storm.catch(() => {});

    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 8000 });
  });

  test('continuous events under iPhone emulation still trigger validation', async ({ browser }) => {
    const context = await browser.newContext(IPHONE);
    const page = await context.newPage();
    try {
      const counter = { n: 0 };
      await mockApi(page, FOUND_REASON, counter);
      await openModal(page);
      await page.getByTestId('contact-textarea').fill(MESSAGE);

      const flag = { stop: false };
      const storm = runStorm(page, 500, flag);

      await expect
        .poll(() => counter.n, { timeout: 6000 })
        .toBeGreaterThanOrEqual(1);

      flag.stop = true;
      await storm.catch(() => {});
      await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 8000 });
    } finally {
      await context.close();
    }
  });

  test('soft-keyboard event during validating does not strand the request', async ({ page }) => {
    await mockApi(page, FOUND_REASON, undefined, 700);
    await openModal(page);
    await page.getByTestId('contact-textarea').fill(MESSAGE);
    await expect(page.getByTestId('contact-status')).toHaveAttribute('data-status', 'validating', { timeout: 8000 });
    await fireSoftKeyboardEdit(page);
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 8000 });
  });

  test('word committed via IME composition validates and succeeds', async ({ page }) => {
    await mockApi(page, FOUND_REASON);
    await openModal(page);
    await page.getByTestId('contact-textarea').click();
    await commitViaComposition(page, MESSAGE);
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 8000 });
  });

  test('normal typing on iPhone reaches success', async ({ browser }) => {
    const context = await browser.newContext(IPHONE);
    const page = await context.newPage();
    try {
      await mockApi(page, FOUND_REASON);
      await openModal(page);
      const ta = page.getByTestId('contact-textarea');
      await ta.click();
      await ta.pressSequentially(MESSAGE, { delay: 60 });
      await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 8000 });
    } finally {
      await context.close();
    }
  });
});
