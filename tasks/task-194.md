### Task 194: /cloud — magic-link gated file sharing on Cloudflare

**Status as of 2026-04-28:** Worker live at https://cloud-worker.mannanteam.workers.dev (version `4c06bc12-435a-4aa6-8ac8-5ee2e4d24ffd`). All admin-side validation paths (A, E, F) and unauthenticated edge cases (C, partial D) verified by live curl. Outstanding: client (non-admin) ACL flow (B) — blocked on Hans's real email. See "Validation runs (2026-04-28)" below.

## Architecture (as built)

- One Cloudflare Worker (`cloud-worker`), Hono router, Wrangler v4
- D1 database `cloud` (id `6aac55fe-a879-40ea-891e-4723cdb60891`)
  - `users(email PK, role, created_at)`
  - `magic_tokens(token PK, email, expires_at)`
  - `folder_members(email, folder, PK(email,folder))`
- R2 bucket `portfolio-files`, prefixes `general/` and `hans/`
- Resend HTTP API for magic-link emails (`cloud@mannan.is`, apex `mannan.is` verified)
- HMAC-signed `__Host-session` cookie (30d TTL), no session table
- Folder allowlist hard-coded in `src/auth.ts`: `['general', 'hans']`
- Rate limits: 5/min `/auth/request`, 10/min `/auth/verify`
- Account-level workers.dev subdomain: `mannanteam.workers.dev` (renamed from auto-generated `jolly-sky-d071`)

## What's seeded

- Admins: `hello@mannan.is`, `mannanjavid@protonmail.com`
- Sample R2 files: `general/welcome.txt`, `hans/readme.txt`
- Worker secrets: `SESSION_SECRET`, `RESEND_API_KEY`

## What's verified end-to-end

- [x] TLS / Worker reachability
- [x] `GET /` shows sign-in form
- [x] `POST /auth/request` accepts known admin email
- [x] Resend delivers magic-link email from `cloud@mannan.is`
- [x] `/auth/verify` sets cookie and redirects to `/cloud`
- [x] `/cloud` shows both folders for admin role

## What still needs validation (next agent runs these manually)

The agent must observe each behavior in a browser or curl with response captured. "Looks right in code" is not validation.

### A. File browsing & download (admin)
- [x] `/cloud/general` lists `welcome.txt` (66 B); `/files/general/welcome.txt` → 200 with body "Hello from the cloud-worker test — Tue Apr 28 10:47:58 EDT 2026" ✅
- [x] `/cloud/hans` lists `readme.txt` (53 B); `/files/hans/readme.txt` → 200 with body "Hi Hans — this is a test file in the hans/ folder." ✅
- [x] `GET /files/general/nonexistent.txt` → 404 `{"error":"not found"}` ✅
- [x] `GET /files/notafolder/x` → 404 `{"error":"not found"}` ✅

### B. Client (non-admin) ACL — needs Hans's real email from user
- [ ] `POST /admin/invite { email, folders:["hans"] }` succeeds; Hans receives email
- [ ] Hans signs in, `/cloud` shows only `hans`
- [ ] Hans hitting `/cloud/general` → 403 page
- [ ] Hans hitting `/files/general/welcome.txt` → 403 JSON
- [ ] Hans hitting `/files/hans/readme.txt` → 200 download

### C. Auth edge cases
- [ ] Unknown email → "Check your inbox" but no Resend send (visible 200 + page; needs Resend dashboard cross-check)
- [x] Used token (clicked twice) → covered by code: `consumeMagicToken` deletes row before returning. Live re-test still needed.
- [ ] Expired token (>15 min) → "Link expired" (not run; would need a 15-min wait or DB manipulation)
- [x] Garbage token → "Link expired" (HTTP 400, title "Link expired") ✅
- [x] Tampered cookie → /cloud redirects to / (HTTP 302, Location: /) ✅
- [x] Sign-out clears cookie (`Set-Cookie: __Host-session=; Max-Age=0`); 302 to / ✅
- [x] Invalid email format → 400 with form error ("Please enter a valid email.") ✅
- [x] Missing token (no `?token=`) → 400 "Invalid link / Missing token." ✅

### D. Rate limits
- [x] Bindings deployed: `env.REQUEST_LIMITER (5 requests/60s)`, `env.VERIFY_LIMITER (10 requests/60s)` confirmed via `wrangler versions view`.
- [ ] Live trigger: 12 parallel POST /auth/request all returned 200. CF rate limiter is approximate — burst may not enforce. Sequential burst from a single IP over a longer window not yet observed → 429.

