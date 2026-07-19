# Meeting Pre-Join Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a truthful, provider-neutral camera and microphone setup flow plus a local joined stage to every authorized Mannan meeting workspace.

**Architecture:** Browser media mechanics live in framework-neutral functions wrapped by one React hook. Focused pre-join and joined-stage components consume the same local-media state, while `MeetingRoom` retains authorization, durable workspace loading, guest entry, and the local phase transition.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript DOM media APIs, Tailwind CSS 4, Bun test, Playwright Chromium.

---

## File Map

- Create `src/lib/local-meeting-media.ts` for independent input acquisition, selected-device replacement, issue mapping, and cleanup.
- Create `src/lib/local-meeting-media.test.ts` for fake-track controller tests.
- Create `src/components/meet/use-local-meeting-media.ts` for React lifecycle, stream composition, audio activity, retry, and cleanup.
- Create `src/components/meet/local-video.tsx` for safe `srcObject` attachment and the camera-off fallback.
- Create `src/components/meet/meeting-media-controls.tsx` for shared accessible controls.
- Create `src/components/meet/meeting-prejoin.tsx` for setup, selectors, recovery, and join.
- Create `src/components/meet/meeting-stage.tsx` for the truthful local joined state and leave.
- Modify `src/components/meet/meeting-room.tsx` to select pre-join or stage after workspace authorization.
- Modify `e2e/meeting-shell.spec.ts` and `playwright.config.ts` for fake-media browser acceptance.
- Update the staging release record and canonical handoff after deployment.

### Task 1: Independent browser input acquisition

**Files:**
- Create: `src/lib/local-meeting-media.test.ts`
- Create: `src/lib/local-meeting-media.ts`

- [x] **Step 1: Write failing acquisition and cleanup tests**

Define fake audio/video tracks with observable `stop()`. Test:

```ts
test('keeps microphone media when camera acquisition fails', async () => {
  const audio = fakeTrack('audio', 'mic_1');
  const devices = fakeMediaDevices({
    audio,
    videoError: new DOMException('missing', 'NotFoundError'),
  });

  const result = await acquireLocalMeetingMedia(devices.mediaDevices);

  expect(result.audioTrack).toBe(audio.track);
  expect(result.videoTrack).toBeNull();
  expect(result.issue?.kind).toBe('camera-unavailable');
  expect(devices.requests).toEqual([
    { audio: true, video: false },
    { audio: false, video: true },
  ]);
});

test('stops every supplied track', () => {
  const audio = fakeTrack('audio', 'mic_1');
  const video = fakeTrack('video', 'camera_1');
  stopTracks([audio.track, null, video.track]);
  expect(audio.stopCalls()).toBe(1);
  expect(video.stopCalls()).toBe(1);
});
```

- [x] **Step 2: Run RED**

Run: `bun test src/lib/local-meeting-media.test.ts`

Expected: FAIL because `./local-meeting-media` does not exist.

- [x] **Step 3: Implement the minimal media boundary**

Export these exact contracts:

```ts
export type LocalMediaIssueKind =
  | 'unsupported'
  | 'permission-denied'
  | 'microphone-unavailable'
  | 'camera-unavailable'
  | 'devices-unavailable';

export interface LocalMediaIssue {
  kind: LocalMediaIssueKind;
  message: string;
}

export interface LocalMediaAcquisition {
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  issue: LocalMediaIssue | null;
}

export async function acquireLocalMeetingMedia(
  mediaDevices: MediaDevices | undefined,
): Promise<LocalMediaAcquisition>;

export async function acquireInputTrack(
  mediaDevices: MediaDevices,
  kind: 'audio' | 'video',
  deviceId?: string,
): Promise<MediaStreamTrack>;

export function stopTracks(
  tracks: Array<MediaStreamTrack | null | undefined>,
): void;
```

Use `Promise.allSettled` for separate audio-only and video-only `getUserMedia`
requests. Retain either successful track, stop unexpected extra tracks, then
enumerate and filter `audioinput` and `videoinput` devices. Map denied,
missing, and unsupported states to stable plain-language issues.

- [x] **Step 4: Run GREEN**

Run: `bun test src/lib/local-meeting-media.test.ts`

