import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { createSiteSessionCookie } from '../src/lib/site-session';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';
const ENDED_MEETING_ID = 'meeting_fedcba9876543210fedcba9876543210';
const END_FLOW_MEETING_ID = 'meeting_end0123456789abcdef0123456789ab';
const END_CONFLICT_MEETING_ID = 'meeting_conflict0123456789abcdef012345';
const PARTICIPANT_MEETING_ID = 'meeting_participant0123456789abcdef0123';

function liveWorkspace(input: {
  meetingId: string;
  version: number;
  role: 'owner' | 'moderator' | 'participant';
  ended?: boolean;
}) {
  return {
    meetingId: input.meetingId,
    version: input.version,
    serverNow: '2026-07-19T14:00:00.000Z',
    title: 'Live planning',
    status: input.ended ? 'ended' : 'scheduled',
    schedule: {
      startsAt: '2026-07-19T13:30:00.000Z',
      endsAt: '2026-07-19T15:00:00.000Z',
      durationSeconds: 5400,
    },
    session: {
      state: input.ended ? 'ended' : 'live',
      actualStartedAt: '2026-07-19T13:30:00.000Z',
      effectiveEndsAt: '2026-07-19T15:00:00.000Z',
      ...(input.ended
        ? { actualEndedAt: '2026-07-19T14:15:00.000Z' }
        : {}),
    },
    currentParticipant: {
      participantId: input.role === 'participant' ? 'guest_1' : 'owner_1',
      role: input.role,
    },
    participants: [
      {
        participantId: 'owner_1',
        role: 'owner',
        identityKind: 'account',
      },
      {
        participantId: 'guest_1',
        role: 'participant',
        identityKind: 'browser_guest',
        displayName: 'River',
      },
    ],
  };
}

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

async function installFakeMeetingSdk(page: Page) {
  await page.addInitScript(() => {
    type Connection =
      | 'idle'
      | 'connecting'
      | 'connected'
      | 'reconnecting'
      | 'disconnected'
      | 'kicked'
      | 'ended'
      | 'failed'
      | 'left';
    type Participant = {
      id: string;
      firstPartyParticipantId: string;
      name: string;
      isLocal: boolean;
      audioEnabled: boolean;
      videoEnabled: boolean;
      audioTrack: MediaStreamTrack | null;
      videoTrack: MediaStreamTrack | null;
    };
    type Snapshot = {
      connection: Connection;
      participants: Participant[];
      issue: string | null;
    };

    const streams = new Set<MediaStream>();
    const listeners = new Set<(snapshot: Snapshot) => void>();
    let connection: Connection = 'idle';
    let leaveCalls = 0;
    let participants: Participant[] = [];

    const videoTrack = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(255,255,255,.32)';
        context.beginPath();
        context.arc(320, 180, 84, 0, Math.PI * 2);
        context.fill();
      }
      const stream = canvas.captureStream(5);
      streams.add(stream);
      return stream.getVideoTracks()[0] ?? null;
    };
    const snapshot = (): Snapshot => ({
      connection,
      participants: participants.map((participant) => ({ ...participant })),
      issue: connection === 'failed' ? 'Could not connect. Try again.' : null,
    });
    const emit = () => {
      const next = snapshot();
      for (const listener of listeners) listener(next);
    };
    const updateLocal = (update: Partial<Participant>) => {
      participants = participants.map((participant) =>
        participant.isLocal ? { ...participant, ...update } : participant);
      emit();
    };

    const session = {
      snapshot,
      subscribe(listener: (snapshot: Snapshot) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async prepare(input: {
        microphoneEnabled: boolean;
        cameraEnabled: boolean;
      }) {
        participants = [{
          id: 'self_playwright',
          firstPartyParticipantId: 'owner_1',
          name: 'Owner',
          isLocal: true,
          audioEnabled: input.microphoneEnabled,
          videoEnabled: input.cameraEnabled,
          audioTrack: null,
          videoTrack: input.cameraEnabled ? videoTrack('#344f45') : null,
        }];
        emit();
      },
      async join() {
        connection = 'connecting';
        emit();
        await new Promise((resolve) => window.setTimeout(resolve, 80));
        connection = 'connected';
        emit();
      },
      async leave() {
        leaveCalls += 1;
        connection = 'left';
        participants = [];
        for (const stream of streams) {
          for (const track of stream.getTracks()) track.stop();
        }
        streams.clear();
        emit();
      },
      async setMicrophoneEnabled(enabled: boolean) {
        updateLocal({ audioEnabled: enabled });
      },
      async setCameraEnabled(enabled: boolean) {
        updateLocal({
          videoEnabled: enabled,
          videoTrack: enabled ? videoTrack('#344f45') : null,
        });
      },
      async setDevice() {},
    };

    const sdk = {
      async initialize(input: {
        authToken: string;
        defaults: { audio: boolean; video: boolean };
      }) {
        if (
          input.authToken !== 'playwright-media-token' ||
          input.defaults.audio !== false ||
          input.defaults.video !== false
        ) {
          throw new Error('Invalid test media initialization');
        }
        return session;
      },
    };
    const control = {
      joinRemote() {
        if (participants.some((participant) => participant.id === 'remote_river')) return;
        participants = [...participants, {
          id: 'remote_river',
          firstPartyParticipantId: 'guest_1',
          name: 'River',
          isLocal: false,
          audioEnabled: true,
          videoEnabled: false,
          audioTrack: null,
          videoTrack: null,
        }];
        emit();
      },
      setRemoteVideo(enabled: boolean) {
        participants = participants.map((participant) =>
          participant.id === 'remote_river'
            ? {
                ...participant,
                videoEnabled: enabled,
                videoTrack: enabled ? videoTrack('#6b493d') : null,
              }
            : participant);
        emit();
      },
      leaveRemote() {
        participants = participants.filter((participant) => participant.id !== 'remote_river');
        emit();
      },
      setConnection(next: Connection) {
        connection = next;
        emit();
      },
      leaves() {
        return leaveCalls;
      },
    };

    const browser = window as typeof window & {
      __MANNAN_MEETING_MEDIA_SDK__: typeof sdk;
      __MANNAN_MEETING_MEDIA_TEST__: typeof control;
    };
    browser.__MANNAN_MEETING_MEDIA_SDK__ = sdk;
    browser.__MANNAN_MEETING_MEDIA_TEST__ = control;
  });
}

