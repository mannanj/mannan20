# Drops — configurable file sharing for mannan.is

**Status:** Design / approved to spec. 2026-06-30.
**Supersedes & extends:** `docs/mcp-file-transfers.md` (the original inbound-only idea note).

---

## 1. Goal

Let Mannan create **Drops** — configurable, link-based file-sharing spaces — and hand them to
people (named individuals or anyone with a URL) so files can move **in**, **out**, or **both
ways**, with per-Drop control over duration, size, headcount, identity, privacy, and review.

This is the original "send magic links so people can upload files to me" idea, generalized into a
single primitive with a policy object.

## 2. Core concept — one primitive, two doors, three directions

A **Drop** is one configurable entity. Two ways to reach it, three directions it can point.

- **Doors (access modes):**
  - **Named** — a magic link sent to specific email(s); recipient resolves to a D1 identity.
  - **Open** — anyone with the URL.
  - **Open + passcode** — anyone with the URL who also has the code.
- **Directions:**
  - **Collect (inbound)** — people upload *to Mannan*. The heart of the feature.
  - **Distribute (outbound)** — people download what *Mannan* shared. Read-only.
  - **Exchange (two-way)** — a small group both uploads and downloads one shared space.

Everything the user "configures along many dimensions" is a field on the Drop (see §5).

## 3. Architecture (decision: "Worker = brains, Site = face")

Mirrors the site↔cloud-worker split already in production.

```
Browser ──► Site (Next.js)  ──🔒 server-to-server──►  cloud-worker (CF)
  │          React pages (Paper design)                D1 (policy/state) + presign
  │          /drop/<id>, composer, /api/drop/*         + Resend notify
  │
  └──────────── PUT bytes (presigned) ─────────────────────────►  R2 (mannan-drops)
```

- **Site (Next.js)** renders the composer and the public `mannan.is/drop/<id>` pages in React with
  the existing Paper design system, reuses `readSiteSession()` for admin auth, and exposes
  `/api/drop/*` routes that call the worker server-to-server using the existing shared-secret
  pattern (`SITE_AUTH_EXCHANGE_SECRET`-style Bearer).
- **cloud-worker (Hono + D1 + R2)** owns all state and policy: it stores Drops in D1, enforces the
  policy, mints **presigned R2 upload URLs**, verifies uploads, logs activity, and sends Resend
  notifications. Single source of truth for identity, roles, and storage.
- **R2** holds the bytes. Uploads go **browser → R2 directly** via presigned URL; the worker never
  streams the bytes (this is what lets it scale past 100 MB).

Rationale: the recipient-facing link is `mannan.is/drop/…` (trustworthy, on-brand, not a
`workers.dev` URL); pages get real components; the worker stays the one place that knows who can do
what. The only cost is touching two codebases — which is already the norm here.

## 4. Upload mechanism — presigned, direct-to-R2

Files exceed 100 MB, so bytes never pass through the worker.

1. **Request** — browser asks the site `POST /api/drop/:id/presign` with `{filename, size, type}`.
   Site forwards to worker `POST /drops/:id/presign`.
2. **Validate (worker)** — checks the full policy (§7) *before* signing: Drop active & unexpired,
   participant within caps, `size ≤ max_file_bytes`, projected total `≤ max_total_bytes`, type
   allowed and not in the hard denylist.
3. **Presign (worker)** — generates an S3 SigV4 presigned `PUT` URL for
   `mannan-drops/drops/<id>/<participant>/<uuid>-<filename>` (via `aws4fetch`, Workers-friendly),
   short TTL (~10 min). Returns URL + object key.
4. **Upload** — browser `PUT`s the bytes **directly to R2**, with progress.
5. **Commit** — browser calls `POST /api/drop/:id/commit` with the object key. Worker does an **R2
   `HEAD`** to verify the object exists and read its **true size** (never trust the client), enforces
   total-quota again, writes a `share_events` row (`status='pending'` if hold-for-approval, else
   `'accepted'`), and fires the Resend notification.

