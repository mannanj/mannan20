import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { createSiteSessionCookie } from '../src/lib/site-session';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';
const ENDED_MEETING_ID = 'meeting_fedcba9876543210fedcba9876543210';

async function authenticateOwner(context: BrowserContext) {
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
}

async function countMediaRequests(page: Page) {
  await page.addInitScript(() => {
    const mediaDevices = navigator.mediaDevices;
    const original = mediaDevices.getUserMedia.bind(mediaDevices);
    const observed = globalThis as typeof globalThis & { __meetingMediaRequests: number };
    observed.__meetingMediaRequests = 0;
    mediaDevices.getUserMedia = async (constraints) => {
      observed.__meetingMediaRequests += 1;
      return original(constraints);
    };
  });
}

async function mediaRequestCount(page: Page) {
  return page.evaluate(() =>
    (globalThis as typeof globalThis & { __meetingMediaRequests: number })
      .__meetingMediaRequests);
}

test('offers conventional email continuation on the meeting home', async ({ page }) => {
  await page.goto('/meet');
  await expect(page.getByRole('heading', { name: 'Meet without the account ceremony.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible();
  await expect(page.getByText('No password or separate sign-up.')).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-home.png', fullPage: true });
});

test('renders the authorized durable workspace on desktop and mobile', async ({ page, context }) => {
  await authenticateOwner(context);
  await countMediaRequests(page);
  let earlyStarted = false;
  await page.route(`**/meet/${MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          meetingId: MEETING_ID,
          version: earlyStarted ? 3 : 1,
          serverNow: '2026-07-19T13:30:00.000Z',
          title: 'Weekly planning',
          status: 'scheduled',
          schedule: {
            startsAt: '2026-07-19T14:00:00.000Z',
            endsAt: '2026-07-19T15:00:00.000Z',
            durationSeconds: 3600,
          },
          ...(earlyStarted
            ? {
                session: {
                  state: 'live',
                  actualStartedAt: '2026-07-19T13:30:00.000Z',
                  effectiveEndsAt: '2026-07-19T14:30:00.000Z',
                },
              }
            : {}),
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
  await page.route(`**/meet/${MEETING_ID}/api/live-session`, async (route) => {
    expect(await route.request().headerValue('if-match')).toBe('"2"');
    expect(await route.request().headerValue('idempotency-key')).toMatch(
      /^browser_start_[a-f0-9]{32}$/u,
    );
    expect(route.request().postData()).toBe('{}');
    earlyStarted = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          sessionId: 'session_0123456789abcdef',
          actualStartedAt: '2026-07-19T13:30:00.000Z',
          effectiveEndsAt: '2026-07-19T14:30:00.000Z',
          version: 3,
        },
      }),
    });
  });
  await page.goto(`/meet/${MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scheduled to start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join meeting' })).not.toBeVisible();
  expect(await mediaRequestCount(page)).toBe(0);
  await page.screenshot({ path: 'test-results/meeting-before-start-desktop.png', fullPage: true });
  await expect(page.getByRole('button', { name: 'Invite people' })).toBeVisible();
  await page.getByRole('button', { name: 'Invite people' }).click();
  await expect(page.getByRole('button', { name: 'Copy private link' })).toBeVisible();
  await expect(page.getByLabel('Private meeting link')).toHaveValue(
    'http://localhost:3847/meet/j/private_guest_secret_0123456789abcdef',
  );
  await page.getByRole('button', { name: 'Start meeting early' }).click();
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();
  await expect(page.getByText('owner', { exact: true })).toBeVisible();
  await expect.poll(() => mediaRequestCount(page)).toBe(2);
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

test('keeps an ended workspace out of device setup', async ({ page, context }) => {
  await authenticateOwner(context);
  await countMediaRequests(page);
  await page.route(`**/meet/${ENDED_MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          meetingId: ENDED_MEETING_ID,
          version: 4,
          serverNow: '2026-07-19T16:00:00.000Z',
          title: 'Finished planning',
          status: 'ended',
          schedule: {
            startsAt: '2026-07-19T14:00:00.000Z',
            endsAt: '2026-07-19T15:00:00.000Z',
            durationSeconds: 3600,
          },
          session: {
            state: 'ended',
            actualStartedAt: '2026-07-19T14:00:00.000Z',
            effectiveEndsAt: '2026-07-19T15:00:00.000Z',
            actualEndedAt: '2026-07-19T14:45:00.000Z',
          },
          currentParticipant: { role: 'owner' },
        },
      }),
    });
  });

  await page.goto(`/meet/${ENDED_MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Meeting ended' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join meeting' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Start meeting early' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite people' })).not.toBeVisible();
  expect(await mediaRequestCount(page)).toBe(0);
  await page.screenshot({ path: 'test-results/meeting-ended-desktop.png', fullPage: true });
});