async function meetingMediaControl(
  page: Page,
  action: 'joinRemote' | 'leaveRemote' | 'remoteVideoOn' | 'reconnecting' | 'connected',
) {
  await page.evaluate((requested) => {
    const control = (window as typeof window & {
      __MANNAN_MEETING_MEDIA_TEST__: {
        joinRemote(): void;
        leaveRemote(): void;
        setRemoteVideo(enabled: boolean): void;
        setConnection(connection: 'reconnecting' | 'connected'): void;
      };
    }).__MANNAN_MEETING_MEDIA_TEST__;
    if (requested === 'joinRemote') control.joinRemote();
    if (requested === 'leaveRemote') control.leaveRemote();
    if (requested === 'remoteVideoOn') control.setRemoteVideo(true);
    if (requested === 'reconnecting') control.setConnection('reconnecting');
    if (requested === 'connected') control.setConnection('connected');
  }, action);
}

async function fakeLeaveCount(page: Page) {
  return page.evaluate(() =>
    (window as typeof window & {
      __MANNAN_MEETING_MEDIA_TEST__: { leaves(): number };
    }).__MANNAN_MEETING_MEDIA_TEST__.leaves());
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
  await installFakeMeetingSdk(page);
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let earlyStarted = false;
  let mediaGrantRequests = 0;
  let serverVersion = 1;
  let riverPresent = true;
  let samPresent = true;
  let riverRemovalAttempts = 0;
  const riverRemovalKeys: string[] = [];
  await page.route(`**/meet/${MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          meetingId: MEETING_ID,
          version: serverVersion,
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
          currentParticipant: { participantId: 'owner_1', role: 'owner' },
          participants: [
            {
              participantId: 'owner_1',
              role: 'owner',
              identityKind: 'account',
            },
            ...(riverPresent
              ? [{
                  participantId: 'guest_1',
                  role: 'participant',
                  identityKind: 'browser_guest',
                  displayName: 'River',
                }]
              : []),
            ...(samPresent
              ? [{
                  participantId: 'guest_2',
                  role: 'participant',
                  identityKind: 'browser_guest',
                  displayName: 'Sam',
                }]
              : []),
          ],
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
    serverVersion = 3;
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
  await page.route(`**/meet/${MEETING_ID}/api/media-grant`, async (route) => {
    mediaGrantRequests += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postData()).toBeNull();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify({
        data: { provider: 'realtimekit', authToken: 'playwright-media-token' },
      }),
    });
  });
  await page.route(`**/meet/${MEETING_ID}/api/participants/*`, async (route) => {
    const request = route.request();
    const participantId = new URL(request.url()).pathname.split('/').at(-1);
    expect(request.method()).toBe('DELETE');
    expect(request.postData()).toBeNull();
    const key = await request.headerValue('idempotency-key');
    expect(key).toMatch(/^browser_remove_[a-f0-9]{32}$/u);

    if (participantId === 'guest_1') {
      expect(await request.headerValue('if-match')).toBe(`"${serverVersion}"`);
      riverRemovalAttempts += 1;
      riverRemovalKeys.push(key!);
      if (riverRemovalAttempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'dependency_unavailable' } }),
        });
        return;
      }
      riverPresent = false;
      serverVersion += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            membershipIntervalId: 'membership_river',
            version: serverVersion,
          },
        }),
      });
      return;
    }

    expect(participantId).toBe('guest_2');
    expect(await request.headerValue('if-match')).toBe(`"${serverVersion}"`);
    samPresent = false;
    serverVersion += 1;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'meeting_conflict' } }),
    });
  });
  await page.goto(`/meet/${MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scheduled to start' })).toBeVisible();
  const people = page.getByRole('region', { name: 'People' });
  await expect(people.getByText('River', { exact: true })).toBeVisible();
  await expect(people.getByText('Sam', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Connecting…' })).toBeVisible();
  await expect(page.getByText('1 connected')).toBeVisible();
  expect(mediaGrantRequests).toBe(1);
  await page.screenshot({ path: 'test-results/meeting-connected-desktop.png', fullPage: true });
  await meetingMediaControl(page, 'joinRemote');
  await expect(page.getByText('2 connected')).toBeVisible();
  await expect(page.getByText('River', { exact: true }).first()).toBeVisible();
  await meetingMediaControl(page, 'remoteVideoOn');
  await expect(page.getByLabel('Remote camera for River')).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-two-party-desktop.png', fullPage: true });

  const samInitialRow = people
    .getByText('Sam', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  const samStatusBox = await samInitialRow.getByText('Not connected').boundingBox();
  const samRemoveBox = await samInitialRow
    .getByRole('button', { name: 'Remove', exact: true })
    .boundingBox();
  expect(samStatusBox).not.toBeNull();
  expect(samRemoveBox).not.toBeNull();
  expect(
    samStatusBox!.x + samStatusBox!.width <= samRemoveBox!.x
      || samRemoveBox!.x + samRemoveBox!.width <= samStatusBox!.x
      || samStatusBox!.y + samStatusBox!.height <= samRemoveBox!.y
      || samRemoveBox!.y + samRemoveBox!.height <= samStatusBox!.y,
  ).toBe(true);

  const riverRow = people
    .getByText('River', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await riverRow.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(riverRow.getByRole('button', { name: 'Remove from meeting' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/meeting-moderation-confirm-desktop.png',
    fullPage: true,
  });
  await riverRow.getByRole('button', { name: 'Remove from meeting' }).click();
  await expect(people.getByText('River', { exact: true })).toBeVisible();
  await expect(people.getByText('Could not finish removing this person. Try again.')).toBeVisible();
  await riverRow.getByRole('button', { name: 'Remove from meeting' }).click();
  await expect(people.getByText('River', { exact: true })).not.toBeVisible();
  expect(riverRemovalKeys.slice(0, 2)).toHaveLength(2);
  expect(riverRemovalKeys[1]).toBe(riverRemovalKeys[0]);
  await meetingMediaControl(page, 'leaveRemote');
  await expect(people.getByText('1 connected')).toBeVisible();
  await page.screenshot({
    path: 'test-results/meeting-moderation-complete-desktop.png',
    fullPage: true,
  });

  const samRow = people
    .getByText('Sam', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await samRow.getByRole('button', { name: 'Remove', exact: true }).click();
  await samRow.getByRole('button', { name: 'Remove from meeting' }).click();
  await expect(people.getByText('Sam', { exact: true })).not.toBeVisible();
  await meetingMediaControl(page, 'reconnecting');
  await expect(page.getByText('Reconnecting…')).toBeVisible();
  await meetingMediaControl(page, 'connected');
  await expect(page.getByText('Reconnecting…')).not.toBeVisible();
  await page.getByRole('button', { name: 'Turn camera off' }).click();
  await expect(page.getByRole('button', { name: 'Turn camera on' })).toBeVisible();
  await page.getByRole('button', { name: 'Device settings' }).click();
  await expect(page.getByRole('complementary').getByText('Device settings', { exact: true })).toBeVisible();
  const browserTokenSinks = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
    url: location.href,
    text: document.body.innerText,
  }));
  expect(JSON.stringify(browserTokenSinks)).not.toContain('playwright-media-token');
  expect(consoleMessages.join('\n')).not.toContain('playwright-media-token');
  expect(pageErrors.join('\n')).not.toContain('playwright-media-token');
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();
  expect(await fakeLeaveCount(page)).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  serverVersion = 3;
  riverPresent = true;
  samPresent = true;
  riverRemovalAttempts = 0;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Weekly planning' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join meeting' })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-prejoin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Join meeting' }).click();
  await expect(page.getByText('1 connected')).toBeVisible();
  expect(mediaGrantRequests).toBe(2);
  await meetingMediaControl(page, 'joinRemote');
  await expect(page.getByText('2 connected')).toBeVisible();
  const mobilePeople = page.getByRole('region', { name: 'People' });
  const mobileRiverRow = mobilePeople
    .getByText('River', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await mobileRiverRow.getByRole('button', { name: 'Remove', exact: true }).click();
  await mobileRiverRow.getByRole('button', { name: 'Remove from meeting' }).click();
  await expect(mobilePeople.getByText('Could not finish removing this person. Try again.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/meeting-moderation-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Mannan Meetings' }).click();
  await expect(page).toHaveURL('/meet');
  await expect.poll(() => fakeLeaveCount(page)).toBe(1);
});

test('ends a live meeting for everyone only after provider-confirmed retry', async ({ page, context }) => {
  await authenticateOwner(context);
  await installFakeMeetingSdk(page);
  let endAttempts = 0;
  const endKeys: string[] = [];

  await page.route(`**/meet/${END_FLOW_MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: liveWorkspace({
          meetingId: END_FLOW_MEETING_ID,
          version: 4,
          role: 'owner',
        }),
      }),
    });
  });
  await page.route(`**/meet/${END_FLOW_MEETING_ID}/api/media-grant`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify({
        data: { provider: 'realtimekit', authToken: 'playwright-media-token' },
      }),
    });
  });
  await page.route(`**/meet/${END_FLOW_MEETING_ID}/api/live-session`, async (route) => {
    const request = route.request();
    expect(request.method()).toBe('DELETE');
    expect(request.postData()).toBeNull();
    expect(await request.headerValue('content-type')).toBeNull();
    expect(await request.headerValue('if-match')).toBe('"4"');
    const key = await request.headerValue('idempotency-key');
    expect(key).toMatch(/^browser_end_[a-f0-9]{32}$/u);
    endKeys.push(key!);
    endAttempts += 1;
    if (endAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'dependency_unavailable' } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          sessionId: 'session_end0123456789abcdef',
          actualEndedAt: '2026-07-19T14:15:00.000Z',
          version: 5,
        },
      }),
    });
  });

  await page.goto(`/meet/${END_FLOW_MEETING_ID}`);
  await expect(page.getByRole('button', { name: 'Join meeting' })).toBeVisible();
  await page.getByRole('button', { name: 'Join meeting' }).click();
  await expect(page.getByText('1 connected')).toBeVisible();
  const leave = page.getByRole('button', { name: 'Leave', exact: true });
  const end = page.getByRole('button', { name: 'End meeting', exact: true });
  await expect(leave).toBeVisible();
  await expect(end).toBeVisible();
  expect(await leave.getAttribute('class')).not.toBe(await end.getAttribute('class'));

  await end.click();
  await expect(page.getByText('End the live meeting for everyone?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End for everyone' })).toBeVisible();
  expect(endAttempts).toBe(0);
  expect(await fakeLeaveCount(page)).toBe(0);
  await expect(page.getByRole('region', { name: 'Meeting stage' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/meeting-end-confirm-desktop.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: 'End for everyone' }).click();
  await expect(page.getByText('Could not finish ending the meeting. Try again.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meeting ended' })).not.toBeVisible();
  await expect(page.getByRole('region', { name: 'Meeting stage' })).toBeVisible();
  expect(await fakeLeaveCount(page)).toBe(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('End the live meeting for everyone?')).toBeVisible();
  await expect(page.getByText('Could not finish ending the meeting. Try again.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/meeting-end-mobile.png', fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'End for everyone' }).click();
  await expect(page.getByRole('heading', { name: 'Meeting ended' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'People' }).getByText('River')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Leave', exact: true })).not.toBeVisible();
  expect(await fakeLeaveCount(page)).toBe(1);
  expect(endKeys).toHaveLength(2);
  expect(endKeys[1]).toBe(endKeys[0]);
  await page.screenshot({
    path: 'test-results/meeting-end-complete-desktop.png',
    fullPage: true,
  });
});

