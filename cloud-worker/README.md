# cloud-worker

Magic-link gated file sharing on Cloudflare. One production Worker, a named storage-canary configuration, one D1 database, private R2 storage target, and Resend for email.

## Stack

- Cloudflare Workers + Hono
- D1 (SQLite) — accounts, one-time auth records, folder grants, and append-only legal acceptances
- R2 (four target buckets):
  - `portfolio-private-files` (production target for binding `FILES`) — authenticated `general/` objects; no public URL or custom domain
  - `portfolio-files` (current production binding during the pre-cutover repository phase) — intentionally public media and documents, including the exact six-file MCP allowlist
  - `mannan-hans` (binding `FILES_HANS`) — Hans's portfolio deliverables
  - `deep-calm-weave-backups` (binding `FILES_BACKUPS`) — Hans's website backups, written by an external Supabase Edge Function + GitHub Actions; bucket-scoped R2 API token managed in the dashboard
- Resend HTTP API for magic-link emails
- HMAC-signed `__Host-session` cookie (no session table)

## Routes

| Method | Path | Auth |
|---|---|---|
| GET | `/` | public — sign-in form (or redirects to `/cloud` if signed in) |
| POST | `/auth/request` | public, rate-limited 5/min/IP — sends magic link if email is in `users` |
| GET | `/auth/verify?token=…` | public, rate-limited 10/min/IP |
| POST | `/auth/site/request` | shared service secret, rate-limited by browser IP + email — creates a pending site account when needed and sends a magic link |
| GET | `/auth/site/verify?token=…` | public, rate-limited — consumes a site magic link and redirects with a one-time exchange code |
| POST | `/auth/site/exchange` | shared service secret — exchanges the code for stable account identity, status, and safe return path |
| POST | `/auth/site/consent` | shared service secret — records the current legal versions and activates the account |
| POST | `/auth/sign-out` | any |
| GET | `/cloud` | session — folder index |
| GET | `/cloud/:folder` | session + `canAccess` — file list |
| GET, HEAD | `/files/:folder/:name` | session + `canAccess`, 120/min/email+IP — streamed download/metadata; all other methods return `405` |
| POST | `/cloud/:folder/download` | session + `canAccess`, 120/min/email+IP — bounded ZIP download |
| POST | `/admin/invite` | admin — `{ email, folders: ["general","hans"] }` upserts user, grants folders, sends link |
| POST | `/admin/grant` | admin — `{ email, folder }` |
| POST | `/admin/revoke` | admin — `{ email, folder }` |
| POST | `/admin/upload` | admin, 120/min/email+IP — multipart `folder`, `file`, max 100 MiB |
| GET | `/admin/users` | admin — debug listing |

Folders are an in-code allowlist (`FOLDERS` in `src/auth.ts`) — currently `['general', 'hans', 'hans-backups']`. Each folder maps to a bucket binding + key prefix in `FOLDER_CONFIG`. Adding a folder requires extending the allowlist, choosing a binding (existing or new), and redeploying.

## Setup

```bash
cd cloud-worker
bun install
```

### 1. Create resources

```bash
wrangler d1 create cloud
# copy the database_id into wrangler.jsonc

wrangler r2 bucket create portfolio-private-files
wrangler r2 bucket create mannan-hans
wrangler r2 bucket create deep-calm-weave-backups
```

Do not run the R2 command as routine setup for the existing deployment. Creation and configuration of `portfolio-private-files` is production Gate A in [`plans/006-private-r2-storage-boundary.md`](../plans/006-private-r2-storage-boundary.md) and requires explicit authorization. The bucket must have its `r2.dev` URL disabled and no custom domain before any private object is copied.

### 2. Apply migrations

```bash
wrangler d1 migrations apply cloud --remote
```

Migration `0003_account_identity_consent.sql` adds stable random `account_id`
values, `active`/`pending_consent` account status, return paths on one-time auth
records, and append-only versioned legal acceptances. Existing rows are
backfilled as `active`; new accounts created by the site sign-in bridge begin
as `pending_consent`. This avoids inventing acceptance records for legacy
accounts while ensuring every new account completes the current consent flow.

The remote migration has **not** been applied as part of this repository work.
Applying it and deploying the matching Worker are production changes and must
be performed together in an explicitly authorized release.

### 3. Seed admin

```bash
wrangler d1 execute cloud --remote --command \
  "INSERT INTO users (email, role, created_at) VALUES ('hello@mannan.is','admin',unixepoch()*1000)"
```

`mannanjavid@protonmail.com` is kept as a `client` user (with access to `hans` and `hans-backups`) for testing client-side functionality — the same flow Hans and other clients use.

