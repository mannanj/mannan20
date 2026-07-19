# RealtimeKit Browser Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the truthful local-only joined shell with a secure, provider-backed custom meeting stage that can display real local and remote RealtimeKit participants while remaining fully testable with an injected fake SDK.

**Architecture:** The existing same-origin meeting BFF derives the provider display name from the signed account session or signed guest cookie and forwards a grant request without exposing first-party credentials. A provider-neutral in-memory controller owns grant, SDK, listener, join, reconnect, device, and cleanup lifecycles; one narrow adapter translates the current `@cloudflare/realtimekit` Core SDK into that contract. React projects controller snapshots into the existing restrained editorial stage, never storing or logging the bearer token.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5.8, Bun test, Playwright, Cloudflare RealtimeKit Core SDK 2.0.1.

**Source specification:** `/Users/manblack/Documents/meet/.worktrees/platform-foundation/docs/superpowers/specs/2026-07-18-realtimekit-media-grants-design.md`

**Official SDK evidence:** Cloudflare documents `@cloudflare/realtimekit`, default `RealtimeKitClient.init({ authToken, defaults })`, explicit `meeting.join()` / `meeting.leave()`, `meeting.self` room and media events, `meeting.meta` socket/media connection events, and `meeting.participants.joined` participant/media events. Package `2.0.1` was confirmed from the npm registry and its public `dist/index.d.ts` inspected before this plan was written.

---

### Task 1: Add an identity-derived same-origin media-grant BFF

**Files:**
- Modify: `src/lib/meeting-cookies.ts`
- Modify: `src/lib/meeting-cookies.test.ts`
- Modify: `src/app/meet/[meetingId]/api/entry/route.ts`
- Modify: `src/app/meet/[meetingId]/api/[...operation]/route.ts`
- Modify: `src/app/meet/meeting-routes.test.ts`

- [x] **Step 1: Write failing signed-cookie and route tests**

Add a guest credential cookie test proving the signed payload preserves the
trimmed display name and rejects an empty or over-100-character name:

```ts
const cookie = createGuestCredentialCookie({
  meetingId: MEETING_ID,
  participantId: 'guest_1',
  displayName: 'River',
  credential: 'guest:credential',
  nowSeconds: 100,
});
expect(readGuestCredential(cookie, MEETING_ID, 101)).toEqual({
  meetingId: MEETING_ID,
  participantId: 'guest_1',
  displayName: 'River',
  credential: 'guest:credential',
  exp: 86_500,
});
```

Add route tests that call the dynamic `POST` handler with operation
`['media-grant']` and prove:

```ts
// account request forwarded to the Worker
expect(JSON.parse(String(init?.body))).toEqual({
  displayName: 'owner@example.com',
});
expect(headers.get('x-account-assertion')).toContain('.');

// guest request forwarded without exposing the credential to JavaScript
expect(JSON.parse(String(init?.body))).toEqual({ displayName: 'River' });
expect(headers.get('x-meeting-participant-id')).toBe('guest_1');
expect(headers.get('x-meeting-guest-credential')).toBe('guest:credential');

// spoofed browser body is ignored
expect(JSON.parse(String(init?.body))).not.toEqual({ displayName: 'Mallory' });
```

Also assert missing identity is `401`, a cross-origin request is `403`, and
the response is `Cache-Control: no-store` with only
`{data:{provider:'realtimekit',authToken:'test-token'}}`.

- [x] **Step 2: Run RED**

Run:

```bash
bun test src/lib/meeting-cookies.test.ts src/app/meet/meeting-routes.test.ts
```

Expected: failures because the guest credential has no display name and the
dynamic route does not allow `media-grant` or guest POST requests.

- [x] **Step 3: Implement the signed identity projection**

Change the public guest credential helpers to require and return:

```ts
export function createGuestCredentialCookie(input: {
  meetingId: string;
  participantId: string;
  displayName: string;
  credential: string;
  nowSeconds?: number;
}): string;

export function readGuestCredential(
  cookieHeader: string | null,
  meetingId: string,
  nowSeconds?: number,
): (Omit<SignedPayload, 'v'> & {
  participantId: string;
  displayName: string;
  credential: string;
}) | null;
```

