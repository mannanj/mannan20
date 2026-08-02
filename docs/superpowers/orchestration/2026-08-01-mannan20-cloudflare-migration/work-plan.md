---
project:
  id: mannan20-cloudflare-migration
  revision: 9
  status: ACTIVE
  final_goal: Run mannan.is and its first-party application state on Cloudflare without a Vercel runtime, Vercel telemetry, or Upstash dependency, while preserving intentional external providers and proven rollback paths.
  complete_when: [architecture, runtime-parity, state-cutover, internal-bindings, r2-boundary, dns-cutover, decommission, final-check]

constraints:
  hard_invariants:
    - Plan 006 remains the authority for the public/private R2 boundary; this migration may not bypass or silently absorb any of its production Gates A-H.
    - Existing public R2 media and the MCP exact-six-file allowlist remain public; authenticated `general/*` must move only under Plan 006.
    - Stripe, Resend, OpenRouter, YouTube, Turnstile, and the domain registrar are intentional external providers unless separately re-scoped.
    - A Cloudflare migration must preserve site behavior, security boundaries, URLs, cookies, email flows, payments, downloads, and real leaderboard data.
    - No secret, private object name, user email, IP address, magic link, cookie, or production payload may enter Git, logs, fixtures, or migration evidence.
    - Production traffic, DNS, state, bucket, secret, deployment, and provider changes require an explicit named gate; repository-only work remains reversible and autonomous.
    - Do not run `next build` in the main worktree while the port-3847 dev server is running; use an isolated worktree for migration builds.
    - Preserve disabled `_jordan` routes and do not migrate their dormant Upstash data unless revival is separately approved.
  protected_changes: At execution authorization on 2026-08-01, main was 2c43676 with 41 porcelain entries and status hash 7f97beaadd20de462196ef8655a2a40ea2ac174dfc3a043c4882b5fe5ef26ee8; commits 7462c70 and 2c43676 added protected task-281 design/plan work after the original strategy snapshot. All remaining pre-existing changes are user-owned.
  authority: On 2026-08-01 the user explicitly authorized the full migration, including production deployments, DNS changes, state copies/writes, cutover, rollback, provider cleanup, commits, and pushes required to complete it; keep named gates as verification boundaries rather than new approval stops.
  user_only_stops: [unavailable credentials/login/MFA, new paid-plan or material spend change, irreversible ambiguity beyond the approved migration, legal/personal consequence, material product-scope change]
  budgets: No spend cap supplied; obtain approval before enabling a paid Cloudflare product or exceeding an existing plan.

milestones:
  - id: architecture
    priority: 1
    depends_on: []
    state: PROVEN
    acceptance: The repository-native plan reconciles current code, current Cloudflare documentation, Plan 006, rollback dimensions, and two independent reviews with no unresolved material finding.
    evidence: This file plus repository evidence at 71c04d1 and the review records appended below.
    review_level: TWO_REVIEWS
    review_route: MIXED
    review_status: RECONCILED
    blocker: null
  - id: runtime-parity
    priority: 2
    depends_on: [architecture]
    state: PROVEN
    acceptance: An isolated branch builds and previews the current Next.js app through OpenNext/workerd; focused unit, route, asset, middleware, image, and Playwright parity checks pass without production traffic or state mutation.
    evidence: docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/runtime-parity-evidence.md plus implementation commit
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: RECONCILED
    blocker: null
  - id: state-cutover
    priority: 3
    depends_on: [runtime-parity]
    state: ACTIVE
    acceptance: Leaderboard, feedback, view counters, magic tokens, and rate limits use Cloudflare-owned state with verified import or expiry, shadow comparison, idempotent writes, rollback coverage, and no live request requiring Upstash.
    evidence: docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/state-cutover-evidence.md
    review_level: TWO_REVIEWS
    review_route: MIXED
    review_status: RECONCILED
    blocker: Authoritative apex traffic now reaches the Cloudflare site Worker and its service-bound state path; keep this milestone active through the bounded production observation window before removing rollback adapters or legacy dependencies.
  - id: internal-bindings
    priority: 4
    depends_on: [runtime-parity, state-cutover]
    state: PROVEN
    acceptance: The Cloudflare-hosted site reaches first-party Workers through explicit service bindings where the caller is server-side; public HTTP remains only where browser or external-client access is intentional.
    evidence: Preview and production deploy binding receipts plus state-cutover-evidence.md; service-bound site leaderboard returned 200 after obsolete URL-independent secrets were removed.
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: RECONCILED
    blocker: null
  - id: dns-cutover
    priority: 6
    depends_on: [internal-bindings, r2-boundary]
    state: ACTIVE
    acceptance: Cloudflare zone eligibility is proven, all DNS records are reconciled, a non-production hostname passes production-shaped smoke tests, and apex/www traffic is cut over with a timed Vercel rollback drill and no DNS/email regression.
    evidence: Active full-zone receipt; .is parent and multi-resolver Cloudflare delegation; authoritative Proton MX/SPF/DMARC/DKIM comparison; live Worker route table; deployment 2ebb0a6a-f3d4-439c-bb99-d4edf70f1380; HTTPS/canonical/static/API smoke matrix; revision 8 independent reviews.
    review_level: TWO_REVIEWS
    review_route: MIXED
    review_status: RECONCILED
    blocker: The bounded rollback-friendly Worker Route cutover is accepted, but the milestone remains open for the observation window, a tested rollback drill, safe Stripe validation, actual mail send/receive proof, DNSSEC enablement, Plan 006 closure, and final Worker Custom Domain conversion.
  - id: decommission
    priority: 7
    depends_on: [dns-cutover]
    state: PENDING
    acceptance: After the observation window, Vercel runtime/project integrations, Vercel telemetry packages, Upstash credentials/dependencies, temporary public migration endpoints, and obsolete keep-alive configuration are removed without removing intentional external providers.
    evidence: null
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: NOT_STARTED
    blocker: null
  - id: final-check
    priority: 8
    depends_on: [decommission]
    state: PENDING
    acceptance: Repository, provider, DNS, synthetic and production smoke evidence proves every final milestone; no legacy runtime/state dependency, temporary credential, stale documentation, or unverified rollback claim remains.
    evidence: null
    review_level: TWO_REVIEWS
    review_route: MIXED
    review_status: NOT_STARTED
    blocker: null

  - id: r2-boundary
    priority: 5
    depends_on: []
    state: ACTIVE
    acceptance: Plan 006 is independently PROVEN through its production Gates E-H and done criteria; no public `general/*` original or temporary migration surface remains.
    evidence: plans/006-private-r2-storage-boundary.md plus its separately authorized private operations evidence; exact-limiter deployments 2a094a28-821a-4e21-a4c9-1aeb218b90eb and 9ab1a0ca-ef08-4b04-b199-75f72617ecd6; controlled review report 20260802T150000Z-52163-plan006-files-limiter-approval-followup.
    review_level: TWO_REVIEWS
    review_route: MIXED
    review_status: IN_PROGRESS
    blocker: Private cutover, deletion, and canary cleanup are complete. Native-only authority was replaced by an independently approved and deployed exact DO guard; closure now requires explicit permission to use an authenticated browser session for the 121-request production 429/Retry-After proof.