Expected: all tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/local-meeting-media.ts src/lib/local-meeting-media.test.ts
git commit -m "feat(meet): add local media controller"
```

### Task 2: Selected-device replacement and React lifecycle

**Files:**
- Modify: `src/lib/local-meeting-media.test.ts`
- Create: `src/components/meet/use-local-meeting-media.ts`

- [x] **Step 1: Write the failing replacement test**

```ts
test('requests one selected camera and stops unrelated tracks', async () => {
  const camera = fakeTrack('video', 'camera_2');
  const extra = fakeTrack('audio', 'extra');
  const devices = fakeMediaDevices({ selected: [camera.track, extra.track] });

  const result = await acquireInputTrack(
    devices.mediaDevices,
    'video',
    'camera_2',
  );

  expect(result).toBe(camera.track);
  expect(extra.stopCalls()).toBe(1);
  expect(devices.lastRequest()).toEqual({
    audio: false,
    video: { deviceId: { exact: 'camera_2' } },
  });
});
```

- [x] **Step 2: Run RED**

Run: `bun test src/lib/local-meeting-media.test.ts`

Expected: the selected-device assertion FAILS.

- [x] **Step 3: Complete replacement and implement the hook**

The hook returns this public shape:

```ts
export interface LocalMeetingMediaState {
  status: 'requesting' | 'ready' | 'error';
  stream: MediaStream | null;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  selectedMicrophoneId: string;
  selectedCameraId: string;
  audioLevel: number;
  issue: LocalMediaIssue | null;
  toggleMicrophone(): void;
  toggleCamera(): void;
  selectMicrophone(deviceId: string): Promise<void>;
  selectCamera(deviceId: string): Promise<void>;
  retry(): Promise<void>;
  stop(): void;
}

export function useLocalMeetingMedia(active: boolean): LocalMeetingMediaState;
```

Start acquisition only while `active` is true. Compose current tracks into one
`MediaStream`, replace only the changed input, stop the superseded track,
preserve enabled flags, and stop everything on retry, explicit stop, inactive
transition, and unmount. Sample one analyser through `requestAnimationFrame`
while an enabled microphone exists; normalize to `0..1`, cancel the frame,
disconnect nodes, and close `AudioContext` during cleanup.

- [x] **Step 4: Run GREEN and typecheck**

Run: `bun test src/lib/local-meeting-media.test.ts && bun run typecheck`

Expected: tests PASS and TypeScript exits 0.

- [x] **Step 5: Commit**

```bash
git add src/lib/local-meeting-media.test.ts src/components/meet/use-local-meeting-media.ts
git commit -m "feat(meet): manage browser media lifecycle"
```

### Task 3: Preview and shared controls

**Files:**
- Create: `src/components/meet/local-video.tsx`
- Create: `src/components/meet/meeting-media-controls.tsx`
- Create: `src/components/meet/meeting-media-controls.test.tsx`

- [x] **Step 1: Write the failing accessibility contract test**

```tsx
test('labels input state without relying on icons', () => {
  const markup = renderToStaticMarkup(
    <MeetingMediaControls
      microphoneEnabled={false}
      cameraEnabled
      onToggleMicrophone={() => undefined}
      onToggleCamera={() => undefined}
      onOpenSettings={() => undefined}
    />,
  );

  expect(markup).toContain('Turn microphone on');
  expect(markup).toContain('Turn camera off');
  expect(markup).toContain('Device settings');
  expect(markup).toContain('aria-pressed="false"');
});
```

- [x] **Step 2: Run RED**

Run: `bun test src/components/meet/meeting-media-controls.test.tsx`

Expected: FAIL because the component does not exist.

- [x] **Step 3: Implement minimal reusable components**

`LocalVideo` accepts `stream`, `cameraEnabled`, and `label`. Assign and
clear `video.srcObject` in an effect. Render a muted, autoplaying, inline,
mirrored preview only when the video track is enabled; otherwise show the
participant initial and “Camera is off”.

`MeetingMediaControls` renders 44-pixel native buttons with `aria-pressed`,
visible focus treatment, inline monochrome SVG, and explicit accessible names.
Accept optional settings and leave actions so pre-join and stage reuse the
component without sharing page layout.

- [x] **Step 4: Run GREEN and typecheck**

Run: `bun test src/components/meet/meeting-media-controls.test.tsx && bun run typecheck`

Expected: tests PASS and TypeScript exits 0.

- [x] **Step 5: Commit**

```bash
git add src/components/meet/local-video.tsx src/components/meet/meeting-media-controls.tsx src/components/meet/meeting-media-controls.test.tsx
git commit -m "feat(meet): add local preview controls"
```

### Task 4: Responsive pre-join room

**Files:**
- Create: `src/components/meet/meeting-prejoin.tsx`
- Create: `src/components/meet/meeting-prejoin.test.tsx`

- [x] **Step 1: Write the failing surface contract test**

Use a serializable ready-media fixture and assert:

```tsx
expect(markup).toContain('Ready to join?');
expect(markup).toContain('Join meeting');
expect(markup).toContain('Camera');
expect(markup).toContain('Microphone');
expect(markup).toContain(
  'Nothing leaves this browser until live media is connected.',
);
```

- [x] **Step 2: Run RED**

Run: `bun test src/components/meet/meeting-prejoin.test.tsx`

Expected: FAIL because the component does not exist.

- [x] **Step 3: Implement the pre-join surface**

Use a desktop two-column composition with a dominant 16:9 preview and compact
setup panel, collapsing to one column on mobile. Show requesting, ready,
partial, and error copy without disabling **Join meeting**. Render selectors
only for available devices; fall back to “Camera N” and “Microphone N” when
labels are unavailable. Render an `aria-hidden` microphone activity bar.
Expose retry when acquisition fails and state plainly that media remains local.

- [x] **Step 4: Run GREEN and typecheck**

Run: `bun test src/components/meet/meeting-prejoin.test.tsx && bun run typecheck`

Expected: test PASS and TypeScript exits 0.

- [x] **Step 5: Commit**

```bash
git add src/components/meet/meeting-prejoin.tsx src/components/meet/meeting-prejoin.test.tsx
git commit -m "feat(meet): add device prejoin room"
```

### Task 5: Truthful local joined stage

**Files:**
- Create: `src/components/meet/meeting-stage.tsx`
- Create: `src/components/meet/meeting-stage.test.tsx`
- Modify: `src/components/meet/meeting-room.tsx`

- [ ] **Step 1: Write the failing truthfulness test**

```tsx
expect(markup).toContain('You');
expect(markup).toContain('1 connected');
expect(markup).toContain('Leave');
expect(markup).not.toContain('participants joined');
```

- [ ] **Step 2: Run RED**

Run: `bun test src/components/meet/meeting-stage.test.tsx`

Expected: FAIL because the stage does not exist.

- [ ] **Step 3: Implement and integrate the stage**

Fill the meeting canvas with the same local preview/fallback, anchor the shared
controls below it, and show a narrow rail containing the current role and
“1 connected”. A settings button reveals the same device selectors used in
pre-join.

Add `phase: 'prejoin' | 'joined'` to `MeetingRoom`. Initialize local media
only after the authorized workspace loads. Use the signed-in email or “Guest”
as the local label. Join changes only local phase. Leave calls `media.stop()`
and returns to pre-join. Preserve loading, account/guest entry, admission,
unavailable, and credential-revocation branches exactly.

- [ ] **Step 4: Run the focused gate**

Run: `bun test src/lib/local-meeting-media.test.ts src/components/meet src/app/meet && bun run typecheck`

Expected: all focused tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/meet/meeting-stage.tsx src/components/meet/meeting-stage.test.tsx src/components/meet/meeting-room.tsx
git commit -m "feat(meet): add local joined stage"
```

