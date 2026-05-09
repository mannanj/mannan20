# Visitation Logging — Architecture & Operations

How page-load and route-change traffic gets captured into Cloudflare D1, and how to operate / extend the system.

Built 2026-05-09. Companion doc: `docs/cloud-cloudflare-architecture.md` (the unrelated `cloud-worker` for file sharing).

---

## 1. The shape, in one diagram

```
Browser
  │  (real client IP visible in x-forwarded-for)
  ▼
Vercel Edge ── runs src/middleware.ts on every page request
  │              ├─ skips: prefetch hits, static assets, api/, og-image, etc.
  │              ├─ extracts real IP from x-forwarded-for[0]
  │              ├─ continues serving the page (NextResponse.next())
  │              └─ event.waitUntil(
  │                    fire-and-forget POST → worker
  │                    Header: x-real-ip = <real client IP>
  │                 )
  │                                          │
  │                                          ▼
  │                       Cloudflare Worker: visits-worker
  │                       (https://visits-worker.mannanteam.workers.dev/v)
  │                          ├─ verifies bearer secret
  │                          ├─ prefers x-real-ip over cf-connecting-ip
  │                          │  (cf-connecting-ip would be Vercel's egress)
  │                          ├─ rate-limits per IP (120 / 60s)
  │                          ├─ hashes IP with rotating salt
  │                          ├─ classifies device from UA
  │                          ├─ pulls country from req.cf
  │                          └─ INSERT … WHERE NOT EXISTS (2s dedupe)
  │                                          │
  ▼                                          ▼
Page rendered                             D1: `visits`
to user                                   table on same Cloudflare account
                                          query via `bun run visits:recent`
```

The middleware does NOT block the response. It returns immediately and uses `event.waitUntil` to keep the worker fetch alive past the response — same pattern as analytics beacons.

---

## 2. Why this stack, in one paragraph each

**Why a Cloudflare Worker as a sidecar.** D1 has no public HTTP API; it can only be accessed via a binding inside a CF Worker or Pages function. Vercel-hosted Next.js cannot bind to D1 directly. So we built a 100-line Worker as the bridge. The Worker is the only thing that talks to D1; everything else (Next.js, dashboards, scripts) talks to the Worker.

**Why D1 vs Vercel Postgres / Upstash / Blob.** D1 is on the same account as the user's existing Workers (`cloud-worker`, `vision-board`), free for 100K writes/day on Workers Paid, and SQL is the right tool for analytics queries (time windows, group-by, indexes). Postgres would be overkill; Upstash Redis isn't designed for analytical queries.

**Why a separate D1 database (not reusing `cloud`).** Different lifecycle. The `cloud` DB stores auth state for the file-sharing magic-link flow — losing it logs people out. The `visits` DB is append-only telemetry — wiping it has no user impact. Separating them lets each be backed up, rotated, sized, or even moved regions independently.

**Why a separate worker (not extending `cloud-worker`).** Reliability isolation. If `visits-worker` gets DOSed or hits a bug, `cloud-worker` (which gates real user file access) keeps running. Also keeps each worker's bundle small and rate-limits independent.

**Why middleware (not a client-side `usePathname` effect).** Middleware runs server-side on Vercel Edge, sees every request — including bots, JS-disabled, and the RSC fetches that App Router uses for soft client navigation. A client effect misses bots and runs only on humans with JS enabled. Middleware also has access to real request headers (IP, UA, Vercel geo, prefetch hints) before the response is sent.

**Why fire-and-forget.** The user's page load must not wait on logging. `event.waitUntil` lets the request return immediately while the worker call finishes asynchronously on the edge.

---

## 3. File layout

```
visits-worker/                     ← Cloudflare Worker project
├── wrangler.jsonc                 D1 binding, rate limiter, observability
├── package.json                   wrangler scripts (deploy, db:*, tail)
├── tsconfig.json
├── .gitignore                     ignores .wrangler/, .dev.vars
├── .dev.vars                      LOCAL secrets, never committed
├── .dev.vars.example              template for new clones
├── migrations/
│   └── 0001_init.sql              CREATE TABLE visits + indexes
└── src/
    └── index.ts                   single fetch handler — auth, hash, insert

src/middleware.ts                  ← lives in the main Next.js app
.env.local                         ← VISITS_WORKER_URL + VISIT_SECRET (untracked)
package.json                       ← bun run visits:* aliases
```

---

## 4. The schema

```sql
CREATE TABLE visits (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,          -- epoch ms
  route     TEXT    NOT NULL,
  ip_hash   TEXT,                       -- sha256(ip + IP_SALT), first 12 hex chars
  country   TEXT,                       -- ISO 2-letter from req.cf.country
  device    TEXT,                       -- mobile | tablet | desktop | bot | unknown
  ua        TEXT,                       -- raw user-agent (truncated to 1024 chars)
  referrer  TEXT,                       -- HTTP Referer header
  is_rsc    INTEGER NOT NULL DEFAULT 0  -- 1 for App Router soft navigation
);

CREATE INDEX idx_visits_ts      ON visits(ts DESC);
CREATE INDEX idx_visits_route   ON visits(route);
CREATE INDEX idx_visits_country ON visits(country);
```