next_task:
  milestone: dns-cutover
  id: observe-worker-route-cutover
  task: Observe the accepted Worker Route cutover while Vercel remains available; close Plan 006, validate Stripe without a charge, prove real mail send/receive, rehearse rollback, then replace the temporary origin-preserving routes with the final Worker Custom Domain and enable Cloudflare DNSSEC.
  expected_evidence: Stable production telemetry and smoke matrix; Plan 006 completion receipt; no-charge Stripe validation; mail send/receive proof; timed route rollback/restore receipt; final Custom Domain/certificate/DNS evidence; signed multi-resolver DNSSEC resolution.
  workspace: /Users/manblack/Documents/mannan20-cloudflare on feat/cloudflare-full-migration; protected main remains untouched.
  attempt: 1
  last_failure: null
  updated_at: "2026-08-02T15:03:00Z"
---

# Mannan20: Vercel/Upstash to Cloudflare migration

## Outcome and boundary

The target is a Cloudflare-hosted Next.js application on Workers through the OpenNext adapter, with first-party state on Cloudflare and private Worker-to-Worker calls on service bindings. It is not a mandate to replace services Cloudflare does not own or that the site deliberately chose: Stripe remains payment infrastructure, Resend remains email delivery, OpenRouter remains model access, Turnstile remains Cloudflare's browser-facing challenge, and the `.is` registrar can remain external.

“Fully Cloudflare” therefore means:

- no production request is served by Vercel;
- no application telemetry component depends on Vercel;
- no live state or rate limit depends on Upstash;
- Cloudflare Workers, Static Assets, R2, D1, SQLite Durable Objects, native rate-limit bindings, service bindings, observability, Web Analytics, and DNS are used where their semantics fit;
- external providers are named, bounded, and reached directly from a Worker only when required.

### Execution authorization

On 2026-08-01 the user directed the coordinator to execute the whole migration immediately and explicitly accepted temporary site downtime and production rollback risk. This authorizes the repository, Cloudflare, Vercel, Upstash, DNS, state-migration, deployment, cleanup, commit, and push operations described by this plan. Named gates remain mandatory evidence/rollback checkpoints but no longer require another routine approval. New paid-plan spend, unavailable login/MFA, credentials the coordinator cannot safely access, or a materially different product direction still stop execution.

## Recovered evidence

### Git and work ownership

- Repository: `/Users/manblack/Documents/mannan20`
- Branch/HEAD: `main` at `71c04d1406e6ef0a2ae65e53c86dbe844283e880`, equal to local `origin/main` at recovery.
- Dirty state: 41 entries, SHA-256 of `git status --porcelain=v1` equal to `0775da61fad381f2577bc1189bd466bd1c1e852cf799e5aa4e0c214229f20206` before this plan was added.
- The dirty tree includes the completed repository phase of security Plan 006, unrelated content/security work, and untracked task 281. Nothing in that snapshot may be reverted, reformatted, staged, or folded into migration commits by assumption.
- Port 3847 had no listener at recovery. Future executors must check again rather than rely on this observation.

### Runtime and integrations

- Root `package.json` is Next.js 15.5.20, React 19, TypeScript 5.8, Bun, and presently has Vercel Analytics/Speed Insights plus Upstash Redis/rate-limit dependencies.
- `vercel.json` contains one daily `/api/keep-alive` cron whose only purpose is an Upstash write.
- `src/middleware.ts` records visits by sending authenticated public HTTP to `visits-worker` and forwarding a Vercel-derived client IP header.
- `src/lib/cloudflare-auth.ts` sends authenticated public HTTP to `cloud-worker` for site magic-link request/exchange.
- Browser code calls the Turnstile verification Worker directly; MCP and public R2 media are intentionally public and are not service-binding candidates.
- Four first-party Workers already exist: `cloud-worker`, `visits-worker`, `mcp-worker`, and `turnstile-worker`. Existing Cloudflare bindings include D1, R2, native rate limiting, and observability.
- All 96 tracked files under `public/` are below Workers Static Assets' 25 MiB per-file limit; the directory is about 332 MiB. Several audio chunks are 10–23 MiB, so the individual-file limit must remain a build gate.
- The app exports Edge runtime for four generated social-image routes. Do not preemptively remove those declarations; prove current adapter behavior in the workerd preview and change only if the pinned adapter requires it.

### Upstash state inventory

Active code uses Upstash for:

