# Meeting Live-Room Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the meeting workspace obey the authoritative scheduled/live lifecycle, including an owner-only explicit early start, instead of allowing the local stage at any time.

**Architecture:** Add the application clock instant to the already-authorized workspace projection, derive a small browser lifecycle model from that server instant plus elapsed local monotonic time, and render one of before-start, pre-join, live-stage, or ended states. The existing versioned `POST /live-session` mutation remains the sole early-start authority; the browser only exposes it to the signed-in owner and reconciles conflicts by reloading the workspace.

**Tech Stack:** TypeScript, meeting application/Worker packages, Next.js 15, React 19, Bun test, Vitest, Playwright, Cloudflare Workers/D1, Vercel Preview.

**Source specification:** `docs/superpowers/specs/2026-07-16-meeting-platform-design.md` in `/Users/manblack/Documents/meet/.worktrees/platform-foundation`, especially “Persistent meeting workspace, access, and live behavior” and “Early-room time display.”

---

### Task 1: Project the authoritative server instant

**Repository:** `/Users/manblack/Documents/meet/.worktrees/platform-foundation`

**Files:**
- Modify: `packages/meeting-application/test/workspace-lookup.test.ts`
- Modify: `packages/meeting-application/src/types.ts`
- Modify: `packages/meeting-application/src/application.ts`
- Modify: Worker tests and fixtures that construct `MeetingWorkspaceProjection`

- [x] **Step 1: Write the failing projection assertion**

Add `serverNow: "2026-07-17T13:00:00.000Z"` to the exact owner workspace projection. Keep the existing `version: 1` assertion so both concurrency and clock authority remain contractual.

- [x] **Step 2: Run the focused application test and verify RED**

Run:

```bash
pnpm --filter @meeting-platform/meeting-application test -- workspace-lookup.test.ts
```

Expected: the exact projection fails because `serverNow` is absent.

- [x] **Step 3: Add the required projection field**

Add this field to `MeetingWorkspaceProjection`:

```ts
readonly serverNow: string;
```

Pass `clock.now()` into `projectWorkspace` and serialize that exact value. Do not read `Date` directly inside the projection.

- [x] **Step 4: Update exact Worker fixtures and run all meeting gates**

Run:

```bash
pnpm check
git diff --check
```

Expected: all domain, application, persistence, and Worker tests plus builds/typechecks pass.

- [x] **Step 5: Commit the contract**

```bash
git add packages/meeting-application packages/meeting-worker
git commit -m "feat(workspace): expose authoritative server time"
```

### Task 2: Derive the browser live-room lifecycle

**Repository:** `/Users/manblack/Documents/mannan20/.worktrees/meeting-consent`

**Files:**
- Create: `src/lib/meeting-room-lifecycle.test.ts`
- Create: `src/lib/meeting-room-lifecycle.ts`

- [x] **Step 1: Write the failing lifecycle table**

Cover these exact states with fixed ISO instants:

```ts
expect(meetingRoomLifecycle(upcomingOwner)).toMatchObject({
  phase: 'before-start',
  canStartEarly: true,
  canJoinMedia: false,
});
expect(meetingRoomLifecycle(upcomingParticipant)).toMatchObject({
  phase: 'before-start',
  canStartEarly: false,
  canJoinMedia: false,
});
expect(meetingRoomLifecycle(scheduledWindow)).toMatchObject({
  phase: 'open',
  canJoinMedia: true,
});
expect(meetingRoomLifecycle(liveSession)).toMatchObject({
  phase: 'live',
  canJoinMedia: true,
});
expect(meetingRoomLifecycle(endedSession)).toMatchObject({
  phase: 'ended',
  canJoinMedia: false,
});
```

Also prove an effective live-session end closes media even if a delayed reconciliation still reports `state: "live"`, and prove malformed/non-finite dates fail closed as `ended`.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
bun test src/lib/meeting-room-lifecycle.test.ts
```

Expected: module-not-found or missing-export failure.

- [x] **Step 3: Implement the pure lifecycle model**

Export focused types plus:

```ts
export function meetingRoomLifecycle(input: {
  nowMs: number;
  role: string;
  status: string;
  schedule: { startsAt: string; endsAt: string };
  session?: {
    state: string;
    actualStartedAt: string;
    effectiveEndsAt: string;
    actualEndedAt?: string;
  };
}): MeetingRoomLifecycle;

export function serverClockNowMs(input: {
  serverNow: string;
  receivedAtMs: number;
  currentClientMs: number;
}): number;
```

`serverClockNowMs` must use `serverNow + max(0, currentClientMs - receivedAtMs)` so browser clock skew cannot open the room early. `meetingRoomLifecycle` must be deterministic, return a non-negative `secondsUntilStart` only before start, and fail closed.

- [x] **Step 4: Run focused tests and TypeScript**

Run:

```bash
bun test src/lib/meeting-room-lifecycle.test.ts
bun run typecheck
```

Expected: both pass.

- [x] **Step 5: Commit the lifecycle model**

```bash
git add src/lib/meeting-room-lifecycle.ts src/lib/meeting-room-lifecycle.test.ts
git commit -m "feat(meet): model authoritative live-room timing"
```

### Task 3: Add the owner early-start client

**Files:**
- Create: `src/lib/meeting-live-session.test.ts`
- Create: `src/lib/meeting-live-session.ts`

- [x] **Step 1: Write a failing exact-request test**

Prove `startMeetingLiveSession` sends:

```ts
{
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'idempotency-key': expect.stringMatching(/^browser_start_[a-f0-9]{32}$/u),
    'if-match': '"7"',
  },
  body: '{}',
}
```

to `/meet/{meetingId}/api/live-session`, validates the returned session timestamps and next version, and rejects malformed or non-success responses without logging response data.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
bun test src/lib/meeting-live-session.test.ts
```

