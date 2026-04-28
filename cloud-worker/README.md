# cloud-worker

Magic-link gated file sharing on Cloudflare. One Worker, one D1 database, one R2 bucket, Resend for email.

## Stack

- Cloudflare Workers + Hono
- D1 (SQLite) — `users`, `magic_tokens`, `folder_members`
- R2 (three buckets):
  - `portfolio-files` (binding `FILES`) — `general/` prefix
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
| POST | `/auth/sign-out` | any |
| GET | `/cloud` | session — folder index |
| GET | `/cloud/:folder` | session + `canAccess` — file list |
| GET | `/files/:folder/:name` | session + `canAccess` — streamed download |
| POST | `/admin/invite` | admin — `{ email, folders: ["general","hans"] }` upserts user, grants folders, sends link |
| POST | `/admin/grant` | admin — `{ email, folder }` |
| POST | `/admin/revoke` | admin — `{ email, folder }` |
| POST | `/admin/upload` | admin — multipart `folder`, `file` |
| GET | `/admin/users` | admin — debug listing |

Folders are an in-code allowlist (`FOLDERS` in `src/auth.ts`) — currently `['general', 'hans', 'backups']`. Each folder maps to a bucket binding + key prefix in `FOLDER_CONFIG`. Adding a folder requires extending the allowlist, choosing a binding (existing or new), and redeploying.

## Setup

```bash
cd cloud-worker
bun install
```

### 1. Create resources

```bash
wrangler d1 create cloud
# copy the database_id into wrangler.jsonc

wrangler r2 bucket create portfolio-files
wrangler r2 bucket create mannan-hans
wrangler r2 bucket create deep-calm-weave-backups
```

### 2. Apply migration

```bash
wrangler d1 migrations apply cloud --remote
```

### 3. Seed admin

```bash
wrangler d1 execute cloud --remote --command \
  "INSERT INTO users (email, role, created_at) VALUES ('hello@mannan.is','admin',unixepoch()*1000)"
```

`mannanjavid@protonmail.com` is kept as a `client` user (with access to `hans` and `backups`) for testing client-side functionality — the same flow Hans and other clients use.

### 4. Set secrets

```bash
# 32 random bytes for cookie HMAC
openssl rand -hex 32 | wrangler secret put SESSION_SECRET

# Resend API key from https://resend.com/api-keys
wrangler secret put RESEND_API_KEY
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

You can also bypass the Worker for admin tasks:

```bash
wrangler r2 object put portfolio-files/general/whatever.pdf --file=./whatever.pdf
wrangler d1 execute cloud --remote --command \
  "INSERT INTO users VALUES ('hans@example.com','client',unixepoch()*1000); \
   INSERT INTO folder_members VALUES ('hans@example.com','hans');"
```

## Adding a third folder

1. Add the name to `FOLDERS` in `src/auth.ts`.
2. Redeploy.
3. Grant access via `/admin/invite` or `/admin/grant`.

## Tradeoffs / known limits

- Folders are a code-level allowlist (no folders table). Three tables total.
- Files stream through the Worker (free egress, simple URLs). Move to presigned URLs only if you start hosting >100 MB items.
- Sessions are stateless HMAC cookies — revocation = rotate `SESSION_SECRET` (everyone signs in again).
- File listing hits R2 on every request. Add a `Cache API` layer if listings get slow.