**Now:** single presigned `PUT`, files ≤ 5 GB (R2 single-upload limit). **Later (M4):** chunked
**multipart** upload — browser splits the file, worker presigns each part and completes the upload.
The schema and flow are designed so this is an additive change (an `upload_id` + parts, no rework).

**Requires:** an R2 S3 API token → `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
(worker secrets), and a **CORS** rule on `mannan-drops` allowing `PUT` from `https://mannan.is`.

## 5. The dial-board (policy fields → `shares` columns)

| Dial | Default | Notes |
|---|---|---|
| title / note | — | shown on the recipient page |
| direction | `collect` | `collect` \| `distribute` \| `exchange` |
| access_mode | `passcode` | `named` \| `open` \| `passcode` |
| passcode | — | hashed at rest (§7) |
| require_name | on | ask for a name before uploading (attribution without full sign-in) |
| max_participants | 10 (open) / invited set (named) | distinct joiners |
| per_person_file_cap | 20 | max files per participant |
| single_use | off | close after first participant/upload |
| expiry | 14 days after creation | `absolute` date \| `created` + N \| `first_open` + N \| never |
| max_file_bytes | 2 GB | hard ceiling 5 GB (M1) |
| max_total_bytes | 20 GB | per-Drop quota |
| allowed_types | any | allowlist; `.exe/.bat/.sh/.cmd/.msi` always blocked |
| hold_for_approval | **on** for open/passcode, off for named | uploads stay `pending` until accepted |
| participants_visible | **off** for collect, on for exchange | can joiners see each other's files & names |
| notify_on_activity | on | Resend to `hello@mannan.is` per event |
| destination prefix | `drops/<id>/` | quarantined; never publicly served |

The two judgment calls (`hold_for_approval`, `participants_visible`) are what separate a private
inbox from a shared room; defaults above are the locked decisions.

## 6. Data model (new D1 migration on cloud-worker)

`folder_members` is membership-only and stays untouched. Drops get their own tables. `magic_tokens`
is **reused** by adding a third `purpose = 'share'` (zero schema change — the column already
discriminates `'cloud'`/`'site'`).

```sql
-- migrations/0003_drops.sql
CREATE TABLE shares (
  id                   TEXT PRIMARY KEY,           -- 16-char base62 public slug = /drop/<id>
  owner_email          TEXT NOT NULL,              -- hello@mannan.is (admin) for now
  direction            TEXT NOT NULL,              -- collect | distribute | exchange
  access_mode          TEXT NOT NULL,              -- named | open | passcode
  passcode_hash        TEXT,                       -- SHA-256(passcode + per-share salt), nullable
  passcode_salt        TEXT,
  title                TEXT,
  note                 TEXT,
  require_name         INTEGER NOT NULL DEFAULT 0,
  max_participants     INTEGER,                    -- null = unlimited
  per_person_file_cap  INTEGER,
  single_use           INTEGER NOT NULL DEFAULT 0,
  max_file_bytes       INTEGER,
  max_total_bytes      INTEGER,
  allowed_types        TEXT,                       -- JSON array; null = any (denylist still applies)
  hold_for_approval    INTEGER NOT NULL DEFAULT 1,
  participants_visible INTEGER NOT NULL DEFAULT 0,
  notify_on_activity   INTEGER NOT NULL DEFAULT 1,
  r2_prefix            TEXT NOT NULL,              -- drops/<id>/
  expiry_basis         TEXT,                       -- absolute | created | first_open | null(never)
  expires_at           INTEGER,                    -- resolved instant; null = never
  first_opened_at      INTEGER,
  used_bytes           INTEGER NOT NULL DEFAULT 0, -- running accepted total (quota)
  status               TEXT NOT NULL DEFAULT 'active', -- active | expired | closed | full
  created_at           INTEGER NOT NULL
);

CREATE TABLE share_participants (
  id         TEXT PRIMARY KEY,        -- participant id (also the cookie subject)
  share_id   TEXT NOT NULL,
  email      TEXT,                    -- null for anonymous/open
  name       TEXT,
  joined_at  INTEGER NOT NULL
);
CREATE INDEX idx_participants_share ON share_participants(share_id);

CREATE TABLE share_events (
  id             TEXT PRIMARY KEY,
  share_id       TEXT NOT NULL,
  participant_id TEXT,
  kind           TEXT NOT NULL,       -- upload | download | approve | reject
  object_key     TEXT,
  filename       TEXT,
  bytes          INTEGER,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_events_share ON share_events(share_id, created_at);
```