| State | Current semantics | Cloudflare target | Migration treatment |
|---|---|---|---|
| Chicken leaderboards and owner/name/email indexes | sorted sets, hashes, conditional claims, Lua rename/merge transactions | one SQLite-backed Durable Object class behind a dedicated state Worker | schema + semantic contract tests, redacted export/import, dual-write with operation IDs, shadow reads, then DO-primary |
| One-time leaderboard magic tokens | atomic `GETDEL`, 15-minute TTL | same Durable Object | never duplicate a token across stores; route legacy/unversioned tokens only to Upstash for one drain TTL and new versioned tokens only to DO |
| Chicken feedback queue | capped newest-first list | same Durable Object | backfill ordered records without recording payloads in evidence; dual-write with dedupe IDs |
| Garden view counters | atomic increments and reads | same state Worker, initially a sharded or singleton SQLite Durable Object selected by measured load | snapshot counts, dual-increment with idempotency keys, compare monotonic totals; never reset public counts |
| Security/resource limits: download 10/60s, leaderboard 6/60s, magic email 3/900s, feedback 4/600s, contact intent/validation 10/3600s | globally shared sliding-window Redis keys | exact sliding-window counters in a dedicated rate-limit DO; optional native 10/60-second binding as a coarse first shield only | no historical import; run old and new exact decisions in shadow, then switch authority without weakening the published policy |
| Garden-view limit 20/60s | best-effort abuse guard around a non-sensitive counter | native rate-limit binding, explicitly accepting per-location/approximate behavior | no historical import; cross-colo burst test and fail-safe counter behavior |
| Disabled `_jordan` state | Redis lists, strings, pipelines | none | exclude; the routes remain unroutable and revival is separate scope |
| `/api/keep-alive` sentinel | daily Redis write | none | delete only after Upstash is out of the live path; do not replace with a Cloudflare cron |

The state Worker starts with an authenticated HTTP interface because the Vercel-hosted app cannot use a Cloudflare binding. Once the site runs on Workers, the same contract is invoked by a service binding. The HTTP interface must be disabled or made unreachable after the Vercel rollback window closes.

## Target architecture

```text
Browser / agent
  |
  +-- mannan.is, www.mannan.is
  |     Cloudflare DNS + Worker Custom Domain
  |       -> OpenNext site Worker
  |            +-- Static Assets binding
  |            +-- service binding -> visits-worker -> visits D1
  |            +-- service binding -> cloud-worker -> cloud D1 + R2
  |            +-- service binding -> portfolio-state-worker
  |            |                         -> SQLite Durable Object(s)
  |            |                         -> native rate-limit bindings
  |            +-- direct HTTPS -> Stripe / Resend / OpenRouter
  |
  +-- intentional public endpoints
        +-- turnstile-siteverify Worker (browser call)
        +-- MCP Worker (external clients)
        +-- public R2 media and exact-six downloads
        +-- cloud file UI until/unless separately placed on a custom hostname
```

### Decisions

1. **Workers + OpenNext, not Pages.** Current Cloudflare documentation supports App Router, route handlers, RSC, SSR, SSG, middleware, streaming, and ISR through `@opennextjs/cloudflare`. The production runtime is workerd; `next dev` remains the fast developer loop, while OpenNext preview is the parity gate.
2. **Explicit checked-in configuration.** Do not rely on Wrangler's zero-config deployment for production. Commit a root `wrangler.jsonc`, `open-next.config.ts`, generated binding types, pinned dependencies, scripts, and environment-specific bindings so review and rollback are deterministic.
3. **Static Assets for tracked `public/`, R2 for existing large/public media.** Preserve existing public R2 URLs. Gate every build on zero static files over 25 MiB and record file count; do not assume total directory size alone proves uploadability.
4. **SQLite Durable Objects for Redis' atomic domain state.** The leaderboard's conditional ownership, one-time tokens, rename/merge transaction, ordered score writes, and capped feedback queue need one serialized consistency boundary. D1 is retained for existing relational worker data, not forced into a Redis-shaped transactional role.
5. **Exact DO limits where semantics matter; native bindings only where approximation is acceptable.** Cloudflare's native binding supports 10- or 60-second periods, is per-location, intentionally permissive, and eventually consistent. It therefore cannot replace the site's 10/15/60-minute global sliding windows or security/resource policies by configuration alone. A rate-limit DO preserves exact rolling-window semantics for download, leaderboard, magic email, feedback, contact intent, and contact validation; an optional native binding may shed obvious bursts before the exact check. Only the low-consequence garden-view guard uses the native binding as authority. Missing exact-limit dependencies fail closed on protected/resource routes.
6. **Service bindings for server-side first-party calls.** Site-to-visits, site-to-cloud-auth/files, and site-to-state calls use service bindings after Cloudflare cutover. Browser-to-Turnstile, external-to-MCP, and public R2 fetches remain public by design.
7. **No replacement cron for keep-alive.** Remove the endpoint and `vercel.json` after Upstash retirement. Add a Cloudflare Cron Trigger only if a separate real scheduled responsibility is proven.
8. **Separate rollback axes.** Runtime rollback and state rollback are not the same operation. After state becomes DO-primary, a Vercel rollback continues calling the authenticated state Worker; it does not silently restore stale Upstash reads. Worker code-version rollback also does not restore DO storage.
9. **DNS before origin cutover, when possible.** First onboard and reconcile the Cloudflare zone while Vercel remains the origin. Only after DNS/email correctness is proven does a later gate attach the Worker custom domain. Unsupported Cloudflare Registrar transfer is not the same as unsupported Cloudflare authoritative DNS.

## Execution phases and gates

### Phase 0 — reconcile and prove prerequisites

Repository-only:

- Finish and safely integrate or explicitly snapshot the current Plan 006 and task-281 work before creating a migration implementation worktree.
- Create an isolated branch/worktree from the user-approved base. Never build the migration in the dirty main worktree.
- Inventory all routes, environment variable names, outbound calls, static files, cookies, redirects/rewrites, cache behavior, headers, and provider dependencies into tests or a redacted evidence record.
- Add a route-and-behavior parity matrix covering homepage, garden, episodes, payments, public downloads, auth, contact, game APIs, generated images, sitemap/robots, civics static rewrite, `/cloud` and `/vision` redirects, middleware visits, and degraded provider states.
- Build a complete preview/production configuration matrix: Worker names/accounts, assets, non-secret vars, required secret names, service targets, DO instance routing, D1, R2, rate-limit bindings, Images choice, routes/custom domains, `workers_dev`, observability, and callback/return URLs. Named-environment bindings and secrets do not inherit; type-generate and schema-validate each environment.
- Prove every service-bound Worker is in the same Cloudflare account. Record exact provider identifiers and version IDs only in a private operations ledger; tracked evidence contains a timestamp and non-sensitive digest/receipt reference.
- Reconcile the repository's claim that `.is` is unsupported with live Cloudflare zone onboarding evidence. Treat that prose as an unverified historical claim: registrar TLD support, authoritative DNS support, and Worker Custom Domain eligibility are distinct questions.