test('reloads the authoritative workspace after an end conflict', async ({ page, context }) => {
  await authenticateOwner(context);
  let endedElsewhere = false;
  let workspaceReads = 0;
  await page.route(`**/meet/${END_CONFLICT_MEETING_ID}/api/workspace`, async (route) => {
    workspaceReads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: liveWorkspace({
          meetingId: END_CONFLICT_MEETING_ID,
          version: endedElsewhere ? 6 : 5,
          role: 'owner',
          ended: endedElsewhere,
        }),
      }),
    });
  });
  await page.route(`**/meet/${END_CONFLICT_MEETING_ID}/api/live-session`, async (route) => {
    expect(await route.request().headerValue('if-match')).toBe('"5"');
    endedElsewhere = true;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'meeting_conflict' } }),
    });
  });

  await page.goto(`/meet/${END_CONFLICT_MEETING_ID}`);
  await page.getByRole('button', { name: 'End meeting', exact: true }).click();
  await page.getByRole('button', { name: 'End for everyone' }).click();
  await expect(page.getByRole('heading', { name: 'Meeting ended' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'End meeting', exact: true })).not.toBeVisible();
  expect(workspaceReads).toBe(2);
});

test('never offers End meeting to an ordinary live participant', async ({ page, context }) => {
  await authenticateOwner(context);
  await page.route(`**/meet/${PARTICIPANT_MEETING_ID}/api/workspace`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: liveWorkspace({
          meetingId: PARTICIPANT_MEETING_ID,
          version: 3,
          role: 'participant',
        }),
      }),
    });
  });

  await page.goto(`/meet/${PARTICIPANT_MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Ready to join?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'End meeting', exact: true })).not.toBeVisible();
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
          currentParticipant: { participantId: 'guest_1', role: 'participant' },
          participants: [
            {
              participantId: 'owner_1',
              role: 'owner',
              identityKind: 'account',
            },
            {
              participantId: 'guest_1',
              role: 'participant',
              identityKind: 'browser_guest',
              displayName: 'River',
            },
          ],
        },
      }),
    });
  });

  await page.goto(`/meet/${ENDED_MEETING_ID}`);
  await expect(page.getByRole('heading', { name: 'Meeting ended' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join meeting' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Start meeting early' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite people' })).not.toBeVisible();
  await expect(page.getByRole('region', { name: 'People' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).not.toBeVisible();
  expect(await mediaRequestCount(page)).toBe(0);
  await page.screenshot({ path: 'test-results/meeting-ended-desktop.png', fullPage: true });
});
