# Meeting staging release record

Date: 2026-07-18

## Outcome

The shared Continue-with-email identity, first-account consent fork, private
meeting Worker, and browser meeting shell are staged end to end. The identity
authority remains the existing Cloud Worker and its `users` table. An email
that already belongs to Cloud or another site feature resolves to the same
normalized row and stable 32-hex account ID.

Existing rows are `active` and skip first-account consent. Only a genuinely new
site-created `pending_consent` row is sent to the scroll-gated Terms and Privacy
review before activation and return-path continuation.

## External resources

- Shared identity D1: `cloud` (`6aac55fe-a879-40ea-891e-4723cdb60891`)
- Applied shared migration: `0003_account_identity_consent.sql`
- Identity Worker: `cloud-worker-identity-staging`
- Identity URL: `https://cloud-worker-identity-staging.mannanteam.workers.dev`
- Identity-only R2 buckets: `cloud-identity-staging-files`,
  `cloud-identity-staging-hans`, and `cloud-identity-staging-backups`
- Meeting D1: `meeting-platform-staging`
  (`cb39464c-14e1-4fb9-abf2-976ea5056ec0`)
- Applied meeting migration: `0001_meeting_application.sql`
- Meeting Worker: `meeting-platform-worker-staging`
- Meeting URL: `https://meeting-platform-worker-staging.mannanteam.workers.dev`
- Vercel branch: `feat/meeting-consent`
- Stable site alias: `https://meet-staging-mannan20.vercel.app`

Both Workers disable per-version preview URLs. The meeting Worker rejects
unauthenticated direct calls. Identity staging uses isolated empty file buckets
and cannot read production Cloud files.

## Secrets and delivery

All Worker secrets are stored in Cloudflare secret bindings. Matching site
secrets and URLs are scoped to Vercel Preview for `feat/meeting-consent`.
No secret value is in source control or this record.

The existing Resend sending key and verified `mannan.is` sender were reused. A
real `Continue to mannan.is` magic link was accepted for
`mannanjavid@protonmail.com`. The key is send-only, so outbound message content
cannot be retrieved through the management API. The remainder of the automated
smoke used a one-use token inserted only as its SHA-256 hash and consumed through
the ordinary verification endpoint.

## Verification evidence

- Identity Worker root: `200`
- Meeting Worker without service authorization: `401`
- Magic token verification: `302` to the exact staged callback
- Site callback: `307` to `/meet`
- Existing-account consent fork: `false`
- Active session email: `mannanjavid@protonmail.com`
- Meeting creation through the Next.js BFF: `201`
- Canonical meeting location validation: passed
- Account workspace render: `200`
- Shared D1 post-check: both `hello@mannan.is` and
  `mannanjavid@protonmail.com` are one `active` row each with a 32-character
  account ID
- Meeting D1 post-check: one version-1 `Staging identity smoke test` meeting
  exists with an owner participant

Vercel Standard Protection remains enabled. Automated checks use Vercel's
official protection-bypass mechanism; a human opening the preview must have
Vercel access or a Vercel share link. No production Vercel deployment, custom
domain, DNS change, or production meeting database was created.

## Remaining production gates

- Legal review of the Terms and Privacy drafts
- Production meeting D1 and Worker secrets
- Production Vercel meeting variables
- Observability/retention review and alerting
- Final human browser pass and production rollout authorization

## Pre-join frontend update — 2026-07-18

The authorized meeting workspace now opens a real provider-neutral device
setup instead of the media placeholder. It requests camera and microphone
independently, preserves partial success, previews local video, shows local
microphone activity, exposes device selection and accessible on/off controls,
and allows entry with either or both inputs disabled. Joining transitions to a
truthful local stage with one connected browser, device settings, and leave.
Leaving stops acquired tracks and returns to setup.

No audio or video leaves the browser in this slice. Remote participants,
published tracks, provider room credentials, reconnection, moderation, and
provider-confirmed attendance remain the next realtime integration boundary.

Implementation commits:

- `52c5015` — independent local media acquisition and cleanup
- `4168f8b` — selected-device replacement and React media lifecycle
- `4aea0cb` — local preview and accessible media controls
- `c9e188c` — responsive device pre-join room
- `37d0949` — truthful local joined stage and workspace integration
- `a3fd94f` — fake-media desktop/mobile browser acceptance

Fresh local evidence:

- Unit suite: 194 passed, 0 failed, 638 assertions
- TypeScript: passed
- Next.js 15.5.20 production build: passed
- Focused Playwright: 2 passed, 0 failed
- Inspected renders: desktop pre-join, desktop joined stage, and mobile
  pre-join; no clipping or overlap found
- `git diff --check`: passed

Staged release evidence:

- Vercel deployment: `dpl_GViLxAjPgW6o91n8zmdCb9zbQ4SA`
- Immutable preview:
  `https://mannan20-l5221kl4n-mannanjs-projects.vercel.app`
- Stable protected alias:
  `https://meet-staging-mannan20.vercel.app`
- Protected `/meet` smoke: `200`
- Protected latest staged meeting route smoke: `200`
- Latest staged meeting used for the route smoke:
  `meeting_00e21fc143c54f24960bf8bc659ec5af` (`Test`, scheduled)

The final hardware-permission acceptance remains a human browser action because
automated staging requests cannot operate the tester's physical camera or
microphone. The local browser suite uses Chromium's deterministic fake devices.

## Private invite update — 2026-07-18

Signed-in owners and moderators now see **Invite people** in the authorized
workspace header. Creating an invite uses the workspace's authoritative meeting
version, sends the existing BFF an exact quoted `If-Match`, expires the private
link when the scheduled meeting ends, and exposes the returned link only in
browser memory for immediate copying. Guests and ordinary participants do not
receive the control. The site does not log or persist the one-time secret.

Contract and implementation commits:

- Meeting repository `ab8b2b6` — expose the current aggregate version in the
  authorized workspace projection and assert it through Worker acceptance
- Site `a68d587` — validate the private invite request/response boundary
- Site `b176d21` — add the owner/moderator invite and signed-in browser flow

Fresh verification:

- Meeting repository: 27 domain, 105 application, 68 persistence, and 81
  Worker tests; all builds and typechecks passed
- Site repository: 197 tests, 0 failures, 647 assertions
- Site TypeScript and Next.js 15.5.20 production build: passed
- Signed-in fake-media Playwright: 2 passed; exact `If-Match`, idempotency key,
  expiry body, and copy-ready URL asserted
- `git diff --check`: passed in both repositories

Updated staging:

- Meeting Worker version:
  `c21c3f4b-d146-4438-8ac7-b3b5490c1f08`
- Vercel deployment: `dpl_HcjAUKJr9YYZTPPJFXWKDCJKzynv`
- Immutable preview:
  `https://mannan20-qpygbvspi-mannanjs-projects.vercel.app`
- Stable protected alias:
  `https://meet-staging-mannan20.vercel.app`
- Worker unauthenticated workspace smoke: `401`
- Protected meeting home and staged meeting route smokes: `200`, `200`

The meeting repository still has no Git remote, so `ab8b2b6` remains a local
commit even though its Worker artifact is deployed to staging.

## Authoritative live-room gate — 2026-07-18

The workspace now uses the meeting application's `serverNow` plus monotonic
browser elapsed time to decide whether live media is closed, scheduled, open,
live, or ended. Before the scheduled instant, ordinary participants see a
countdown and make no camera or microphone requests. The signed-in owner gets
one explicit **Start meeting early** action backed by the existing versioned
live-session command. At the scheduled instant the local device room opens
automatically. Ended or expired live sessions stop media and render a durable
ended-workspace state.

The lifecycle UI also hides the private-invite control after the meeting ends;
the current invite policy expires links at the scheduled end, so showing that
action afterward would create an already-dead link. Post-meeting additions can
receive a separately designed workspace-access expiry policy later.

Implementation commits:

- Meeting repository `9dd8a57` — expose the authoritative application-clock
  instant in the authorized workspace projection
- Site `8fd5fa4` — derive before-start/open/live/ended behavior from server time
  and monotonic elapsed time, failing closed for malformed state
- Site `e508ee0` — add the exact versioned owner early-start client
- Site `6eb95ee` — gate device acquisition, add the lifecycle UI, preserve
  version changes across invite/early-start controls, and cover desktop/mobile

Fresh verification:

- Meeting repository: 27 domain, 105 application, 68 persistence, and 81
  Worker tests; all builds/typechecks passed
- Site repository: 209 tests, 0 failures, 682 assertions
- Site TypeScript and Next.js 15.5.20 production build: passed
- Playwright: 3 passed, including zero media requests before start and after
  end, exact early-start headers/body, desktop stage, and mobile pre-join
- Original-resolution inspection: before-start desktop, ended desktop, and
  mobile pre-join showed no clipping, overlap, stale controls, or false media
  state