**Gate 0A — account and zone evidence (read-only/login approval):** confirm the active Cloudflare plan; Workers code and Static Assets limits; Durable Objects, Queues if proposed, Images, and R2 availability/cost class; same-account service-binding eligibility; existing resource names; jurisdiction choices; and whether `mannan.is` can be added as an active Cloudflare zone. Record states only, never credentials or private operational identifiers.

**STOP:** If Cloudflare cannot activate the `.is` zone, keep the Worker migration viable on a preview hostname but mark apex cutover blocked. Do not infer that Registrar TLD support controls DNS support; capture the provider's actual error and choose a separately approved DNS alternative.

### Phase 1 — OpenNext runtime parity, no production traffic

Repository-only:

- Test a candidate exact `@opennextjs/cloudflare`/Wrangler/Next.js compatibility tuple, then pin it in Bun's lockfile. Do not promise a version from stale documentation; record the passing tuple and upstream compatibility evidence.
- Create the new site Worker explicitly as root-level `mannan20-site` with root `wrangler.jsonc` and `open-next.config.ts`; keep the four existing Worker projects separate. Add `nodejs_compat`, Static Assets, an explicitly chosen candidate compatibility date, and separate complete preview/production configuration. Freeze the same date that passed preview.
- Add `cf:build`, `cf:preview`, `cf:typegen`, and dry-run/upload scripts that cannot deploy accidentally under ordinary verification commands.
- Keep `next dev` for development; add workerd preview as a required integration gate.
- Decide caching from measured use. This repository currently shows no on-demand `revalidatePath`, `revalidateTag`, or `unstable_cache` calls. Start without optional R2/D1/DO ISR cache infrastructure unless the built route manifest proves it is required. If enabled later, provision a dedicated cache bucket/database/queue; never reuse content buckets or application D1.
- Replace or conditionally disable Vercel Analytics/Speed Insights only after Cloudflare Web Analytics and Workers Observability acceptance is defined. Avoid double-counting during overlap.
- Define a privacy-safe logging policy before enabling the site Worker's invocation logs. Inventory every callback/link/query/path that can carry a code. Either remove secrets from logged URLs or disable invocation logs on affected Workers; use allowlisted structured events with sampling and retention. Synthetic sentinels must prove URLs, authorization/cookie headers, bodies, email, IP, magic codes, and tokens do not enter persisted or live telemetry.
- Inventory actual `next/image` use and choose one: an approved Cloudflare Images binding under a spend gate, a constrained custom loader, or deliberately unoptimized images. Test remote R2 source restrictions, cache behavior, and per-environment bindings.
- Test all large assets and social-image routes in workerd, including response size, content type, caching, and external R2 image fetches. Use the actual Wrangler upload/dry-run result for code-bundle and asset feasibility; current Cloudflare limits treat Worker code and Static Assets separately, so do not invent an aggregate 100 MiB ceiling.
- Explicitly prove that every auth/session/private/dynamic route, every response with `Set-Cookie`, and every Plan 006 protected response bypasses OpenNext/edge caching. Preserve existing security headers during migration; any broader CSP/HSTS remediation discovered here is a separate written plan, not opportunistic scope.

Acceptance evidence:

- clean isolated `bun install --frozen-lockfile`, typecheck, root unit tests, MCP drift/tests, worker tests, OpenNext build, Wrangler dry-run, per-environment schema/type checks, workerd preview, focused Playwright, cache/privacy-sentinel checks, static asset count/max-size checks, bundle/CPU-limit inspection, and redacted secret scan;
- no production deploy, resource, secret, or DNS mutation.

### Phase 2 — deploy a production-shaped preview

**Gate 2A — preview resources and secrets:** authorize creation/use of dedicated preview Worker resources and setting secret names through Cloudflare's secret store. Preview must not bind production state for writes.

- Deploy a versioned preview Worker or non-production environment to `workers.dev` first.
- Use synthetic D1/DO/R2 fixtures and provider test/mocked modes. Never send real Stripe charges, real contact email, production magic links, or private R2 objects.
- Run the parity matrix from at least one real browser and one non-browser HTTP client. Verify workerd headers, cookies, redirects, middleware, image generation, streaming, error behavior, and asset delivery.
- Record Worker version ID, config hash, test commit, timestamps, and redacted results.

Rollback: delete or disable only the preview trigger/version after approval; production remains on Vercel.

### Phase 3 — Cloudflare state service and Upstash exit

Repository-only first:

- Define a narrow versioned state API and SQLite Durable Object schema. Every mutation carries an operation ID and is idempotent.
- Pin the object topology before schema work: all leaderboard boards, ownership/name/email indexes, identity merges, rename chains, magic tokens, and feedback live in one stable `portfolio-state-v1` instance so their transactions share one database; garden counters use stable per-slug instances; exact rate limits use a fixed, load-tested number of stable policy+hash-shard instances with per-subject rows. Export/import/recovery tooling enumerates each known object route explicitly.
- Choose the DO lifecycle model and jurisdiction before creating production IDs. Document that code rollback cannot cross an incompatible class lifecycle change and does not roll back storage. Build repository-only synthetic export/restore tests; the real PITR/bookmark rehearsal occurs only on an isolated remote preview object after Gate 3A and before any backfill or DO-primary decision.
- Port Redis Lua semantics into transactional SQL tests: name claim, score insertion/cap, email/device merge, rename chains, one-time token consume, feedback cap, and view increments.
- Add a Vercel-compatible authenticated HTTPS adapter and typed `WorkerEntrypoint` RPC methods for the Cloudflare service-binding adapter behind one application interface. Public HTTP always requires cryptographic authentication; internal RPC is authorized by the same-account binding capability. Never treat a caller-chosen header as proof of a binding. Validate request body size, method, timestamp/replay protection or equivalent, caller authorization, and safe errors.
- Treat client IPs/emails as sensitive. Logs use irreversible/redacted identifiers and bounded retention.
- Add export/import tooling that reads credentials only from ignored local/provider secret stores and writes no production payload to the repository. Evidence contains counts, schema version, aggregate checks, and keyed/redacted digests only.
- Prohibit in-memory success fallbacks in production after state cutover. Define fail-closed mutations, bounded/stale read behavior where safe, retry/backoff, overload responses, and monotonic counter behavior. Test concurrency, version skew, DO timeout/overload, and cross-colo callers.
- Bound rate-limit storage and attacker-controlled cardinality: store only timestamps inside the maximum active policy window; delete expired subject rows on access plus scheduled compaction alarms; cap rows/bytes per shard with a fail-closed overload response; place an optional native coarse limiter before the exact DO; and define cardinality, cleanup, overload, shard-hotspot, and monthly cost projections at current and adversarial traffic in Gates 0A/3A.