Pass the already-validated candidate display name when the entry route creates
the credential cookie. In the dynamic route, allow exact
`POST /media-grant`, require same-origin, and construct the Worker body only on
the server:

```ts
const mediaGrant =
  operation.length === 1
  && operation[0] === 'media-grant'
  && request.method === 'POST';

const body = mediaGrant
  ? { displayName: session.email }
  : await readMeetingJson(request);
```

For a guest, allow only workspace `GET` and media-grant `POST`; derive
`{displayName: guest.displayName}` from the signed HTTP-only cookie. Do not
read a browser-provided media-grant body and do not expose the guest credential
or account assertion in the site response.

- [x] **Step 4: Run GREEN and focused boundary checks**

Run:

```bash
bun test src/lib/meeting-cookies.test.ts src/app/meet/meeting-routes.test.ts src/lib/meeting-bff.test.ts src/lib/meeting-worker.test.ts
bun run typecheck
```

Expected: all focused tests pass and TypeScript exits 0.

- [x] **Step 5: Commit**

```bash
git add src/lib/meeting-cookies.ts src/lib/meeting-cookies.test.ts 'src/app/meet/[meetingId]/api/entry/route.ts' 'src/app/meet/[meetingId]/api/[...operation]/route.ts' src/app/meet/meeting-routes.test.ts
git commit -m "feat(meet): proxy identity-bound media grants"
```

### Task 2: Build the memory-only grant client and provider-neutral controller

**Files:**
- Create: `src/lib/meeting-media-grant.ts`
- Create: `src/lib/meeting-media-grant.test.ts`
- Create: `src/lib/meeting-media-controller.ts`
- Create: `src/lib/meeting-media-controller.test.ts`

- [x] **Step 1: Write failing grant and controller tests**

Define the wished-for grant API:

```ts
const grant = await requestMeetingMediaGrant(MEETING_ID, fetcher);
expect(grant.provider).toBe('realtimekit');
expect(grant.authToken).toBe('memory-only-token');
```

Prove exact same-origin `POST`, `cache: 'no-store'`, no request body, strict
provider/token parsing, stable `MeetingMediaGrantError` codes, and no token in
error messages or JSON serialization.

Build a fake `MeetingMediaSdk` and assert this exact controller sequence:

```ts
expect(calls).toEqual([
  'grant',
  'stop-prejoin',
  'sdk:init:audio=false:video=false',
  'subscribe',
  'prepare:mic_1:camera_1:audio=true:video=true',
  'join',
]);
```

Tests must also prove:

- the token is absent from `controller.snapshot()` and serialized snapshots;
- joined participant/media events replace rather than duplicate rows;
- reconnecting, connected, disconnected, kicked, ended, failed, and left
  states map to stable public connection states;
- microphone/camera toggles and device changes delegate to the active session;
- leave and dispose unsubscribe exactly once and call provider leave at most
  once;
- a failed grant or SDK join exposes retryable safe copy and leaves no live
  provider session; and
- a late async completion after dispose cannot resurrect the room.

- [x] **Step 2: Run RED**

Run:

```bash
bun test src/lib/meeting-media-grant.test.ts src/lib/meeting-media-controller.test.ts
```

Expected: module-not-found failures for the new grant and controller modules.

- [x] **Step 3: Implement the public browser contract**

Use these provider-neutral public shapes:

```ts
export type MeetingMediaConnection =
  | 'idle' | 'connecting' | 'connected' | 'reconnecting'
  | 'disconnected' | 'kicked' | 'ended' | 'failed' | 'left';

export interface MeetingMediaParticipant {
  id: string;
  name: string;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
}

export interface MeetingMediaSnapshot {
  connection: MeetingMediaConnection;
  participants: readonly MeetingMediaParticipant[];
  issue: string | null;
}

export interface MeetingMediaSession {
  snapshot(): MeetingMediaSnapshot;
  subscribe(listener: (snapshot: MeetingMediaSnapshot) => void): () => void;
  prepare(input: {
    microphone?: MediaDeviceInfo;
    camera?: MediaDeviceInfo;
    microphoneEnabled: boolean;
    cameraEnabled: boolean;
  }): Promise<void>;
  join(): Promise<void>;
  leave(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  setCameraEnabled(enabled: boolean): Promise<void>;
  setDevice(device: MediaDeviceInfo): Promise<void>;
}

export interface MeetingMediaSdk {
  initialize(input: {
    authToken: string;
    defaults: { audio: false; video: false };
  }): Promise<MeetingMediaSession>;
}
```