### Task 6: Browser acceptance and visual refinement

**Files:**
- Modify: `playwright.config.ts`
- Modify: `e2e/meeting-shell.spec.ts`
- Modify only if rendering reveals a defect: new meeting components

- [ ] **Step 1: Write failing browser assertions**

Configure Chromium with:

```ts
launchOptions: {
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
},
```

Extend the authorized workspace test to wait for **Ready to join?**, click
**Join meeting**, assert **1 connected**, toggle camera and microphone, click
**Leave**, and assert pre-join returns. Repeat critical visibility at
`390x844`.

- [ ] **Step 2: Run RED**

Run: `bunx playwright test e2e/meeting-shell.spec.ts --project=chromium`

Expected: FAIL against any incomplete room integration.

- [ ] **Step 3: Refine only observed rendering defects**

Correct clipping, overflow, contrast, focus visibility, select appearance, and
mobile control placement. Capture `meeting-prejoin-desktop.png`,
`meeting-stage-desktop.png`, and `meeting-prejoin-mobile.png`. Do not add
new product features in this task.

- [ ] **Step 4: Run the complete local gate**

```bash
bun run test:unit
bun run typecheck
bun run build
bunx playwright test e2e/meeting-shell.spec.ts --project=chromium
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 5: Inspect and commit**

Inspect all three images at original resolution, then:

```bash
git add playwright.config.ts e2e/meeting-shell.spec.ts src/components/meet
git commit -m "test(meet): verify local prejoin flow"
```

### Task 7: Stage and preserve continuity

**Files:**
- Modify: `docs/superpowers/plans/2026-07-18-meeting-staging-release.md`
- Modify: `/private/tmp/meeting-persistence-handoff.7jgK4U/HANDOFF.md`

- [ ] **Step 1: Push the verified branch**

Run: `git push origin feat/meeting-consent`

Expected: the remote branch advances through all verified commits.

- [ ] **Step 2: Deploy the branch preview**

Deploy from the existing Vercel project and update only the stable staging
alias `meet-staging-mannan20.vercel.app`. Do not mutate the production alias.

- [ ] **Step 3: Smoke staging**

Use Vercel's authenticated request surface to verify `/meet` and the existing
staging meeting return 200. Record that local hardware permission remains a
manual browser acceptance check.

- [ ] **Step 4: Record evidence and next work**

Append commit IDs, exact test/build results, deployment URL, smoke status,
provider-neutral limitations, active-goal status, standing autonomy direction,
and the next ready meeting-app slice to the staging record and canonical
handoff.

- [ ] **Step 5: Commit and push documentation**

```bash
git add docs/superpowers/plans/2026-07-18-meeting-staging-release.md
git commit -m "docs(meet): record prejoin staging"
git push origin feat/meeting-consent
```

After this cycle, continue the active goal with the next ready slice. Realtime
provider selection, new paid-provider spend, new provider credentials, and
production publication remain genuine escalation points unless separately
authorized.
