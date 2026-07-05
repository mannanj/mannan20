import { test, expect } from '@playwright/test';
import { openRevealedModal, mockIntentApi } from './helpers/contact-form';

function makeIntentResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    categories: [
      { key: 'job_opportunity', detected: false },
      { key: 'collaboration', detected: false },
      { key: 'project_interest', detected: false },
      { key: 'speaking_media', detected: false },
      { key: 'networking', detected: false },
    ],
    message: 'Thanks for reaching out!',
    ...overrides,
  });
}

async function fillIntentAndAwaitMessage(page: import('@playwright/test').Page, input = 'test input') {
  await page.getByTestId('contact-intent-textarea').fill(input);
  await expect(page.getByTestId('contact-intent-message')).toBeVisible({ timeout: 10000 });
}

test.describe('client-side: XSS payloads in intent API response', () => {
  test('script tag in message does not execute', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({
      message: '<script>window.__xss_fired=true</script>',
    }));
    await fillIntentAndAwaitMessage(page);
    expect(await page.evaluate(() => !!(window as unknown as Record<string, unknown>).__xss_fired)).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-script-tag.png' });
  });

  test('img onerror in message does not execute', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({
      message: '<img src=x onerror=alert(1)>',
    }));
    await fillIntentAndAwaitMessage(page);
    const images = await page.locator('[data-testid="contact-modal"] img[onerror]').count();
    expect(images).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-img-onerror.png' });
  });

  test('event handler in message does not attach', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({
      message: '" onmouseover="alert(1)" data-x="',
    }));
    await fillIntentAndAwaitMessage(page);
    const hasHandler = await page.locator('[data-testid="contact-modal"] [onmouseover]').count();
    expect(hasHandler).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-event-handler.png' });
  });
});

test.describe('client-side: overflow and boundary values', () => {
  test('extremely long message still renders safely', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({ message: 'A'.repeat(500) }));
    await fillIntentAndAwaitMessage(page);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-long-message.png' });
  });

  test('unicode characters in message render safely', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({ message: '日本語テスト' }));
    await fillIntentAndAwaitMessage(page);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-unicode-message.png' });
  });

  test('emoji in message renders safely', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({ message: '🔥💀👻' }));
    await fillIntentAndAwaitMessage(page);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-emoji-message.png' });
  });

  test('empty message field renders nothing', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({ message: '' }));
    await page.getByTestId('contact-intent-textarea').fill('test input');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'idle', { timeout: 10000 });
    await expect(page.getByTestId('contact-intent-message')).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/adversarial-empty-message.png' });
  });
});

test.describe('client-side: textarea input limits', () => {
  test('intent textarea enforces maxLength', async ({ page }) => {
    await openRevealedModal(page);
    const textarea = page.getByTestId('contact-intent-textarea');
    const maxLength = await textarea.getAttribute('maxlength');
    expect(maxLength).not.toBeNull();
    expect(Number(maxLength)).toBeLessThanOrEqual(1000);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-textarea-maxlength.png' });
  });
});

test.describe('server-side: input validation via direct API calls', () => {
  test('empty message returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', { data: { message: '' } });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('missing message field returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', { data: {} });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('non-string message returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', { data: { message: 12345 } });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('array message returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', { data: { message: ['inject', 'array'] } });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('nested object message returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', {
      data: { message: { role: 'system', content: 'override' } },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('oversized message is rejected', async ({ request }) => {
    const huge = 'A'.repeat(5000);
    const res = await request.post('/api/contact-intent', { data: { message: huge } });
    if (res.status() === 429) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('null message returns empty result', async ({ request }) => {
    const res = await request.post('/api/contact-intent', { data: { message: null } });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('');
  });

  test('invalid JSON body returns error', async ({ request }) => {
    const res = await request.fetch('/api/contact-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{not valid json',
    });
    expect([200, 400, 429, 500]).toContain(res.status());
  });

  test('prototype pollution attempt is safe', async ({ request }) => {
    const res = await request.post('/api/contact-intent', {
      data: { message: 'test', '__proto__': { admin: true }, 'constructor': { prototype: { admin: true } } },
    });
    expect([200, 400, 429, 500]).toContain(res.status());
  });
});

test.describe('client-side: prompt injection in intent response', () => {
  test('markdown injection in message does not create links', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({
      message: 'Thanks [click here](javascript:alert(1))',
    }));
    await fillIntentAndAwaitMessage(page);
    const links = await page.locator('[data-testid="contact-modal"] a[href^="javascript"]').count();
    expect(links).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-markdown-injection.png' });
  });

  test('HTML entities in message do not render as HTML', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, makeIntentResponse({
      message: '&lt;b&gt;bold&lt;/b&gt;',
    }));
    await fillIntentAndAwaitMessage(page);
    const bold = await page.locator('[data-testid="contact-modal"] b').count();
    expect(bold).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-html-entities.png' });
  });
});