`MeetingMediaController` owns mutable token/session references only inside the
class closure, publishes frozen token-free snapshots, and accepts injected
`grant`, `sdk`, and `stopPreJoin` dependencies. Normalize every user-visible
failure without interpolating thrown messages.

- [x] **Step 4: Run GREEN**

Run:

```bash
bun test src/lib/meeting-media-grant.test.ts src/lib/meeting-media-controller.test.ts
bun run typecheck
```

Expected: controller and grant tests pass, including order and cleanup.

- [x] **Step 5: Commit**

```bash
git add src/lib/meeting-media-grant.ts src/lib/meeting-media-grant.test.ts src/lib/meeting-media-controller.ts src/lib/meeting-media-controller.test.ts
git commit -m "feat(meet): add in-memory room controller"
```

### Task 3: Adapt the current RealtimeKit Core SDK

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/lib/realtimekit-browser-sdk.ts`
- Create: `src/lib/realtimekit-browser-sdk.test.ts`

- [x] **Step 1: Install the exact inspected SDK and write failing adapter tests**

Run:

```bash
bun add @cloudflare/realtimekit@2.0.1
```

Write tests against an injected fake Core client loader. Prove initialization
passes only `{authToken, defaults:{audio:false,video:false}}`, subscribes before
join, projects `self` plus `participants.joined.toArray()`, and listens to:

```text
self: roomJoined, roomLeft, audioUpdate, videoUpdate
meta: socketConnectionUpdate, mediaConnectionUpdate
participants.joined: participantJoined, participantLeft, audioUpdate, videoUpdate
```

Assert the adapter removes each exact listener, maps `roomLeft` states without
leaking raw errors, calls `self.setDevice()` before enabling requested media,
and uses `self.enableAudio/disableAudio`, `self.enableVideo/disableVideo`,
`meeting.join()`, and `meeting.leave()` exactly once per action.

- [x] **Step 2: Run RED**

Run:

```bash
bun test src/lib/realtimekit-browser-sdk.test.ts
```

Expected: module-not-found failure for the adapter.

- [x] **Step 3: Implement the narrow SDK adapter**

Export a default factory with an injectable loader:

```ts
export function createRealtimeKitBrowserSdk(
  loadClient: RealtimeKitClientLoader = async () =>
    (await import('@cloudflare/realtimekit')).default,
): MeetingMediaSdk;
```

Use the official Core SDK 2.0.1 shapes inspected from `dist/index.d.ts`:

```ts
const meeting = await RealtimeKitClient.init({
  authToken,
  defaults: { audio: false, video: false },
});
```

Project tracks as nullable even though SDK declarations are non-null, because
runtime media may be absent while disabled. Filter hidden recorder entries,
sort the local participant first and remote participants by name then ID, and
emit a new immutable snapshot after each relevant event. Never call console,
analytics, storage, history, or URL APIs.

- [x] **Step 4: Run GREEN and bundle checks**

Run:

```bash
bun test src/lib/realtimekit-browser-sdk.test.ts src/lib/meeting-media-controller.test.ts
bun run typecheck
bun run build
```

Expected: adapter tests, TypeScript, and the Next production build pass.

- [x] **Step 5: Commit**

```bash
git add package.json bun.lock src/lib/realtimekit-browser-sdk.ts src/lib/realtimekit-browser-sdk.test.ts
git commit -m "feat(meet): adapt RealtimeKit Core in browser"
```

### Task 4: Wire the controller into the room lifecycle

**Files:**
- Create: `src/components/meet/use-meeting-media-room.ts`
- Modify: `src/components/meet/meeting-prejoin.tsx`
- Modify: `src/components/meet/meeting-prejoin.test.tsx`
- Modify: `src/components/meet/meeting-room.tsx`

- [ ] **Step 1: Write failing integration assertions**

Add component assertions for joining/disabled copy:

```ts
expect(markup).toContain('Connecting…');
expect(markup).toContain('Could not connect. Try again.');
```

Extend controller tests to prove `MeetingRoom` input is captured before local
media stops:

```ts
expect(joinInput).toEqual({
  microphone: microphones[0],
  camera: cameras[0],
  microphoneEnabled: true,
  cameraEnabled: false,
});
expect(stopPreJoin).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run RED**

