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
