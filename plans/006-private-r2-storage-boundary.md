# Plan 006: Separate private cloud files from the public portfolio R2 bucket

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Executor instructions:** Repository work and production operations are separate phases. Complete and verify the repository phase first. Do not create buckets, change bindings, copy/delete objects, change public access, deploy, use production credentials, or run remote Cloudflare/Vercel commands until Mannan explicitly authorizes the named production gate. Stop at every human gate.
>
> **Drift check:** `git diff --stat 76d995a..HEAD -- cloud-worker mcp-worker scripts/build-mcp-data.mjs src/app/api/download src/lib/downloads.ts src/lib/r2.ts next.config.ts docs/cloud-cloudflare-architecture.md`. Re-read any changed file. Reconfirm `general` maps to `FILES` + `general/`, production `FILES` targets `portfolio-files`, MCP `FILES` targets `portfolio-files`, and `PUBLIC_FILE_SLUGS` is the exact six-file list below. Any mismatch is a STOP condition until reconciled with live code.

## Goal

Remove the authentication bypass created by storing `general/*` client files in publicly addressable `portfolio-files`, while preserving intentional public media and the MCP's exact six documents. Harden direct file retrieval, prove the private target through an authenticated canary, retain a rollback until cutover is proven, then remove exposed originals.

## Status

- **Priority:** P0 — immediate investigation/planning priority
- **Finding IDs:** SEC-14, SEC-15, SEC-16
- **Effort:** L (repository M + operations M)
- **Risk:** HIGH — confidentiality boundary and production data movement
- **Depends on:** explicit authorization for each production gate
- **Category:** security / storage / operations
- **Planned at:** commit `76d995a`, 2026-07-12

## Confirmed current state

- `cloud-worker/wrangler.jsonc` binds `FILES` to `portfolio-files`; `cloud-worker/src/auth.ts` maps `general` to it with prefix `general/`.
- Cloud routes check a signed session and D1 `folder_members`, but those checks protect only Worker routes.
- `src/lib/r2.ts` names the enabled public `r2.dev` host. Public media and browser downloads depend on it. **Do not disable public access on `portfolio-files`.**
- `mcp-worker` uses the same bucket. `scripts/build-mcp-data.mjs` already has an explicit allowlist of exactly `resume`, `cover-letter`, `gmu-archr`, `omf-dr`, `immortalism-manifesto`, and `mcp-intent-spike`.
- MCP allowlisting protects `/files/<slug>`, not raw public R2 keys. The MCP path dispatcher currently accepts every method.
- The authenticated direct route checks folder authorization but does not validate the object name before key construction. Listing subpaths and admin uploads do not share ZIP selection's partial validator.
- Cloud downloads have no dedicated limiter and incomplete attachment headers. MCP limiting exists but is optional/fail-open in its type and handler.
- `portfolio-private-files` and safe copy/verification tooling do not exist in the repository.
- Existing upload/migration scripts hard-code the public bucket and public URL; they are unsuitable for this cutover.
- `portfolio/jordan/*` is a separate public-URL design. Its Next.js route is disabled, and moving its visits Worker binding would break browser reads. A hidden/noindex document is also present in tracked public storage inputs; hidden discovery state is not confidentiality. Plan 006 records these classification risks but does not move them with `general/*`.
- A value-blind, high-signal scan found no private-key, major provider-token, live Stripe-key, or JWT patterns in tracked state/history. Broader redacted Gitleaks gates remain required before operations.

## Target trust boundaries

```text
Public portfolio website
├── public portfolio-files
│   ├── intentionally public media/assets
│   ├── public browser downloads
│   └── exact six-file MCP allowlist
└── authenticated cloud-worker
    ├── portfolio-private-files / general/*
    ├── mannan-hans
    └── deep-calm-weave-backups
```

`portfolio-private-files` must have neither an `r2.dev` development URL nor a custom domain. Possession of a key must never retrieve a private object; the only supported path is the cloud Worker after session and folder authorization.

## Design decision

Use a named `storage-canary` Wrangler environment whose `FILES` binding targets `portfolio-private-files`, while production remains on `portfolio-files`. Copy `general/*`, then verify real login, client permissions, listing, individual GET/HEAD, ZIP, headers, denial, rate limits, and content equivalence through the canary. Only then make a separate production binding change.