Expected: missing module/export failure.

- [x] **Step 3: Implement the narrow browser client**

Export:

```ts
export async function startMeetingLiveSession(input: {
  meetingId: string;
  version: number;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<{
  sessionId: string;
  actualStartedAt: string;
  effectiveEndsAt: string;
  version: number;
}>;
```

Reuse `validMeetingIdentifier`, require a positive safe version, generate the browser idempotency key with `crypto.randomUUID`, require exact safe response fields, and expose a stable public error rather than provider or Worker internals.

- [x] **Step 4: Run focused tests and TypeScript**

Run:

```bash
bun test src/lib/meeting-live-session.test.ts
bun run typecheck
```

Expected: both pass.

- [x] **Step 5: Commit the mutation client**

```bash
git add src/lib/meeting-live-session.ts src/lib/meeting-live-session.test.ts
git commit -m "feat(meet): add owner early-start client"
```

### Task 4: Gate the pre-join experience and render timing states

**Files:**
- Create: `src/components/meet/meeting-lifecycle-panel.test.tsx`
- Create: `src/components/meet/meeting-lifecycle-panel.tsx`
- Modify: `src/components/meet/meeting-room.tsx`
- Modify: `e2e/meeting-shell.spec.ts`

- [x] **Step 1: Write failing static contracts**

Render the panel for an owner and participant before start and assert:

```ts
expect(ownerMarkup).toContain('Start meeting early');
expect(ownerMarkup).toContain('Scheduled to start');
expect(participantMarkup).toContain('Live meeting has not started');
expect(participantMarkup).not.toContain('Start meeting early');
```

Render the ended state and assert `Meeting ended` plus the scheduled time, with no `Join meeting` action.

- [x] **Step 2: Run the component test and verify RED**

Run:

```bash
bun test src/components/meet/meeting-lifecycle-panel.test.tsx
```

Expected: missing component/export failure.

- [x] **Step 3: Implement the lifecycle panel and timer**

The panel receives already-derived lifecycle data, a localized start label, and optional `onStartEarly`. It renders a restrained second-updating countdown from five minutes onward and an hours/minutes label earlier. It must not claim media is connected.

- [x] **Step 4: Integrate lifecycle state in `MeetingRoom`**

Record `{serverNow, receivedAtMs}` when workspace data arrives, tick once per second while the workspace is before start or live, and derive the lifecycle through the pure helper. Only enable `useLocalMeetingMedia` and render `MeetingPreJoin` when `canJoinMedia` is true. On owner early start, call the tested client with the current version, replace the workspace version/session from its result, and transition to pre-join. On `meeting_conflict`, reload workspace; on other failure, keep the panel and show a concise retryable status.

- [x] **Step 5: Extend browser acceptance**

Use a fixed `serverNow` in the workspace fixture. Assert before-start participants never request camera/microphone and cannot see `Join meeting`; assert the owner sees and can activate `Start meeting early`; stub the exact live-session request; then assert `Ready to join?` appears and the existing desktop/mobile pre-join flow remains intact. Add an ended fixture proving no device request and no join action.

- [x] **Step 6: Run the site gate**

Run:

```bash
bun test src
bun run typecheck
bun run build
bunx playwright test e2e/meeting-shell.spec.ts
git diff --check
```

Expected: all unit tests, TypeScript, production build, desktop/mobile Playwright flows, and whitespace checks pass.

- [x] **Step 7: Commit the UI slice**

```bash
git add src/components/meet src/lib/meeting-room-lifecycle.ts e2e/meeting-shell.spec.ts
git commit -m "feat(meet): enforce the live-room lifecycle"
```

### Task 5: Stage and preserve continuity

- [x] **Step 1: Run final cross-repository gates**

Run `pnpm check` plus `git diff --check` in the meeting worktree and the full site gate from Task 4 in the site worktree.

- [x] **Step 2: Deploy the existing staging surfaces**

Deploy only `meeting-platform-worker-staging`, push `feat/meeting-consent`, deploy a Vercel Preview, and update only `meet-staging-mannan20.vercel.app`. Do not create production resources or alter production aliases.

- [x] **Step 3: Smoke lifecycle boundaries**

Verify unauthenticated direct Worker access remains `401`, protected `/meet` and a staged meeting route return `200`, and the meeting page does not request media before its authoritative open state.

- [x] **Step 4: Record exact evidence**

Append commits, test counts, deployments, smokes, remaining RealtimeKit credential limitation, and the next ready action to `docs/superpowers/plans/2026-07-18-meeting-staging-release.md` and `/private/tmp/meeting-persistence-handoff.7jgK4U/HANDOFF.md`.

- [x] **Step 5: Commit and push the release record**

Leave both feature worktrees intact because the active goal continues into the RealtimeKit adapter and media-grant slice.
