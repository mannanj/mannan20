# `/cloud` — Cloudflare architecture

Magic-link gated file sharing, sitting entirely on Cloudflare. The portfolio site (Vercel/Next.js) only contributes a single redirect: `mannan.is/cloud → cloud-worker.mannanteam.workers.dev`. Everything below that URL is one Worker.

> Source code: [`cloud-worker/`](../cloud-worker)
> Live: https://cloud-worker.mannanteam.workers.dev

## Why a separate Worker (not Next.js routes)

- **Egress-free downloads.** R2 charges $0 for data leaving the bucket. Routing downloads through a Vercel function would either (a) cost Vercel bandwidth, or (b) need pre-signed URLs that complicate auth. A Worker streams the R2 object body directly back to the user with no transit cost.
- **Edge auth.** Magic-link verification, HMAC cookie checks, and ACL lookups happen in V8 isolates at the Cloudflare edge — single-digit-ms latency.
- **Isolation.** A bug in the file-sharing Worker can't take down the portfolio. They share nothing — no database, no deployment, no build pipeline.

## Components at a glance

| Component | Cloudflare service | Why it's used | Binding |
|---|---|---|---|
| HTTP router & handlers | **Workers** (Hono) | Edge JS runtime, per-request V8 isolate | n/a |
| User / membership tables | **D1** (SQLite) | Tiny relational data; ~3 tables, low writes | `DB` |
| File storage | **R2** | Free egress, S3-compatible API, no per-GB transit cost | `FILES` |
| Magic-link rate limiting | **Rate Limiting** binding | Protects `/auth/request` & `/auth/verify` from abuse | `REQUEST_LIMITER`, `VERIFY_LIMITER` |
| Folder listing cache | **Cache API** (`caches.default`) | Avoids `R2.list()` on every page-load | n/a |
| Magic-link email delivery | **Resend** (third-party) | CF doesn't ship transactional email; Resend HTTP API is the simplest path | secret `RESEND_API_KEY` |
| Account-level subdomain | `mannanteam.workers.dev` | Renamed from auto-generated; `.is` TLDs unsupported by CF DNS so a custom `cloud.mannan.is` was not possible | n/a |

## R2 specifically

**Bucket:** `portfolio-files` (binding `FILES`).

**Layout:** flat object keys with folder prefixes. Folders aren't a real R2 concept — they're string prefixes. The folder allowlist lives in code (`FOLDERS` in `src/auth.ts`), not in the bucket.

```
portfolio-files/
  general/welcome.txt
  general/spaced name.txt   # spaces are fine in keys
  hans/readme.txt
```

**Operations and how the Worker triggers them:**

| Worker action | R2 method | Class | Cost / million |
|---|---|---|---|
| Folder listing (`/cloud/:folder`) | `FILES.list({ prefix })` | **A** | $4.50 |
| Upload (`/admin/upload`) | `FILES.put(key, stream)` | **A** | $4.50 |
| Download (`/files/:folder/:name`) | `FILES.get(key)` | **B** | $0.36 |
| Admin delete (via wrangler) | `R2.delete(key)` | Free | — |

**Free tier (per month):** 10 GB stored, 1M Class A ops, 10M Class B ops, **unlimited egress**. At the current scale, none of this is approached.

**Storage class:** Standard (`$0.015/GB-month`). Infrequent Access exists (`$0.01/GB-month`) but trades cheaper storage for more expensive ops (2× Class A, 2.5× Class B) and a 30-day minimum retention. Not worth it here.

**Streaming model:** the download handler returns `new Response(obj.body, …)` — the R2 stream is piped straight to the client, never buffered in memory. Works for files up to R2's per-object cap (~5 TB) without the Worker's CPU/memory limits mattering.

**Why no presigned URLs (yet):** signed URLs require trusting the URL itself; this Worker prefers a session cookie + per-request ACL check on every download. If file sizes ever grow past ~100 MB and the Worker request budget becomes a concern, switching to presigned URLs is straightforward — generate a short-lived signed URL inside `/files/:folder/:name`, return a 302 to it, and let R2 stream directly.

## Workers specifically

**Runtime:** Cloudflare Workers, V8 isolate (not Node.js). Web standard `Request`/`Response` only — no `fs`, no `process`, no Node modules without compatibility flags.