This meets the pre-switch application-verification requirement without adding a temporary diagnostic endpoint to production. A direct binding flip was rejected because it makes production the first canary. A dual-binding admin route was rejected because it creates a temporary sensitive HTTP surface and does not prove the ordinary client path.

## Scope

### Repository changes

- Centralize validated object identifiers and safe attachment headers.
- Add direct-route method restrictions and authenticated file abuse controls.
- Harden MCP and site download routes while preserving the exact six MCP files.
- Add `storage-canary` configuration without changing the production binding.
- Add tests, redacted secret-scanning gates, documentation, and rollback instructions.

### Production operations — separately authorized

- Create/configure `portfolio-private-files`.
- Copy and verify only `general/*`.
- Configure canary secrets, deploy canary, and verify.
- Switch/deploy production cloud Worker.
- Observe, then delete only verified public originals.
- Revoke migration credentials and remove canary after the rollback window.

### Out of scope

- Disabling public access on `portfolio-files`.
- Moving public media, browser downloads, MCP documents, `portfolio/jordan/*`, hidden/noindex objects, or any non-`general/` prefix. Their intent/classification is SEC-17.
- Changing the MCP or visits Worker binding.
- Changing D1 users, roles, or folder grants.
- Fixing unrelated auth findings, pushing, merging, or deploying without approval.

## Repository phase

### Task 1: Lock public/private invariants in tests

**Files:** `mcp-worker/test/files.spec.ts`, `scripts/build-mcp-data.mjs`, `cloud-worker/src/storage.test.ts`

- [x] Replace the MCP `length === 6`-only assertion with this exact ordered mapping:

```ts
expect(data.files.map(({ slug, key }) => ({ slug, key }))).toEqual([
  { slug: "resume", key: "portfolio/resume/Mannan_Javid_Resume.pdf" },
  { slug: "cover-letter", key: "portfolio/documents/mannan-javid-cover-letter.pdf" },
  { slug: "gmu-archr", key: "portfolio/documents/GMU-ARCHR.pdf" },
  { slug: "omf-dr", key: "portfolio/documents/OMF-DR.pdf" },
  { slug: "immortalism-manifesto", key: "portfolio/documents/immortalism-manifesto.pdf" },
  { slug: "mcp-intent-spike", key: "portfolio/documents/mcp-intent-spike.pdf" },
]);
```

- [x] Make generation fail unless those six slugs are exact and every key begins with `portfolio/resume/` or `portfolio/documents/`. Explicitly forbid `general/`, `portfolio/jordan/`, `hans/`, `drops/`, and `backups/`.
- [x] Run `bun run mcp:check && bun run mcp:test`; snapshot was in sync and 41 tests passed. The first MCP run was sandbox-blocked on localhost; the approved read-only rerun passed.

### Task 2: Centralize private object-key validation

**Files:** create `cloud-worker/src/storage.ts`; modify `cloud-worker/src/auth.ts`, `cloud-worker/src/index.ts`, `cloud-worker/src/admin.ts`; create/modify `cloud-worker/src/storage.test.ts`

- [x] Write failing table tests for accepted `report.pdf`, `client/final deck.pdf`, and Unicode names; reject empty/absolute paths, leading/trailing slash, empty/`.`/`..` segments, backslash, NUL/control characters, encoded separators/dot segments after decoding, and values over 1024 code units.
- [x] Add:

```ts
export function parseRelativeObjectName(raw: string): string | null;
export function objectKeyFor(folder: Folder, raw: string): string | null;
export function safeAttachmentFilename(raw: string): string;
```

`parseRelativeObjectName` rejects rather than rewrites invalid input. `objectKeyFor` prepends only the configured prefix. `safeAttachmentFilename` removes controls/quotes from the final segment and falls back to `download`. Do not use filesystem normalization for opaque R2 keys.

- [x] Route single downloads, listing subpaths, selected/all ZIP prefixes, archive entry names, and admin upload filenames through the helper. Validate again at ZIP serialization because `hans-backups` has an external writer.
- [x] Return `400` before R2 work for malformed listing/ZIP/upload identifiers and indistinguishable `404` on direct retrieval. Preserve `isFolder` + `canAccess` before lookup.
- [x] Run `cd cloud-worker && bun test src/storage.test.ts`; all 25 storage tests passed as part of the 70-test cloud suite.

### Task 3: Harden authenticated file responses and resource use