- `git diff --check`: passed in both repositories

Updated staging:

- Meeting Worker version:
  `0c41f389-d594-44ff-81e6-fe9f4b3f6b20`
- Vercel deployment: `dpl_6Awhc72AtijdfpBcoJYSkvmTSdhU`
- Immutable preview:
  `https://mannan20-or5z7rnyn-mannanjs-projects.vercel.app`
- Stable protected alias:
  `https://meet-staging-mannan20.vercel.app`
- Worker unauthenticated workspace smoke: `401`
- Protected meeting home and staged meeting route smokes: `200`, `200`

Cloudflare RealtimeKit remains the approved next provider behind the custom
stage. Official documentation still lists it as Beta and free during Beta, but
both available Cloudflare credentials returned `403` from the RealtimeKit Apps
API because they lack `Realtime` or `Realtime Admin`. No RealtimeKit App,
preset, room, participant, token, webhook, or media usage was created in this
release.

## Local RealtimeKit grant backend — not staged — 2026-07-18

The server-side media-grant path is now implemented and verified locally. It
reauthorizes the existing single account/guest meeting identity before every
grant, lazily reconciles provider rooms and participants through token-free D1
projection mappings, and returns only a no-store RealtimeKit browser token.
Unknown, removed, early, and ended actors make zero provider calls. Missing
provider configuration affects only the media-grant endpoint.

Meeting repository commits:

- `1bc0992` — first-party account/guest media authorization
- `b28d791` — provider-neutral grant coordinator and race cleanup
- `685b2c0` — bounded, redacted injected-fetch RealtimeKit adapter
- `90c7076` — local `0002` media projection migration and strict D1 store
- `29306ba` — authorize-first Worker media-grant route and optional bindings

Release-grade local evidence under Node 22.22.0:

- 27 domain tests
- 110 application tests
- 75 real-D1 persistence tests
- 93 Worker tests
- 6 provider-neutral coordinator tests
- 10 exact RealtimeKit HTTP/redaction tests
- all package builds and typechecks passed
- Wrangler generated bindings are current
- `git diff --check` passed
- secret/token audit found no RealtimeKit credential value, D1 token column,
  log payload, or raw provider error detail

External staging state is unchanged. Migration `0002_meeting_media.sql` was not
applied remotely, no new Worker version or Vercel deployment was published,
and no RealtimeKit secret, App, preset, room, participant, or token was created.
The latest staged Worker remains version
`0c41f389-d594-44ff-81e6-fe9f4b3f6b20`.

Live staging requires a Cloudflare credential with `Realtime` or `Realtime
Admin`, then a dedicated staging App and host/participant presets. Only after
those exist should `0002` be applied, non-secret IDs/presets and the API-token
secret be installed, the Worker be deployed, and two-browser media acceptance
begin.

## RealtimeKit browser stage — locally verified, not staged — 2026-07-18

The protected meeting workspace now has a complete provider-backed browser
path behind the existing custom interface. The same-origin BFF derives the
display name from the signed shared account session or signed guest cookie,
requests a no-store grant, and passes the bearer token only through in-memory
controller and SDK inputs. The browser never chooses its provider identity.

Browser-stage commits:

- `2dc112f` — identity-derived account and guest media-grant BFF
- `c8299dc` — strict grant client and provider-neutral room controller
- `07697f2` — pinned `@cloudflare/realtimekit` 2.0.1 Core SDK adapter
- `cff3da0` — pre-join to provider-room lifecycle and retry/cleanup
- `a60a9c0` — local/remote participant stage, People rail, and live controls
- the documentation/acceptance commit containing this section — injected
  fake-SDK desktop/mobile acceptance and release evidence

Fresh release-grade evidence:

- Unit suite: 245 passed, 0 failed, 828 assertions across 42 files
- TypeScript: passed
- Next.js 15.5.20 production build: passed
- Playwright Chromium: 3 passed, 0 failed in 5.9 seconds
- Browser acceptance covers connecting, one- and two-person stages, remote
  join and camera updates, reconnect recovery, local controls, UI leave,
  navigation cleanup, and exactly one grant per join
- Token-sink acceptance found no fixture token in the page URL, DOM,
  `localStorage`, `sessionStorage`, console messages, or uncaught errors
- Source audit found `authToken` only in strict parsing, in-memory handoff, and
  explicit tests; it found no storage, URL, analytics, DOM, or console sink