Drops are **runtime data in D1**, not a static `src/lib/*.ts` config module (those are for static
site content). The site reads/writes them only through the worker API.

## 7. Access, identity & security

- **Named** — `mintMagicToken(email, 'share')` + email via Resend; verify creates/looks-up a
  `share_participant` and issues a short-lived **scoped participant cookie** (separate from the admin
  `__Host-mannan-session`). Reuses `auth.ts` token machinery verbatim.
- **Open / passcode** — joining posts name (if `require_name`) and passcode; passcode is checked
  against `passcode_hash` with a constant-time compare and a dedicated **attempt rate-limiter**.
- **Link entropy** — 16-char base62 id (~95 bits); unguessable.
- **Policy enforcement at presign** — the single chokepoint: status, expiry (resolved per
  `expiry_basis`), participant cap, per-person file cap, per-file size, projected total, type
  allow/deny. **Commit re-verifies true size via R2 `HEAD`** and re-checks the total — an oversize or
  spoofed upload is rejected and the object deleted.
- **Hard denylist** — `.exe/.bat/.sh/.cmd/.msi` (and similar) always blocked regardless of allowlist.
- **Quarantine** — dedicated bucket **`mannan-drops`**, never publicly served, separate from
  `portfolio-files`. `hold_for_approval` keeps uploads `pending` until Mannan accepts.
- **Rate limits** — new CF rate-limit namespaces for presign (per IP + per participant), join/
  passcode attempts, and download; mirrors the existing auth limiters.
- **Privacy guardrail (hard)** — Drop data and `mannan-drops` contents must **never** enter the
  public MCP snapshot. Extend the existing `mcp-worker` build guards/tests to assert no Drop tables,
  keys, or `/drop/` data appear in `data.generated.json`.
- **Virus scanning** — out of scope for v1; mitigated by quarantine + approval + denylist + no
  public serving. Future: AV scan on accept before a file is downloadable.

## 8. Lifecycle & cleanup

- **States:** `active → {expired | closed | full}`. `closed` = single-use consumed; `full` =
  `used_bytes ≥ max_total_bytes` or participant cap reached.
- **Cleanup cron** — a Cloudflare **Cron Trigger** on the worker (daily): mark past-expiry Drops
  `expired`, delete their `mannan-drops` objects, and purge `share_events`/`participants` after a
  short grace window. Keeps storage and D1 bounded.
- **First-open** — `first_opened_at` set on first recipient page load (drives `first_open` expiry).

## 9. Notifications

Reuse `cloud-worker/src/email.ts` (Resend, from `cloud@mannan.is`). New template: "New upload to
<Drop title>" → sent to `hello@mannan.is` on each accepted/pending upload, with sender name, file,
size, and an approve/view link. `notify_on_activity` gates it. (Future: daily digest option.)

## 10. API surface

**Site (Next.js):**
- `POST /api/drops` (admin) — create; `GET /api/drops` (admin) — list + activity.
- `POST /api/drops/:id/approve` · `/reject` (admin).
- `GET /drop/:id` — SSR recipient page (variant by direction; passcode gate).
- `POST /api/drop/:id/join` — name/passcode → participant + scoped cookie.
- `POST /api/drop/:id/presign` · `POST /api/drop/:id/commit`.
- `GET /api/drop/:id/files` · `GET /api/drop/:id/download/:key` (distribute/exchange; visibility-filtered).