**Privacy note.** Raw IP is never stored. `ip_hash` is `sha256(ip + IP_SALT)` truncated to 12 hex chars (~48 bits — enough to dedupe and detect abuse, not enough to reverse-lookup). To rotate: change the `IP_SALT` worker secret; new visits will hash differently, old hashes become orphaned (which is the desired forgetting behavior).

---

## 5. Setup, repeatable from scratch

```bash
# 1. Create the D1 database (one-time, captures database_id)
cd visits-worker
bunx wrangler d1 create visits

# 2. Paste database_id into wrangler.jsonc → d1_databases[0].database_id

# 3. Apply migration
bun run db:migrate          # remote
bun run db:migrate:local    # local dev

# 4. Generate two secrets and store them in .dev.vars
{
  echo "VISIT_SECRET=$(openssl rand -hex 32)"
  echo "IP_SALT=$(openssl rand -hex 32)"
} > .dev.vars

# 5. Deploy the worker so the script exists on Cloudflare
bun run deploy

# 6. Push secrets to the deployed worker (use printf to avoid trailing newline)
printf '%s' "$(grep '^VISIT_SECRET=' .dev.vars | cut -d= -f2)" \
  | bunx wrangler secret put VISIT_SECRET
printf '%s' "$(grep '^IP_SALT=' .dev.vars | cut -d= -f2)" \
  | bunx wrangler secret put IP_SALT

# 7. Add the same VISIT_SECRET + worker URL to the Next.js app
# .env.local (untracked) and Vercel Environment Variables (Production + Preview)
VISITS_WORKER_URL=https://visits-worker.mannanteam.workers.dev/v
VISIT_SECRET=<same value as the worker secret>
```

**On Vercel:** add via dashboard or `vercel env add VISIT_SECRET production` and `vercel env add VISITS_WORKER_URL production` (then `preview`). Production logging won't fire until both are set.

---

## 6. Day-to-day operations

### Querying

From repo root (alias scripts in main `package.json`):
```bash
bun run visits:recent      # last 50 visits, newest first
bun run visits:top         # top 20 routes in the last 24h
bun run visits:tail        # stream live worker logs (wrangler tail)
bun run visits:deploy      # redeploy worker after editing src/index.ts
```

From inside `visits-worker/`:
```bash
bun run db:recent
bun run db:top
bun run db:migrate
bun run tail
```

For ad-hoc SQL, the CF dashboard has a D1 console:
`Workers & Pages → D1 → visits → Console`

### Useful queries to keep around

```sql
-- Visits per day, last 30 days
SELECT date(ts/1000,'unixepoch') as day, COUNT(*) c
FROM visits
WHERE ts > (strftime('%s','now')-2592000)*1000
GROUP BY day ORDER BY day DESC;

-- Country breakdown last 24h, excluding bots
SELECT country, COUNT(*) c
FROM visits
WHERE ts > (strftime('%s','now')-86400)*1000 AND device != 'bot'
GROUP BY country ORDER BY c DESC;

-- Hard loads vs soft nav per article
SELECT route,
       SUM(CASE WHEN is_rsc=0 THEN 1 ELSE 0 END) hard,
       SUM(CASE WHEN is_rsc=1 THEN 1 ELSE 0 END) soft
FROM visits
WHERE route LIKE '/garden/article/%'
GROUP BY route;

-- Unique visitors (by ip_hash) last 7d
SELECT COUNT(DISTINCT ip_hash) FROM visits
WHERE ts > (strftime('%s','now')-604800)*1000;
```

### Editing the worker

```bash
cd visits-worker
# edit src/index.ts
bun run dev        # local dev server with .dev.vars
# test, then:
bun run deploy
```

### Editing the schema

```bash
cd visits-worker
bunx wrangler d1 migrations create visits add_user_id
# edit migrations/0002_add_user_id.sql
bun run db:migrate:local   # try locally
bun run db:migrate         # apply to remote
```

### Rotating IP_SALT

```bash
cd visits-worker
printf '%s' "$(openssl rand -hex 32)" | bunx wrangler secret put IP_SALT
# also update .dev.vars to match for local dev
```

After rotation, old `ip_hash` values can no longer be cross-referenced with new visits — same IP will hash differently. This is intentional.

---

## 7. The middleware itself

Lives at `src/middleware.ts` in the main Next.js app. Three responsibilities:

1. **Filter out non-user requests** via the `matcher` config:
   - `api/*`, `_next/static`, `_next/image`, `favicon.ico`, `robots.txt`, `sitemap.xml`
   - `manifest.webmanifest`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon` (Next.js metadata file conventions)
   - Anything with a file extension (`.*\\..*`)

2. **Filter out prefetch hits** via headers (matcher can't see headers):
   - `next-router-prefetch`
   - `purpose: prefetch`
   - `sec-purpose: prefetch` (Speculation Rules API)

3. **Detect RSC soft navigation** so we can distinguish from hard loads:
   - `RSC: 1` header
   - `next-router-state-tree` header (App Router)
   - `?_rsc=…` query param

The fire-and-forget POST itself is a single `fetch(...)`; the response body is ignored, errors are swallowed (logging must never break the page).

---

## 8. Gotchas hit during implementation

**`wrangler secret put` and trailing newlines.** Piping with `cat` or `grep | cut` includes the trailing `\n`, which gets stored as part of the secret value. Bearer-token comparisons then fail with 401. **Fix:** use `printf '%s' "..."` or `tr -d '\n'` before piping.

**The project's `dev` script kills port 3847.** `package.json` has `"dev": "lsof -ti:3847 | xargs kill -9 ..."`. Running `bun run dev` (especially in the background) will silently terminate any existing dev server on 3847. If the user runs a persistent server, never start your own without coordinating.

**Middleware doesn't pick up env-var changes without a restart.** Adding `VISITS_WORKER_URL` / `VISIT_SECRET` to `.env.local` requires `bun run dev` to be restarted. Hot reload doesn't reload `process.env`.

**App Router emits multiple RSC requests per soft nav.** Layout, page, and error boundaries can each trigger their own RSC fetch. We dedupe in the worker (`WHERE NOT EXISTS … ts > now-2000`) keyed on `(ip_hash, route)`. The 2s window was chosen to be longer than any reasonable RSC burst but shorter than a deliberate refresh.

**Next.js 15.1 uses `middleware.ts`. Next 16 renames it to `proxy.ts`.** The validation hook keeps recommending the rename — only act on it after upgrading to Next 16.

**Vercel doesn't surface real client IP the same way Cloudflare does.** Inside Vercel Edge middleware, `req.headers.get('x-forwarded-for')` carries the real client IP (first comma-separated entry). Inside the Cloudflare Worker, the natural source is `cf-connecting-ip` — but in this architecture the Worker's caller is *Vercel*, not the browser, so `cf-connecting-ip` would resolve to a Vercel egress IP. **Solution in place:** middleware extracts the real IP from `x-forwarded-for` and forwards it to the Worker as `x-real-ip`; the Worker prefers `x-real-ip` over `cf-connecting-ip`. Without this, every visit would hash to a small set of Vercel datacenter IPs, breaking dedupe and `COUNT(DISTINCT ip_hash)` analytics.

**CORS on the worker is wide-open.** Only the bearer secret authenticates. Acceptable for a server-to-server call, but if you ever invoke the endpoint from a browser, lock CORS down to your origin.

---

## 9. Cost shape (Workers Paid plan, $5/mo)

| Resource | Limit on Paid | Visitation usage at 1K visits/day |
|---|---|---|
| Worker requests | 10M/mo included | ~30K/mo (0.3%) |
| D1 rows written | 50M/mo included | ~30K/mo (0.06%) |
| D1 rows read | 25B/mo included | trivial |
| D1 storage | 5 GB included | ~6 MB/yr at this rate |

Even at 100× traffic, this stays in the included tier. The rate limiter (120 req/60s per IP) caps damage from a runaway client or malicious flooder.

---

## 10. Known limitations & future improvements

- **No dashboard UI.** Today: SQL via CLI or CF console. Future: gated `/dashboard` route on `visits-worker` (basic auth or magic-link reusing `cloud-worker`'s pattern).
- **No retention policy.** Table grows forever. Cron-trigger that deletes rows older than N days would be ~10 lines of SQL inside a scheduled handler.
- **No bot filter at write time.** Bots are tagged `device='bot'` but still inserted. Two options later: (a) drop them in the worker, (b) keep them and filter at query time. Currently doing (b) — easier to inspect later.
- **No country-level filtering.** All countries logged equally. If GDPR posture tightens, can drop EU rows entirely or coarsen IP_hash to a daily bucket only.
- **No sampling.** At extreme traffic, sample rate could be added in middleware (`Math.random() < 0.1`) to keep D1 writes bounded. Not needed at portfolio scale.

---

## 11. Touch points if you ever change something

| Change | Files to edit |
|---|---|
| Add a column to `visits` | `migrations/000N_*.sql`, `src/index.ts` (INSERT), update queries |
| Change matcher (which routes log) | `src/middleware.ts` → `config.matcher` |
| Change dedupe window | `src/index.ts` → `DEDUPE_WINDOW_MS` |
| Change rate limit | `wrangler.jsonc` → `ratelimits[0].simple` |
| Rotate secrets | `wrangler secret put` for worker, Vercel env vars for app, `.env.local` for local dev |
| Add a query alias | `visits-worker/package.json` → scripts, then mirror in root `package.json` |
| Move to a different worker URL / domain | `wrangler.jsonc` → `routes`, then update `VISITS_WORKER_URL` everywhere |
