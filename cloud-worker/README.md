# cloud-worker

Magic-link gated file sharing on Cloudflare. One Worker, one D1 database, one R2 bucket, Resend for email.

## Stack

- Cloudflare Workers + Hono
- D1 (SQLite) — `users`, `magic_tokens`, `folder_members`
- R2 — `portfolio-files` bucket, prefixes `general/` and `hans/`
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

Folders are an in-code allowlist (`FOLDERS` in `src/auth.ts`) — currently `['general', 'hans']`. Add a string here to add a folder.

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
```

### 2. Apply migration

```bash
wrangler d1 migrations apply cloud --remote
```

### 3. Seed admin

```bash
wrangler d1 execute cloud --remote --command \
  "INSERT INTO users (email, role, created_at) VALUES ('hello@mannan.is','admin',unixepoch()*1000), ('mannanjavid@protonmail.com','admin',unixepoch()*1000)"
```

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

### 6. Custom domain (later, when DNS moves to Cloudflare)

When `mannan.is` is on Cloudflare DNS:

1. Cloudflare Dashboard → Workers & Pages → cloud-worker → Settings → Domains & Routes → Add Custom Domain → `cloud.mannan.is`.
2. Update `vars.PUBLIC_BASE_URL` to `https://cloud.mannan.is`.
3. `wrangler deploy`.

Resend (sender domain) does NOT require Cloudflare DNS — verify `mannan.is` in Resend by adding the SPF/DKIM/DMARC records at whatever DNS host the domain is on.

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
