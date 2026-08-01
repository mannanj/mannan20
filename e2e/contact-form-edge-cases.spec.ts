import { test, expect, type Page } from '@playwright/test';
import {
  frames,
  mockCallbackApi,
  mockIntentApi,
  openModal,
  openRevealedModal,
  stubTurnstile,
  successfulReflection,
} from './helpers/contact-form';

async function openCallback(page: Page) {
  await page.getByRole('button', { name: 'Ask Mannan to contact me' }).click();
  await expect(page.getByLabel('Contact')).toBeVisible();
}

test.describe('callback request consent and verification', () => {
  test('does not request a callback while interpreting or when choosing direct contact', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    await openRevealedModal(page);
    await mockCallbackApi(page, 200, { submitted: true }, callbackRequests);
    await mockIntentApi(page, successfulReflection('A useful next step could be a short note.'));

    await page.getByTestId('contact-intent-textarea').fill('An introduction');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    expect(callbackRequests).toEqual([]);
    await page.getByRole('button', { name: 'Contact Mannan directly' }).click();
    expect(callbackRequests).toEqual([]);
  });

  test('requires a fresh callback proof and sends exactly the completed transcript', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    await openRevealedModal(page, { tokens: ['reveal-token', null] });
    await mockIntentApi(page, successfulReflection('A focused note could make the overlap clear.'));
    await mockCallbackApi(page, 200, { submitted: true }, callbackRequests);

    await page.getByTestId('contact-intent-textarea').fill('I would like to discuss a project');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);
    await expect(page.getByText('This sends your contact details, reason, and this short conversation to Mannan.')).toBeVisible();
    await expect(page.getByLabel('Reason')).toHaveValue('I would like to discuss a project');
    await expect(page.getByRole('button', { name: 'Send to Mannan' })).toBeDisabled();
    expect(callbackRequests).toEqual([]);
  });

  test('validates fields, focuses the first error, and keeps the editable reason', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('A note with context could help.'));
    await page.getByTestId('contact-intent-textarea').fill('A project invitation');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);

    const reason = page.getByLabel('Reason');
    await reason.fill('short');
    const submit = page.getByRole('button', { name: 'Send to Mannan' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText('Enter a contact method between 3 and 254 characters.')).toBeVisible();
    await expect(page.getByLabel('Contact')).toBeFocused();
    await expect(reason).toHaveValue('short');
    await expect(page.getByLabel('Contact')).toHaveAttribute('aria-describedby', 'callback-contact-error');
  });

  test('handles expired proof, preserves fields, and prevents a duplicate callback submission', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    await openRevealedModal(page, { tokens: ['reveal-token', 'callback-token'] });
    await mockIntentApi(page, successfulReflection('A concise introduction would be a sensible next step.'));
    await mockCallbackApi(page, 403, { error: 'verification-required' }, callbackRequests);
    await page.getByTestId('contact-intent-textarea').fill('A longer project invitation');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);
    await page.getByLabel('Contact').fill('visitor@example.test');
    await page.getByLabel('Reason').fill('Please call to discuss a specific project opportunity.');
    await expect(page.getByRole('button', { name: 'Send to Mannan' })).toBeEnabled();
    await page.getByRole('button', { name: 'Send to Mannan' }).click();
    await expect(page.getByTestId('contact-callback-error')).toHaveText('Human verification expired. Please verify again.');
    await expect(page.getByLabel('Contact')).toHaveValue('visitor@example.test');
    await expect(page.getByLabel('Reason')).toHaveValue('Please call to discuss a specific project opportunity.');
    await expect(page.getByRole('button', { name: 'Send to Mannan' })).toBeDisabled();
    expect(callbackRequests).toHaveLength(1);
    expect(callbackRequests[0]).toEqual({
      contact: 'visitor@example.test',
      reason: 'Please call to discuss a specific project opportunity.',
      transcript: [{ userText: 'A longer project invitation', aiReply: 'A concise introduction would be a sensible next step.' }],
      turnstileToken: 'callback-token',
    });
  });

  test('shows safe provider failure copy and successful delivery acceptance', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    await openRevealedModal(page, { tokens: ['reveal-token', 'callback-token'] });
    await mockIntentApi(page, successfulReflection('A brief overview could establish useful context.'));
    await mockCallbackApi(page, 503, { error: 'submission-unavailable' }, callbackRequests);
    await page.getByTestId('contact-intent-textarea').fill('A project discussion');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);
    await page.getByLabel('Contact').fill('visitor@example.test');
    await page.getByLabel('Reason').fill('Please contact me about a scoped project discussion.');
    await page.getByRole('button', { name: 'Send to Mannan' }).click();
    await expect(page.getByTestId('contact-callback-error')).toHaveText("Couldn't submit this. You can retry or contact Mannan directly above.");
    expect(callbackRequests).toHaveLength(1);

    await page.unroute('**/api/contact-request');
    await mockCallbackApi(page, 200, { submitted: true }, callbackRequests);
    await page.getByRole('button', { name: 'Send to Mannan' }).click();
    await expect(page.getByTestId('contact-callback-success')).toHaveText('Submitted for delivery to Mannan.');
    expect(callbackRequests).toHaveLength(2);
  });

  test('prevents duplicate submission while a callback request is pending', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await openRevealedModal(page, { tokens: ['reveal-token', 'callback-token'] });
    await mockIntentApi(page, successfulReflection('A concise note could establish the context.'));
    await page.route('**/api/contact-request', async (route) => {
      callbackRequests.push(route.request().postDataJSON());
      await pending;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ submitted: true }) });
    });
    await page.getByTestId('contact-intent-textarea').fill('A pending callback case');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);
    await page.getByLabel('Contact').fill('visitor@example.test');
    await page.getByLabel('Reason').fill('Please reach out about this pending callback case.');
    const submit = page.getByRole('button', { name: 'Send to Mannan' });
    await submit.click();
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'callback_sending');
    await page.getByLabel('Contact').locator('xpath=ancestor::form').evaluate((form: HTMLFormElement) => form.requestSubmit());
    await page.waitForTimeout(100);
    expect(callbackRequests).toHaveLength(1);
    release();
    await expect(page.getByTestId('contact-callback-success')).toHaveText('Submitted for delivery to Mannan.');
  });

  test('closing during a pending callback request aborts safely', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await openRevealedModal(page, { tokens: ['reveal-token', 'callback-token'] });
    await mockIntentApi(page, successfulReflection('A concise note could establish the context.'));
    await page.route('**/api/contact-request', async (route) => {
      await pending;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ submitted: true }) }).catch(() => {});
    });
    await page.getByTestId('contact-intent-textarea').fill('Close during callback');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await openCallback(page);
    await page.getByLabel('Contact').fill('visitor@example.test');
    await page.getByLabel('Reason').fill('Please reach out about closing during this callback.');
    await page.getByRole('button', { name: 'Send to Mannan' }).click();
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'callback_sending');
    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();
    release();
    await page.waitForTimeout(100);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('stream and modal failure boundaries', () => {
  for (const [name, body] of [
    ['incomplete', frames({ type: 'meta', version: 1 }, { type: 'text', value: 'Partial reflection.' })],
    ['malformed', '{not json}\n'],
    ['unknown', '{"type":"unknown"}\n'],
    ['duplicate metadata', frames({ type: 'meta', version: 1 }, { type: 'meta', version: 1 })],
    ['trailing frame', frames({ type: 'meta', version: 1 }, { type: 'done' }, { type: 'text', value: 'trailing' })],
    ['oversized frame', frames({ type: 'meta', version: 1 }, { type: 'text', value: 'x'.repeat(4096) })],
  ] as const) {
    test(`marks a ${name} stream incomplete`, async ({ page }) => {
      await openRevealedModal(page);
      await mockIntentApi(page, body);
      await page.getByTestId('contact-intent-textarea').fill('A stream boundary');
      await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'interpretation_error');
      await expect(page.getByTestId('contact-intent-turn')).toHaveCount(0);
    });
  }

  test('excludes an incomplete reflection from a callback transcript', async ({ page }) => {
    const callbackRequests: unknown[] = [];
    await openRevealedModal(page, { tokens: ['reveal-token', 'callback-token'] });
    await mockIntentApi(page, frames({ type: 'meta', version: 1 }, { type: 'text', value: 'Partial reflection.' }));
    await mockCallbackApi(page, 200, { submitted: true }, callbackRequests);
    await page.getByTestId('contact-intent-textarea').fill('An incomplete reflection case');
    await expect(page.getByTestId('contact-intent-incomplete')).toHaveText('Incomplete reflection');
    await openCallback(page);
    await page.getByLabel('Contact').fill('visitor@example.test');
    await page.getByLabel('Reason').fill('Please reach out about this incomplete reflection.');
    await page.getByRole('button', { name: 'Send to Mannan' }).click();
    await expect(page.getByTestId('contact-callback-success')).toHaveText('Submitted for delivery to Mannan.');
    expect(callbackRequests[0]).toMatchObject({ transcript: [] });
  });

  test('resets the optional interaction when the revealed modal is reopened', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('A useful next step could be a note.'));
    await page.getByTestId('contact-intent-textarea').fill('An optional interaction');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await page.getByTestId('contact-modal-close').click();
    await page.getByTestId('contact-ripple').click();
    await expect(page.getByTestId('contact-intent-disclosure')).toBeVisible();
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(0);
  });

  test('leaving during a pending request is lifecycle-safe', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, async () => new Promise<void>(() => {}));
    await page.getByTestId('contact-intent-textarea').fill('Close while pending');
    await expect(page.getByTestId('contact-intent-local-thanks')).toBeVisible();
    await page.getByTestId('contact-modal-close').click();
    await expect(page.getByTestId('contact-modal')).not.toBeVisible();
  });
});

test('the reveal flow still opens on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await stubTurnstile(page);
  await openModal(page);
  const box = await page.getByTestId('contact-modal').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