**Gate 3A — create preview/production state resources:** authorize Durable Object namespaces/migrations, any optional Queue and its spend, state Worker deployment, and secrets. Allocate unique account-scoped numeric native rate-limit namespace IDs only for policies that use them; these IDs are configuration keys, not dashboard resources. Deploy the downstream state Worker before any caller service binding. On an isolated preview object, rehearse PITR/bookmark restore and redacted export/restore, prove no production object is targeted, and record the private receipt before Gate 3B.

**Gate 3B — non-destructive backfill:** freeze only operations that cannot be replayed safely, snapshot Upstash, import into DO, and compare:

- leaderboard entries and score ordering per board;
- owner/name/email relationship counts and referential invariants;
- feedback count/order up to the configured cap;
- garden counts per public slug;
- no private values in evidence.

Do not migrate transient rate-limit keys. Do not copy disabled `_jordan` keys.

**Gate 3C — shadow and dual-write:** keep Upstash authoritative while reading/comparing DO in the background. Then dual-write idempotently and require zero unexplained divergence across an agreed traffic/event window.

One migration coordinator generates the operation ID before either write. The DO owns a unique operation ledger. Every Upstash mutation during either authority state—Upstash-primary or DO-primary mirror—uses an atomic Lua transaction that claims the same operation ID and performs the score/feedback/view mutation together. Both dedupe ledgers live for at least the full mirror, repair, and rollback window. The primary also durably records mirror intent before acknowledging the user. Define write order, acknowledgement boundary, timeout ambiguity, bounded retry/outbox behavior, dead-letter/stop thresholds, and authority switching. If a Cloudflare Queue carries repair events, its at-least-once delivery is covered by the same dedupe contract and its cost requires Gate 3A approval. Run the fault-injection matrix in both authority directions, stopping after every primary write, mirror write, journal update, and response boundary to prove retries cannot duplicate a random-member score, feedback entry, or view increment.

A write is successful to the user only under the explicitly named primary's durability rule; an unrepairable mirror failure stops the gate.

One-time token rule: never write the same token into two independently consumable stores. At a recorded issuance cutover, new tokens receive a DO provenance/version prefix and exist only in DO. Legacy/unversioned tokens exist only in Upstash and redeem only through Upstash for one 15-minute drain TTL. The application routes redemption by provenance; it never races both stores or retries a consumed token against the other authority. After the drain timestamp, the legacy route is disabled. Test cutover and runtime rollback on both sides of the drain and prove no authority switch can make a consumed token valid again.

Rate-limit rule: shadow the old Upstash decision against the exact rate-limit DO for every protected policy. Acceptance is the same configured rolling window, key derivation, `429`, `Retry-After`, and fail-closed behavior under cross-colo traffic. The garden-view-only native limiter is tested for its deliberately accepted approximate/local behavior. Existing `cloud-worker` limiters remain defense in depth and are not confused with the site's public-download limiter.

**Gate 3D — DO-primary:** change reads and writes to DO-primary while retaining Upstash mirror/rollback only for the observation window. Prove real leaderboard submission/claim/rename/magic-link, feedback, and garden view behavior without altering existing scores or identities.

Rollback:

- before DO-primary: repair/re-import and continue Upstash-primary;
- after DO-primary while dual-write is healthy: choose an explicit consistency point and return to Upstash-primary;
- after Upstash mirror stops: runtime may roll back to Vercel, but state stays DO-primary through authenticated HTTPS. Never point users at stale Upstash.

### Phase 4 — internal service bindings and Vercel-specific cleanup

Repository-only first:

- Add typed service-binding RPC from the site Worker to `visits-worker`, `cloud-worker`, and the state Worker. Keep separately authenticated public URL adapters only for local development and time-bounded Vercel rollback; a public route never trusts an internal-marker header.
- Refactor visit attribution so the site Worker extracts Cloudflare's verified request metadata and passes only the required normalized value through typed RPC. The legacy Vercel HTTP path continues to require its bearer secret and validates the forwarded IP under its existing contract until retired. Spoof tests cover both paths.
- Use bindings for cloud auth request/exchange and protected download proxying. Deploy backward-compatible downstream changes before caller changes.
- Keep Turnstile Worker browser-facing, MCP public, and public R2 direct paths unchanged.
- Before cutover, replace Turnstile's production `ALLOWED_ORIGIN="*"` with explicit preview/production origins and configure/verify expected hostname and action checks. Use test keys in preview; prove replay/single-use behavior and the final apex/www widget hostname.
- Audit every Worker binding for least privilege. Remove an apparently unused binding, such as visits-worker's public R2 binding, only if code search/tests prove it is unused and a bounded written task authorizes the change; otherwise record it as separate follow-up.
- Delete `/api/keep-alive` and `vercel.json` only after Upstash has no live responsibility.
- Replace Vercel telemetry with the approved Cloudflare telemetry configuration; update privacy copy that currently names Vercel transport logs.

**Gate 4A — downstream deploys:** authorize backward-compatible versions of state/cloud/visits Workers. Record old/new version IDs and smoke each public contract before changing the site caller.

### Phase 5 — Cloudflare DNS foundation while Vercel remains origin