**Files:** `cloud-worker/wrangler.jsonc`, `cloud-worker/src/types.ts`, `cloud-worker/src/index.ts`, `cloud-worker/src/storage.ts`, `cloud-worker/src/zip.ts`, `cloud-worker/src/index.test.ts`, `cloud-worker/README.md`

- [x] Add required `FILES_LIMITER` with namespace `1003`, default 120 requests/60 seconds keyed by authenticated email + connecting IP. Missing production binding fails closed. The limit remains subject to canary telemetry before deploy.
- [x] Register explicit GET and HEAD for `/files/:folder/:name{.+}` plus a fallback `405` with `Allow: GET, HEAD`. HEAD performs auth, validation, limiting, and `R2Bucket.head` but returns no body.
- [x] Preserve authenticated `POST /cloud/:folder/download`: it constructs a ZIP and is not the direct file endpoint. Rate-limit it and add maximum entry-count and total-byte budgets before streaming.
- [x] Add upload size limits and refuse unsafe keys before `put`.
- [x] For direct file retrieval, make no session, no membership, invalid identifier, and missing object indistinguishable `404`s. Keep listing UX (`302` login / signed-in `403`) unchanged.
- [x] Set successful private GET/HEAD headers:

```text
Content-Disposition: attachment; filename="<safe name>"
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; sandbox
Referrer-Policy: no-referrer
```

Preserve safe `Content-Type`, `Content-Length`, and `ETag`; never forward arbitrary object metadata headers. Add `private, no-store` to authenticated HTML/token responses and an appropriate `Vary` policy.

- [x] Route tests cover GET/HEAD, empty HEAD body, 405/Allow, limiting, archive/upload budgets, missing-limiter failure, invalid names, denial-equivalent 404, correct bucket selection, headers, and hostile ZIP entry names.
- [x] Run `cd cloud-worker && bun test`; 70 tests and 161 assertions passed.
- [x] Run `cd cloud-worker && bunx tsc --noEmit`; exactly 14 known `admin.ts` JSON-body baseline errors remain, with no errors in the new storage/direct-file/ZIP/config code.

### Task 4: Harden public MCP and site download routes

**Files:** `mcp-worker/src/files.ts`, `mcp-worker/src/types.ts`, `mcp-worker/test/files.spec.ts`, `src/app/api/download/[slug]/route.ts`, `e2e/downloads.spec.ts`

- [x] MCP: accept only GET/HEAD; other methods return `405` + `Allow`. Validate raw suffix with `^[a-z0-9]+(?:-[a-z0-9]+)*$` before exact allowlist lookup. HEAD uses `FILES.head` and has no body.
- [x] Make MCP `FILES_LIMITER` required/fail-closed in production. Test limit exhaustion, per-IP separation, missing binding, `429`, and `Retry-After`. Separately bind/rate-limit `/mcp` at 60/min/IP, cap bodies at 32 KiB and search queries at 512 characters, and return configured policy metadata.
- [x] MCP attachment responses add `nosniff`, sandbox CSP, and no-referrer while preserving disposition and the current deliberate cache policy.
- [x] Next.js public download route explicitly exports GET and HEAD, validates slug before `DOWNLOADS`, retains its limiter, returns an empty HEAD body, and applies the same attachment headers. Unsupported methods return `405`.
- [x] Tests cover exact six mappings, GET/HEAD, malformed/unknown, 405, missing object, limiter behavior, and headers.
- [x] Run `bun run mcp:check && bun run mcp:test && bun run test:unit`; snapshot remained in sync, MCP passed 44/44, and root passed 117/117.

### Task 5: Add non-production storage-canary configuration

**Files:** `cloud-worker/wrangler.jsonc`, `cloud-worker/README.md`, `docs/cloud-cloudflare-architecture.md`

- [x] Define `env.storage-canary` as a distinct Worker with `FILES` → `portfolio-private-files`; keep the other R2 bindings, production D1, and limiters aligned. Set only non-secret canary URLs in JSONC.
- [x] Document that Wrangler environment secrets do not inherit: set `SESSION_SECRET`, `RESEND_API_KEY`, and `SITE_AUTH_EXCHANGE_SECRET` separately in Cloudflare secret storage. Never place values in JSONC, task logs, or shell history.
- [x] Keep top-level production `FILES` → `portfolio-files` in the repository-phase diff. A config assertion prevents accidental early replacement.
- [x] Correct stale one-bucket, uncached-listing, folder-name, and public/private architecture prose.

