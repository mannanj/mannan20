import { test, expect } from '@playwright/test';
import {
  frames,
  mockIntentByteStream,
  mockIntentApi,
  openRevealedModal,
  splitUtf8Chunks,
  successfulReflection,
} from './helpers/contact-form';

test.describe('adversarial reflection frames', () => {
  test('renders XSS-looking reflection text as inert text', async ({ page }) => {
    await openRevealedModal(page);
    const payload = '<img src=x onerror="window.__xss_fired=true">';
    await mockIntentApi(page, successfulReflection(payload));
    await page.getByTestId('contact-intent-textarea').fill('An adversarial response');
    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText(payload);
    expect(await page.evaluate(() => Boolean((window as unknown as Record<string, unknown>).__xss_fired))).toBe(false);
    await expect(page.locator('[data-testid="contact-modal"] img[onerror]')).toHaveCount(0);
  });

  test('shows progressive text and preserves UTF-8 split inside a multibyte character', async ({ page }) => {
    await openRevealedModal(page);
    const partial = 'A visible partial reflection. ';
    const remainder = '日本語 and 🔥 remain ordinary text.';
    const payload = frames(
      { type: 'meta', version: 1 },
      { type: 'text', value: partial },
      { type: 'text', value: remainder },
      { type: 'done' },
    );
    const firstTextEnd = payload.indexOf(`${JSON.stringify({ type: 'text', value: partial })}\n`) + JSON.stringify({ type: 'text', value: partial }).length + 1;
    const fireByteStart = new TextEncoder().encode(payload.slice(0, payload.indexOf('🔥'))).length;
    const chunks = splitUtf8Chunks(payload, [firstTextEnd, fireByteStart + 2]);
    await mockIntentByteStream(page, chunks, 1_500);
    await page.getByTestId('contact-intent-textarea').fill('Unicode input');
    await expect(page.getByTestId('contact-intent-stream')).toHaveText(partial);
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'reflecting');
    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText(`${partial}${remainder}`);
  });

  test('rejects a provider error after partial text without committing it', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, frames(
      { type: 'meta', version: 1 },
      { type: 'text', value: 'A partial reflection.' },
      { type: 'error', code: 'upstream' },
    ));
    await page.getByTestId('contact-intent-textarea').fill('Partial upstream error');
    await expect(page.getByTestId('contact-intent-incomplete')).toBeVisible();
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(0);
    await expect(page.getByTestId('contact-intent-live')).toHaveText("Couldn't interpret that just now.");
  });

  test('rejects an NDJSON client buffer that exceeds its bound', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, `${'x'.repeat(8193)}`);
    await page.getByTestId('contact-intent-textarea').fill('Oversized unframed payload');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'interpretation_error');
  });

  test('keeps streamed text out of the live region', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('A quiet visible reflection.'));
    await page.getByTestId('contact-intent-textarea').fill('Live region check');
    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText('A quiet visible reflection.');
    await expect(page.getByTestId('contact-intent-live')).toHaveText('Interpretation complete.');
    await expect(page.getByTestId('contact-intent-live')).not.toContainText('A quiet visible reflection.');
  });

  test('enforces the input boundary locally', async ({ page }) => {
    await openRevealedModal(page);
    await expect(page.getByTestId('contact-intent-textarea')).toHaveAttribute('maxlength', '1000');
  });
});