- `git diff --check`: passed
- Original-resolution inspection passed for
  `meeting-connected-desktop.png`, `meeting-two-party-desktop.png`, and
  `meeting-two-party-mobile.png`; no clipping, overflow, overlap, or false
  participant state was observed

External staging is deliberately unchanged. The stable protected alias still
points to the last Worker-compatible frontend. Publishing this browser stage
alone would expose a Join action that can only fail against the older Worker.

Live RealtimeKit staging remains blocked on a Cloudflare credential with
`Realtime` or `Realtime Admin`. That credential is required to create the
RealtimeKit App and presets, apply remote migration
`0002_meeting_media.sql`, install the Worker configuration and secret, deploy
the Worker and browser stage together, and complete live two-browser media
acceptance. No RealtimeKit resource, token, media usage, migration, Worker
version, Vercel deployment, or stable-alias change was made in this checkpoint.

## Participant moderation and provider ejection — locally verified, not staged — 2026-07-19

The authorized workspace now projects its current first-party roster before,
during, and after live media. The reusable People panel uses safe account and
guest labels, correlates provider presence only through validated first-party
participant IDs, keeps the owner immutable, and exposes removal only to owners
and moderators. Removal requires an inline confirmation and retains one
idempotency key across a dependency retry. The roster changes only after the
first-party membership closure and provider cleanup both confirm; a version
conflict reloads the authoritative workspace.

The Worker now closes the first-party membership before provider cleanup,
retries mapped RealtimeKit ejection through the same command receipt, and
returns a stable dependency error while cleanup remains incomplete. A second
authorization check after provider grant provisioning closes the concurrent
grant/removal race and ejects any newly invalid participant without returning a
browser token. Conditional D1 cleanup cannot erase a newer mapping winner.

Meeting repository commits:

- `a860339` — safe current-roster workspace projection
- `6eec46a` — mapped participant ejection and compare-delete cleanup
- `77b06de` — lazy Worker/provider ejection composition
- `443d077` — retryable removal ordering and grant-race enforcement
- `092b616` — verified Task 5–6 execution checkpoint

Site commits:

- `fbb0fde` — strict same-origin removal client and first-party SDK IDs
- `89fc951` — reusable People panel and moderation state flow
- the documentation/acceptance commit containing this section — desktop/mobile
  moderation acceptance and the observed narrow-rail overlap fix

Fresh release-grade evidence:

- Meeting monorepo under Node 22.21.1: all builds and typechecks passed; 333
  tests passed across domain (27), room provider (12), application (111),
  RealtimeKit provider (11), real-D1 persistence (76), and Worker (96)
- Wrangler Worker bindings: current
- Site unit suite: 264 passed, 0 failed, 886 assertions across 45 files
- Site TypeScript and Next.js 15.5.20 production build: passed
- Playwright Chromium: 3 passed, 0 failed in 7.3 seconds
- Browser acceptance proves an empty DELETE body, exact quoted `If-Match`, one
  stable retry key across a first `503` then success, no premature roster
  removal, provider-left connected-count reconciliation, `409` workspace reload,
  participant-role action hiding, and 390x844 no-horizontal-overflow behavior
- Original-resolution inspection passed
  `meeting-moderation-confirm-desktop.png`,
  `meeting-moderation-complete-desktop.png`, and
  `meeting-moderation-mobile.png`. The first desktop inspection exposed a real
  status/action collision; a failing bounding-box assertion reproduced it, and
  the verified row-layout fix removed the overlap.
- Source audits found only binding/config names, provider method names,
  memory-only token handoff, and explicit fixtures—no provider body, credential
  value, token storage, URL, DOM, analytics, exception, or console sink
- `git diff --check`: passed in both repositories

External staging remains deliberately unchanged. Migration
`0002_meeting_media.sql` is not applied remotely, the Worker and browser commits
are not deployed, and the protected stable alias still points to the last
Worker-compatible release. Publishing only one side would expose an incomplete
media/moderation path.

Live staging still requires a Cloudflare credential with `Realtime` or
`Realtime Admin` to create the App and presets, install the configuration and
secret, apply migration `0002`, deploy the Worker and site together, and run
live two-browser acceptance. Webhook-confirmed ejection, durable provider
reconciliation, and a moderation audit-event expansion remain explicitly
deferred to subsequent slices. No RealtimeKit resource, remote migration,
Worker version, Vercel deployment, stable-alias change, or media usage was
created in this checkpoint.