**Framework:** [Hono](https://hono.dev) — small router (~14 KB) built around the Web platform. Used here for routing, middleware, and form/JSON parsing. Express does not work in Workers; Hono is the standard pick.

**Entrypoint:** `src/index.ts` exports a `Hono<{ Bindings: Env }>()` app whose `default` export is the Worker fetch handler. Wrangler bundles via esbuild on `wrangler deploy`.

**Bindings (declared in `wrangler.jsonc`):**

```jsonc
{
  "main": "src/index.ts",
  "d1_databases": [{ "binding": "DB", "database_name": "cloud", "database_id": "…" }],
  "r2_buckets":  [{ "binding": "FILES", "bucket_name": "portfolio-files" }],
  "ratelimits":  [
    { "name": "REQUEST_LIMITER", "namespace_id": "1001", "simple": { "limit": 5,  "period": 60 } },
    { "name": "VERIFY_LIMITER",  "namespace_id": "1002", "simple": { "limit": 10, "period": 60 } }
  ],
  "vars": { "RESEND_FROM": "…", "PUBLIC_BASE_URL": "…" }
}
```

Bindings appear on `c.env` inside handlers. They're injected at runtime — no SDK initialization, no credentials in code.

**Secrets:** stored separately from `wrangler.jsonc`, set via `wrangler secret put NAME`. The two used here are `SESSION_SECRET` (HMAC key for the auth cookie) and `RESEND_API_KEY`.

**Deploy:** `wrangler deploy` from `cloud-worker/`. Each deploy creates a new immutable version; `wrangler deployments list` shows them. Rollback = `wrangler rollback --version-id <id>`.

**Observability:** `observability.enabled = true` in `wrangler.jsonc` ships logs to the CF dashboard. Live tail with `wrangler tail cloud-worker --format=pretty`.

**workers.dev gotcha:** requests to `*.workers.dev` URLs reject non-browser User-Agents with 403. CLI testing requires `-A "Mozilla/5.0"`. Custom domains (when available) bypass this.

## D1

Three tables, all touched on most authenticated requests:

```sql
users(email PK, role, created_at)
magic_tokens(token PK, email, expires_at)
folder_members(email, folder, PK(email, folder))
```

- `users` — admin/client roster. ~2 admins, N clients.
- `magic_tokens` — short-lived (15 min); `consumeMagicToken` deletes the row before validating expiry, so tokens are single-use even on race conditions.
- `folder_members` — the ACL. Admins bypass this table (role check short-circuits). Clients must have a row per folder they can access.

**Migrations** live in `cloud-worker/migrations/0001_init.sql`. Apply with `wrangler d1 migrations apply cloud --remote`.

**Free tier:** 5M reads/day, 100k writes/day, 5 GB stored. Trivial usage here.

## Rate Limiting

Native Cloudflare Rate Limiting bindings — not a third-party package. Each binding has a `namespace_id` and a `simple` policy (`limit` requests per `period` seconds). Called from handlers as:

```ts
const limit = await c.env.REQUEST_LIMITER.limit({ key: `req:${ip}` });
if (!limit.success) return /* 429 */;
```

The `key` is what the limiter buckets by — IP for unauthenticated endpoints. The CF rate limiter is **approximate** (best-effort, edge-distributed); a small burst may slip through before the limit kicks in. This is acceptable for magic-link abuse prevention, where exact precision isn't required.

## Auth (stateless HMAC cookie)

No session table. The cookie *is* the session:

```
__Host-session=<base64url(payload)>.<base64url(HMAC-SHA256(payload))>
payload = { email, exp }
```

- `__Host-` prefix forces `Secure; Path=/; no Domain attribute` — browser-enforced hardening
- `HttpOnly; SameSite=Lax` blocks JS access and most CSRF
- HMAC signed with `SESSION_SECRET`; verified on every request in middleware
- 30-day TTL embedded in payload — also enforced via cookie `Max-Age`
- **Revocation** = rotate `SESSION_SECRET`. Everyone signs in again.

Magic links are single-use 32-byte tokens stored in D1 with a 15-min expiry. `consumeMagicToken` deletes-then-validates, so a token clicked twice always fails the second time.

## Listing cache (added 2026-04-28)

The `/cloud/:folder` route used to call `FILES.list()` on every request. Each call was a Class A op ($4.50/M). Now:

```ts
// src/index.ts
const cacheKey = listingCacheKey(folder);  // https://cache.local/listing/<folder>
const hit = await caches.default.match(cacheKey);
if (hit) {
  files = await hit.json();
} else {
  files = (await env.FILES.list({ prefix: `${folder}/` })).objects.map(…);
  ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(files), {
    headers: { 'cache-control': 's-maxage=300' },
  })));
}
```

**Key choices:**

- **Cache the listing JSON, not the rendered HTML.** The HTML embeds the user's email; the listing data is identical for every authorized viewer. Render per-user, cache per-folder.
- **5-min TTL** (`s-maxage=300`). Long enough to absorb refresh bursts, short enough that any failed purge resolves quickly. Acts as a safety net — explicit purge does the real invalidation.
- **Synthetic cache key** (`https://cache.local/listing/<folder>`) instead of the raw request. The raw request varies on auth headers, so we'd never get a hit. The synthetic key normalizes across users.

**Invalidation on upload** (`src/admin.ts`):

```ts
ctx.waitUntil(caches.default.delete(listingCacheKey(folder)));
```

After a `FILES.put`, the next `/cloud/:folder` request misses cache, lists R2, and re-populates with the fresh entry.

**Caveats:**

1. **Cache API is per-colo.** The purge only clears the colo serving the upload request. Visitors on other CF edge locations may see a stale listing for up to the TTL. For ~handful of users this is essentially never observable; for global instant invalidation we'd need either Cache Tags (Enterprise plan) or moving to KV/D1 as the cache.
2. **Bypass paths don't trigger purge.** Uploading via `wrangler r2 object put` or deleting via `wrangler r2 object delete` skips the Worker entirely, so no purge runs. The TTL takes over (max 5 min staleness). Same applies if a delete-via-Worker route is ever added — it must also call `caches.default.delete(...)`.
3. **Stale listing ≠ broken download.** If a deleted file is still in the cached listing, clicking it triggers `FILES.get(key)` → R2 returns null → existing 404 handler. The download path bypasses the cache entirely, so listings can lie but downloads are always authoritative.

## Resend (not Cloudflare, but in the loop)

Magic-link emails ship from `cloud@mannan.is` via Resend's HTTP API. Sender-domain DKIM/SPF/DMARC live at the existing DNS host (Resend doesn't require Cloudflare DNS, which is fortunate since `.is` isn't supported by CF). Free tier: 3k emails/mo, 100/day.

If Resend ever goes down or hits a quota, magic-link sign-in fails closed — no fallback (no SMS, no backup channel). Acceptable given the user count.

## Total cost at current scale

**$0/month.** R2 storage well under 10 GB free; Class A/B ops well under their free tiers; egress is unconditionally free; Workers requests under the 100k/day free tier; D1 trivial; Resend under 3k emails. The Workers Paid plan ($5/mo) would unlock 10M Workers requests, no daily cap, and longer CPU limits — not currently needed.

The cache layer's primary role is *not* cost reduction (we're nowhere near caps) but **shape**: keep listings from scaling linearly with traffic, so an unexpected refresh storm or aggressive client doesn't suddenly burn through Class A ops or hammer R2.

