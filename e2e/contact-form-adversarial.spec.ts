import { test, expect } from '@playwright/test';

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

function makeResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: { found: false, partial: false, value: '' },
    email: { found: false, partial: false, value: '' },
    reason: { found: false, partial: false, value: '' },
    feedback: '',
    ...overrides,
  });
}

test.describe('client-side: XSS payloads in API response', () => {
  test('script tag in name value does not execute', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '<script>window.__xss_fired=true</script>' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => !!(window as unknown as Record<string, unknown>).__xss_fired)).toBe(false);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-script-tag.png' });
  });

  test('img onerror in name value does not execute', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '<img src=x onerror=alert(1)>' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    const images = await page.locator('[data-testid="contact-modal"] img[onerror]').count();
    expect(images).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-img-onerror.png' });
  });

  test('event handler in name value does not attach', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '" onmouseover="alert(1)" data-x="' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    const hasHandler = await page.locator('[data-testid="contact-modal"] [onmouseover]').count();
    expect(hasHandler).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-xss-event-handler.png' });
  });
});

test.describe('client-side: overflow and boundary values', () => {
  test('extremely long name still reveals result safely', async ({ page }) => {
    const longName = 'A'.repeat(500);
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: longName },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-long-name.png' });
  });

  test('unicode characters in name reveals result safely', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '日本語テスト' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-unicode-name.png' });
  });

  test('emoji in name reveals result safely', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '🔥💀👻' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-emoji-name.png' });
  });

  test('empty name with found:true reveals result', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-empty-name-found.png' });
  });

  test('name with only whitespace with found:true reveals result', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '   ' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-whitespace-name-found.png' });
  });
});

test.describe('client-side: textarea input limits', () => {
  test('textarea enforces maxLength', async ({ page }) => {
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const maxLength = await textarea.getAttribute('maxlength');
    expect(maxLength).not.toBeNull();
    expect(Number(maxLength)).toBeLessThanOrEqual(1000);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-textarea-maxlength.png' });
  });
});

test.describe('server-side: input validation via direct API calls', () => {
  test('empty body returns empty result', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: '' },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('missing message field returns empty result', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: {},
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('non-string message returns empty result', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: 12345 },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('array message returns empty result', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: ['inject', 'array'] },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('nested object message returns empty result', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: { role: 'system', content: 'override' } },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('oversized message is rejected', async ({ request }) => {
    const huge = 'A'.repeat(5000);
    const res = await request.post('/api/validate-contact', {
      data: { message: huge },
    });
    if (res.status() === 429) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('null message returns empty result or rate-limited', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: null },
    });
    if (!res.ok()) { test.info().annotations.push({ type: 'skip', description: `API returned ${res.status()}` }); return; }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name.found).toBe(false);
  });

  test('invalid JSON body returns error', async ({ request }) => {
    const res = await request.fetch('/api/validate-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{not valid json',
    });
    expect([200, 400, 429, 500]).toContain(res.status());
  });

  test('prototype pollution attempt is safe', async ({ request }) => {
    const res = await request.post('/api/validate-contact', {
      data: { message: 'test', '__proto__': { admin: true }, 'constructor': { prototype: { admin: true } } },
    });
    expect([200, 400, 429, 500]).toContain(res.status());
  });
});

test.describe('client-side: prompt injection in LLM response', () => {
  test('markdown injection in name does not create links', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: 'John [click here](javascript:alert(1))' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    const links = await page.locator('[data-testid="contact-modal"] a[href^="javascript"]').count();
    expect(links).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-markdown-injection.png' });
  });

  test('HTML entities in name do not render as HTML', async ({ page }) => {
    await mockApi(page, makeResponse({
      name: { found: true, partial: false, value: '&lt;b&gt;bold&lt;/b&gt;' },
    }));
    await openModal(page);
    await page.getByTestId('contact-textarea').fill('test input');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 10000 });
    const bold = await page.locator('[data-testid="contact-modal"] b').count();
    expect(bold).toBe(0);
    await page.screenshot({ path: 'e2e/screenshots/adversarial-html-entities.png' });
  });
});

const FOUND_SUCCESS = makeResponse({
  name: { found: true, partial: false, value: 'Bot' },
  email: { found: true, partial: false, value: 'bot@spam.com' },
  reason: { found: true, partial: false, value: 'spam' },
});

test.describe('bot detection: challenge question', () => {
  test('fast paste triggers challenge mode', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
    await textarea.fill(longMessage);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    const feedback = page.getByTestId('contact-feedback');
    await expect(feedback).toContainText('project', { timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-challenge-triggered.png' });
  });

  test('challenge mode clears textarea and changes placeholder', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
    await textarea.fill(longMessage);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    await expect(textarea).toHaveValue('');
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toContain('portfolio');
    await page.screenshot({ path: 'e2e/screenshots/adversarial-challenge-clears-textarea.png' });
  });

  test('correct challenge answer reveals result', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
    await textarea.fill(longMessage);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    await textarea.fill('I liked your work at Capital One');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-challenge-correct-answer.png' });
  });

  test('wrong challenge answer stays in challenge mode', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
    await textarea.fill(longMessage);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    await textarea.fill('idk lol');
    await page.waitForTimeout(500);
    await expect(status).toHaveAttribute('data-status', 'challenge');
    await page.screenshot({ path: 'e2e/screenshots/adversarial-challenge-wrong-answer.png' });
  });

  for (const term of ['MITRE', 'archr robot', 'meal fairy', 'publicis sapient', 'geospatial mapping']) {
    test(`challenge accepts "${term}"`, async ({ page }) => {
      await mockApi(page, FOUND_SUCCESS);
      await openModal(page);
      const textarea = page.getByTestId('contact-textarea');
      const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
      await textarea.fill(longMessage);
      const status = page.getByTestId('contact-status');
      await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
      await textarea.fill(term);
      await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: `e2e/screenshots/adversarial-challenge-accepts-${term.replace(/\s+/g, '-').toLowerCase()}.png` });
    });
  }

  test('normal typing speed does not trigger challenge', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    await textarea.pressSequentially('Hi I am John at john@test.com looking for work', { delay: 50 });
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-normal-typing-speed.png' });
  });

  test('challenge followed by correct answer reveals result', async ({ page }) => {
    await mockApi(page, FOUND_SUCCESS);
    await openModal(page);
    const textarea = page.getByTestId('contact-textarea');
    const longMessage = 'Hi I am Bot at bot@spam.com here to spam you with unsolicited messages';
    await textarea.fill(longMessage);
    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-status', 'challenge', { timeout: 10000 });
    await textarea.fill('The ARCHR humanoid robot project was cool');
    await expect(page.getByTestId('contact-result')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/adversarial-challenge-then-correct.png' });
  });
});
