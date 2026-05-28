### Task 199: Visitor + referral + affiliate tracking on D1, with bot/LLM classification

**Goal:** stand up a first-party tracking system on this site that captures every pageview, attaches referral / affiliate codes when present, fingerprints visitors so we can stitch identity across sessions, and surfaces "who sent this person" candidates at conversion time (contact form, `/schedule` booking, future app signups). Storage is **Cloudflare D1** (existing `cloud-worker` binding `DB`), with periodic **R2 backups** and pruning of low-signal rows. Designed to coexist with **Anubis** (added later) and an allowlist-based **LLM/bot classifier** so visitor logs can be filtered into `human`, `allowed-bot`, `llm`, `unknown` cohorts.

> Inspiration: `/Users/manblack/Documents/deep-calm-weave/TASK-AFFILIATE-ATTRIBUTION.md` (Hans's coaching site). That plan is Supabase + Edge Functions; this one is **D1 + Cloudflare Worker** and is scoped to Mannan's portfolio + `/schedule` + future app signup flows.

---

## 1. Why

- Friends will refer people to my site — I want to know **which friend** drove a contact / booking / app signup, so I can thank them and (eventually) pay them.
- I will have multiple conversion surfaces: contact form, `/schedule` (Task 198), future apps that live on the site (signup forms). Each of these needs to carry attribution evidence to the backend.
- I won't block LLM crawlers or healthy bots — but I want to **classify** them so my "real visitor" reports are not polluted. Anubis (added later) will help on the human/bot challenge side; this system handles the bookkeeping.
- Storage cost matters: D1 row count grows linearly with traffic, so the system must self-prune and back up to R2 monthly.

---

## 2. Scope (v1)

### Conversion surfaces wired up in v1

1. **Contact form** (existing, `/api/validate-contact` + email path)
2. **`/schedule` Example Demo confirmation** (Task 198 mock confirm — when this becomes real, attribution rides along automatically)
3. **App signup forms** (any `/app/*` or embedded signup that currently posts to a worker route — wire the same beacon payload)

### Out of scope for v1

- Vanity paths like `/sally` (defer; v1 only handles `?ref=sally`)
- Public-facing affiliate dashboards (admin-only review UI)
- Automated commission calc / payouts (manual review only)
- Real Anubis integration (add the columns and the consumer hooks, but the actual challenge wiring lands in a follow-up task)

---

## 3. Architecture

### 3.1 Components

- **`cloud-worker`** (existing) gains a `/__t` endpoint = the **track-visit beacon**. First-party origin is `mannan.is` (via worker route or Next rewrite to the worker), so we get HttpOnly cookie support if/when we want it.
- **D1 schema** (in `cloud-worker/migrations/`):
  - `affiliates` — small lookup, ~20 rows ever
  - `visits` — every pageview with fingerprints
  - `attribution_candidates` — created at conversion time, snapshotted, immutable
  - `bot_classifications` (cache) — UA + signal hash → `{ kind: human|allowed-bot|llm|unknown, source }`, TTL'd
- **`src/lib/track.ts`** — client beacon helper (used by Next pages). On route change: read/persist `browser_id` + sticky `ref_code`, compute fingerprints (ThumbmarkJS + FingerprintJS v5 OSS), `navigator.sendBeacon('/__t', payload)`.
- **`cloud-worker/src/track.ts`** — the worker handler: CORS allowlist, rate-limit (reuse `REQUEST_LIMITER`), classify UA via `bot_classifications`, insert into `visits`, return 204.
- **`cloud-worker/src/attribution.ts`** — pure scoring/matching module. **No D1 imports** — takes raw rows in, returns scored candidates. Unit-testable.
- **Conversion hooks** in each conversion worker route: after the existing job, call `generateAttributionCandidates({ email, browser_id, session_id, ip, fingerprints })` and insert rows.
- **Admin review UI** at `/admin/attributions` (gated; reuse whatever admin gating exists today, or add a simple env-var-token check for v1).
- **Cron triggers** (in `wrangler.jsonc`):
  - Monthly: dump all D1 tables → R2 (`FILES_BACKUPS` or a new `mannan-backups` bucket — decide during build)
  - Daily: prune `visits` rows with no `ref_code` and no candidate FK older than 30 days

### 3.2 Capture flow

On every Next.js route change (mount a `useTrackVisit` hook in `src/app/layout.tsx` or a top-level client wrapper):

1. Read `?ref=` from URL → if present, persist to `localStorage.last_ref_code` (sticky **90 days**).
2. Read or create `browser_id` (UUID v4) in `localStorage`.
3. Read or create `session_id` (UUID v4) in `sessionStorage`.
4. Compute `fingerprint_thumbmark` and `fingerprint_fpjs` (lazy-load both libs so SSR + initial paint stay clean).
5. `navigator.sendBeacon('/__t', JSON.stringify({...}))` with: `browser_id`, both fingerprints, current path, `document.referrer`, `ref_code` (URL or sticky), `session_id`, `viewport`, `tz`.

The `/__t` worker:
- **Strict CORS allowlist**: `mannan.is`, `*.mannan.is`, `localhost:3847`. **No `*` wildcard** — public beacon with `*` is a tracking-data exfiltration vector.
- Rate limit per IP via `REQUEST_LIMITER`.
- Pull `cf-connecting-ip` for `ip_address`; pull `cf-ipcountry`, `cf-ray` for cheap enrichment.
- Classify the UA against `bot_classifications` cache → if miss, run a tiny inline matcher against:
  - **Healthy-bot allowlist** (Googlebot, Bingbot, etc. — pull from a curated list, store as a JSON constant for v1)
  - **LLM/AI crawler list** (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, Bytespider, etc. — also a JSON constant for v1; cite `https://github.com/ai-robots-txt/ai.robots.txt` as the seed list)
  - Fallback: `unknown` (treat as human in reports until proven otherwise; Anubis will tighten this later)
- Insert row into `visits` with `bot_kind` set.
- Return **204 immediately** — never block the page.

### 3.3 Conversion / candidate generation

When any conversion happens:
1. Existing route does its normal job (send email, write booking, etc.).
2. Calls `generateAttributionCandidates({ email, browser_id?, session_id?, ip, fingerprints? }, env.DB)`.
3. The matcher queries `visits` for overlapping signals in the **last 90 days** where `ref_code IS NOT NULL`.
4. For each affiliate-tagged candidate visit cluster, insert a row into `attribution_candidates` with:
   - **Conversion FK columns** — explicit, not polymorphic: `contact_submission_id`, `schedule_booking_id`, `app_signup_id` (nullable, exactly one set per row).
   - `ref_code` (the affiliate)
   - **Snapshot fields** captured at conversion time (so the row is durable even if the live conversion row is deleted/mutated):
     - `converted_email`, `converted_name`
     - `converted_at`
     - `converted_kind` ('contact' | 'schedule' | 'app_signup')
     - `converted_payload_summary` (e.g. `schedule.type=example-demo`, app slug, contact subject)
   - `confidence_score` (0–100)
   - `evidence` JSON — which signals matched (browser_id exact, fingerprint match, IP /24 match, etc.) with timestamps
   - `status` — `pending` (default) | `confirmed` | `rejected` | `needs_followup`
   - `bot_kind_at_conversion` — so I can ignore candidates where the "convert" was actually a bot replay

### 3.4 Scoring (in `attribution.ts`)

| Signal | Weight |
|---|---|
| `browser_id` exact match | 40 |
| `fingerprint_thumbmark` match | 20 |
| `fingerprint_fpjs` match | 20 |
| Both fingerprints match same visit | +10 bonus |
| `session_id` match | 15 |
| IP exact match within 7d | 15 |
| IP /24 match within 30d | 5 |
| Email domain match | 5 |
| Same-day visit + conversion | +5 bonus |
| `bot_kind != 'human'` on the candidate visit | -100 (effectively kills the row) |

Cap at 100. Surface raw evidence regardless of score so I can override.

### 3.5 Bot / LLM classification

- `bot_kind` enum on `visits`: `human` | `allowed-bot` | `llm` | `unknown`.
- Source columns: `bot_signal_source` (e.g. `ua-allowlist`, `ua-llm-list`, `anubis-pass`, `anubis-fail`, `none`).
- Reports default to `bot_kind = 'human' OR bot_kind = 'unknown'`. Toggle to include LLMs / bots when I want to see them.
- Anubis hookup (later task): when Anubis runs in front, the `/__t` worker reads the Anubis-set cookie/header and sets `bot_signal_source = 'anubis-pass'` / `'anubis-fail'`. Schema is ready for it from day one.
- LLM allowlist: I will not 4xx them. I just want to **know** they were here. Maintain the allowlist as `cloud-worker/src/llm-bots.ts` so it's diffable in PRs.

### 3.6 Retention + R2 backups

- `visits` with a `ref_code` OR referenced by a candidate: keep indefinitely.
- `visits` without affiliate signal: **prune after 30 days** via daily Cron Trigger.
- `attribution_candidates`: never auto-delete.
- **Monthly R2 dump**: Cron Trigger exports each table to NDJSON, gzips, writes to `mannan-backups/d1/YYYY-MM/`. Backup runs **before** the prune cron each month so we never delete a row that wasn't backed up.
- Backup script lives at `cloud-worker/src/backup.ts`. Uses D1's `prepare().raw()` paginated reads so we don't blow memory on a single statement.

### 3.7 Admin review UI

- New route `/admin/attributions` (server component, auth-gated).
- Lists candidates sorted by `created_at` DESC, filterable by `ref_code`, `confidence_score` range, `status`, `converted_kind`.
- Row expand shows: snapshot fields, full `evidence` JSON, link to live conversion record (if present), affiliate info, `bot_kind_at_conversion` badge.
- Status controls: confirm / reject / needs-followup. Buttons hit a worker route that updates `status` + appends to an `audit` JSON column.
- v1 auth gate: simple env-var-bearer-token cookie set via a one-shot `/admin/login` page. Fine for solo use; revisit when there's a second admin.

---

## 4. Open questions / deferred decisions

- **Where does the beacon mount?** Next.js `app/layout.tsx` with a tiny `'use client'` wrapper, OR a route group. Decide during build — preference is a single mount in root layout to avoid drift.
- **First-party domain**: route `/__t` on `mannan.is` to the worker via `next.config.ts` rewrite → keeps the request same-origin so cookies are first-party. (Already an option since the worker has `workers_dev: true` plus a custom domain.)
- **Anubis integration**: full hookup is a follow-up task. v1 just needs the schema columns and a code path that's a no-op when Anubis headers aren't present.
- **D1 row size**: visits with a fingerprint blob can be ~2 KB each. At ~5k visits/mo this is ~10 MB/mo pre-pruning. Comfortably within D1 free tier; revisit only if traffic explodes.
- **Vanity paths** (`/sally`): defer to v2. v1 is `?ref=sally` only.
- **App signup table**: needs to actually exist before v1 ships. If no app signup form is live yet, leave the `app_signup_id` column nullable + the wiring stubbed; first real app to ship picks it up.

---

## 5. Tasklist

### Phase 1 — Schema + matcher (no traffic yet)
- [ ] Migration: `affiliates`, `visits`, `attribution_candidates`, `bot_classifications` in `cloud-worker/migrations/`
- [ ] Indexes on `visits` (`browser_id`, `fingerprint_thumbmark`, `fingerprint_fpjs`, `ip_address`, `created_at`, `ref_code`, `bot_kind`)
- [ ] Seed `affiliates` table with my known referrers (a tiny SQL file or admin-only insert UI)
- [ ] `cloud-worker/src/attribution.ts` — pure matching + scoring
- [ ] Unit tests for `attribution.ts` against fake D1 result sets (vitest, `--bun` if it plays nicely)

### Phase 2 — Capture
- [ ] `cloud-worker/src/track.ts` worker handler with CORS allowlist + rate limit + bot classification + D1 insert
- [ ] `cloud-worker/src/llm-bots.ts` + `cloud-worker/src/allowed-bots.ts` — curated UA lists
- [ ] Wire `/__t` route into the worker's main `index.ts`
- [ ] Next.js rewrite from `/__t` → worker (in `next.config.ts`) so beacon is same-origin
- [ ] `src/lib/track.ts` client helper — fingerprints, beacon payload
- [ ] `useTrackVisit()` hook mounted in `src/app/layout.tsx` (or a thin client wrapper)
- [ ] Add a paragraph on visit logging + fingerprinting to whatever privacy/about page makes sense (or a new `/privacy`)

### Phase 3 — Conversion wiring
- [ ] Hook into the contact form path (currently in `src/app/api/validate-contact` + email send) — after success, call `generateAttributionCandidates`
- [ ] Hook into `/schedule` Example Demo confirm — when this becomes a real worker route, the call ships with it
- [ ] Stub the app-signup hook (no-op until first app signup form exists)
- [ ] Update client forms to include `browser_id` + `session_id` + current fingerprints in their submission payload

### Phase 4 — Admin review
- [ ] `/admin/attributions` page with filters + status controls
- [ ] Worker routes: `list-attribution-candidates`, `update-attribution-candidate`
- [ ] Simple env-var bearer-cookie admin gate

### Phase 5 — Hygiene + R2 backups
- [ ] Cron Trigger: daily prune of stale unsignaled `visits`
- [ ] Cron Trigger: monthly D1 → R2 NDJSON dump (`mannan-backups/d1/YYYY-MM/`)
- [ ] Backup script writes a manifest with row counts so I can spot-check after each run
- [ ] Document the new tables + cron schedule in `cloud-worker/README.md`

### Phase 6 — Anubis + future
- [ ] Anubis in front of selected routes (separate task) — wire its headers into `bot_signal_source`
- [ ] Tune scoring weights after first ~20 real candidates
- [ ] Vanity paths (`/sally`) → either redirect to `/?ref=sally` or render a branded landing page

---

## 6. Security + privacy

- Fingerprinting is borderline-PII in some jurisdictions. Privacy page must disclose it before this ships.
- `/__t` CORS must be an **allowlist**, never `*`. A wildcard public beacon is a data-exfiltration vector for any site that knows the URL.
- All access to the new tables goes through worker routes — D1 has no RLS, so the worker layer **is** the gate. Don't leak the D1 binding to any public unauthenticated path that doesn't need it.
- IP addresses are stored raw in v1. Once Anubis lands and we're behind it consistently, consider hashing or truncating to /24 at ingest if review only needs subnet matching.
- `attribution_candidates` snapshots include email + name — admin endpoints must require the bearer cookie, no exceptions.
- Bot UA lists are static JSON in the worker bundle for v1. Don't fetch them at request time — the worker can't afford that round trip and the lists barely change.

---

## 7. Lessons learned from the sister implementation (deep-calm-weave, 2026-05-06)

These are field notes from Hans's coaching-site build (which is being implemented live as I write this task). Bake them in from day one on the portfolio side — don't relearn them.

### CORS preflight is the silent killer of beacon endpoints

The single biggest source of "why aren't visits landing" was preflight. The rules that mattered:

- **The beacon must set zero custom request headers.** No `X-Browser-Id`, no `Authorization`, no `apikey`. Any non-CORS-safelisted header re-triggers preflight even when the body is `text/plain`. **All identity / payload goes in the JSON body, never in headers.**
- **`Content-Type` matters.** `application/json` is **not** safelisted and will preflight. `text/plain` (or omitting Content-Type) is safelisted and skips preflight. The worker should parse the body as JSON regardless of declared content-type — so always send as `text/plain` from the client. This applies to:
  - `navigator.sendBeacon(url, blob)` — pass a `Blob` with `type: 'text/plain'` (or the raw string; `sendBeacon` defaults to `text/plain;charset=UTF-8` when given a string)
  - The `fetch()` fallback path (used when sendBeacon is unavailable or returns false) — explicitly set `Content-Type: text/plain`, **not** `application/json`, even though the body is JSON
- **The worker must still handle `OPTIONS` gracefully.** Even with the above, future callers (e.g. a non-beacon JSON poster, a debugging tool, a third party we forgot about) will preflight. Pattern that worked:

  ```ts
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  ```

  …placed **before** the origin allowlist gate. `corsHeaders` should include:
  - `Access-Control-Allow-Origin` (reflected from `Origin`, after allowlist check)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: content-type` (add others only if a caller actually needs them — keep this minimal)
  - `Vary: Origin` (so caches don't leak the wrong ACAO)

### What this means for our `useTrackVisit` hook + `/__t` worker

- `useTrackVisit` must **only** call `navigator.sendBeacon(url, blob)` with a `Blob` (or string) that resolves to `text/plain`. No headers passed in. Period.
- The fetch fallback (browsers without sendBeacon, or when sendBeacon returns false because payload too large) must use `Content-Type: text/plain` and parse-on-server.
- The `/__t` worker handles `OPTIONS` first, before the origin gate, before rate limiting. Same shape as the `subscribe-newsletter` precedent in the sister project.
- Keep the hook's beacon payload **flat JSON only** — don't add headers thinking it's "cleaner" to put `browser_id` in `X-Browser-Id`. It's a trap.

### Diagnostic checklist for "visits aren't landing"

When a beacon silently fails, check in this order:

1. Open the Network tab, **filter by the `/__t` URL**. If you see a red `OPTIONS` row with no following `POST`, you have a preflight failure.
2. Inspect the failed `OPTIONS` response headers — missing `Access-Control-Allow-Origin`? Wrong allowlist? Missing `Allow-Headers: content-type`?
3. Check the request: is the client sending any non-safelisted header? Even one will preflight.
4. Confirm `sendBeacon` returned `true`. If it returned `false`, the payload was rejected (usually >64 KB) — fall back to `fetch` with `keepalive: true` and `Content-Type: text/plain`.
5. Once a fresh reload shows visits landing, navigate two routes back-to-back to confirm the route-change hook is firing once per route, not zero or two.

### Style of fix

When preflight breaks, the temptation is to crank the worker's `Allow-Headers` open to `*`. Don't. The right fix is **stop sending the offending header from the client**. Permissive CORS is a defense-in-depth liability for a public beacon.

---

## 8. References

- Inspiration: `/Users/manblack/Documents/deep-calm-weave/TASK-AFFILIATE-ATTRIBUTION.md`
- LLM crawler seed list: `https://github.com/ai-robots-txt/ai.robots.txt`
- D1 backup pattern: paginate via `LIMIT/OFFSET` or `id > last_seen`; never `SELECT *` an unbounded table
- Existing worker shape: `cloud-worker/src/index.ts`, `cloud-worker/wrangler.jsonc` (binding `DB`, rate limiter `REQUEST_LIMITER`, R2 buckets including `FILES_BACKUPS`)

- Location: `cloud-worker/src/`, `cloud-worker/migrations/`, `src/lib/track.ts`, `src/app/layout.tsx`, `src/app/admin/attributions/`, `next.config.ts`