**cloud-worker (Bearer-guarded, server-to-server):**
- `POST /drops` · `GET /drops` · `POST /drops/:id/{presign,commit,approve,reject,join}` ·
  `GET /drops/:id` (policy + visibility-filtered file list) · `scheduled()` cron handler.

## 11. Testing strategy (incl. mutation testing)

Every E2E scenario must have a mutation it provably catches (per project standard).

- **Unit** — a pure `evaluatePolicy(share, participant, file)` returning allow/deny+reason; table-
  driven over every guard. Mutation: flip each comparison (`<` ↔ `<=`, drop a clause) → the matching
  test must go red.
- **Integration** — presign signs only when policy passes; commit's R2-`HEAD` rejects an oversize/
  spoofed file. Mutation: make commit trust the client-reported size → the oversize test must go red.
- **E2E (Playwright), the three flows:**
  - *Collect + passcode:* wrong code rejected; right code → upload → `pending` in admin → approve →
    `accepted`. Mutations: break the passcode check (must reject-test red); auto-accept instead of
    holding (the "still pending before approval" assertion red).
  - *Distribute:* download respects max-downloads & expiry. Mutation: ignore expiry → expired-link
    test red.
  - *Exchange:* `participants_visible=on` shows others' files; `off` hides them. Mutation: invert the
    visibility filter → both assertions red.
- **Privacy build-guard** — extend `mcp:check`/snapshot tests to assert no Drop data in the MCP.

Assertions pin exact values/counts/states (not loose tokens), so an off-by-one in code+test can't
both pass.

## 12. Build order (phased; model supports all from day one)

- **M1 — Collect (the heart):** schema + worker `/drops` API + presign/commit (single-PUT ≤5GB) +
  all three access modes + hold-for-approval + Resend notify + admin list/approve + recipient upload
  page + cleanup cron + privacy guard + full test suite.
- **M2 — Distribute:** outbound file selection + presigned/streamed download + download caps
  (reuses the existing `/files` serving as a template).
- **M3 — Exchange:** `participants_visible`, shared file list UI, two-way page.
- **M4 — Multipart upload** (>5 GB), resumable.
- **Later:** AV scanning, notification digests, a second admin (today admin is the hardcoded
  `hello@mannan.is`), richer per-type policies.

## 13. Reuse map (grounded in current code)

- `cloud-worker/src/auth.ts` — `mintMagicToken`/`consumeMagicToken` (+ `'share'` purpose),
  `hashSecret` (passcode), session/cookie helpers.
- `cloud-worker/migrations/0003_drops.sql` — new tables (after `0001`, `0002`).
- `cloud-worker/src/index.ts` — new `/drops` routes + `scheduled()` cron.
- `cloud-worker/src/email.ts` — Resend notify (new template).
- `cloud-worker/src/admin.ts` — admin list/approve endpoints.
- `cloud-worker/wrangler.jsonc` — `DROPS` R2 binding (`mannan-drops`), R2 S3 secrets, new
  rate-limit namespaces, cron trigger.
- Site: `src/app/drop/[id]/page.tsx`, `src/app/api/drops/*`, `src/app/api/drop/[id]/*`,
  `src/lib/drops.ts` (types + worker client), `src/lib/cloudflare-auth.ts` (extend for Drops),
  `src/lib/rate-limit.ts` (new limiter), composer under the admin/auth surface.
- New worker dep: `aws4fetch` for S3 SigV4 presigning.

## 14. Open items (deferred, not blocking M1)

- Exact multipart chunk size / resumability UX (M4).
- Whether to keep an immutable audit log of rejected uploads or hard-delete.
- AV scanning provider, if added.
- Second-admin support (today: hardcoded `hello@mannan.is`).