**Gate 5A — DNS onboarding:** requires explicit domain/DNS authorization. It cannot begin until Gate 0A proves that Cloudflare accepts `mannan.is` as an active zone. If it does not, `cf-preview.mannan.is` is not a valid fallback assumption; use only `workers.dev` or a separately approved domain while apex cutover remains BLOCKED.

- Export a redacted DNS inventory from the current provider, including record content, TTL, proxy intent, apex/www, MX, SPF, DKIM, DMARC, CAA, verification, redirects, and all subdomains. Store no sensitive validation value in Git.
- Add `mannan.is` to Cloudflare DNS and reproduce every required record. Keep the site pointing to Vercel during this gate.
- Lower TTLs before the nameserver change when the current provider permits it.
- Change authoritative nameservers at the external `.is` registrar only after independent record comparison.
- Follow this DNSSEC state machine exactly: capture old signer/DS/NS evidence privately; lower relevant TTLs and wait out the previous TTL; remove the old DS and verify unsigned resolution; change only the NS delegation; wait for Cloudflare zone `Active` and prove Cloudflare authority through multiple resolvers; validate web and mail; only then enable Cloudflare DNSSEC and publish the new DS; verify signed resolution.
- Prove apex/www, email receive/send/authentication, existing Worker URLs/redirects, and unrelated subdomains while Vercel is still the origin.

Rollback before the new DS is published: restore prior NS and verify the old provider is still authoritative/signing before restoring its old DS. Rollback after the new DS is published: remove the Cloudflare DS, wait for verified unsigned resolution and relevant caches, restore old NS, verify the old signer, then restore the old DS. Never change NS and DS in one unverified step. Because resolver caches persist, define the observation duration before starting.

### Phase 6 — application cutover

**Gate 6A — non-production hostname:** after zone eligibility, attach a production-shaped hostname such as `cf-preview.mannan.is`; otherwise use `workers.dev` or a separately approved domain. Use production-like read dependencies but isolated writes. Run the full parity matrix, security headers, cache, asset, auth callback, per-environment `SITE_AUTH_RETURN_URL`/email-link origin, Stripe test mode, Turnstile hostname/action, and service-binding tests.

**Gate 6B — final go/no-go:** require:

- Plan 006 production Gates E-H and its done criteria independently completed: the private binding is proven, public `general/*` originals are deleted, and its migration surface is closed. Deferral requires a separately approved P0 security exception; this plan never absorbs those operations;
- zero material shadow-state divergence;
- current backup/export receipts and tested rollback commands;
- healthy Worker observability and error budgets;
- exact apex/www certificate and redirect behavior;
- a recorded Vercel deployment that remains available for rollback;
- two independent reviews reconciled.

**Gate 6C — apex cutover:** capture the existing DNS/certificate state and exact Custom Domain reversal first; attach the OpenNext Worker Custom Domain to the chosen canonical hostname, configure the other hostname's redirect, and run immediate synthetic + real-browser smoke tests. Do not delete Vercel or Upstash during this gate.

Observation windows:

- intensive: first hour, watching 5xx, CPU/memory, subrequests, state divergence, auth, email, downloads, checkout creation, and static/R2 misses;
- normal: at least 24 hours before ending easy traffic rollback;
- extended: an agreed period before deleting Vercel/Upstash resources or temporary public adapters.

Runtime rollback: detach/disable the Worker custom-domain route and restore the recorded Vercel DNS origin, then verify apex/www and certificates. State stays on its current authoritative backend; use the Vercel-compatible state HTTP adapter if DO-primary.

### Phase 7 — decommission and close

**Gate 7A — provider cleanup:** separately authorize each deletion/revocation after the extended observation window.

- Remove `@vercel/analytics`, `@vercel/speed-insights`, Vercel cron/configuration, Vercel environment variables, deploy hooks, and finally the Vercel project only when traffic logs and DNS prove it is unused.
- Remove `@upstash/redis`, `@upstash/ratelimit`, Upstash environment variables, fallback code, migration scripts, and finally the Upstash database only after exported evidence and restore requirements are approved.
- Disable the temporary authenticated public state interface after Vercel rollback closes; retain only the service binding.
- Revoke migration/API tokens, delete temporary resources with explicit target checks, and remove ignored local credential files only under their separate security authorization.
- Update README, architecture documents, visitation logging, deployment guidance, privacy statements, runbooks, task ledger, and CI.

Final proof:

- repository-wide search finds no runtime Vercel/Upstash import, environment variable, endpoint, cron, deploy instruction, or privacy claim except intentional historical prose clearly marked as history;
- all repository gates and Worker tests pass from a clean checkout;
- live apex/www, auth, contact, downloads, game, garden, MCP, cloud redirect, payments in safe mode, email, static media, robots/sitemap/social images, and observability checks pass;
- Cloudflare resource bindings and custom domains match the committed configuration;
- no temporary endpoint, secret, migration credential, dual-write path, or undeclared paid resource remains;
- final independent reviews find no unresolved security, data-integrity, rollback, or evidence gap.

## Verification matrix

| Surface | Pre-cutover proof | Post-cutover proof | Rollback signal |
|---|---|---|---|
| Next runtime | OpenNext build + workerd Playwright | apex browser/API smoke | Vercel deployment smoke |
| Static assets | count, max size, content headers | representative audio/image/font loads | Vercel asset loads |
| Middleware/visits | synthetic prefetch/RSC/bot/IP cases | D1 visit rows via redacted aggregate | legacy authenticated Vercel call |
| Auth | synthetic request/exchange/cookie tests | real approved magic link and sign-out behavior | Vercel callback with state Worker HTTP |
| Leaderboard | SQL semantic tests + shadow digest | submit/claim/rename/read without score loss | explicit backend authority check |
| Rate limits | policy unit/integration tests | real 429 and Retry-After, no fail-open | restore prior config/version |
| Garden views | per-slug snapshot + dual increments | monotonic visible count | divergence threshold breach |
| Downloads/R2 | Plan 006 gates + six-file invariants | GET/HEAD/405/headers/public media | recorded Worker version/binding |
| Contact/LLM | mocks and provider-degraded tests | approved no-charge/no-secret smoke | error-rate threshold |
| Stripe | mocked/test-mode checkout only | no real charge | disable route/version rollback |
| DNS/email | record diff, DNSSEC, MX/SPF/DKIM/DMARC | multi-resolver and send/receive proof | prior NS/DS receipt |
| Observability | preview logs/metrics with redaction | dashboards and alert thresholds | insufficient visibility is no-go |