### Task 6: Secret and history gate

**Files:** only if required: `.gitignore`, `.gitleaks.toml`, `.github/workflows/ci.yml`

- [x] Run checksum-verified Gitleaks 8.30.1 with `--redact` against current tracked state and all 852 reachable commits. Both final scans reported no leaks.
- [x] Classify the only tracked candidate as the documented `cloud-worker/.dev.vars.example` placeholder and allowlist it with exact path + rule + line regex; no credential class is globally suppressed.
- [x] Add ignores for `.env`, `.env.*`, and every Worker's `.dev.vars`, while explicitly unignoring committed `*.example` templates.
- [x] Pin the Gitleaks v3 CI action by full commit SHA and pin scanner version 8.30.1.
- [x] No real credential was found in tracked state/history, so the rotation/history-rewrite STOP path was not invoked. Ignored local credential files remain unmodified and must not be committed.
- [ ] Before any production gate, confirm required values exist in Cloudflare/Vercel secret storage, then separately authorize removal of ignored local credential-bearing files. Do not inspect, print, copy, or ledger their values.

### Task 7: Repository verification and ledger boundary

**Files:** `tasks/task-272.md`, `plans/README.md`, `plans/PLAN.md`, `plans/KICKOFF.md`

- [x] Run `git diff --check`, root typecheck/unit, cloud-worker tests/typecheck-baseline, MCP drift/tests, canary dry-run, and the redacted secret gate.
- [x] Confirm no task-attributed changes under `.claude/claude.md`, `portfolio/`, or `tasks/task-262.md`; all remain preserved pre-existing user-owned paths.
- [ ] Create a local repository-phase commit only if authorized. Do not push/deploy.
- [x] Mark plan 006 `IN PROGRESS — repository phase complete; production authorization required`, not DONE.

## Production operations phase

Every gate requires explicit authorization. Record timestamps, action names, counts/bytes, Worker version IDs, test roles, and rollback decisions in `tasks/task-272.md`. Never record credentials, cookies, magic links, object contents, or private filenames.

### Gate A — private bucket creation/configuration

- [ ] Create `portfolio-private-files` in the source account/jurisdiction.
- [ ] Confirm Public Development URL is **Disabled / Not allowed**.
- [ ] Confirm Custom Domains is empty and no browser CORS is configured.
- [ ] Capture a redacted configuration receipt containing only bucket name and access states. STOP if any public access exists.

### Gate B — source inventory and non-destructive copy

- [ ] Freeze `general` admin uploads for the copy window, or record the start time and require an incremental second pass.
- [ ] Inventory only `general/`: count, aggregate bytes, per-key size/type/custom metadata. Never select another prefix.
- [ ] Use Cloudflare Super Slurper: Cloudflare R2 source, source prefix `general/`, destination `portfolio-private-files`, **skip existing/no overwrite**. Any migration credential must be temporary, bucket-scoped, created/entered/stored only in Cloudflare, then revoked.
- [ ] Run the incremental pass if writes were not frozen.
- [ ] Compare destination count, bytes, per-key sizes/types/metadata. Do not require ETag equality because multipart migration may change it.
- [ ] STOP on missing, extra, truncated, overwritten, or metadata-divergent objects. Keep source untouched.

### Gate C — canary secret setup/deployment

- [ ] Configure canary secrets through Cloudflare secret storage without exporting/printing values.
- [ ] Deploy only `cloud-worker --env storage-canary`; record version ID.
- [ ] Prove production Worker version/binding is unchanged.

### Gate D — authenticated pre-switch verification

Use one admin, one client with `general`, and one authenticated client without it:

- [ ] Unauthenticated canary direct object requests return `404`.
- [ ] Allowed admin/client can list and download every individual object and the complete ZIP.
- [ ] No-grant client cannot list/retrieve; direct retrieval matches missing-key `404`.
- [ ] GET/HEAD metadata matches; HEAD body is empty; other direct methods return `405` + `Allow`.
- [ ] Security/no-store headers and rate limiting work.
- [ ] Compare source-production and destination-canary ZIP inventories by relative name, size, and SHA-256 for every file in a mode-0700 temporary directory; securely remove temporary copies afterward.
- [ ] Externally confirm the private bucket has no functioning public/custom-domain URL and the unauthenticated canary route is `404`.
- [ ] STOP on mismatch. Delete/disable only the canary and repair/re-copy destination; do not touch source.