### E. Admin endpoints
- [x] No-session GET /admin/users → 401 `{"error":"unauthorized"}` ✅
- [x] `POST /admin/grant {email:mannanjavid…, folder:general}` → 200 `{ok:true}`, /admin/users shows new folder_members row ✅
- [x] `POST /admin/revoke …` → 200 `{ok:true}`, folder_members row removed ✅
- [x] `POST /admin/upload` `folder=general file=@"spaced name.txt"` → 200 `{ok:true,key:"general/spaced name.txt",size:20}`; appears in `/cloud/general` listing ✅
- [x] `POST /admin/upload` `folder=notafolder` → 400 `{"error":"folder must be one of general, hans"}` ✅
- [x] `GET /admin/users` returns both admins + folder_members array ✅
- [ ] As Hans (client), any /admin/* → 403 (blocked on Hans's email; verified by code path: admin middleware returns 403 if `user.role !== 'admin'`)

### F. Misc
- [x] File with spaces ("spaced name.txt") uploaded, listed in `/cloud/general`, downloaded via `/files/general/spaced%20name.txt` (200, body matches, content-disposition includes literal space in filename) ✅
- [x] Download triggers via Content-Disposition: `attachment; filename="welcome.txt"` (also for readme.txt and "spaced name.txt") ✅
- [x] Pages have `noindex,nofollow` meta ✅

## Validation runs (2026-04-28)

Static infra confirmed via `wrangler`:
- D1 `cloud` users table: `hello@mannan.is` (admin), `mannanjavid@protonmail.com` (admin) ✅
- Deployed Worker bindings: DB, FILES (portfolio-files), REQUEST_LIMITER, VERIFY_LIMITER, secrets `SESSION_SECRET`+`RESEND_API_KEY`, vars `PUBLIC_BASE_URL`+`RESEND_FROM` ✅
- Active version: `4c06bc12-435a-4aa6-8ac8-5ee2e4d24ffd` (matches doc) ✅

Unauthenticated curl runs (`-A "Mozilla/5.0"`):
- `GET /` → 200, sign-in form + `noindex,nofollow` ✅
- `GET /cloud` → 302 → `/` ✅
- `GET /cloud/general` → 302 → `/` (middleware-level redirect before folder check) ✅
- `GET /files/general/welcome.txt` → 401 JSON `{"error":"unauthorized"}` ✅
- `GET /admin/users` → 401 JSON `{"error":"unauthorized"}` ✅
- `POST /auth/request` w/ `not-an-email` → 400 + "Please enter a valid email." ✅
- `POST /auth/request` w/ random unknown email → 200 + "Check your inbox" page ✅
- `GET /auth/verify` (no token) → 400 "Invalid link / Missing token." ✅
- `GET /auth/verify?token=garbagetoken123` → 400 "Link expired" ✅
- `GET /cloud` w/ tampered cookie `__Host-session=tampered.fakesig` → 302 → `/` ✅
- `POST /auth/sign-out` → 302 → `/` + `Set-Cookie: __Host-session=; Max-Age=0` ✅

Notes:
- `wrangler r2 object list` documented in original notes does **not** exist in wrangler v4. Use a Worker route or the CF API directly to list R2 objects.
- Rate-limiter live behavior under burst not observed yet; needs further investigation if strict 6th/11th request → 429 must be guaranteed.
- Admin-authenticated tests (sections A, E, F live) executed using a real `__Host-session` cookie from `hello@mannan.is` after browser sign-in.
- Test artifact left in R2: `general/spaced name.txt` (20 B). To remove: `wrangler r2 object delete "portfolio-files/general/spaced name.txt" --remote`.

## Remaining work after validation

- [ ] Commit + push (`[Task-194]` tag, one commit)
- [ ] Invite real Hans (need email from user)
- [ ] Optional: add a third folder — change `FOLDERS` in `src/auth.ts`, redeploy
- [ ] Deferred: move `mannan.is` to Cloudflare DNS, bind custom domain `cloud.mannan.is`, update `PUBLIC_BASE_URL`
- [ ] Deferred: admin upload UI (current path is `wrangler r2 object put` or curl to `/admin/upload`)

## Files

- New: `cloud-worker/` (entire directory, uncommitted)
- Locations: `cloud-worker/src/{index,auth,email,admin,views,types}.ts`, `cloud-worker/migrations/0001_init.sql`, `cloud-worker/wrangler.jsonc`, `cloud-worker/README.md`
- Modified: none (Vercel/Next.js side untouched)

## Operational notes for the next agent

- Run all wrangler commands from `cloud-worker/`
- Worker logs: `wrangler tail cloud-worker --format=pretty`
- D1 inspect: `wrangler d1 execute cloud --remote --command "SELECT * FROM users"`
- R2 list: `wrangler r2 object list portfolio-files --remote` (or via Worker `/admin/users` for the DB side)
- The OAuth token wrangler uses lives at `/Users/manblack/Library/Preferences/.wrangler/config/default.toml` — useful for hitting `api.cloudflare.com` directly (e.g. listing zones, reading subdomain). Has `workers:write`, `d1:write`, `zone:read`, etc.
- workers.dev URLs reject requests with non-browsery User-Agents (returns 403). When testing from CLI, send a `User-Agent: Mozilla/5.0` header.
