import { test, expect, type Page } from '@playwright/test';

const PAGE = '/videos/sun-signal-light';
const VERIFY = '**/api/transcripts/verify';

function reply(body: Record<string, unknown>, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function openGate(page: Page) {
  await page.goto(PAGE);
  const button = page.getByTestId('transcripts-download-button');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId('transcripts-gate-modal')).toBeVisible();
}

test.describe('the download button on the film page', () => {
  test('sits at the top right, reads Download, and carries a chat icon', async ({ page }) => {
    await page.goto(PAGE);
    const button = page.getByTestId('transcripts-download-button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Download');
    await expect(button.locator('svg')).toHaveCount(1);

    const box = (await button.boundingBox())!;
    const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    expect(box.y).toBeLessThan(heading.y);
    expect(box.x).toBeGreaterThan(page.viewportSize()!.width / 2);
  });

  test('/sun still reaches the film page', async ({ page }) => {
    await page.goto('/sun');
    await expect(page).toHaveURL(/\/videos\/sun-signal-light$/);
    await expect(page.getByTestId('transcripts-download-button')).toBeVisible();
  });
});

test.describe('the identity gate', () => {
  test('opens with the select-people note and both hints shown once, before any guess', async ({ page }) => {
    await openGate(page);

    const modal = page.getByTestId('transcripts-gate-modal');
    await expect(modal).toContainText('select people');

    const hints = page.getByTestId('transcript-gate-hints');
    await expect(hints).toBeVisible();
    await expect(hints).toHaveCount(1);
    await expect(hints).toContainText('where you work');
    await expect(hints).toContainText('who you are');

    await expect(page.getByTestId('transcript-gate-turn')).toHaveCount(0);
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
    await page.screenshot({ path: 'e2e/screenshots/transcripts-gate-open.png' });
  });

  test('asks where you are coming from, while the contact form keeps its own placeholder', async ({ page }) => {
    await openGate(page);
    await expect(page.getByTestId('transcript-gate-textarea')).toHaveAttribute('placeholder', 'Where are you coming from?');
  });

  test('the hints stay a single line and do not multiply as guesses are spent', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) => route.fulfill(reply({ message: "That's not it — 2 tries left.", unlocked: false, remaining: 2 })));

    const textarea = page.getByTestId('transcript-gate-textarea');
    await textarea.fill('nope');
    await expect(page.getByTestId('transcript-gate-turn')).toHaveCount(1, { timeout: 10000 });
    await textarea.fill('still nope');
    await expect(page.getByTestId('transcript-gate-turn')).toHaveCount(2, { timeout: 10000 });

    await expect(page.getByTestId('transcript-gate-hints')).toHaveCount(1);
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
  });

  test('a wrong guess replies in the thread and unlocks nothing', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) => route.fulfill(reply({ message: "That's not it — 2 tries left.", unlocked: false, remaining: 2 })));

    await page.getByTestId('transcript-gate-textarea').fill('acme corp');
    await expect(page.getByTestId('transcript-gate-turn-ai')).toHaveText("That's not it — 2 tries left.", { timeout: 10000 });
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
  });

  test('three wrong guesses spend the budget and retire the input', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) => route.fulfill(reply({ message: 'Nope.', unlocked: false, remaining: 0 })));

    const textarea = page.getByTestId('transcript-gate-textarea');
    for (let i = 1; i <= 3; i += 1) {
      await expect(textarea).toBeVisible();
      await textarea.fill(`guess ${i}`);
      await expect(page.getByTestId('transcript-gate-turn')).toHaveCount(i, { timeout: 10000 });
    }

    await expect(page.getByTestId('transcript-gate-textarea')).toHaveCount(0);
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
    await page.screenshot({ path: 'e2e/screenshots/transcripts-gate-exhausted.png' });
  });

  test('a lockout reply is shown to the visitor rather than surfacing as an error', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) =>
      route.fulfill(reply({ message: 'Still locked — three tries used. Try again in about 10 minutes.', unlocked: false, remaining: 0, retryAfterSeconds: 600 }, 429)),
    );

    await page.getByTestId('transcript-gate-textarea').fill('faizan');
    await expect(page.getByTestId('transcript-gate-turn-ai')).toContainText('Still locked', { timeout: 10000 });
    await expect(page.getByTestId('transcript-gate-error')).toHaveCount(0);
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
  });

  test('a correct guess reveals the download link, pointing at the gated route', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) => route.fulfill(reply({ message: 'Thanks — that checks out.', unlocked: true, remaining: 2 })));

    await page.getByTestId('transcript-gate-textarea').fill('steerbridge');

    const link = page.getByTestId('transcripts-download-link');
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveAttribute('href', '/api/transcripts/download');
    await expect(page.getByTestId('transcript-gate-unlocked-note')).toContainText('checks out');
    await expect(page.getByTestId('transcript-gate-textarea')).toHaveCount(0);
    await expect(page.getByTestId('transcript-gate-hints')).toHaveCount(0);
    await page.screenshot({ path: 'e2e/screenshots/transcripts-gate-unlocked.png' });
  });

  test('an unrecognised visitor is offered the prompt, not the download', async ({ page }) => {
    await page.route('**/api/transcripts/verify', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill(reply({ unlocked: false }));
      }
      return route.fulfill(reply({ message: 'Nope.', unlocked: false, remaining: 2 }));
    });

    await openGate(page);
    await expect(page.getByTestId('transcript-gate-textarea')).toBeVisible();
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
  });

  test('a server failure reverts the guess so it can be retyped', async ({ page }) => {
    await openGate(page);
    await page.route(VERIFY, (route) => route.fulfill({ status: 500, body: 'boom' }));

    const textarea = page.getByTestId('transcript-gate-textarea');
    await textarea.fill('steerbridge');
    await expect(page.getByTestId('transcript-gate-status')).toHaveAttribute('data-status', 'error', { timeout: 10000 });
    await expect(textarea).toHaveValue('steerbridge');
    await expect(page.getByTestId('transcripts-download-link')).toHaveCount(0);
  });
});