### Gate E — production binding switch

- [ ] Make a dedicated cutover commit changing only top-level cloud Worker `FILES` to `portfolio-private-files` plus ledger state.
- [ ] Deploy only `cloud-worker`; record old/new version IDs.
- [ ] Repeat all allowed/denied listing, GET, HEAD, ZIP, upload, header, and limiter smoke tests.
- [ ] Upload a uniquely named canary through `/admin/upload`, prove it exists only through private storage, then remove it by approved operation and wait out listing caches.
- [ ] Keep MCP on `portfolio-files`; test all six MCP downloads and representative public media/browser downloads.
- [ ] Observe logs/errors for an agreed window, minimum 24 hours recommended, before deletion authorization.

### Gate F — rollback while originals remain

- [ ] Redeploy the recorded old Worker version or revert only `FILES` and deploy.
- [ ] Wait/purge the per-colo listing cache (documented maximum five minutes), then verify source access.
- [ ] Reconcile private-only writes before rollback. Copying them to the public source re-exposes them and requires explicit acknowledgment; prefer fix-forward for confidentiality failures.
- [ ] Never delete private copies during rollback.

### Gate G — delete exposed originals

This destructive step needs separate explicit authorization:

- [ ] Re-run inventory and production tests after observation.
- [ ] Confirm no code/config/script/stored URL reads `portfolio-files/general/`.
- [ ] Delete only exact `general/*` keys from the frozen manifest; never bucket-wide delete.
- [ ] Confirm source has zero `general/*` objects.
- [ ] Check every former public URL by status only; expect `404`.
- [ ] Re-run authenticated private downloads plus all six public MCP files.
- [ ] Close exposure only when old-public `404` and authenticated-private success are both proven.

### Gate H — close migration surface

- [ ] Revoke migration credentials and confirm revocation.
- [ ] Remove canary after observation/rollback closes.
- [ ] Remove canary-only config later if not retained for disaster-recovery tests.
- [ ] Update canonical docs/ledger with exact evidence and run verification-before-completion plus session-audit.

## Rollback matrix

| Point | Safe rollback | Consequence |
|---|---|---|
| Before copy | Remove unused private bucket with approval | None |
| Copy failed | Source remains authoritative; repair/re-copy | None |
| Canary failed | Remove canary; production unchanged | None |
| Production switched, originals retained | Rebind/redeploy prior version | Reconcile new private-only writes; source remains exposed |
| Public originals deleted | Prefer fix-forward; reverse-copy before any rebind | Recreates public exposure; separate approval required |

## Done criteria

- [ ] Production `general/*` comes from `portfolio-private-files`.
- [ ] Private bucket has no public URL, custom domain, or browser CORS path.
- [ ] Unauthenticated/unauthorized direct access returns `404`; allowed admin/client flows pass.
- [ ] Copy equivalence was proven before cutover.
- [ ] Old `portfolio-files/general/*` URLs return `404` after authorized deletion.
- [ ] Public media/browser downloads work and MCP serves exactly the six named files.
- [ ] File routes enforce methods, validation, headers, resource budgets, and rate limits.
- [ ] Redacted current/history secret scans pass or every real credential is revoked/rotated.
- [ ] No secret appears in tracked files, ledgers, output artifacts, or manifests.
- [ ] `.claude/claude.md`, `portfolio/`, and `tasks/task-262.md` remain untouched.

## STOP conditions

Stop if production state/allowlist differs; `general/*` has public consumers; another prefix enters copy/delete; a real secret is found; destination access settings are wrong; inventory/content differs; canary auth/ACL/GET/HEAD/ZIP/denial fails; cutover requires MCP/visits changes; old-prefix writes continue; or rollback would recreate exposure without explicit approval.

## Current Cloudflare references

- R2 public buckets and disabling `r2.dev`/custom-domain access: <https://developers.cloudflare.com/r2/buckets/public-buckets/>
- Worker bindings as embedded resource capabilities: <https://developers.cloudflare.com/workers/runtime-apis/bindings/>
- Wrangler R2 binding/environment configuration: <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Non-destructive R2 migration with Super Slurper: <https://developers.cloudflare.com/r2/data-migration/super-slurper/>
- Bucket-scoped and temporary R2 credentials: <https://developers.cloudflare.com/r2/api/tokens/>