Run:

```bash
bun test src/components/meet/meeting-prejoin.test.tsx src/lib/meeting-media-controller.test.ts
```

Expected: missing connection-state UI/hook behavior.

- [ ] **Step 3: Implement the React lifecycle seam**

`useMeetingMediaRoom` creates one controller per meeting ID, subscribes in an
effect, disposes on meeting change/unmount, and exposes:

```ts
{
  snapshot,
  joining,
  join(localMedia),
  retry(localMedia),
  leave(),
  toggleMicrophone(),
  toggleCamera(),
  selectMicrophone(deviceId),
  selectCamera(deviceId),
}
```

`MeetingRoom` stays in pre-join until the controller snapshot reaches
`connected`; during `connecting` the Join action is disabled and labeled
**Connecting…**. On a retryable failure, keep the user in pre-join with
**Could not connect. Try again.** Leaving awaits provider cleanup, returns to
pre-join, and reacquires local preview tracks. Kicked and ended states do not
auto-rejoin; disconnected/reconnecting states remain in the stage with honest
status copy.

- [ ] **Step 4: Run GREEN**

Run:

```bash
bun test src/components/meet/meeting-prejoin.test.tsx src/lib/meeting-media-controller.test.ts
bun run typecheck
```

Expected: focused tests and TypeScript pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/meet/use-meeting-media-room.ts src/components/meet/meeting-prejoin.tsx src/components/meet/meeting-prejoin.test.tsx src/components/meet/meeting-room.tsx
git commit -m "feat(meet): connect prejoin to provider room"
```

### Task 5: Render a truthful multi-party custom stage

**Files:**
- Create: `src/components/meet/participant-media.tsx`
- Create: `src/components/meet/participant-media.test.tsx`
- Modify: `src/components/meet/meeting-stage.tsx`
- Modify: `src/components/meet/meeting-stage.test.tsx`

- [ ] **Step 1: Write failing stage projection tests**

Render one local and two remote participants and assert:

```ts
expect(markup).toContain('3 connected');
expect(markup).toContain('You');
expect(markup).toContain('River');
expect(markup).toContain('Sam');
expect(markup).toContain('Reconnecting…');
expect(markup).not.toContain('connected locally');
```

Test `ParticipantMedia` with live and absent tracks. It must render a muted,
mirrored local video, an unmuted non-mirrored remote audio/video pair, and a
name/initial fallback without inventing camera or microphone state.

- [ ] **Step 2: Run RED**

Run:

```bash
bun test src/components/meet/participant-media.test.tsx src/components/meet/meeting-stage.test.tsx
```

Expected: missing component and obsolete local-only stage contract failures.

- [ ] **Step 3: Implement the adaptive stage**

Use one responsive media grid: one participant fills the canvas; two use equal
columns on desktop; three or more use a balanced two-column grid with a single
full-width final tile when odd. Keep the compact People rail, but derive the
count and rows only from the controller snapshot. Add small plain-language
status treatments for **Reconnecting…**, **Connection lost**, **You were
removed**, and **Meeting ended**.

Attach `MediaStreamTrack` objects to `HTMLMediaElement.srcObject` in effects
using ephemeral `MediaStream` instances; clear `srcObject` during cleanup.
Remote audio elements are autoplaying and not muted. Local video is muted and
mirrored. Do not serialize track objects or retain them beyond snapshot/event
ownership.

Stage controls delegate to the controller. Device selects use the already
enumerated pre-join device list but call provider `setDevice`; they must not
restart the old local-preview hook while joined.

- [ ] **Step 4: Run GREEN and accessibility-focused component checks**

Run:

```bash
bun test src/components/meet/participant-media.test.tsx src/components/meet/meeting-stage.test.tsx src/components/meet/meeting-media-controls.test.tsx
bun run typecheck
```

Expected: all focused tests pass; controls retain labels, focus styles, and
44px minimum targets.

- [ ] **Step 5: Commit**

```bash
git add src/components/meet/participant-media.tsx src/components/meet/participant-media.test.tsx src/components/meet/meeting-stage.tsx src/components/meet/meeting-stage.test.tsx
git commit -m "feat(meet): render connected participant stage"
```

### Task 6: Run fake-SDK browser acceptance and release gates

**Files:**
- Modify: `e2e/meeting-shell.spec.ts`
- Modify: `docs/superpowers/plans/2026-07-18-meeting-staging-release.md`
- Modify: `/private/tmp/meeting-persistence-handoff.7jgK4U/HANDOFF.md`

- [ ] **Step 1: Write failing desktop/mobile fake-SDK acceptance**

Install an init script before page load that exposes a test-only injected
`MeetingMediaSdk` through the existing dependency seam, not through a
production environment flag. Route media-grant with a fixture token, click
**Join meeting**, and assert:

```text
Connecting… -> 1 connected -> remote River joins -> 2 connected
remote camera off/on updates -> reconnecting -> connected
local microphone/camera toggles -> Leave -> Ready to join?
```

Assert exactly one media-grant request per join attempt, no token in page URL,
`localStorage`, `sessionStorage`, DOM text, console messages, or uncaught error
messages, and exactly one fake provider leave on UI leave and on navigation.
Repeat critical stage visibility at `390x844`.

- [ ] **Step 2: Run RED**

Run:

```bash
bunx playwright test e2e/meeting-shell.spec.ts --project=chromium
```

Expected: new remote-participant and memory-only-token assertions fail until
the full browser dependency seam is connected.

- [ ] **Step 3: Refine only observed integration defects**

Fix only defects exposed by acceptance: clipping, overflow, track attachment,
listener cleanup, status copy, focus order, or mobile controls. Capture:

```text
test-results/meeting-connected-desktop.png
test-results/meeting-two-party-desktop.png
test-results/meeting-two-party-mobile.png
```

Inspect all three at original resolution.

- [ ] **Step 4: Run the complete release-grade gate**

```bash
bun run test:unit
bun run typecheck
bun run build
bunx playwright test e2e/meeting-shell.spec.ts --project=chromium
git diff --check
rg -n "authToken|localStorage|sessionStorage|console\." src/components/meet src/lib/meeting-media-* src/lib/realtimekit-browser-sdk.ts
```

Expected: every command exits 0; the audit finds the token only in the grant
parser, in-memory controller/adapter input, and explicit test fixtures, with no
storage, URL, analytics, DOM, or console sink.

- [ ] **Step 5: Record evidence, commit, and preserve the live blocker**

Update the staging record and canonical handoff with exact commit IDs, test
counts, screenshots, and the next action. State explicitly that the live
RealtimeKit App/presets, remote `0002` migration, Worker deploy, browser SDK
connection, and two-browser acceptance remain blocked on a Cloudflare token
with `Realtime` or `Realtime Admin`. Do not point the stable staging alias at a
frontend whose join action can only fail against the older Worker.

```bash
git add e2e/meeting-shell.spec.ts docs/superpowers/plans/2026-07-18-meeting-staging-release.md docs/superpowers/plans/2026-07-18-realtimekit-browser-stage.md
git commit -m "docs(meet): record verified browser media stage"
git push
```

The handoff is outside the repository and must be refreshed through
`apply_patch` after the verified commit. Continue with the next locally ready
meeting-platform slice rather than waiting on the credential blocker.
