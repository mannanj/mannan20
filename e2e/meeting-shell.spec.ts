import { expect, test } from '@playwright/test';
import { createSiteSessionCookie } from '../src/lib/site-session';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';

test('offers conventional email continuation on the meeting home', async ({ page }) => {
  await page.goto('/meet');
  await expect(page.getByRole('heading', { name: 'Meet without the account ceremony.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible();
  await expect(page.getByText('No password or separate sign-up.')).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-home.png', fullPage: true });
});

test('renders the authorized durable workspace on desktop and mobile', async ({ page, context }) => {
  process.env.MANNAN_SESSION_SECRET = 'playwright-consent-session-secret';
  const sessionCookie = await createSiteSessionCookie({
    accountId: '0123456789abcdef0123456789abcdef',
    email: 'owner@example.com',
    role: 'user',
  });
  const [cookiePair] = sessionCookie.split(';');
  const [cookieName, cookieValue] = cookiePair!.split('=');
  await context.addCookies([
    {
      name: cookieName!,
      value: cookieValue!,
      url: 'https://localhost:3847',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.route(`**/meet/${MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          meetingId: MEETING_ID,
          version: 1,
          title: 'Weekly planning',
          status: 'scheduled',
          schedule: {
            startsAt: '2026-07-19T14:00:00.000Z',
            endsAt: '2026-07-19T15:00:00.000Z',
            durationSeconds: 3600,
          },
          currentParticipant: { role: 'owner' },
        },
      }),
    });
  });
  await page.route(`**/meet/${MEETING_ID}/api/access-links`, async (route) => {
    expect(await route.request().headerValue('if-match')).toBe('"1"');
    expect(await route.request().headerValue('idempotency-key')).toMatch(
      /^browser_invite_[a-f0-9]{32}$/u,
    );
    expect(route.request().postDataJSON()).toEqual({
      expiresAt: '2026-07-19T15:00:00.000Z',
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessLinkId: 'link_0123456789abcdef',
          secret: 'private_guest_secret_0123456789abcdef',
          expiresAt: '2026-07-19T15:00:00.000Z',
          version: 2,
        },
      }),
    });
  });
  await page.goto(`/meet/${MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();
  await expect(page.getByText('owner', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite people' })).toBeVisible();
  await page.getByRole('button', { name: 'Invite people' }).click();
  await expect(page.getByRole('button', { name: 'Copy private link' })).toBeVisible();
  await expect(page.getByLabel('Private meeting link')).toHaveValue(
    'http://localhost:3847/meet/j/private_guest_secret_0123456789abcdef',
  );
  await expect(page.getByRole('button', { name: 'Turn camera off' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn microphone off' })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-prejoin-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Join meeting' }).click();
  await expect(page.getByText('1 connected')).toBeVisible();
  await page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(page.getByRole('button', { name: 'Turn camera on' })).toBeVisible();
  await page.getByRole('button', { name: 'Device settings' }).click();
  await expect(page.getByRole('complementary').getByText('Device settings', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-stage-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join meeting' })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-prejoin-mobile.png', fullPage: true });
});