test.describe('the gate against the real API', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.21' } });

  test('a real correct answer unlocks a real, password-free download', async ({ page }) => {
    await openGate(page);
    await page.getByTestId('transcript-gate-textarea').fill('I work at SteerBridge');

    const link = page.getByTestId('transcripts-download-link');
    await expect(link).toBeVisible({ timeout: 15000 });

    const response = await page.request.get('/api/transcripts/download');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/zip');
    expect(response.headers()['content-disposition']).toContain('sun-signal-transcripts.zip');

    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(1_000_000);
    expect(body.subarray(0, 2).toString('latin1')).toBe('PK');
    const generalPurposeFlags = body.readUInt16LE(6);
    expect(generalPurposeFlags & 0x0001).toBe(0);
  });
});

test.describe('a grant that already exists', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.23' } });

  test('survives a full page reload without spending another guess', async ({ page }) => {
    await openGate(page);
    await page.getByTestId('transcript-gate-textarea').fill('faizan');
    await expect(page.getByTestId('transcripts-download-link')).toBeVisible({ timeout: 15000 });

    await page.reload();
    await page.getByTestId('transcripts-download-button').click();

    await expect(page.getByTestId('transcripts-download-link')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('transcript-gate-textarea')).toHaveCount(0);
    await expect(page.getByTestId('transcript-gate-unlocked-note')).toContainText('Still unlocked');
  });
});

test.describe('the download route without a grant', () => {
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.22' } });

  test('refuses an ungranted request and a forged grant alike', async ({ request }) => {
    expect((await request.get('/api/transcripts/download')).status()).toBe(403);

    const forged = await request.get('/api/transcripts/download', {
      headers: { cookie: '__Host-transcripts-grant=eyJleHAiOjk5OTk5OTk5OTl9.not-a-real-signature' },
    });
    expect(forged.status()).toBe(403);
  });
});
