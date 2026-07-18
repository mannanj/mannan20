import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const SESSION_SECRET = 'playwright-consent-session-secret';
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

function pendingConsentCookie(): string {
  const payload = Buffer.from(
    JSON.stringify({
      purpose: 'legal_consent',
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
      returnTo: '/meet/room-123',
      exp: Math.floor(Date.now() / 1000) + 1800,
    }),
    'utf8',
  ).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `__Host-mannan-consent=${payload}.${signature}`;
}

async function openPendingConsent(page: Page) {
  await page.setExtraHTTPHeaders({ cookie: pendingConsentCookie() });
  await page.goto('/auth/consent');
  await expect(page.getByRole('heading', { name: 'One last step' })).toBeVisible();
}

async function scrollReviewToEnd(page: Page) {
  await page.getByTestId('legal-document-scroll').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
}

test.describe('canonical legal pages', () => {
  test('Terms and Privacy render the complete shared drafts', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
    await expect(page.getByText('Draft for legal review before production publication.')).toBeVisible();
    await expect(page.getByRole('heading', { name: '4. Meetings and submitted content' })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2. Meeting information' })).toBeVisible();
    await expect(page.getByText(/We do not sell personal information/)).toBeVisible();
  });
});

test.describe('first-account legal review', () => {
  test('checking the box opens review and scrolling enables Agree and continue', async ({ page }) => {
    await openPendingConsent(page);

    await page.getByTestId('consent-card-checkbox').check();
    const dialog = page.getByRole('dialog', { name: 'Review the Terms and Privacy Policy' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#review-terms-title')).toBeFocused();
    await expect(page.getByTestId('legal-review-checkbox')).toBeDisabled();
    await expect(page.getByTestId('agree-and-continue')).toBeDisabled();

    await scrollReviewToEnd(page);
    await expect(page.getByTestId('legal-review-checkbox')).toBeEnabled();
    await expect(page.getByTestId('legal-review-checkbox')).toBeChecked();
    await expect(page.getByTestId('agree-and-continue')).toBeEnabled();

    let submittedBody = '';
    await page.route('**/api/auth/consent', async (route) => {
      submittedBody = route.request().postData() ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Accepted</title><p>Accepted</p>',
      });
    });
    await page.getByTestId('agree-and-continue').click();
    await expect.poll(() => submittedBody).toBe('accepted=yes');
  });

  test('Privacy receives initial focus and Escape restores its opener', async ({ page }) => {
    await openPendingConsent(page);
    const privacyLink = page.getByTestId('review-privacy-link');
    await privacyLink.click();

    await expect(page.locator('#review-privacy-title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('legal-review-dialog')).toHaveCount(0);
    await expect(privacyLink).toBeFocused();
  });

  test('keyboard focus wraps inside the open dialog', async ({ page }) => {
    await openPendingConsent(page);
    await page.getByTestId('review-terms-link').click();

    const close = page.getByRole('button', { name: 'Close legal review' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('legal-document-scroll')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
  });
});

test.describe('first-account legal review on mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the consent card and review dialog fit the viewport', async ({ page }) => {
    await openPendingConsent(page);
    await expect(page.getByTestId('consent-card-checkbox')).toBeVisible();
    await page.getByTestId('review-terms-link').click();

    const box = await page.getByTestId('legal-review-dialog').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    expect(box!.y + box!.height).toBeLessThanOrEqual(667);
  });
});
