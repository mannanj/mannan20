# Meeting Private Invite Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in meeting owners and moderators create and copy an expiring private guest link from the meeting workspace.

**Architecture:** The meeting application adds its authoritative aggregate version to the already-authorized workspace projection. The site uses that version for the existing same-origin access-link BFF, retains the returned secret only in component memory, and presents the invite action only to signed-in owners/moderators.

**Tech Stack:** TypeScript, meeting application/Worker packages, Next.js 15, React 19, Bun test, Vitest, Playwright, Cloudflare Workers/D1, Vercel Preview.

---

### Task 1: Expose authoritative workspace version

**Repositories:**
- Meeting worktree: `/Users/manblack/Documents/meet/.worktrees/platform-foundation`

**Files:**
- Modify: `packages/meeting-application/test/workspace-lookup.test.ts`
- Modify: `packages/meeting-application/src/types.ts`
- Modify: `packages/meeting-application/src/application.ts`
- Modify: meeting Worker fixtures that construct `MeetingWorkspaceProjection`

- [x] Add `version: 1` to the exact account workspace projection test.
- [x] Run `pnpm --filter @meeting-platform/meeting-application test -- workspace-lookup.test.ts` and verify RED.
- [x] Add required `version: number` to `MeetingWorkspaceProjection` and project `meeting.version`.
- [x] Update typed Worker fixtures and acceptance assertions to include the version.
- [x] Run `pnpm check`, `git diff --check`, and commit `feat(workspace): expose current meeting version`.

### Task 2: Build the tested browser invite client

**Repository:**
- Site worktree: `/Users/manblack/Documents/mannan20/.worktrees/meeting-consent`

**Files:**
- Create: `src/lib/meeting-invite.test.ts`
- Create: `src/lib/meeting-invite.ts`

- [x] Write a failing test for `createMeetingInvite` proving exact same-origin path, JSON body with meeting-end expiry, quoted `If-Match`, idempotency key, safe local share URL construction, and returned next version.
- [x] Run `bun test src/lib/meeting-invite.test.ts` and verify RED.
- [x] Implement:

```ts
export interface MeetingInviteResult {
  accessLinkId: string;
  shareUrl: string;
  expiresAt?: string;
  version: number;
}

export async function createMeetingInvite(input: {
  meetingId: string;
  version: number;
  expiresAt: string;
  origin: string;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
}): Promise<MeetingInviteResult>;
```

Reject malformed response identifiers, secret, expiry, or version. Never log or persist the returned secret.
- [x] Run focused tests and TypeScript.
- [x] Commit `feat(meet): add private invite client`.

### Task 3: Add the persistent invite control

**Files:**
- Create: `src/components/meet/meeting-invite-link.test.tsx`
- Create: `src/components/meet/meeting-invite-link.tsx`
- Modify: `src/components/meet/meeting-room.tsx`
- Modify: `e2e/meeting-shell.spec.ts`

- [x] Write a failing static contract test proving the control uses “Invite people”, describes expiry, and does not render the raw secret before creation.
- [x] Run the component test and verify RED.
- [x] Implement a compact workspace-header control shown only when `signedInEmail !== null` and role is `owner` or `moderator`.
- [x] On create, use the current workspace version and scheduled end time. Hold the result only in React state, update the workspace version, and expose “Copy private link”. Use `navigator.clipboard` with selected-text fallback and concise copied/error status.
- [x] Extend the signed-in Playwright workspace fixture with `version: 1`, stub the access-link response, verify the exact `If-Match` header and expiry body, then verify copy-ready UI on desktop and mobile.
- [x] Run all site gates and commit `feat(meet): add private invite control`.

### Task 4: Stage both sides and preserve continuity

- [ ] Deploy `meeting-platform-worker-staging` with the existing secrets and D1 binding.
- [ ] Push the site branch, deploy the Vercel branch preview, and update only `meet-staging-mannan20.vercel.app`.
- [ ] Smoke the Worker authorization boundary, site home, and staged meeting route.
- [ ] Append exact commits, checks, deployments, limitations, and next ready work to the staging record and canonical handoff.
- [ ] Commit and push the release record, leaving both feature worktrees intact for the active goal.