## Other important details

- **Folder allowlist is a code constant.** Adding a folder requires a code change (`FOLDERS` in `src/auth.ts`) + redeploy + grants in `folder_members`. Intentional — folders are a structural decision, not user data.
- **No admin UI.** Inviting/granting/revoking/uploading is curl-against-`/admin/*` or wrangler. Trade-off: zero UI surface to maintain or harden, at the cost of admin ergonomics.
- **No file deletion route.** Deletes go through wrangler. Adding a Worker route is straightforward but would need to also purge the listing cache (same pattern as upload).
- **mannan.is/cloud is just a 308 redirect** in the Next.js app (commits `8fd9e77`, `b3b497e`) — there's no other Vercel/Next.js code path involved in `/cloud`.
- **All admin endpoints require an `__Host-session` cookie from a user with `role='admin'`** — there's no API token. Admin = log in, then your cookie is the credential.

## Operational quick reference

```bash
# Inspect users / folder_members
wrangler d1 execute cloud --remote --command "SELECT * FROM users"
wrangler d1 execute cloud --remote --command "SELECT * FROM folder_members"

# Deploy
cd cloud-worker && wrangler deploy

# Live tail
wrangler tail cloud-worker --format=pretty

# List R2 objects (wrangler v4 — Worker route is preferred)
wrangler r2 object list portfolio-files --remote

# Bypass-upload (won't purge listing cache; max 5min staleness)
wrangler r2 object put portfolio-files/general/foo.pdf --file=./foo.pdf --remote

# Rotate session secret (forces sign-out for everyone)
openssl rand -hex 32 | wrangler secret put SESSION_SECRET
```