## Risk register

| Risk | Prevention / detection | Rollback |
|---|---|---|
| OpenNext runtime mismatch | workerd preview, route matrix, generated image and middleware tests | keep Vercel serving traffic |
| Worker asset limit breach | CI checks 25 MiB max and file count against current plan | move only intentional large assets to R2, then rebuild |
| Leaderboard identity/score corruption | transactional DO schema, idempotency, snapshot invariants, shadow diff | explicit authoritative-store switch; never wipe/renumber |
| Magic token double redemption | atomic DO consume, issue-time boundary, wait one old TTL | disable new issuance and repair before resuming |
| Dual-write split brain | operation IDs, repair queue, divergence SLO, one named primary | revert only to a proven-current backend |
| Rate-limit weakening | exact DO policies for security/resource limits; native binding only for accepted best effort; cross-colo tests | deploy prior Worker config/version without changing the authoritative state backend |
| Wrong DO instance routing | stable singleton/per-slug/policy+subject object names and routing contract tests | stop import/cutover; restore per-object snapshot |
| Telemetry credential/privacy leak | invocation-log decision per Worker, allowlisted structured events, sentinel scans | disable new logs immediately and rotate/revoke any exposed credential |
| Private R2 regression | Plan 006 remains separate authority | use its Gate F matrix; never copy private writes public silently |
| Client-IP trust regression | Cloudflare request metadata + service-binding authentication | legacy Vercel path only during bounded overlap |
| DNS/email outage | exact inventory, staged DNS-first move, DNSSEC checks, MX/DKIM smoke | restore recorded NS/DS configuration |
| Analytics double-count/privacy drift | single active analytics path, privacy-copy review | disable new beacon/telemetry binding |
| Turnstile origin/hostname drift | explicit environment origins, hostname/action/replay tests | restore prior Worker version/config |
| Premature provider deletion | observation windows and per-provider destructive gates | retain Vercel/Upstash until rollback closes |
| Dirty-worktree collision | isolated worktree and protected snapshot reconciliation | stop; do not reset or overwrite user changes |

## Current authoritative references

- Cloudflare Next.js/OpenNext support and workerd preview: <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- OpenNext Cloudflare configuration and caching: <https://opennext.js.org/cloudflare/get-started> and <https://opennext.js.org/cloudflare/caching>
- Workers limits and 25 MiB static-asset ceiling: <https://developers.cloudflare.com/workers/platform/limits/>
- Service bindings and downstream-first deployment: <https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/>
- Service-binding RPC: <https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/>
- Native rate-limit binding semantics and constraints: <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>
- SQLite Durable Object storage/transactions/PITR: <https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/>
- Durable Object limits: <https://developers.cloudflare.com/durable-objects/platform/limits/>
- Worker versions/rollback boundaries: <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- Wrangler configuration as source of truth: <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Wrangler named-environment inheritance: <https://developers.cloudflare.com/workers/wrangler/environments/>
- Workers Logs and invocation-log controls: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- Worker Custom Domains and zone requirement: <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- Cloudflare DNS full-zone setup: <https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/>
- Cloudflare DNS full-setup/DNSSEC troubleshooting: <https://developers.cloudflare.com/dns/zone-setups/full-setup/troubleshooting/>
- OpenNext image choices: <https://opennext.js.org/cloudflare/howtos/image>
- Turnstile server-side hostname/action validation: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- Cron Triggers, only if a real scheduled responsibility emerges: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>

## Review evidence

### Revision 1 — OpenAI frontier review

- Route: `native-controlled`, OpenAI `gpt-5.6-sol`, `xhigh`, selected by the runtime-verified direct selector on 2026-08-01. The child rollout did not expose separate effective-model metadata, so the native route receipt—not child self-report—is the control evidence.
- Scope/result: read-only review at `71c04d1`; no edits, secrets, deployment, or external mutation. Verdict: not executable until seven high and seven medium findings were reconciled.
- Accepted into revision 2: exact-vs-native rate-limit split; single-authority token provenance; idempotent legacy and DO writes with durable intent/fault tests; invocation-log privacy controls; Plan 006 closure dependency; stable DO instance topology; explicit DNSSEC rollback; full environment matrix; typed RPC trust boundary; Turnstile restrictions; DO lifecycle/jurisdiction/PITR; Images spend choice; no production memory fallback; private operations ledger; candidate compatibility-date wording.

### Revision 1 — DeepSeek independent review

- Route: `compatibility-controlled`, OpenRouter `deepseek/deepseek-v4-flash`, `high`; monitored report `20260801T202132Z-14831-mannan20-cloudflare-plan-review-2` recorded matching observed provider/model/effort, `verified=true`, `timed_out=false`, and exit 0.
- Scope/result: read-only review at `71c04d1`; no edits, secrets, deployment, or external mutation. Verdict: not executable until four high findings were reconciled.
- Accepted into revision 2: explicit fifth/root site Worker; pinned tested dependency tuple; `.is` claim reconciliation and real eligibility stop; concrete rate-limit ownership; Plan 006 dependency; cache/`Set-Cookie` isolation tests; callback/Turnstile environment matrix; least-privilege binding audit.
- Reconciled differently: a forgeable internal header is not binding authentication, so revision 2 uses typed RPC plus cryptographic auth on public fallbacks; the same magic token is never checked in both stores, so revision 2 uses provenance routing; Cloudflare's documented Static Assets limits do not establish the review's claimed combined 100 MiB code+asset cap, so revision 2 relies on current plan evidence and actual Wrangler dry-run/upload limits; broad new CSP/HSTS work and a TOML-to-JSONC conversion are separate scope, while migration preserves and tests current headers/config behavior.

### Revision 2 — focused verification

