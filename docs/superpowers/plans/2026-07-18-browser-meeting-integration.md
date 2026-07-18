# Browser Meeting Integration Plan

> Execute in `/Users/manblack/Documents/mannan20/.worktrees/meeting-consent` on
> `feat/meeting-consent`. Keep the meeting Worker private. Do not deploy,
> provision D1, install/rotate secrets, mutate DNS, or send email.

**Goal:** Connect the completed site session and first-account consent flow to
the completed private meeting Worker through server-only Next.js routes, then
add a simple account/guest meeting entry and workspace shell.

**Boundary:** Browsers call only same-origin `mannan.is` routes. The site server
holds the Worker service secret, signs 60-second account assertions from the
active site session, and keeps access/guest credentials in secure HTTP-only
meeting-scoped cookies. Pending-consent sessions never become account actors.

## Task 1: Build the server-only Worker client

- Add strict configuration for `MEETING_WORKER_URL`,
  `MEETING_SERVICE_SECRET`, and `MEETING_ACCOUNT_ASSERTION_SECRET`.
- Sign the versioned method/path/body assertion used by the Worker.
- Forward only allowlisted headers, use bounded timeouts, parse stable response
  envelopes, and never log bodies, account IDs, cookies, assertions, or bearer
  credentials.
- Prove request binding, redacted failures, and fail-closed configuration with
  unit tests.

## Task 2: Add scoped admission and guest identity cookies

- Store the resolved access secret in a short-lived secure HTTP-only cookie
  scoped to `/meet/{meetingId}`.
- Store a signed temporary guest candidate with random participant/session IDs.
- Replace it after entry with the application-issued guest credential in a
  secure meeting-scoped cookie.
- Strictly validate meeting IDs, signatures, expiry, and cookie scope; add unit
  tests for tampering and cross-meeting reuse.

## Task 3: Add account meeting BFF routes

- Add same-origin handlers for create, workspace, access links, participants,
  and live-session operations.
- Require an active site session for account commands and derive the actor only
  from its stable account ID.
- Preserve `Idempotency-Key`, `If-Match`, `ETag`, stable status, and safe JSON
  responses while keeping Worker secrets server-only.

## Task 4: Add share-link and guest admission routes

- Resolve `/meet/j/{secret}` server-side, set the pending access cookie, and
  redirect to the clean canonical meeting path.
- Add same-origin guest-candidate and entry handlers.
- Prefer the active account session; otherwise require the signed candidate.
- Load guest workspaces with credential headers and clear revoked/invalid
  meeting cookies without leaking their values.

## Task 5: Add the meeting entry/workspace shell

- Add `/meet` account creation surface and `/meet/{meetingId}` lobby/workspace.
- Use the existing plain-language `Continue with email`, `Check your email`,
  and `Agree and continue` flow with the current path as `returnTo`.
- Keep guest entry to one display-name field and one Enter meeting action.
- Show schedule, current role, live state, and concise recoverable errors.

## Task 6: Verify the complete browser flow

- Unit-test every server boundary and cookie transition.
- Add Playwright coverage for returning account, first-account consent return,
  clean share-link handoff, guest entry, account precedence, and revoked access.
- Run unit tests, typecheck, Next build, focused desktop/mobile Playwright, and
  `git diff --check`.
- Record exact evidence and remaining production gates in the cross-repository
  design and handoff. No deployment is part of verification.
