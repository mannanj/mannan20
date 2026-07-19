import { expect, test } from '@playwright/test';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';

test('offers conventional email continuation on the meeting home', async ({ page }) => {
  await page.goto('/meet');
  await expect(page.getByRole('heading', { name: 'Meet without the account ceremony.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible();
  await expect(page.getByText('No password or separate sign-up.')).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-home.png', fullPage: true });
});

test('renders the authorized durable workspace on desktop and mobile', async ({ page }) => {
  await page.route(`**/meet/${MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          meetingId: MEETING_ID,
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
  await page.goto(`/meet/${MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();
  await expect(page.getByText('owner', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-workspace-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-workspace-mobile.png', fullPage: true });
});