- DeepSeek: `compatibility-controlled` focused run `20260801T203636Z-21680-mannan20-cloudflare-plan-v2-focused`, matching observed model/effort, `verified=true`, `timed_out=false`, exit 0. Verdict: PASS; all prior high/medium findings materially resolved and no new material finding.
- OpenAI: same `native-controlled` frontier reviewer. Verdict: one high and two medium gaps remained: Upstash mirror dedupe covered only Upstash-primary, policy+subject rate-limit objects lacked bounded cleanup/cost controls, and real PITR rehearsal was placed before remote-resource authorization.
- Revision 3 reconciliation: atomic Upstash dedupe now applies in both authority directions with both ledgers retained through rollback; exact limits use finite policy+hash shards with TTL compaction, caps, coarse shielding, and adversarial cost gates; local synthetic restore work is separated from an isolated remote preview PITR rehearsal after Gate 3A.

### Revision 3 — final frontier verification

- OpenAI: same `native-controlled` `gpt-5.6-sol`/`xhigh` reviewer. Verdict: PASS. It verified bidirectional atomic Upstash dedupe, bounded exact-rate-limit storage/cardinality/cost controls, and remote PITR only after Gate 3A on an isolated preview object; no material regression was introduced.
- Architecture result: PROVEN in revision 4. The two required independent routes are reconciled with no unresolved high/medium finding.

Append only route, date, tree reference, finding severity, reconciliation, and check result. Do not paste prompts, secrets, private data, or unredacted provider output.

### Revision 7 — state cleanup and production-shaped deploy review

- OpenAI review 1: native-controlled `gpt-5.6-sol`/high, read-only. It found four important and two minor issues covering rollback reachability, migration equivalence, rate-row cardinality, stale Vercel operations prose, disabled Jordan manifest coverage, and production fail-closed tests. All were remediated and verified.
- DeepSeek review attempts: compatibility-controlled OpenRouter `deepseek/deepseek-v4-flash`/xhigh. The first broad run timed out at 240 seconds; a materially narrower escalated run observed the requested model/effort but timed out at 180 seconds. Both reports had `verified=false`; neither is counted as review evidence.
- OpenAI review 2: fresh native-controlled `gpt-5.6-sol`/high, read-only substitution after the cross-provider route was unavailable. It found rename-cycle, zero-name identity export, Upstash limiter-algorithm parity, and per-policy compaction defects. Focused follow-ups confirmed every material finding resolved and no residual issue.
- Parent gates: root TypeScript and 124 tests; state Worker TypeScript, 5 tests, and dry-run; MCP drift and 44 tests; OpenNext build; cache/privacy/disabled-route checks; deployment and status-only smokes. Result: the Cloudflare path is review-reconciled; apex completion remains blocked on zone creation and Stripe-secret validation.

### Revision 8 — DNS onboarding and bounded Worker Route cutover

- Cloudflare zone `mannan.is` became active as a full zone with assigned nameservers `gabe.ns.cloudflare.com` and `rosemary.ns.cloudflare.com`; the `.is` parent plus 1.1.1.1 and 8.8.8.8 returned that delegation. No DS is published yet, so the staged DNSSEC state remains intentionally unsigned.
- The imported Proton MX, SPF, DMARC, verification, and three DKIM CNAMEs were compared with the former authoritative zone. The DKIM records were corrected from proxied to DNS-only and then resolved correctly from Cloudflare authority and public resolvers.
- Before application cutover, apex and `www` still reached the preserved Vercel origin and returned its 429 challenge, while `mannan20-site.mannanteam.workers.dev` returned 200. Reversible Worker routes `mannan.is/*` and `www.mannan.is/*` were attached to `mannan20-site` without deleting the Vercel origin.
- Production deployment `2ebb0a6a-f3d4-439c-bb99-d4edf70f1380` adds a custom OpenNext wrapper that redirects HTTP and `www` to the HTTPS apex, preserves path/query with 308, adds one-year HSTS on apex responses, and runs before production static assets. `workers_dev=true` remains explicit for observation and diagnostics.
- Parent gates: canonical redirect tests 4/4; root TypeScript; Wrangler production dry-run; apex/www HTTP and HTTPS; HSTS; favicon GET/HEAD; robots, sitemap, garden, game, cloud redirect, leaderboard, session status, and `workers.dev` smokes. No Vercel response identifier remained on the routed apex/www responses.
- Two independent native-controlled OpenAI `gpt-5.6-sol`/high reviews initially found missing HTTP-to-HTTPS, missing `www` canonicalization, and uncommitted/config ambiguity. Both focused re-reviews passed after remediation and accepted the bounded Worker Route cutover. They explicitly did not mark the final Custom Domain, DNSSEC, rollback-drill, mail send/receive, Plan 006, observation, or decommission gates complete.

### Revision 9 — exact private-file limiter deployment

- Cloudflare's native Worker Rate Limiting binding remains a coarse first shield because its per-location, asynchronously updated counters are intentionally permissive. The authoritative private-file policy is now a true per-subject 120-request/60-second rolling window in the existing `portfolio-state-v1` Durable Object, exposed only through the named `FileRateLimitService` service-binding RPC.
- Direct GET/HEAD, ZIP, and admin upload paths require both checks before R2 work. Missing/RPC/capacity/malformed conditions fail closed; runtime validation pins policy metadata and a plausible reset, while exact denials emit integer `Retry-After` bounded to 1-60.
- Independent OpenAI `gpt-5.6-sol`/high review found and drove three repairs: runtime validation of RPC results, exact event-log semantics instead of the legacy weighted approximation, and bounded HTTP delay output. Verified follow-up verdict: APPROVED with no blocking finding.
- Parent gates: state Worker 7 tests and TypeScript; cloud Worker 76 tests and strict TypeScript; both Wrangler dry-runs; downstream-first production rollout. Active versions are state `2a094a28-821a-4e21-a4c9-1aeb218b90eb` and cloud `9ab1a0ca-ef08-4b04-b199-75f72617ecd6`, both at 100%; their prior versions remain rollback targets.
- Public smoke checks passed for cloud root, unauthenticated private-file denial, apex, and `www`. The final authenticated 121-request 429 proof is pending explicit permission to use an existing browser session without extracting its cookie.