### 4. Set secrets

```bash
# 32 random bytes for cookie HMAC
openssl rand -hex 32 | wrangler secret put SESSION_SECRET

# Resend API key from https://resend.com/api-keys
wrangler secret put RESEND_API_KEY

# shared secret for the portfolio-to-cloud auth exchange
wrangler secret put SITE_AUTH_EXCHANGE_SECRET
```

### 5. Deploy

```bash
wrangler deploy
```

The Worker will be live at `https://cloud-worker.<your-workers-subdomain>.workers.dev`. Update `vars.PUBLIC_BASE_URL` in `wrangler.jsonc` to that exact URL and redeploy so magic-link emails point to the right host.

### 6. Custom domain — not available

Cloudflare does not support `.is` TLDs, so `mannan.is` cannot be moved to Cloudflare DNS and `cloud.mannan.is` cannot be bound as a custom domain. The Worker stays on `cloud-worker.mannanteam.workers.dev`; `mannan.is/cloud` redirects to it via the Next.js app.

Resend (sender domain) does NOT require Cloudflare DNS — `mannan.is` is verified in Resend by SPF/DKIM/DMARC records at the existing DNS host.

## Local dev

```bash
cp .dev.vars.example .dev.vars  # then fill in secrets
wrangler d1 migrations apply cloud --local
wrangler d1 execute cloud --local --command \
  "INSERT INTO users VALUES ('you@example.com','admin',unixepoch()*1000)"
wrangler dev
```

## Inviting a user

```bash
curl -X POST https://cloud-worker.<sub>.workers.dev/admin/invite \
  -H "Cookie: __Host-session=..." \
  -H "Content-Type: application/json" \
  -d '{"email":"hans@example.com","folders":["hans"]}'
```

Or upload a file:

```bash
curl -X POST https://cloud-worker.<sub>.workers.dev/admin/upload \
  -H "Cookie: __Host-session=..." \
  -F "folder=general" \
  -F "file=@/path/to/file.pdf"
```

For non-sensitive bucket administration, Wrangler can bypass the Worker. Never upload `general/*` to the public `portfolio-files` bucket after the private cutover:

```bash
wrangler d1 execute cloud --remote --command \
  "INSERT INTO users VALUES ('hans@example.com','client',unixepoch()*1000); \
   INSERT INTO folder_members VALUES ('hans@example.com','hans');"
```

## Shared site identity boundary

`mannan.is` is the browser-facing identity and consent surface. Its server
calls the `/auth/site/*` routes with `SITE_AUTH_EXCHANGE_SECRET`; that secret is
never sent to the browser. Site sign-in intentionally creates an account on
first use. Direct `/cloud` sign-in remains invite-only and sends no email for
unknown or pending accounts.

Magic tokens and site exchange codes are single-use and short-lived. A return
path is carried through both records, but only same-site relative paths are
accepted; absolute URLs, scheme-relative paths, backslashes, and control
characters fall back to `/`. The site must also validate the returned path
before redirecting.

Consent completion accepts only the server-selected current Terms and Privacy
versions. The Worker endpoint requires the same server-to-server bearer secret,
validates the stable account ID, records the acceptance idempotently, and then
activates the account. The browser cannot submit an email, role, account status,
or arbitrary legal version.

## Adding a third folder

1. Add the name to `FOLDERS` in `src/auth.ts`.
2. Redeploy.
3. Grant access via `/admin/invite` or `/admin/grant`.

## Tradeoffs / known limits

- Folders are a code-level allowlist (no folders table).
- Files stream through the Worker (free egress, simple URLs). Move to presigned URLs only if you start hosting >100 MB items.
- Sessions are stateless HMAC cookies — revocation = rotate `SESSION_SECRET` (everyone signs in again).
- File listings use the Cache API for up to five minutes and are invalidated on Worker uploads; out-of-band changes may remain stale until expiry.

## Storage canary and cutover boundary

The top-level `FILES` binding intentionally remains `portfolio-files` until production Gate E. The named `storage-canary` environment binds `FILES` to `portfolio-private-files` so authenticated listing, GET/HEAD, ZIP, ACL denial, and headers can be proven before the production binding changes.

Wrangler environment secrets do not inherit. Before an explicitly authorized canary deploy, set `SESSION_SECRET`, `RESEND_API_KEY`, and `SITE_AUTH_EXCHANGE_SECRET` separately in Cloudflare secret storage for `storage-canary`; never place their values in JSONC, task logs, shell history, or repository files. Copy and deletion operations, canary deployment, the production switch, and cleanup are separately authorized gates in [plan 006](../plans/006-private-r2-storage-boundary.md).
