import { test, expect, type Page } from '@playwright/test';
import { mockIntentApi, openRevealedModal, successfulReflection } from './helpers/contact-form';

const MESSAGE = 'I want to discuss a dealer role';
const RESPONSE = successfulReflection('A short note about the role could clarify the overlap.');

const IPHONE = {
  viewport: { width: 393, height: 659 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
} as const;

async function fireSoftKeyboardEdit(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="contact-intent-textarea"]') as HTMLTextAreaElement | null;
    if (!element) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(element, element.value.endsWith(' ') ? element.value.trimEnd() : `${element.value} `);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function commitComposition(page: Page, value: string) {
  await page.evaluate((text) => {
    const element = document.querySelector('[data-testid="contact-intent-textarea"]') as HTMLTextAreaElement | null;
    if (!element) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setter.call(element, text);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertCompositionText' }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
  }, value);
}

test.describe('mobile contact alignment', () => {
  test('continuous soft-keyboard edits do not postpone the three-second ceiling', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, RESPONSE, requests);
    await page.getByTestId('contact-intent-textarea').fill(MESSAGE);

    for (let index = 0; index < 7; index += 1) {
      await page.waitForTimeout(450);
      await fireSoftKeyboardEdit(page);
    }

    await expect.poll(() => requests.length, { timeout: 5_000 }).toBe(1);
    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText('A short note about the role could clarify the overlap.');
  });

  test('an IME composition commits one reflection request', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, RESPONSE, requests);
    await page.getByTestId('contact-intent-textarea').click();
    await commitComposition(page, MESSAGE);
    await expect(page.getByTestId('contact-intent-turn-ai')).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test('iPhone layout keeps the modal and callback controls reachable inside the viewport', async ({ browser }) => {
    const context = await browser.newContext(IPHONE);
    const page = await context.newPage();
    try {
      let callbackRequested = false;
      await openRevealedModal(page);
      await mockIntentApi(page, RESPONSE);
      await page.route('**/api/contact-request', async (route) => {
        callbackRequested = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ submitted: true }) });
      });
      const modal = page.getByTestId('contact-modal');
      await expect(page.getByTestId('contact-intent-disclosure')).toBeVisible();
      await page.getByTestId('contact-intent-textarea').fill(MESSAGE);
      await expect(page.getByTestId('contact-intent-turn-ai')).toBeVisible();
      await page.getByRole('button', { name: 'Ask Mannan to contact me' }).click();

      const send = page.getByRole('button', { name: 'Send to Mannan' });
      await expect(send).toBeEnabled();
      await send.scrollIntoViewIfNeeded();
      await expect(send).toBeInViewport();
      expect(await modal.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

      const box = await modal.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(IPHONE.viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(IPHONE.viewport.height);

      await send.focus();
      await expect(send).toBeFocused();
      await send.click();
      await expect(page.getByLabel('Contact')).toBeFocused();
      await expect(page.getByText('Enter a contact method between 3 and 254 characters.')).toBeVisible();
      expect(callbackRequested).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('reduced motion does not suppress the loading state or completed reflection', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openRevealedModal(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await mockIntentApi(page, async (route) => {
      await pending;
      await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: RESPONSE });
    });
    await page.getByTestId('contact-intent-textarea').fill(MESSAGE);
    await expect(page.getByTestId('contact-intent-loading')).toContainText('Looking for possible overlap…');
    release();
    await expect(page.getByTestId('contact-intent-turn-ai')).toBeVisible();
  });
});
