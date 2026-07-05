import { test, expect, type Page } from '@playwright/test';
import { openModal, stubTurnstile } from './helpers/contact-form';

const INTENT_RESPONSE = JSON.stringify({
  categories: [{ key: 'job_opportunity', detected: true }],
  message: 'Thanks — I would love to hear more about the dealer role!',
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

function mockIntentApi(page: Page, body: string, counter?: { n: number }, delayMs = 0) {
  return page.route('**/api/contact-intent', async (route) => {
    if (counter) counter.n += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}

async function openRevealedModal(page: Page) {
  await stubTurnstile(page);
  await openModal(page);
  await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
}

async function fireSoftKeyboardEdit(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="contact-intent-textarea"]') as HTMLTextAreaElement | null;
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    const base = el.value.replace(/\s+$/, '');
    setter.call(el, el.value.endsWith(' ') ? base : base + ' ');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function commitViaComposition(page: Page, text: string) {
  await page.evaluate((value) => {
    const el = document.querySelector('[data-testid="contact-intent-textarea"]') as HTMLTextAreaElement | null;
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

test.describe('post-reveal intent capture — mobile soft-keyboard resilience', () => {
  test('continuous soft-keyboard events still trigger the intent parse call', async ({ page }) => {
    const counter = { n: 0 };
    await openRevealedModal(page);
    await mockIntentApi(page, INTENT_RESPONSE, counter);
    await page.getByTestId('contact-intent-textarea').fill(MESSAGE);

    const flag = { stop: false };
    const storm = runStorm(page, 500, flag);

    await expect
      .poll(() => counter.n, {
        timeout: 6000,
        message: 'intent parse never fired while soft-keyboard events kept streaming in',
      })
      .toBeGreaterThanOrEqual(1);

    flag.stop = true;
    await storm.catch(() => {});

    await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 8000 });
  });

  test('continuous events under iPhone emulation still trigger the intent parse call', async ({ browser }) => {
    const context = await browser.newContext(IPHONE);
    const page = await context.newPage();
    try {
      const counter = { n: 0 };
      await openRevealedModal(page);
      await mockIntentApi(page, INTENT_RESPONSE, counter);
      await page.getByTestId('contact-intent-textarea').fill(MESSAGE);

      const flag = { stop: false };
      const storm = runStorm(page, 500, flag);

      await expect
        .poll(() => counter.n, { timeout: 6000 })
        .toBeGreaterThanOrEqual(1);

      flag.stop = true;
      await storm.catch(() => {});
      await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 8000 });
    } finally {
      await context.close();
    }
  });

  test('soft-keyboard event during sending does not strand the request', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, INTENT_RESPONSE, undefined, 700);
    await page.getByTestId('contact-intent-textarea').fill(MESSAGE);
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'sending', { timeout: 8000 });
    await fireSoftKeyboardEdit(page);
    await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 8000 });
  });

  test('word committed via IME composition parses and succeeds', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, INTENT_RESPONSE);
    await page.getByTestId('contact-intent-textarea').click();
    await commitViaComposition(page, MESSAGE);
    await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 8000 });
  });

  test('normal typing on iPhone reaches a rendered response', async ({ browser }) => {
    const context = await browser.newContext(IPHONE);
    const page = await context.newPage();
    try {
      await openRevealedModal(page);
      await mockIntentApi(page, INTENT_RESPONSE);
      const ta = page.getByTestId('contact-intent-textarea');
      await ta.click();
      await ta.pressSequentially(MESSAGE, { delay: 60 });
      await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 8000 });
    } finally {
      await context.close();
    }
  });
});
