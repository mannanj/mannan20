# Drops — M1 (Collect) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the **Collect** direction of Drops — Mannan creates a configurable, link-based inbox (`mannan.is/drop/<id>`), hands it out as a named magic link / open link / passcode link, and people upload files (>100 MB, ≤5 GB) straight to R2; uploads land quarantined, optionally held for approval, and notify Mannan by email.

**Architecture:** "Worker = brains, Site = face," mirroring the production site↔cloud-worker split. The Next.js site renders the composer + recipient pages and exposes `/api/drop(s)/*` routes that call the cloud-worker server-to-server over the existing shared-secret Bearer. The cloud-worker (Hono + D1 + R2) owns all state and policy: it stores Drops in D1, enforces policy at one chokepoint (presign), mints **presigned R2 `PUT` URLs** (browser → R2 directly, so bytes never touch the worker), re-verifies true size on commit via R2 `HEAD`, logs activity, and emails via Resend. A daily Cron Trigger expires and cleans up.

**Tech Stack:** Cloudflare Workers (Hono `^4.6.14`), D1 (SQLite), R2 (+ S3 presigning via **`aws4fetch`**, the worker's first new runtime dep), Web Crypto (HMAC-SHA-256 sessions/tokens, **PBKDF2** passcodes); Next.js 15 App Router + React 19 + Tailwind v4 (the `.taste-prototype` "Paper" editorial surface); Resend (email); Upstash (site rate-limit, optional); tests via `@cloudflare/vitest-pool-workers` (worker), Playwright (site E2E), `bun:test` (pure units).

---

## Grounding — verified facts this plan is built on

Re-verified directly against the codebase (2026-06-30). Corrections to the spec/transcript are flagged ⚠️.

**cloud-worker (`cloud-worker/`):**
- Router is Hono `^4.6.14`; `const app = new Hono<{ Bindings: Env; Variables: { session: Session | null } }>()`; one global middleware loads the session. **No CORS middleware** (fine — presigned PUT CORS lives on the R2 bucket, not the worker).
- ⚠️ Export is `export default app` — **no `scheduled()` handler exists**. The cron requires changing the export to `export default { fetch: app.fetch, scheduled }`.
- ⚠️ Admin gate is a **D1 `users.role === 'admin'` middleware** on the `/admin` sub-router (`cloud-worker/src/admin.ts:21-29`), not a hardcoded email. Drops worker routes will instead be **Bearer-guarded** (the site's user cookie never crosses origins), with the site enforcing admin-vs-recipient before proxying — matching `/auth/site/*` (`cloud-worker/src/index.ts:79-82, 164-167`).
- Server-to-server auth: worker checks `c.req.header('authorization') !== \`Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}\``.
- D1 idiom: `env.DB.prepare(sql).bind(...).first<T>() | .run() | .all()`, `env.DB.batch([...])`.
- ⚠️ `magic_tokens.purpose` is typed as a **union `'cloud' | 'site'`** in `mintMagicToken`/`consumeMagicToken` (`cloud-worker/src/auth.ts:186, 201`). The D1 column is plain `TEXT` (zero-migration), but adding `'share'` **requires editing the union in both signatures** (not zero-code).
- ⚠️ `hashSecret` (`auth.ts:178`) is **unsalted single-pass SHA-256** — fine for 256-bit tokens, inadequate for a low-entropy human passcode. Drops passcodes use **PBKDF2** (new `passcode.ts`).
- Session helpers (`auth.ts`): `createSessionCookie`/`readSession`/`clearSessionCookie`, cookie `__Host-session`, HMAC over `env.SESSION_SECRET`, stateless `{email, exp}`.
- `Env` (`cloud-worker/src/types.ts`): `DB`, `FILES`/`FILES_HANS`/`FILES_BACKUPS` (R2), `REQUEST_LIMITER`/`VERIFY_LIMITER` (`RateLimit` = `{ limit({key}): Promise<{success}> }`), secrets `SESSION_SECRET`/`RESEND_API_KEY`/`RESEND_FROM`/`PUBLIC_BASE_URL`/`SITE_AUTH_RETURN_URL`/`SITE_AUTH_EXCHANGE_SECRET`.
- Resend (`cloud-worker/src/email.ts`): `fetch('https://api.resend.com/emails', { headers: { Authorization: \`Bearer ${env.RESEND_API_KEY}\`, 'Idempotency-Key' }, body: { from: env.RESEND_FROM, to, subject, text, html } })`. `RESEND_FROM = "Mannan <cloud@mannan.is>"`.
- `wrangler.jsonc`: `compatibility_date "2026-04-01"`, no compat flags, **no `triggers`**, `workers_dev: true`; D1 `DB`→`cloud` (id `6aac55fe-a879-40ea-891e-4723cdb60891`); R2 `FILES`/`FILES_HANS`/`FILES_BACKUPS`; `ratelimits` `REQUEST_LIMITER` (5/60, ns 1001) + `VERIFY_LIMITER` (10/60, ns 1002). **No `mannan-drops` bucket.** Secrets via `.dev.vars` / `wrangler secret`.
- Migrations: `0001_init.sql`, `0002_shared_site_auth.sql` → ours is **`0003_drops.sql`**. Apply: `wrangler d1 migrations apply cloud --local` (`bun run db:migrate:local`) / `--remote` (`bun run db:migrate`).
- `cloud-worker/package.json`: deps `hono` only; devDeps `@cloudflare/workers-types`, `typescript`, `wrangler`. **No test runner** (one `auth.test.ts` runs via bare `bun test`, unwired). `aws4fetch` absent.

**site (`src/`):** Next 15.1, React 19, Tailwind v4.
- ⚠️ Site↔worker env vars differ from the worker's names: site reads **`CLOUDFLARE_AUTH_WORKER_URL`** (default `https://cloud-worker.mannanteam.workers.dev`) + **`CLOUDFLARE_AUTH_EXCHANGE_SECRET`** — the **same secret value** the worker checks as `SITE_AUTH_EXCHANGE_SECRET`.
- Worker-client idiom: `src/lib/cloudflare-auth.ts` → `fetch(\`${workerUrl()}/path\`, { headers: { authorization: \`Bearer ${secret}\`, 'content-type': 'application/json', 'x-site-auth-ip': ip } })`.
- Admin session: `readSiteSession(cookieHeader: string | null): Promise<SiteSession | null>` (`src/lib/site-session.ts:85`), `SiteSession = { email, role, admin, exp }`, cookie `__Host-mannan-session`, HMAC over `MANNAN_SESSION_SECRET`. ⚠️ No admin-gated page/route exists yet — this plan introduces the pattern: `if (!session?.admin) → 401 / redirect`.
- API-route idiom: `src/app/api/auth/request/route.ts` — `export const dynamic = 'force-dynamic'`, defensive JSON parse, IP from `x-forwarded-for`, rate-limit, call wrapper, `NextResponse.json`.
- Rate-limit: `src/lib/rate-limit.ts` — `@upstash/ratelimit` + `@upstash/redis`, env `UPSTASH_REDIS_REST_KV_REST_API_URL` / `..._TOKEN`, exported `limitX(id)` with in-memory `memoryLimit` fallback, `LimitResult = { success, limit, remaining, reset }`.
- Stream-download idiom (M2 reference): `src/app/api/download/[slug]/route.ts` → `new Response(upstream.body, { headers })`.
- ⚠️ Design system: fonts **Geist + EB Garamond** (`--font-geist-sans`, `--font-caption`); **no `@theme` block**; the warm "Paper" palette is the scoped `.taste-prototype` CSS-var block (`globals.css:262-418`): `--taste-bg #edf2ef`, `--taste-panel`, `--taste-ink #111614`, `--taste-accent #2f6f4e`, classes `.taste-nav`/`.taste-panel`/`.taste-button`+`.taste-button-primary`/`.taste-kicker`/`.taste-rise [--delay:Nms]`. Container `mx-auto max-w-7xl px-5 sm:px-8` (narrow doc: `max-w-2xl`).

**tests / guards:**
- Playwright: `playwright.config.ts`, `testDir ./e2e`, baseURL `http://localhost:3847`, `webServer: { command: 'bun run dev', port: 3847, reuseExistingServer: true }`, `retries: 1`. Specs stub the worker via `page.route('**/api/...**', r => r.fulfill({ json: {...} }))`; selectors are `getByTestId`; assertions pin exact values.
- ⚠️ The reused `:3847` server loads prod `.env.local` — any `**/api/drop(s)/**` route a spec forgets to stub will hit **prod** D1/R2/Redis. Stub them all.
- Site units: `bun test src` (`bun run test:unit`), `import { ... } from 'bun:test'`.
- cloud-worker units today: bare `bun test` (unwired). Integration needs **introducing** `vitest` + `@cloudflare/vitest-pool-workers` (template: `mcp-worker/vitest.config.ts`, `vitest ^4.1.0`, pool `^0.16.15`).
- Privacy guard: `scripts/build-mcp-data.mjs` `FORBIDDEN` substring list (lines 268-283) + `mcp-worker/test/privacy.spec.ts` `FORBIDDEN_PATTERNS` `[label, RegExp][]`. The MCP build never reads cloud-worker D1, so Drops can't structurally leak; these additions are defense-in-depth.
- ⚠️ No `.github/workflows` — gates are manual. Build-verify caution (memory): never `next build` while `:3847` dev runs (shared `.next`); use an isolated worktree on a scratch port.

**Secrets:** all secret **values** live in `.env.local` / worker secrets. This plan references env vars **by name only** — never paste a value into a committed file.

---

## File structure

**cloud-worker (brains) — new:**
- `cloud-worker/migrations/0003_drops.sql` — `shares`, `share_participants`, `share_events` + indexes.
- `cloud-worker/src/drops/ids.ts` — `newShareId()` (16-char base62), `newId()` (uuid-hex).
- `cloud-worker/src/drops/passcode.ts` — PBKDF2 `hashPasscode()` / `verifyPasscode()` (constant-time).
- `cloud-worker/src/drops/tokens.ts` — `mintParticipantToken()` / `verifyParticipantToken()` (HMAC `SESSION_SECRET`).
- `cloud-worker/src/drops/policy.ts` — types + pure `evaluatePolicy(share, file, ctx)`.
- `cloud-worker/src/drops/presign.ts` — `presignPutUrl()` (aws4fetch SigV4).
- `cloud-worker/src/drops/store.ts` — D1 access (create/get/list shares, participants, events, quota).
- `cloud-worker/src/drops/notify.ts` — `sendDropUploadNotification()` (Resend).
- `cloud-worker/src/drops/cleanup.ts` — `runCleanup(env, now)` (cron body).
- `cloud-worker/src/drops/routes.ts` — Hono sub-router `/drops/*` (Bearer-guarded).
- `cloud-worker/vitest.config.ts` — clone of mcp-worker's.
- Co-located `bun:test` units: `src/drops/{util,ids,passcode,tokens,policy,config,notify}.test.ts`.
- Miniflare (`vitest`) integration specs: `cloud-worker/test/{schema,drops-schema,drops-store,drops-presign,drops-routes,drops-cleanup}.spec.ts`.

**cloud-worker — modified:**
- `cloud-worker/src/types.ts` — add `FILES_DROPS`, `DROP_PRESIGN_LIMITER`, `DROP_JOIN_LIMITER`, `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`.
- `cloud-worker/src/auth.ts` — add `'share'` to the two `purpose` unions.
- `cloud-worker/src/index.ts` — `app.route('/drops', drops)`; export `{ fetch, scheduled }`.
- `cloud-worker/wrangler.jsonc` — `FILES_DROPS` bucket, two rate-limit namespaces, `triggers.crons`.
- `cloud-worker/package.json` — add `aws4fetch`, `vitest`, `@cloudflare/vitest-pool-workers`; `"test": "vitest run"`.
- `cloud-worker/.dev.vars.example` — add `R2_*` placeholders.

**site (face) — new:**
- `src/lib/drops.ts` — shared types (`DropConfig`, `DropView`, `DropFile`) + worker client.
- `src/app/api/drops/route.ts` — `POST` create / `GET` list (admin).
- `src/app/api/drops/[id]/approve/route.ts`, `.../[id]/reject/route.ts` — admin.
- `src/app/api/drop/[id]/join/route.ts` — public, sets participant cookie.
- `src/app/api/drop/[id]/presign/route.ts`, `.../[id]/commit/route.ts` — public.
- `src/app/drop/[id]/page.tsx` — SSR recipient page (collect variant).
- `src/app/drop/[id]/collect-client.tsx` — `'use client'` join + upload + progress + commit.
- `src/app/drops/page.tsx` — admin composer + inbox (server-gated via `readSiteSession`).
- `src/app/drops/composer-client.tsx`, `src/app/drops/inbox-client.tsx` — `'use client'`.
- `src/lib/drops.test.ts` — `bun:test` units for client shaping/validation.
- `e2e/drops-collect.spec.ts` — Playwright (stubbed worker), three mutation-checked scenarios.

**site — modified:**
- `src/lib/rate-limit.ts` — add `limitDropJoin(id)` (site-side brute-force outer layer).

**guards — modified:**
- `scripts/build-mcp-data.mjs` — extend `FORBIDDEN`.
- `mcp-worker/test/privacy.spec.ts` — extend `FORBIDDEN_PATTERNS`.

**Build order:** Phase 0 ops → Phase 1 worker foundation → Phase 2 worker API → Phase 3 worker wiring+cron → Phase 4 site proxy+client lib → Phase 5 recipient page → Phase 6 composer+inbox → Phase 7 E2E + privacy guard + gate. Each phase leaves the tree green.

---

## Phase 0 — Ops prerequisites (R2 bucket, S3 token, secrets, CORS)

These are one-time Cloudflare-side actions. The presign path is dead without them; do them first so later integration tests have real bindings locally (miniflare auto-provisions a local `mannan-drops`; only **remote** deploy needs the live bucket/secrets).

### Task 0: Provision R2 + secrets

**Files:** none (Cloudflare dashboard + `wrangler`).

- [ ] **Step 1: Create the quarantine bucket**

Run: `cd cloud-worker && bunx wrangler r2 bucket create mannan-drops`
Expected: `Created bucket 'mannan-drops'`.

- [ ] **Step 2: Create an R2 S3 API token** (dashboard → R2 → Manage R2 API Tokens → Create API token, **Object Read & Write**, scoped to `mannan-drops`). Record Account ID, Access Key ID, Secret Access Key.

- [ ] **Step 3: Set the worker secrets** (remote)

```bash
cd cloud-worker
echo "<account-id>"      | bunx wrangler secret put R2_ACCOUNT_ID
echo "<access-key-id>"   | bunx wrangler secret put R2_ACCESS_KEY_ID
echo "<secret-access-key>" | bunx wrangler secret put R2_SECRET_ACCESS_KEY
```
Expected: three `Success! Uploaded secret …`.

- [ ] **Step 4: Add the same three to `cloud-worker/.dev.vars`** (local, gitignored) so `wrangler dev` can presign locally:

```
R2_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
```

- [ ] **Step 5: Set CORS on the bucket** so browsers can `PUT` directly. Create `cloud-worker/r2-cors.json`:

```json
[
  {
    "AllowedOrigins": ["https://mannan.is", "http://localhost:3847"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Run: `cd cloud-worker && bunx wrangler r2 bucket cors put mannan-drops --rules ./r2-cors.json`
Expected: `Set CORS configuration for bucket 'mannan-drops'`. (Verify: `bunx wrangler r2 bucket cors list mannan-drops`.)

- [ ] **Step 6: Update `.dev.vars.example`** (committed, no values) — add the three `R2_*` keys with empty placeholders so the contract is documented.

- [ ] **Step 7: Commit** (config only; no secret values)

```bash
git add cloud-worker/.dev.vars.example cloud-worker/r2-cors.json
git commit -m "chore(drops): provision mannan-drops R2 bucket CORS + R2 S3 secret contract"
```

---

## Phase 1 — Worker foundation (harness, schema, pure modules)

Pure modules use **`bun:test`** (matches the existing `cloud-worker/src/auth.test.ts`, zero new harness, instant). Binding-dependent specs use **`@cloudflare/vitest-pool-workers`** (miniflare). Separation by location + extension: `bun test src` runs `src/**/*.test.ts`; `vitest run` runs only `test/**/*.spec.ts`.

### Task 1: Introduce the Workers (miniflare) test harness

**Files:**
- Modify: `cloud-worker/package.json`
- Create: `cloud-worker/vitest.config.ts`, `cloud-worker/test/apply-migrations.ts`, `cloud-worker/test/env.d.ts`, `cloud-worker/test/schema.spec.ts`

- [ ] **Step 1: Add deps + scripts**

Run:
```bash
cd cloud-worker
bun add aws4fetch
bun add -d vitest@^4.1.0 @cloudflare/vitest-pool-workers@^0.16.15
```
Then edit `cloud-worker/package.json` `scripts` to add (keep existing entries):
```json
"test": "vitest run",
"test:unit": "bun test src",
"test:all": "bun test src && vitest run"
```
Expected: `dependencies` now includes `aws4fetch`; `devDependencies` includes `vitest` + `@cloudflare/vitest-pool-workers`.

- [ ] **Step 2: Write the vitest config** — `cloud-worker/vitest.config.ts`

```ts
import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'));
  return {
    test: {
      include: ['test/**/*.spec.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
        },
      },
    },
  };
});
```

- [ ] **Step 3: Migration-apply setup** — `cloud-worker/test/apply-migrations.ts`

```ts
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

- [ ] **Step 4: Types for the test env** — `cloud-worker/test/env.d.ts`

```ts
import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';
import type { Env } from '../src/types';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}
```

- [ ] **Step 5: Smoke spec proving the harness + existing migrations apply** — `cloud-worker/test/schema.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('worker test harness', () => {
  it('applies existing migrations and exposes D1', async () => {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first<{ name: string }>();
    expect(row?.name).toBe('users');
  });
});
```

- [ ] **Step 6: Run it**

Run: `cd cloud-worker && bun run test`
Expected: 1 passed. If the import paths (`@cloudflare/vitest-pool-workers/config`, `cloudflare:test`) error, the installed pool version's API differs — reconcile against `node_modules/@cloudflare/vitest-pool-workers/README.md`; the smoke test is the fast signal.

- [ ] **Step 7: Commit**

```bash
git add cloud-worker/package.json cloud-worker/bun.lock cloud-worker/vitest.config.ts cloud-worker/test/
git commit -m "test(drops): add @cloudflare/vitest-pool-workers harness + aws4fetch dep"
```

### Task 2: D1 migration `0003_drops.sql`

**Files:**
- Create: `cloud-worker/migrations/0003_drops.sql`
- Create: `cloud-worker/test/drops-schema.spec.ts`

- [ ] **Step 1: Write the failing schema spec** — `cloud-worker/test/drops-schema.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('0003_drops schema', () => {
  it('creates shares, share_participants, share_events with a working round-trip', async () => {
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO shares (id, owner_email, direction, access_mode, require_name, single_use,
        hold_for_approval, participants_visible, notify_on_activity, r2_prefix, used_bytes, status, created_at)
       VALUES ('share_abc', 'hello@mannan.is', 'collect', 'passcode', 1, 0, 1, 0, 1, 'drops/share_abc/', 0, 'active', ?)`,
    ).bind(now).run();

    const share = await env.DB.prepare('SELECT id, status, used_bytes FROM shares WHERE id = ?').bind('share_abc').first<{ id: string; status: string; used_bytes: number }>();
    expect(share).toEqual({ id: 'share_abc', status: 'active', used_bytes: 0 });

    await env.DB.prepare('INSERT INTO share_participants (id, share_id, joined_at) VALUES (?,?,?)').bind('p1', 'share_abc', now).run();
    await env.DB.prepare(
      `INSERT INTO share_events (id, share_id, participant_id, kind, status, created_at) VALUES (?,?,?,?,?,?)`,
    ).bind('e1', 'share_abc', 'p1', 'upload', 'pending', now).run();

    const events = await env.DB.prepare('SELECT kind, status FROM share_events WHERE share_id = ?').bind('share_abc').all<{ kind: string; status: string }>();
    expect(events.results).toEqual([{ kind: 'upload', status: 'pending' }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd cloud-worker && bun run test test/drops-schema.spec.ts`
Expected: FAIL — `no such table: shares`.

- [ ] **Step 3: Write the migration** — `cloud-worker/migrations/0003_drops.sql`

```sql
CREATE TABLE shares (
  id                   TEXT PRIMARY KEY,
  owner_email          TEXT NOT NULL,
  direction            TEXT NOT NULL,
  access_mode          TEXT NOT NULL,
  passcode_hash        TEXT,
  passcode_salt        TEXT,
  title                TEXT,
  note                 TEXT,
  require_name         INTEGER NOT NULL DEFAULT 0,
  max_participants     INTEGER,
  per_person_file_cap  INTEGER,
  single_use           INTEGER NOT NULL DEFAULT 0,
  max_file_bytes       INTEGER,
  max_total_bytes      INTEGER,
  allowed_types        TEXT,
  hold_for_approval    INTEGER NOT NULL DEFAULT 1,
  participants_visible INTEGER NOT NULL DEFAULT 0,
  notify_on_activity   INTEGER NOT NULL DEFAULT 1,
  r2_prefix            TEXT NOT NULL,
  expiry_basis         TEXT,
  expires_at           INTEGER,
  first_opened_at      INTEGER,
  used_bytes           INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'active',
  created_at           INTEGER NOT NULL
);

CREATE TABLE share_participants (
  id         TEXT PRIMARY KEY,
  share_id   TEXT NOT NULL,
  email      TEXT,
  name       TEXT,
  joined_at  INTEGER NOT NULL
);
CREATE INDEX idx_participants_share ON share_participants(share_id);

CREATE TABLE share_events (
  id             TEXT PRIMARY KEY,
  share_id       TEXT NOT NULL,
  participant_id TEXT,
  kind           TEXT NOT NULL,
  object_key     TEXT,
  filename       TEXT,
  bytes          INTEGER,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_events_share ON share_events(share_id, created_at);
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd cloud-worker && bun run test test/drops-schema.spec.ts`
Expected: PASS.

- [ ] **Step 5: Apply to the local D1** (so `wrangler dev` has the tables)

Run: `cd cloud-worker && bun run db:migrate:local`
Expected: `0003_drops.sql` listed as applied. (Remote apply — `bun run db:migrate` — happens at deploy time in Phase 3.)

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/migrations/0003_drops.sql cloud-worker/test/drops-schema.spec.ts
git commit -m "feat(drops): add 0003_drops D1 migration (shares, participants, events)"
```

### Task 3: Extend `auth.ts` — `'share'` purpose + exported crypto primitives

`drops/tokens.ts` reuses the worker's existing HMAC/b64url helpers; the magic-link "Named" door needs `'share'` accepted by the token functions.

**Files:**
- Modify: `cloud-worker/src/auth.ts`

- [ ] **Step 1: Widen the `purpose` union in both functions.** In `mintMagicToken` (`auth.ts:186`) and `consumeMagicToken` (`auth.ts:201`), change `purpose: 'cloud' | 'site' = 'cloud'` to:

```ts
purpose: 'cloud' | 'site' | 'share' = 'cloud',
```

- [ ] **Step 2: Export the crypto primitives** for reuse. The file already declares `function b64urlEncode`, `function b64urlDecode`, `async function sign`, `async function verify`. Add `export` to `b64urlEncode` and `b64urlDecode`, and add this aliased re-export below them:

```ts
export { sign as signHmac, verify as verifyHmac };
```

- [ ] **Step 3: Verify the existing worker still typechecks and its unit test passes**

Run: `cd cloud-worker && bunx tsc --noEmit && bun test src/auth.test.ts`
Expected: no type errors; `auth.test.ts` 3 passed.

- [ ] **Step 4: Commit**

```bash
git add cloud-worker/src/auth.ts
git commit -m "feat(drops): accept 'share' magic-token purpose + export HMAC/b64url primitives"
```

### Task 4: Shared util + id generators — `drops/util.ts`, `drops/ids.ts`

**Files:**
- Create: `cloud-worker/src/drops/util.ts`, `cloud-worker/src/drops/ids.ts`
- Create: `cloud-worker/src/drops/util.test.ts`, `cloud-worker/src/drops/ids.test.ts`

- [ ] **Step 1: Write failing tests** — `cloud-worker/src/drops/util.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { constantTimeEqual, fromHex, toHex } from './util';

describe('drops util', () => {
  test('toHex/fromHex round-trip', () => {
    const bytes = new Uint8Array([0, 15, 16, 255]);
    expect(toHex(bytes.buffer)).toBe('000f10ff');
    expect([...fromHex('000f10ff')]).toEqual([0, 15, 16, 255]);
  });
  test('constantTimeEqual: equal strings true, any difference false', () => {
    expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true);
    expect(constantTimeEqual('abcdef', 'abcdeg')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
```

`cloud-worker/src/drops/ids.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { newId, newShareId } from './ids';

describe('drops ids', () => {
  test('newShareId is 16 chars of base62 and unguessable-distinct', () => {
    const a = newShareId();
    expect(a).toMatch(/^[0-9A-Za-z]{16}$/);
    expect(newShareId()).not.toBe(a);
  });
  test('newId is a 32-hex token', () => {
    expect(newId()).toMatch(/^[0-9a-f]{32}$/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops`
Expected: FAIL — cannot find module `./util` / `./ids`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/util.ts`

```ts
export function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

`cloud-worker/src/drops/ids.ts`:

```ts
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function newShareId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/drops/util.ts cloud-worker/src/drops/ids.ts cloud-worker/src/drops/util.test.ts cloud-worker/src/drops/ids.test.ts
git commit -m "feat(drops): add hex/constant-time util + share/event id generators"
```

### Task 5: Passcode hashing — `drops/passcode.ts` (PBKDF2)

**Files:**
- Create: `cloud-worker/src/drops/passcode.ts`, `cloud-worker/src/drops/passcode.test.ts`

- [ ] **Step 1: Write the failing test** — `cloud-worker/src/drops/passcode.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { hashPasscode, newSalt, verifyPasscode } from './passcode';

describe('drops passcode (PBKDF2)', () => {
  test('hash is deterministic per (passcode, salt) and 64-hex', async () => {
    const salt = newSalt();
    const h1 = await hashPasscode('let-me-in', salt);
    const h2 = await hashPasscode('let-me-in', salt);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
  });
  test('different salts yield different hashes for the same passcode', async () => {
    expect(await hashPasscode('let-me-in', newSalt())).not.toBe(await hashPasscode('let-me-in', newSalt()));
  });
  test('verify accepts the right passcode and rejects the wrong one', async () => {
    const salt = newSalt();
    const hash = await hashPasscode('let-me-in', salt);
    expect(await verifyPasscode('let-me-in', salt, hash)).toBe(true);
    expect(await verifyPasscode('let-me-out', salt, hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops/passcode.test.ts`
Expected: FAIL — cannot find module `./passcode`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/passcode.ts`

```ts
import { constantTimeEqual, fromHex, toHex } from './util';

const enc = new TextEncoder();
const ITERATIONS = 100_000;

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPasscode(passcode: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function verifyPasscode(passcode: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const actual = await hashPasscode(passcode, saltHex);
  return constantTimeEqual(actual, expectedHashHex);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops/passcode.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Mutation check (prove the wrong-passcode test bites).** Temporarily change `verifyPasscode`'s last line to `return true;`. Run the test. Expected: the "rejects the wrong one" assertion goes **RED**. Revert immediately (do not commit the mutation).

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/passcode.ts cloud-worker/src/drops/passcode.test.ts
git commit -m "feat(drops): PBKDF2 passcode hashing with constant-time verify"
```

### Task 6: Participant session token — `drops/tokens.ts`

A stateless signed token (HMAC `SESSION_SECRET`, like the worker's own session) that binds a recipient to one share. The site stores it in a cookie and echoes it on presign/commit; the worker verifies it statelessly.

**Files:**
- Create: `cloud-worker/src/drops/tokens.ts`, `cloud-worker/src/drops/tokens.test.ts`

- [ ] **Step 1: Write the failing test** — `cloud-worker/src/drops/tokens.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import type { Env } from '../types';
import { mintParticipantToken, verifyParticipantToken } from './tokens';

const env = { SESSION_SECRET: 'test-secret' } as Env;

describe('drops participant token', () => {
  test('mint then verify returns the same share + participant', async () => {
    const token = await mintParticipantToken(env, 'share_abc', 'p1');
    expect(await verifyParticipantToken(env, token)).toMatchObject({ sid: 'share_abc', pid: 'p1' });
  });
  test('a tampered payload is rejected', async () => {
    const token = await mintParticipantToken(env, 'share_abc', 'p1');
    const [, sig] = token.split('.');
    const forged = `${btoa('{"sid":"share_evil","pid":"p1","exp":9999999999999}').replace(/=/g, '')}.${sig}`;
    expect(await verifyParticipantToken(env, forged)).toBeNull();
  });
  test('a token signed with a different secret is rejected', async () => {
    const token = await mintParticipantToken({ SESSION_SECRET: 'other' } as Env, 'share_abc', 'p1');
    expect(await verifyParticipantToken(env, token)).toBeNull();
  });
  test('null/garbage tokens return null', async () => {
    expect(await verifyParticipantToken(env, null)).toBeNull();
    expect(await verifyParticipantToken(env, 'not-a-token')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops/tokens.test.ts`
Expected: FAIL — cannot find module `./tokens`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/tokens.ts`

```ts
import { b64urlDecode, b64urlEncode, signHmac, verifyHmac } from '../auth';
import type { Env } from '../types';

const enc = new TextEncoder();
const dec = new TextDecoder();
const TTL_MS = 6 * 60 * 60 * 1000;

export interface ParticipantClaims {
  sid: string;
  pid: string;
  exp: number;
}

export async function mintParticipantToken(env: Env, sid: string, pid: string): Promise<string> {
  const claims: ParticipantClaims = { sid, pid, exp: Date.now() + TTL_MS };
  const payload = b64urlEncode(enc.encode(JSON.stringify(claims)));
  const sig = await signHmac(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifyParticipantToken(env: Env, token: string | null): Promise<ParticipantClaims | null> {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!(await verifyHmac(env.SESSION_SECRET, payload, sig))) return null;
  let claims: ParticipantClaims;
  try {
    claims = JSON.parse(dec.decode(b64urlDecode(payload)));
  } catch {
    return null;
  }
  if (typeof claims.sid !== 'string' || typeof claims.pid !== 'string' || typeof claims.exp !== 'number') return null;
  if (claims.exp < Date.now()) return null;
  return claims;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops/tokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Mutation check.** Temporarily make `verifyParticipantToken` skip the signature check (`if (false) return null;` in place of the `verifyHmac` guard). Run the test. Expected: both the "tampered payload" and "different secret" assertions go **RED**. Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/tokens.ts cloud-worker/src/drops/tokens.test.ts
git commit -m "feat(drops): stateless HMAC participant session token"
```

### Task 7: Policy engine — `drops/policy.ts` (`evaluatePolicy`)

The single source of truth for "may this upload proceed?" Pure, table-tested, and the heart of the mutation suite. Used at **presign** (client-reported size) and re-used at **commit** (true size from R2 `HEAD`).

**Files:**
- Create: `cloud-worker/src/drops/policy.ts`, `cloud-worker/src/drops/policy.test.ts`

- [ ] **Step 1: Write the failing table-driven test** — `cloud-worker/src/drops/policy.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { evaluatePolicy, type FileMeta, type PolicyContext, type ShareRow } from './policy';

const GB = 1024 ** 3;

function share(overrides: Partial<ShareRow> = {}): ShareRow {
  return {
    id: 'share_abc', owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'passcode',
    passcode_hash: null, passcode_salt: null, title: null, note: null, require_name: 1,
    max_participants: 10, per_person_file_cap: 20, single_use: 0, max_file_bytes: 2 * GB,
    max_total_bytes: 20 * GB, allowed_types: null, hold_for_approval: 1, participants_visible: 0,
    notify_on_activity: 1, r2_prefix: 'drops/share_abc/', expiry_basis: 'created',
    expires_at: 4_000_000_000_000, first_opened_at: null, used_bytes: 0, status: 'active',
    created_at: 1_000_000_000_000, ...overrides,
  };
}
const file = (o: Partial<FileMeta> = {}): FileMeta => ({ filename: 'photo.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg', ...o });
const ctx = (o: Partial<PolicyContext> = {}): PolicyContext => ({ now: 2_000_000_000_000, participantFileCount: 0, ...o });

describe('evaluatePolicy', () => {
  test('a normal upload to an active collect drop is allowed', () => {
    expect(evaluatePolicy(share(), file(), ctx())).toEqual({ ok: true });
  });
  test('rejects when status is not active', () => {
    expect(evaluatePolicy(share({ status: 'full' }), file(), ctx())).toMatchObject({ ok: false, code: 'inactive' });
  });
  test('rejects when expired (now >= expires_at), even if status still active', () => {
    expect(evaluatePolicy(share({ expires_at: 1_500_000_000_000 }), file(), ctx({ now: 1_500_000_000_001 }))).toMatchObject({ ok: false, code: 'expired' });
  });
  test('allows at exactly one ms before expiry', () => {
    expect(evaluatePolicy(share({ expires_at: 2_000_000_000_001 }), file(), ctx({ now: 2_000_000_000_000 }))).toEqual({ ok: true });
  });
  test('rejects upload to a distribute (download-only) drop', () => {
    expect(evaluatePolicy(share({ direction: 'distribute' }), file(), ctx())).toMatchObject({ ok: false, code: 'no-upload' });
  });
  test('rejects when the per-person file cap is already reached', () => {
    expect(evaluatePolicy(share({ per_person_file_cap: 3 }), file(), ctx({ participantFileCount: 3 }))).toMatchObject({ ok: false, code: 'file-cap' });
  });
  test('allows the last file under the per-person cap', () => {
    expect(evaluatePolicy(share({ per_person_file_cap: 3 }), file(), ctx({ participantFileCount: 2 }))).toEqual({ ok: true });
  });
  test('rejects a file larger than max_file_bytes', () => {
    expect(evaluatePolicy(share({ max_file_bytes: GB }), file({ size: GB + 1 }), ctx())).toMatchObject({ ok: false, code: 'too-large' });
  });
  test('allows a file exactly at max_file_bytes', () => {
    expect(evaluatePolicy(share({ max_file_bytes: GB }), file({ size: GB }), ctx())).toEqual({ ok: true });
  });
  test('rejects when this file would exceed the total quota', () => {
    expect(evaluatePolicy(share({ max_total_bytes: 10 * GB, used_bytes: 9 * GB }), file({ size: 2 * GB }), ctx())).toMatchObject({ ok: false, code: 'quota' });
  });
  test('allows when this file exactly fills the remaining quota', () => {
    expect(evaluatePolicy(share({ max_total_bytes: 10 * GB, used_bytes: 9 * GB }), file({ size: GB }), ctx())).toEqual({ ok: true });
  });
  test('enforces an allowlist when set', () => {
    const s = share({ allowed_types: JSON.stringify(['image/jpeg', 'application/pdf']) });
    expect(evaluatePolicy(s, file({ type: 'image/jpeg' }), ctx())).toEqual({ ok: true });
    expect(evaluatePolicy(s, file({ filename: 'a.png', type: 'image/png' }), ctx())).toMatchObject({ ok: false, code: 'type' });
  });
  test('always blocks denylisted executable extensions regardless of allowlist', () => {
    const s = share({ allowed_types: null });
    for (const name of ['malware.exe', 'run.BAT', 'x.sh', 'y.cmd', 'z.msi']) {
      expect(evaluatePolicy(s, file({ filename: name, type: 'application/octet-stream' }), ctx())).toMatchObject({ ok: false, code: 'blocked-type' });
    }
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops/policy.test.ts`
Expected: FAIL — cannot find module `./policy`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/policy.ts`

```ts
export interface ShareRow {
  id: string;
  owner_email: string;
  direction: 'collect' | 'distribute' | 'exchange';
  access_mode: 'named' | 'open' | 'passcode';
  passcode_hash: string | null;
  passcode_salt: string | null;
  title: string | null;
  note: string | null;
  require_name: number;
  max_participants: number | null;
  per_person_file_cap: number | null;
  single_use: number;
  max_file_bytes: number | null;
  max_total_bytes: number | null;
  allowed_types: string | null;
  hold_for_approval: number;
  participants_visible: number;
  notify_on_activity: number;
  r2_prefix: string;
  expiry_basis: 'absolute' | 'created' | 'first_open' | null;
  expires_at: number | null;
  first_opened_at: number | null;
  used_bytes: number;
  status: 'active' | 'expired' | 'closed' | 'full';
  created_at: number;
}

export interface FileMeta {
  filename: string;
  size: number;
  type: string;
}

export interface PolicyContext {
  now: number;
  participantFileCount: number; // this participant's existing pending+accepted uploads (per-person cap)
}

export type PolicyResult = { ok: true } | { ok: false; code: string; reason: string };

const BLOCKED_EXT = new Set(['exe', 'bat', 'sh', 'cmd', 'msi', 'com', 'scr', 'ps1']);

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

function deny(code: string, reason: string): PolicyResult {
  return { ok: false, code, reason };
}

export function evaluatePolicy(share: ShareRow, file: FileMeta, ctx: PolicyContext): PolicyResult {
  if (BLOCKED_EXT.has(extOf(file.filename))) return deny('blocked-type', 'This file type is not allowed.');
  if (share.status !== 'active') return deny('inactive', 'This drop is no longer open.');
  if (share.expires_at !== null && ctx.now >= share.expires_at) return deny('expired', 'This drop has expired.');
  if (share.direction === 'distribute') return deny('no-upload', 'This drop does not accept uploads.');
  if (share.per_person_file_cap !== null && ctx.participantFileCount >= share.per_person_file_cap) {
    return deny('file-cap', 'You have reached the upload limit for this drop.');
  }
  if (share.max_file_bytes !== null && file.size > share.max_file_bytes) return deny('too-large', 'This file is too large.');
  if (share.max_total_bytes !== null && share.used_bytes + file.size > share.max_total_bytes) {
    return deny('quota', 'This drop is full.');
  }
  if (share.allowed_types !== null) {
    let allowed: string[] = [];
    try {
      allowed = JSON.parse(share.allowed_types);
    } catch {
      allowed = [];
    }
    if (!allowed.includes(file.type)) return deny('type', 'This file type is not accepted by this drop.');
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops/policy.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Mutation sweep (prove each guard bites).** Apply each mutation below one at a time, run the test, confirm the named assertion goes **RED**, then revert before the next:
  - `>=` → `>` in the per-person cap check → "rejects when the per-person file cap is already reached" RED.
  - `>` → `>=` in `max_file_bytes` check → "allows a file exactly at max_file_bytes" RED.
  - `share.used_bytes + file.size > max` → `file.size > max` (drop the running total) → "rejects when this file would exceed the total quota" RED.
  - `ctx.now >= share.expires_at` → `ctx.now > share.expires_at` → "rejects when expired" still passes, but flip to `<` → "rejects when expired" RED (confirms the comparison direction is load-bearing).
  - Remove the `BLOCKED_EXT` guard → "always blocks denylisted executable extensions" RED.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/policy.ts cloud-worker/src/drops/policy.test.ts
git commit -m "feat(drops): pure evaluatePolicy engine with table-driven guard tests"
```

---

## Phase 2 — Worker API (bindings, config, store, presign, notify, routes)

### Task 8: Bindings & `Env` — `FILES_DROPS`, rate limiters, R2 S3 secrets

**Files:**
- Modify: `cloud-worker/src/types.ts`, `cloud-worker/wrangler.jsonc`, `cloud-worker/vitest.config.ts`

- [ ] **Step 1: Extend `Env`** — `cloud-worker/src/types.ts`, add inside `interface Env`:

```ts
  FILES_DROPS: R2Bucket;
  DROP_PRESIGN_LIMITER: RateLimit;
  DROP_JOIN_LIMITER: RateLimit;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
```

- [ ] **Step 2: Add the bucket + rate-limit bindings** — `cloud-worker/wrangler.jsonc`. Append to `r2_buckets`:

```jsonc
    {
      "binding": "FILES_DROPS",
      "bucket_name": "mannan-drops"
    }
```

Append to `ratelimits` (unique namespace_ids):

```jsonc
    {
      "name": "DROP_PRESIGN_LIMITER",
      "namespace_id": "1003",
      "simple": { "limit": 30, "period": 60 }
    },
    {
      "name": "DROP_JOIN_LIMITER",
      "namespace_id": "1004",
      "simple": { "limit": 8, "period": 60 }
    }
```

- [ ] **Step 3: Provide test secrets to miniflare** — `cloud-worker/vitest.config.ts`, replace the `miniflare` block with:

```ts
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              SESSION_SECRET: 'test-session-secret',
              SITE_AUTH_EXCHANGE_SECRET: 'test-bearer-secret',
              RESEND_API_KEY: 'test-resend-key',
              R2_ACCOUNT_ID: 'testacct',
              R2_ACCESS_KEY_ID: 'testkeyid',
              R2_SECRET_ACCESS_KEY: 'testsecretkey',
            },
          },
```

(`RESEND_FROM`, `PUBLIC_BASE_URL`, `SITE_AUTH_RETURN_URL` already come from `wrangler.jsonc` `vars`. `FILES_DROPS` auto-provisions a local miniflare R2.)

- [ ] **Step 4: Regenerate worker types + verify harness green**

Run: `cd cloud-worker && bunx wrangler types && bun run test`
Expected: types regenerate; existing specs (schema, harness) still pass.

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/types.ts cloud-worker/wrangler.jsonc cloud-worker/vitest.config.ts cloud-worker/worker-configuration.d.ts
git commit -m "feat(drops): bind mannan-drops R2 + presign/join rate limiters + R2 S3 secrets"
```

### Task 9: Dial-board config builder — `drops/config.ts`

Applies the spec's **locked defaults** (§5) and validates/clamps. Pure → unit-tested. M1 supports expiry bases `absolute`, `created`, `never`; `first_open` is **deferred** (needs a window column — see "Deferred from M1" at the end of this plan).

**Files:**
- Create: `cloud-worker/src/drops/config.ts`, `cloud-worker/src/drops/config.test.ts`

- [ ] **Step 1: Write the failing test** — `cloud-worker/src/drops/config.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { buildShareConfig } from './config';

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const GB = 1024 ** 3;

describe('buildShareConfig defaults (locked decisions)', () => {
  test('passcode drop defaults: hold_for_approval ON, collect → participants_visible OFF, 14-day created expiry', () => {
    const r = buildShareConfig({ access_mode: 'passcode' }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.share).toMatchObject({
      direction: 'collect', access_mode: 'passcode', hold_for_approval: 1, participants_visible: 0,
      require_name: 1, notify_on_activity: 1, expiry_basis: 'created', max_file_bytes: 2 * GB, max_total_bytes: 20 * GB,
    });
    expect(r.share.expires_at).toBe(NOW + 14 * DAY);
  });
  test('named drop defaults hold_for_approval OFF', () => {
    const r = buildShareConfig({ access_mode: 'named' }, NOW);
    expect(r.ok && r.share.hold_for_approval).toBe(0);
  });
  test('clamps max_file_bytes to the 5 GB M1 ceiling', () => {
    const r = buildShareConfig({ access_mode: 'open', max_file_bytes: 99 * GB }, NOW);
    expect(r.ok && r.share.max_file_bytes).toBe(5 * GB);
  });
  test('never-expiry yields a null expires_at', () => {
    const r = buildShareConfig({ access_mode: 'open', expiry: { basis: 'never' } }, NOW);
    expect(r.ok && r.share.expires_at).toBeNull();
  });
  test('passcode access requires a passcode string', () => {
    expect(buildShareConfig({ access_mode: 'passcode', passcode: '' }, NOW)).toMatchObject({ ok: false });
  });
  test('rejects an unknown direction', () => {
    expect(buildShareConfig({ access_mode: 'open', direction: 'sideways' as never }, NOW)).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops/config.test.ts`
Expected: FAIL — cannot find module `./config`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/config.ts`

```ts
const DAY = 86_400_000;
const GB = 1024 ** 3;
const MAX_FILE_CEILING = 5 * GB;

export interface DropConfigInput {
  direction?: 'collect' | 'distribute' | 'exchange';
  access_mode?: 'named' | 'open' | 'passcode';
  passcode?: string;
  title?: string;
  note?: string;
  require_name?: boolean;
  max_participants?: number | null;
  per_person_file_cap?: number | null;
  single_use?: boolean;
  max_file_bytes?: number | null;
  max_total_bytes?: number | null;
  allowed_types?: string[] | null;
  hold_for_approval?: boolean;
  participants_visible?: boolean;
  notify_on_activity?: boolean;
  expiry?: { basis: 'absolute' | 'created' | 'never'; days?: number; at?: number };
}

export interface BuiltShare {
  direction: 'collect' | 'distribute' | 'exchange';
  access_mode: 'named' | 'open' | 'passcode';
  title: string | null;
  note: string | null;
  require_name: number;
  max_participants: number | null;
  per_person_file_cap: number | null;
  single_use: number;
  max_file_bytes: number | null;
  max_total_bytes: number | null;
  allowed_types: string | null;
  hold_for_approval: number;
  participants_visible: number;
  notify_on_activity: number;
  expiry_basis: 'absolute' | 'created' | null;
  expires_at: number | null;
}

export type BuildResult = { ok: true; share: BuiltShare } | { ok: false; error: string };

const bool = (v: boolean | undefined, fallback: boolean): number => (v === undefined ? (fallback ? 1 : 0) : v ? 1 : 0);

export function buildShareConfig(input: DropConfigInput, now: number): BuildResult {
  const direction = input.direction ?? 'collect';
  if (!['collect', 'distribute', 'exchange'].includes(direction)) return { ok: false, error: 'invalid direction' };
  const access_mode = input.access_mode ?? 'passcode';
  if (!['named', 'open', 'passcode'].includes(access_mode)) return { ok: false, error: 'invalid access_mode' };
  if (access_mode === 'passcode' && !input.passcode) return { ok: false, error: 'passcode required' };

  let expiry_basis: 'absolute' | 'created' | null = 'created';
  let expires_at: number | null = now + 14 * DAY;
  const e = input.expiry;
  if (e) {
    if (e.basis === 'never') { expiry_basis = null; expires_at = null; }
    else if (e.basis === 'created') { expiry_basis = 'created'; expires_at = now + (e.days ?? 14) * DAY; }
    else if (e.basis === 'absolute') {
      if (!e.at || e.at <= now) return { ok: false, error: 'absolute expiry must be in the future' };
      expiry_basis = 'absolute'; expires_at = e.at;
    } else return { ok: false, error: 'invalid expiry basis' };
  }

  const clamp = (v: number | null | undefined, ceiling: number, dflt: number): number | null =>
    v === null ? null : Math.min(v ?? dflt, ceiling);

  return {
    ok: true,
    share: {
      direction, access_mode,
      title: input.title?.slice(0, 200) ?? null,
      note: input.note?.slice(0, 2000) ?? null,
      require_name: bool(input.require_name, true),
      max_participants: input.max_participants === undefined ? (access_mode === 'named' ? null : 10) : input.max_participants,
      per_person_file_cap: input.per_person_file_cap === undefined ? 20 : input.per_person_file_cap,
      single_use: bool(input.single_use, false),
      max_file_bytes: clamp(input.max_file_bytes, MAX_FILE_CEILING, 2 * GB),
      max_total_bytes: input.max_total_bytes === null ? null : (input.max_total_bytes ?? 20 * GB),
      allowed_types: input.allowed_types && input.allowed_types.length ? JSON.stringify(input.allowed_types) : null,
      hold_for_approval: bool(input.hold_for_approval, access_mode !== 'named'),
      participants_visible: bool(input.participants_visible, direction === 'exchange'),
      notify_on_activity: bool(input.notify_on_activity, true),
      expiry_basis, expires_at,
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops/config.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Mutation check.** Flip the `hold_for_approval` default to `bool(input.hold_for_approval, false)`. Run. Expected: the passcode-defaults test goes **RED** (hold_for_approval expected 1). Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/config.ts cloud-worker/src/drops/config.test.ts
git commit -m "feat(drops): dial-board config builder with locked defaults + clamps"
```

### Task 10: D1 data access — `drops/store.ts`

**Files:**
- Create: `cloud-worker/src/drops/store.ts`, `cloud-worker/test/drops-store.spec.ts`

- [ ] **Step 1: Write the failing integration spec** — `cloud-worker/test/drops-store.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addUsedBytes, countParticipantFiles, createShare, getEvent, getShare, insertEvent,
  insertParticipant, listEvents, setEventStatus,
} from '../src/drops/store';
import type { ShareRow } from '../src/drops/policy';

const base: ShareRow = {
  id: 'share_store', owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'passcode',
  passcode_hash: 'hash', passcode_salt: 'salt', title: 'T', note: null, require_name: 1, max_participants: 10,
  per_person_file_cap: 20, single_use: 0, max_file_bytes: 1000, max_total_bytes: 5000, allowed_types: null,
  hold_for_approval: 1, participants_visible: 0, notify_on_activity: 1, r2_prefix: 'drops/share_store/',
  expiry_basis: 'created', expires_at: 9_999_999_999_999, first_opened_at: null, used_bytes: 0,
  status: 'active', created_at: 1000,
};

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('drops store', () => {
  it('round-trips a share', async () => {
    await createShare(env, base);
    const got = await getShare(env, 'share_store');
    expect(got).toMatchObject({ id: 'share_store', passcode_hash: 'hash', max_total_bytes: 5000, status: 'active' });
  });
  it('counts a participant\'s pending+accepted uploads, ignoring rejected', async () => {
    await createShare(env, base);
    await insertParticipant(env, { id: 'p1', share_id: 'share_store', email: null, name: 'Ann', joined_at: 1 });
    await insertEvent(env, { id: 'e1', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k1', filename: 'a', bytes: 100, status: 'pending', created_at: 1 });
    await insertEvent(env, { id: 'e2', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k2', filename: 'b', bytes: 100, status: 'accepted', created_at: 2 });
    await insertEvent(env, { id: 'e3', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k3', filename: 'c', bytes: 100, status: 'rejected', created_at: 3 });
    expect(await countParticipantFiles(env, 'share_store', 'p1')).toBe(2);
  });
  it('addUsedBytes is additive and setEventStatus mutates', async () => {
    await createShare(env, base);
    await addUsedBytes(env, 'share_store', 250);
    await addUsedBytes(env, 'share_store', 250);
    expect((await getShare(env, 'share_store'))?.used_bytes).toBe(500);
    await insertEvent(env, { id: 'e1', share_id: 'share_store', participant_id: null, kind: 'upload', object_key: 'k', filename: 'a', bytes: 1, status: 'pending', created_at: 1 });
    await setEventStatus(env, 'e1', 'accepted');
    expect((await getEvent(env, 'e1'))?.status).toBe('accepted');
    expect((await listEvents(env, 'share_store')).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun run test test/drops-store.spec.ts`
Expected: FAIL — cannot find module `../src/drops/store`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/store.ts`

```ts
import type { Env } from '../types';
import type { ShareRow } from './policy';

export interface ParticipantRow {
  id: string;
  share_id: string;
  email: string | null;
  name: string | null;
  joined_at: number;
}

export interface EventRow {
  id: string;
  share_id: string;
  participant_id: string | null;
  kind: 'upload' | 'download' | 'approve' | 'reject';
  object_key: string | null;
  filename: string | null;
  bytes: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}

export async function createShare(env: Env, s: ShareRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO shares (id, owner_email, direction, access_mode, passcode_hash, passcode_salt, title, note,
      require_name, max_participants, per_person_file_cap, single_use, max_file_bytes, max_total_bytes, allowed_types,
      hold_for_approval, participants_visible, notify_on_activity, r2_prefix, expiry_basis, expires_at, first_opened_at,
      used_bytes, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    s.id, s.owner_email, s.direction, s.access_mode, s.passcode_hash, s.passcode_salt, s.title, s.note,
    s.require_name, s.max_participants, s.per_person_file_cap, s.single_use, s.max_file_bytes, s.max_total_bytes,
    s.allowed_types, s.hold_for_approval, s.participants_visible, s.notify_on_activity, s.r2_prefix, s.expiry_basis,
    s.expires_at, s.first_opened_at, s.used_bytes, s.status, s.created_at,
  ).run();
}

export async function getShare(env: Env, id: string): Promise<ShareRow | null> {
  return env.DB.prepare('SELECT * FROM shares WHERE id = ?').bind(id).first<ShareRow>();
}

export async function listShares(env: Env): Promise<ShareRow[]> {
  const { results } = await env.DB.prepare('SELECT * FROM shares ORDER BY created_at DESC').all<ShareRow>();
  return results;
}

export async function touchFirstOpen(env: Env, id: string, now: number): Promise<void> {
  await env.DB.prepare('UPDATE shares SET first_opened_at = ? WHERE id = ? AND first_opened_at IS NULL').bind(now, id).run();
}

export async function markShareStatus(env: Env, id: string, status: ShareRow['status']): Promise<void> {
  await env.DB.prepare('UPDATE shares SET status = ? WHERE id = ?').bind(status, id).run();
}

export async function addUsedBytes(env: Env, id: string, delta: number): Promise<void> {
  await env.DB.prepare('UPDATE shares SET used_bytes = used_bytes + ? WHERE id = ?').bind(delta, id).run();
}

export async function insertParticipant(env: Env, p: ParticipantRow): Promise<void> {
  await env.DB.prepare('INSERT INTO share_participants (id, share_id, email, name, joined_at) VALUES (?,?,?,?,?)')
    .bind(p.id, p.share_id, p.email, p.name, p.joined_at).run();
}

export async function getParticipant(env: Env, id: string): Promise<ParticipantRow | null> {
  return env.DB.prepare('SELECT * FROM share_participants WHERE id = ?').bind(id).first<ParticipantRow>();
}

export async function countParticipants(env: Env, shareId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM share_participants WHERE share_id = ?').bind(shareId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countParticipantFiles(env: Env, shareId: string, participantId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM share_events WHERE share_id = ? AND participant_id = ? AND kind = 'upload' AND status IN ('pending','accepted')",
  ).bind(shareId, participantId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function insertEvent(env: Env, e: EventRow): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO share_events (id, share_id, participant_id, kind, object_key, filename, bytes, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  ).bind(e.id, e.share_id, e.participant_id, e.kind, e.object_key, e.filename, e.bytes, e.status, e.created_at).run();
}

export async function getEvent(env: Env, id: string): Promise<EventRow | null> {
  return env.DB.prepare('SELECT * FROM share_events WHERE id = ?').bind(id).first<EventRow>();
}

export async function listEvents(env: Env, shareId: string): Promise<EventRow[]> {
  const { results } = await env.DB.prepare('SELECT * FROM share_events WHERE share_id = ? ORDER BY created_at DESC').bind(shareId).all<EventRow>();
  return results;
}

export async function setEventStatus(env: Env, id: string, status: EventRow['status']): Promise<void> {
  await env.DB.prepare('UPDATE share_events SET status = ? WHERE id = ?').bind(status, id).run();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun run test test/drops-store.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/drops/store.ts cloud-worker/test/drops-store.spec.ts
git commit -m "feat(drops): D1 store for shares, participants, events, quota"
```

### Task 11: Presign — `drops/presign.ts` (aws4fetch SigV4)

**Files:**
- Create: `cloud-worker/src/drops/presign.ts`, `cloud-worker/test/drops-presign.spec.ts`

- [ ] **Step 1: Write the failing spec** (pins aws4fetch's presign output shape so an API drift fails loudly) — `cloud-worker/test/drops-presign.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { presignPutUrl } from '../src/drops/presign';

describe('presignPutUrl', () => {
  it('produces a SigV4 presigned PUT URL for the mannan-drops bucket', async () => {
    const url = await presignPutUrl(env, 'drops/share_abc/p1/uuid-photo.jpg', 600);
    const u = new URL(url);
    expect(u.host).toBe('testacct.r2.cloudflarestorage.com');
    expect(u.pathname).toBe('/mannan-drops/drops/share_abc/p1/uuid-photo.jpg');
    expect(u.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(u.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(u.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(u.searchParams.get('X-Amz-Credential')).toContain('testkeyid');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun run test test/drops-presign.spec.ts`
Expected: FAIL — cannot find module `../src/drops/presign`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/presign.ts`

```ts
import { AwsClient } from 'aws4fetch';
import type { Env } from '../types';

export const DROPS_BUCKET = 'mannan-drops';

export async function presignPutUrl(env: Env, key: string, expiresSeconds = 600): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const path = key.split('/').map(encodeURIComponent).join('/');
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${DROPS_BUCKET}/${path}`);
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
  const signed = await client.sign(url.toString(), { method: 'PUT', aws: { signQuery: true } });
  return signed.url;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun run test test/drops-presign.spec.ts`
Expected: PASS. (If `signQuery` isn't honored by the installed aws4fetch, the `X-Amz-Signature` assertion fails — consult `node_modules/aws4fetch/README.md` for the current presign option name.)

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/drops/presign.ts cloud-worker/test/drops-presign.spec.ts
git commit -m "feat(drops): aws4fetch SigV4 presigned PUT URLs for mannan-drops"
```

### Task 12: Notification — `drops/notify.ts` (Resend)

**Files:**
- Create: `cloud-worker/src/drops/notify.ts`, `cloud-worker/src/drops/notify.test.ts`

- [ ] **Step 1: Write the failing test** (pure message builder; the fetch wrapper is thin) — `cloud-worker/src/drops/notify.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { buildDropNotification } from './notify';

describe('buildDropNotification', () => {
  test('pending upload reads "awaiting your approval" and links the site inbox', () => {
    const msg = buildDropNotification({
      title: 'Retreat photos', shareId: 'share_abc', filename: 'IMG.jpg', bytes: 5 * 1024 * 1024,
      participantName: 'Ann', status: 'pending', siteOrigin: 'https://mannan.is',
    });
    expect(msg.to).toEqual(['hello@mannan.is']);
    expect(msg.subject).toBe('New upload to Retreat photos');
    expect(msg.text).toContain('Ann');
    expect(msg.text).toContain('5.0 MB');
    expect(msg.text).toContain('awaiting your approval');
    expect(msg.text).toContain('https://mannan.is/drops');
  });
  test('accepted upload reads "was accepted"', () => {
    const msg = buildDropNotification({ title: null, shareId: 'share_x', filename: 'a', bytes: 1, participantName: null, status: 'accepted', siteOrigin: 'https://mannan.is' });
    expect(msg.subject).toBe('New upload to a drop');
    expect(msg.text).toContain('was accepted');
    expect(msg.text).toContain('Someone');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun test src/drops/notify.test.ts`
Expected: FAIL — cannot find module `./notify`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/notify.ts`

```ts
import type { Env } from '../types';
import type { ShareRow } from './policy';

export interface DropNotificationInput {
  title: string | null;
  shareId: string;
  filename: string;
  bytes: number;
  participantName: string | null;
  status: 'pending' | 'accepted';
  siteOrigin: string;
}

export interface DropNotificationMessage {
  to: string[];
  subject: string;
  text: string;
}

export function buildDropNotification(input: DropNotificationInput): DropNotificationMessage {
  const label = input.title ?? 'a drop';
  const who = input.participantName ?? 'Someone';
  const sizeMb = `${(input.bytes / (1024 * 1024)).toFixed(1)} MB`;
  const verb = input.status === 'pending' ? 'is awaiting your approval' : 'was accepted';
  return {
    to: ['hello@mannan.is'],
    subject: `New upload to ${label}`,
    text: `${who} uploaded "${input.filename}" (${sizeMb}) to "${label}". It ${verb}.\n\n${input.siteOrigin}/drops`,
  };
}

export async function sendDropUploadNotification(
  env: Env,
  share: ShareRow,
  input: { eventId: string; filename: string; bytes: number; participantName: string | null; status: 'pending' | 'accepted' },
): Promise<void> {
  if (!share.notify_on_activity) return;
  const siteOrigin = new URL(env.SITE_AUTH_RETURN_URL).origin;
  const msg = buildDropNotification({
    title: share.title, shareId: share.id, filename: input.filename, bytes: input.bytes,
    participantName: input.participantName, status: input.status, siteOrigin,
  });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `drop-upload/${input.eventId}`,
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) console.error('resend_drop_error', res.status, await res.text());
  } catch (err) {
    console.error('resend_drop_throw', err);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun test src/drops/notify.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/drops/notify.ts cloud-worker/src/drops/notify.test.ts
git commit -m "feat(drops): Resend upload-notification builder + best-effort sender"
```

### Task 13: Routes scaffold + create / list / get — `drops/routes.ts`

The Bearer-guarded sub-router. Built across Tasks 13–18; each adds handlers + tests. Route tests call the router directly via Hono's `drops.request(path, init, env)` with the miniflare `env`, so they need no `index.ts` wiring.

**Files:**
- Create: `cloud-worker/src/drops/routes.ts`, `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Write the failing spec** — `cloud-worker/test/drops-routes.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { drops } from '../src/drops/routes';

const BEARER = { authorization: 'Bearer test-bearer-secret', 'content-type': 'application/json' };
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  drops.request(path, { method: 'POST', headers: { ...BEARER, ...headers }, body: JSON.stringify(body) }, env);
const get = (path: string, headers: Record<string, string> = {}) =>
  drops.request(path, { method: 'GET', headers: { ...BEARER, ...headers } }, env);

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('drops routes — auth + create/list/get', () => {
  it('rejects calls without the shared-secret Bearer', async () => {
    const res = await drops.request('/', { method: 'GET' }, env);
    expect(res.status).toBe(401);
  });
  it('creates a passcode collect drop and lists it without leaking the passcode hash', async () => {
    const created = await post('/', { access_mode: 'passcode', passcode: 'open-sesame', title: 'Retreat', direction: 'collect' });
    expect(created.status).toBe(200);
    const { id } = await created.json<{ id: string }>();
    expect(id).toMatch(/^[0-9A-Za-z]{16}$/);

    const list = await (await get('/')).json<{ drops: Array<Record<string, unknown>> }>();
    expect(list.drops).toHaveLength(1);
    expect(list.drops[0]).toMatchObject({ id, title: 'Retreat', pending: 0 });
    expect(JSON.stringify(list.drops[0])).not.toContain('passcode_hash');
  });
  it('recipient GET returns safe metadata (requires_passcode, no hash) and marks first-open', async () => {
    const { id } = await (await post('/', { access_mode: 'passcode', passcode: 'pw', title: 'T' })).json<{ id: string }>();
    const view = await (await get(`/${id}`)).json<Record<string, unknown>>();
    expect(view).toMatchObject({ id, title: 'T', requires_passcode: true, status: 'active' });
    expect(JSON.stringify(view)).not.toContain('passcode');
    const row = await env.DB.prepare('SELECT first_opened_at FROM shares WHERE id = ?').bind(id).first<{ first_opened_at: number | null }>();
    expect(row?.first_opened_at).toBeGreaterThan(0);
  });
  it('rejects an invalid create (passcode mode, empty passcode)', async () => {
    expect((await post('/', { access_mode: 'passcode', passcode: '' })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd cloud-worker && bun run test test/drops-routes.spec.ts`
Expected: FAIL — cannot find module `../src/drops/routes`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/routes.ts`

```ts
import { Hono, type Context } from 'hono';
import type { Env } from '../types';
import type { Session } from '../auth';
import { buildShareConfig, type DropConfigInput } from './config';
import { newId, newShareId } from './ids';
import { hashPasscode, newSalt, verifyPasscode } from './passcode';
import { evaluatePolicy, type ShareRow } from './policy';
import { presignPutUrl } from './presign';
import { sendDropUploadNotification } from './notify';
import { mintParticipantToken, verifyParticipantToken } from './tokens';
import type { EventRow } from './store';
import * as store from './store';

type DropCtx = { Bindings: Env; Variables: { session: Session | null } };
export const drops = new Hono<DropCtx>();

drops.use('*', async (c, next) => {
  if (c.req.header('authorization') !== `Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

function ipOf(c: Context<DropCtx>): string {
  return c.req.header('x-site-auth-ip') ?? c.req.header('cf-connecting-ip') ?? 'unknown';
}

async function tryLimit(limiter: Env['DROP_PRESIGN_LIMITER'] | undefined, key: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}

function isExpired(share: ShareRow, now: number): boolean {
  return share.status !== 'active' || (share.expires_at !== null && now >= share.expires_at);
}

function redactShare(s: ShareRow) {
  const { passcode_hash: _h, passcode_salt: _s, ...rest } = s;
  return rest;
}

// POST /drops — create
drops.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as (DropConfigInput & { owner_email?: string }) | null;
  if (!body) return c.json({ error: 'invalid body' }, 400);
  const built = buildShareConfig(body, Date.now());
  if (!built.ok) return c.json({ error: built.error }, 400);

  const id = newShareId();
  let passcode_hash: string | null = null;
  let passcode_salt: string | null = null;
  if (built.share.access_mode === 'passcode') {
    passcode_salt = newSalt();
    passcode_hash = await hashPasscode(body.passcode as string, passcode_salt);
  }
  const now = Date.now();
  const share: ShareRow = {
    id,
    owner_email: body.owner_email ?? 'hello@mannan.is',
    ...built.share,
    passcode_hash,
    passcode_salt,
    r2_prefix: `drops/${id}/`,
    first_opened_at: null,
    used_bytes: 0,
    status: 'active',
    created_at: now,
  };
  await store.createShare(c.env, share);
  return c.json({ id });
});

// GET /drops — admin inbox (list + events + pending counts)
drops.get('/', async (c) => {
  const shares = await store.listShares(c.env);
  const drops = await Promise.all(
    shares.map(async (s) => {
      const events = await store.listEvents(c.env, s.id);
      const pending = events.filter((e) => e.kind === 'upload' && e.status === 'pending').length;
      return { ...redactShare(s), pending, events };
    }),
  );
  return c.json({ drops });
});

// GET /drops/:id — recipient-safe metadata
drops.get('/:id', async (c) => {
  const id = c.req.param('id');
  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const now = Date.now();
  await store.touchFirstOpen(c.env, id, now);
  return c.json({
    id: share.id,
    title: share.title,
    note: share.note,
    direction: share.direction,
    access_mode: share.access_mode,
    require_name: share.require_name === 1,
    requires_passcode: share.access_mode === 'passcode',
    max_file_bytes: share.max_file_bytes,
    status: isExpired(share, now) ? 'expired' : 'active',
  });
});
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun run test test/drops-routes.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): /drops create + admin list + recipient-safe get"
```

### Task 14: Join endpoint (open + passcode doors)

**Files:**
- Modify: `cloud-worker/src/drops/routes.ts`
- Modify: `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Add the failing tests** — append inside the `describe` in `drops-routes.spec.ts`:

```ts
  it('join rejects a wrong passcode and accepts the right one, issuing a token', async () => {
    const { id } = await (await post('/', { access_mode: 'passcode', passcode: 'right-code', require_name: true })).json<{ id: string }>();
    expect((await post(`/${id}/join`, { name: 'Ann', passcode: 'wrong-code' })).status).toBe(403);
    const ok = await post(`/${id}/join`, { name: 'Ann', passcode: 'right-code' });
    expect(ok.status).toBe(200);
    const { token, participant_id } = await ok.json<{ token: string; participant_id: string }>();
    expect(token).toContain('.');
    const p = await env.DB.prepare('SELECT name FROM share_participants WHERE id = ?').bind(participant_id).first<{ name: string }>();
    expect(p?.name).toBe('Ann');
  });
  it('join enforces require_name', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: true })).json<{ id: string }>();
    expect((await post(`/${id}/join`, {})).status).toBe(400);
  });
  it('join is refused once the participant cap is full', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_participants: 1 })).json<{ id: string }>();
    expect((await post(`/${id}/join`, {})).status).toBe(200);
    expect((await post(`/${id}/join`, {})).status).toBe(409);
  });
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `cd cloud-worker && bun run test test/drops-routes.spec.ts`
Expected: FAIL — `/join` returns 404 (route not defined).

- [ ] **Step 3: Add the handler** to `drops/routes.ts` (after the `GET /:id` handler):

```ts
// POST /drops/:id/join — open + passcode doors
drops.post('/:id/join', async (c) => {
  const id = c.req.param('id');
  if (!(await tryLimit(c.env.DROP_JOIN_LIMITER, `join:${ipOf(c)}`))) return c.json({ error: 'rate-limited' }, 429);
  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const now = Date.now();
  if (isExpired(share, now)) return c.json({ error: 'expired' }, 410);

  const body = (await c.req.json().catch(() => null)) as { name?: string; passcode?: string } | null;

  if (share.access_mode === 'passcode') {
    const ok =
      !!share.passcode_hash &&
      !!share.passcode_salt &&
      !!body?.passcode &&
      (await verifyPasscode(body.passcode, share.passcode_salt, share.passcode_hash));
    if (!ok) return c.json({ error: 'bad-passcode' }, 403);
  }
  if (share.access_mode === 'named') return c.json({ error: 'use-magic-link' }, 400); // handled in Task 18

  if (share.require_name === 1 && !body?.name?.trim()) return c.json({ error: 'name-required' }, 400);
  if (share.max_participants !== null && (await store.countParticipants(c.env, id)) >= share.max_participants) {
    return c.json({ error: 'full' }, 409);
  }

  const pid = newId();
  await store.insertParticipant(c.env, {
    id: pid,
    share_id: id,
    email: null,
    name: body?.name?.trim().slice(0, 100) ?? null,
    joined_at: now,
  });
  const token = await mintParticipantToken(c.env, id, pid);
  return c.json({ token, participant_id: pid });
});
```

- [ ] **Step 4: Run to verify pass**

Run: `cd cloud-worker && bun run test test/drops-routes.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Mutation check.** In the passcode branch, force `const ok = true`. Run. Expected: "join rejects a wrong passcode…" goes **RED**. Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): join endpoint with passcode/open doors, name + cap enforcement"
```

### Task 15: Presign endpoint (policy gate → signed PUT)

**Files:**
- Modify: `cloud-worker/src/drops/routes.ts`, `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Add the failing tests:**

```ts
  async function joinOpen(id: string) {
    const r = await post(`/${id}/join`, { name: 'Ann' });
    return (await r.json<{ token: string; participant_id: string }>());
  }

  it('presign signs a PUT URL when policy passes and scopes the key to the participant', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: true, max_file_bytes: 1024 ** 3 })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const res = await post(`/${id}/presign`, { filename: 'photo.jpg', size: 5_000_000, type: 'image/jpeg' }, { 'x-drop-participant': token });
    expect(res.status).toBe(200);
    const out = await res.json<{ url: string; key: string }>();
    expect(out.key).toBe(`drops/${id}/${participant_id}/`.length ? out.key : '');
    expect(out.key.startsWith(`drops/${id}/${participant_id}/`)).toBe(true);
    expect(new URL(out.url).searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('presign refuses an oversize file (policy: too-large) without signing', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1_000_000 })).json<{ id: string }>();
    const { token } = await joinOpen(id);
    const res = await post(`/${id}/presign`, { filename: 'big.bin', size: 2_000_000, type: 'application/octet-stream' }, { 'x-drop-participant': token });
    expect(res.status).toBe(422);
    expect((await res.json<{ error: string }>()).error).toBe('too-large');
  });
  it('presign rejects a request with no/invalid participant token', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false })).json<{ id: string }>();
    expect((await post(`/${id}/presign`, { filename: 'a', size: 1, type: 't' })).status).toBe(401);
  });
```

(Note: the `joinOpen` here uses `require_name:false` drops; for the first test `require_name:true` it passes a name. Keep the helper but pass name always — harmless when not required.)

- [ ] **Step 2: Run to verify fail** — `/presign` 404.

Run: `cd cloud-worker && bun run test test/drops-routes.spec.ts`

- [ ] **Step 3: Add the handler** to `drops/routes.ts`:

```ts
// POST /drops/:id/presign — policy chokepoint → signed PUT
drops.post('/:id/presign', async (c) => {
  const id = c.req.param('id');
  const claims = await verifyParticipantToken(c.env, c.req.header('x-drop-participant') ?? null);
  if (!claims || claims.sid !== id) return c.json({ error: 'unauthorized' }, 401);
  if (!(await tryLimit(c.env.DROP_PRESIGN_LIMITER, `presign:${claims.pid}:${ipOf(c)}`))) return c.json({ error: 'rate-limited' }, 429);

  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const body = (await c.req.json().catch(() => null)) as { filename?: string; size?: number; type?: string } | null;
  if (!body?.filename || typeof body.size !== 'number' || body.size < 0) return c.json({ error: 'bad-request' }, 400);

  const fileCount = await store.countParticipantFiles(c.env, id, claims.pid);
  const verdict = evaluatePolicy(
    share,
    { filename: body.filename, size: body.size, type: body.type ?? 'application/octet-stream' },
    { now: Date.now(), participantFileCount: fileCount },
  );
  if (!verdict.ok) return c.json({ error: verdict.code, reason: verdict.reason }, 422);

  const safeName = body.filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  const key = `drops/${id}/${claims.pid}/${newId()}-${safeName}`;
  const url = await presignPutUrl(c.env, key, 600);
  return c.json({ url, key, expires_in: 600 });
});
```

- [ ] **Step 4: Run to verify pass.** Run the spec. Expected: PASS (10 tests).

- [ ] **Step 5: Mutation check.** Change `if (!verdict.ok) return …422` to `if (false) …`. Run. Expected: "presign refuses an oversize file…" goes **RED** (now signs instead of refusing). Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): presign endpoint — policy-gated SigV4 PUT, participant-scoped key"
```

### Task 16: Commit endpoint (R2 `HEAD` true-size, quota, hold-for-approval, notify)

The security keystone: **never trust the client-reported size** — re-read the true size from R2 and re-run policy. `used_bytes` tracks the **physical R2 footprint** (pending + accepted); reject deletes + refunds.

**Files:**
- Modify: `cloud-worker/src/drops/routes.ts`, `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Add the failing tests:**

```ts
  it('commit reads the TRUE size from R2 and rejects a spoofed oversize object, deleting it', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1_000_000, hold_for_approval: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/spoof.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(2_000_000)); // real object is 2 MB, over the 1 MB cap
    const res = await post(`/${id}/commit`, { key, filename: 'spoof.bin' }, { 'x-drop-participant': token });
    expect(res.status).toBe(422);
    expect((await res.json<{ error: string }>()).error).toBe('too-large');
    expect(await env.FILES_DROPS.head(key)).toBeNull(); // deleted
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(0);
  });
  it('commit on a hold-for-approval drop records the upload as PENDING and counts its bytes', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: true })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/ok.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(500_000));
    const res = await post(`/${id}/commit`, { key, filename: 'ok.bin' }, { 'x-drop-participant': token });
    expect(res.status).toBe(200);
    expect((await res.json<{ status: string }>()).status).toBe('pending');
    const ev = await env.DB.prepare("SELECT status, bytes FROM share_events WHERE share_id = ?").bind(id).first<{ status: string; bytes: number }>();
    expect(ev).toEqual({ status: 'pending', bytes: 500_000 });
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(500_000);
  });
  it('commit auto-accepts when hold_for_approval is off', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/auto.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(1000));
    expect((await (await post(`/${id}/commit`, { key, filename: 'auto.bin' }, { 'x-drop-participant': token })).json<{ status: string }>()).status).toBe('accepted');
  });
```

- [ ] **Step 2: Run to verify fail** — `/commit` 404.

- [ ] **Step 3: Add the handler** to `drops/routes.ts`:

```ts
// POST /drops/:id/commit — verify true size via R2 HEAD, record, notify
drops.post('/:id/commit', async (c) => {
  const id = c.req.param('id');
  const claims = await verifyParticipantToken(c.env, c.req.header('x-drop-participant') ?? null);
  if (!claims || claims.sid !== id) return c.json({ error: 'unauthorized' }, 401);

  const body = (await c.req.json().catch(() => null)) as { key?: string; filename?: string } | null;
  if (!body?.key || !body.key.startsWith(`drops/${id}/${claims.pid}/`)) return c.json({ error: 'bad-key' }, 400);

  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);

  const head = await c.env.FILES_DROPS.head(body.key);
  if (!head) return c.json({ error: 'no-object' }, 400);
  const trueSize = head.size;

  const fileCount = await store.countParticipantFiles(c.env, id, claims.pid);
  const filename = body.filename ?? body.key.split('/').pop() ?? 'file';
  const verdict = evaluatePolicy(
    share,
    { filename, size: trueSize, type: head.httpMetadata?.contentType ?? 'application/octet-stream' },
    { now: Date.now(), participantFileCount: fileCount },
  );
  if (!verdict.ok) {
    await c.env.FILES_DROPS.delete(body.key);
    return c.json({ error: verdict.code, reason: verdict.reason }, 422);
  }

  const accepted = share.hold_for_approval === 0;
  const eventId = newId();
  const event: EventRow = {
    id: eventId, share_id: id, participant_id: claims.pid, kind: 'upload',
    object_key: body.key, filename, bytes: trueSize, status: accepted ? 'accepted' : 'pending', created_at: Date.now(),
  };
  await store.insertEvent(c.env, event);
  await store.addUsedBytes(c.env, id, trueSize); // physical footprint, pending or accepted
  if (share.single_use === 1) await store.markShareStatus(c.env, id, 'closed');

  const participant = await store.getParticipant(c.env, claims.pid);
  c.executionCtx.waitUntil(
    sendDropUploadNotification(c.env, share, {
      eventId, filename, bytes: trueSize, participantName: participant?.name ?? null, status: accepted ? 'accepted' : 'pending',
    }),
  );
  return c.json({ status: accepted ? 'accepted' : 'pending', event_id: eventId });
});
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS (13 tests).

- [ ] **Step 5: Mutation checks (the keystone).**
  - Replace `head.size` in the `evaluatePolicy` call with `body` client size — i.e. trust the client. Concretely change the `size: trueSize` line to `size: 1` (a fake small size). Run. Expected: "commit reads the TRUE size … rejects a spoofed oversize object" goes **RED** (it would accept). Revert.
  - Change `const accepted = share.hold_for_approval === 0` to `= true` (auto-accept always). Run. Expected: "commit on a hold-for-approval drop records the upload as PENDING" goes **RED**. Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): commit endpoint — R2 HEAD true-size re-check, quota, hold-for-approval, notify"
```

### Task 17: Approve / reject endpoints (admin)

**Files:**
- Modify: `cloud-worker/src/drops/routes.ts`, `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Add the failing tests:**

```ts
  it('approve flips a pending upload to accepted (bytes already counted)', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: true })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/a.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(700));
    const { event_id } = await (await post(`/${id}/commit`, { key, filename: 'a.bin' }, { 'x-drop-participant': token })).json<{ event_id: string }>();
    expect((await post(`/${id}/approve`, { event_id })).status).toBe(200);
    expect((await env.DB.prepare('SELECT status FROM share_events WHERE id = ?').bind(event_id).first<{ status: string }>())?.status).toBe('accepted');
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(700);
  });
  it('reject deletes the R2 object and refunds its bytes from used_bytes', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: true })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/r.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(900));
    const { event_id } = await (await post(`/${id}/commit`, { key, filename: 'r.bin' }, { 'x-drop-participant': token })).json<{ event_id: string }>();
    expect((await post(`/${id}/reject`, { event_id })).status).toBe(200);
    expect((await env.DB.prepare('SELECT status FROM share_events WHERE id = ?').bind(event_id).first<{ status: string }>())?.status).toBe('rejected');
    expect(await env.FILES_DROPS.head(key)).toBeNull();
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(0);
  });
```

- [ ] **Step 2: Run to verify fail** — `/approve` 404.

- [ ] **Step 3: Add the handlers** to `drops/routes.ts`:

```ts
// POST /drops/:id/approve — admin (site-gated)
drops.post('/:id/approve', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) return c.json({ error: 'event_id required' }, 400);
  const ev = await store.getEvent(c.env, body.event_id);
  if (!ev || ev.share_id !== id || ev.kind !== 'upload') return c.json({ error: 'not found' }, 404);
  if (ev.status !== 'pending') return c.json({ status: ev.status }); // idempotent
  await store.setEventStatus(c.env, ev.id, 'accepted');
  return c.json({ status: 'accepted' });
});

// POST /drops/:id/reject — admin (site-gated): delete object + refund bytes
drops.post('/:id/reject', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) return c.json({ error: 'event_id required' }, 400);
  const ev = await store.getEvent(c.env, body.event_id);
  if (!ev || ev.share_id !== id || ev.kind !== 'upload') return c.json({ error: 'not found' }, 404);
  if (ev.status === 'rejected') return c.json({ status: 'rejected' }); // idempotent
  await store.setEventStatus(c.env, ev.id, 'rejected');
  if (ev.object_key) await c.env.FILES_DROPS.delete(ev.object_key);
  if (ev.bytes) await store.addUsedBytes(c.env, id, -ev.bytes);
  return c.json({ status: 'rejected' });
});
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS (15 tests).

- [ ] **Step 5: Mutation check.** In `reject`, comment out the `FILES_DROPS.delete`. Run. Expected: "reject deletes the R2 object…" goes **RED**. Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): admin approve/reject — status flip, object delete, byte refund"
```

### Task 18: Named door — magic-link invite (create) + consume (join)

Completes the third access mode. Create accepts `invite_emails[]`, mints `purpose='share'` tokens, emails each a `…/drop/<id>?token=…` link; join consumes the token → a participant bound to that email.

**Files:**
- Modify: `cloud-worker/src/drops/notify.ts`, `cloud-worker/src/drops/routes.ts`, `cloud-worker/test/drops-routes.spec.ts`

- [ ] **Step 1: Add invite email builder** to `drops/notify.ts`:

```ts
export function buildDropInviteText(title: string | null, link: string): string {
  return `You've been invited to a drop${title ? `: "${title}"` : ''}.\n\nOpen it to upload your files:\n${link}\n\nThis link is personal — don't forward it.`;
}

export async function sendDropInvite(env: Env, to: string, title: string | null, link: string): Promise<void> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `drop-invite/${link.slice(-32)}`,
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject: `You've got a drop${title ? `: ${title}` : ''}`, text: buildDropInviteText(title, link) }),
    });
    if (!res.ok) console.error('resend_invite_error', res.status, await res.text());
  } catch (err) {
    console.error('resend_invite_throw', err);
  }
}
```

- [ ] **Step 2: Add the failing test** to `drops-routes.spec.ts` (consume path — emailing is fire-and-forget):

```ts
  it('named drop: a valid share magic-token joins as the invited email; a bad token is refused', async () => {
    const { id } = await (await post('/', { access_mode: 'named', require_name: false })).json<{ id: string }>();
    // simulate the invite mint that create would have done:
    const { mintMagicToken } = await import('../src/auth');
    const raw = await mintMagicToken(env, 'guest@example.com', 'share');
    const res = await post(`/${id}/join`, { magic_token: raw });
    expect(res.status).toBe(200);
    const { participant_id } = await res.json<{ participant_id: string }>();
    expect((await env.DB.prepare('SELECT email FROM share_participants WHERE id = ?').bind(participant_id).first<{ email: string }>())?.email).toBe('guest@example.com');
    expect((await post(`/${id}/join`, { magic_token: 'garbage' })).status).toBe(403);
  });
```

- [ ] **Step 3: Wire create + join.** In `drops/routes.ts`:
  - Add imports: `import { consumeMagicToken, mintMagicToken } from '../auth';` and `import { sendDropInvite } from './notify';`
  - In the `POST /` handler, after `await store.createShare(...)` and before `return c.json({ id })`, add:

```ts
  if (built.share.access_mode === 'named' && Array.isArray((body as { invite_emails?: string[] }).invite_emails)) {
    const siteOrigin = new URL(c.env.SITE_AUTH_RETURN_URL).origin;
    for (const email of (body as { invite_emails: string[] }).invite_emails.slice(0, 50)) {
      const token = await mintMagicToken(c.env, email, 'share');
      c.executionCtx.waitUntil(sendDropInvite(c.env, email, built.share.title, `${siteOrigin}/drop/${id}?token=${token}`));
    }
  }
```

  - Replace the `if (share.access_mode === 'named') return …400` line in `POST /:id/join` with:

```ts
  if (share.access_mode === 'named') {
    const raw = (body as { magic_token?: string } | null)?.magic_token;
    const email = raw ? await consumeMagicToken(c.env, raw, 'share') : null;
    if (!email) return c.json({ error: 'bad-token' }, 403);
    if (share.max_participants !== null && (await store.countParticipants(c.env, id)) >= share.max_participants) return c.json({ error: 'full' }, 409);
    const pid = newId();
    await store.insertParticipant(c.env, { id: pid, share_id: id, email, name: body?.name?.trim().slice(0, 100) ?? null, joined_at: now });
    return c.json({ token: await mintParticipantToken(c.env, id, pid), participant_id: pid });
  }
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS (16 tests).

- [ ] **Step 5: Mutation check.** Change the join consume to `const email = raw ? 'guest@example.com' : null` (skip real consume). Run. Expected: the "a bad token is refused" assertion goes **RED**. Revert.

- [ ] **Step 6: Full worker suite + commit**

Run: `cd cloud-worker && bun run test:all`
Expected: all `bun:test` units + all vitest specs green.

```bash
git add cloud-worker/src/drops/notify.ts cloud-worker/src/drops/routes.ts cloud-worker/test/drops-routes.spec.ts
git commit -m "feat(drops): named door — magic-link invite emails + token-consume join"
```

---

## Phase 3 — Cleanup cron + worker wiring + ship

### Task 19: Cleanup — `drops/cleanup.ts`

**Files:**
- Create: `cloud-worker/src/drops/cleanup.ts`, `cloud-worker/test/drops-cleanup.spec.ts`

- [ ] **Step 1: Write the failing spec** — `cloud-worker/test/drops-cleanup.spec.ts`

```ts
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { runCleanup } from '../src/drops/cleanup';
import { createShare } from '../src/drops/store';
import type { ShareRow } from '../src/drops/policy';

const DAY = 86_400_000;
function share(id: string, o: Partial<ShareRow>): ShareRow {
  return {
    id, owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'open', passcode_hash: null, passcode_salt: null,
    title: null, note: null, require_name: 0, max_participants: null, per_person_file_cap: null, single_use: 0,
    max_file_bytes: null, max_total_bytes: null, allowed_types: null, hold_for_approval: 0, participants_visible: 0,
    notify_on_activity: 0, r2_prefix: `drops/${id}/`, expiry_basis: 'created', expires_at: null, first_opened_at: null,
    used_bytes: 0, status: 'active', created_at: 0, ...o,
  };
}

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('runCleanup', () => {
  it('marks a past-expiry active drop expired', async () => {
    const now = 100 * DAY;
    await createShare(env, share('s_exp', { status: 'active', expires_at: now - 1 }));
    await createShare(env, share('s_live', { status: 'active', expires_at: now + DAY }));
    const res = await runCleanup(env, now);
    expect(res.expired).toBe(1);
    expect((await env.DB.prepare('SELECT status FROM shares WHERE id = ?').bind('s_exp').first<{ status: string }>())?.status).toBe('expired');
    expect((await env.DB.prepare('SELECT status FROM shares WHERE id = ?').bind('s_live').first<{ status: string }>())?.status).toBe('active');
  });
  it('purges objects + rows for a drop expired beyond the grace window', async () => {
    const now = 100 * DAY;
    await createShare(env, share('s_old', { status: 'expired', expires_at: now - 8 * DAY }));
    await env.FILES_DROPS.put('drops/s_old/p/old.bin', new Uint8Array(10));
    await env.DB.prepare("INSERT INTO share_events (id, share_id, kind, status, created_at) VALUES ('e','s_old','upload','accepted',1)").run();
    const res = await runCleanup(env, now);
    expect(res.purged).toBe(1);
    expect(await env.FILES_DROPS.head('drops/s_old/p/old.bin')).toBeNull();
    expect(await env.DB.prepare('SELECT id FROM shares WHERE id = ?').bind('s_old').first()).toBeNull();
    expect(await env.DB.prepare('SELECT id FROM share_events WHERE share_id = ?').bind('s_old').first()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail** — cannot find module `../src/drops/cleanup`.

- [ ] **Step 3: Implement** — `cloud-worker/src/drops/cleanup.ts`

```ts
import type { Env } from '../types';
import { listShares, markShareStatus } from './store';

const GRACE_MS = 7 * 86_400_000;

export async function runCleanup(env: Env, now: number): Promise<{ expired: number; purged: number }> {
  const shares = await listShares(env);
  let expired = 0;
  let purged = 0;
  for (const s of shares) {
    if (s.status === 'active' && s.expires_at !== null && now >= s.expires_at) {
      await markShareStatus(env, s.id, 'expired');
      expired++;
      continue;
    }
    if (s.status === 'expired' && s.expires_at !== null && now >= s.expires_at + GRACE_MS) {
      let cursor: string | undefined;
      do {
        const list = await env.FILES_DROPS.list({ prefix: s.r2_prefix, cursor });
        for (const obj of list.objects) await env.FILES_DROPS.delete(obj.key);
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
      await env.DB.prepare('DELETE FROM share_events WHERE share_id = ?').bind(s.id).run();
      await env.DB.prepare('DELETE FROM share_participants WHERE share_id = ?').bind(s.id).run();
      await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(s.id).run();
      purged++;
    }
  }
  return { expired, purged };
}
```

- [ ] **Step 4: Run to verify pass.** Expected: PASS (2 tests).

- [ ] **Step 5: Mutation check.** Change `now >= s.expires_at` (first branch) to `now < s.expires_at`. Run. Expected: "marks a past-expiry active drop expired" goes **RED**. Revert.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/drops/cleanup.ts cloud-worker/test/drops-cleanup.spec.ts
git commit -m "feat(drops): daily cleanup — expire past-due drops, purge after grace window"
```

### Task 20: Wire router + `scheduled()` + cron trigger; ship the worker

**Files:**
- Modify: `cloud-worker/src/index.ts`, `cloud-worker/wrangler.jsonc`

- [ ] **Step 1: Mount the router + scheduled handler** — `cloud-worker/src/index.ts`.
  - Add imports near the top: `import { drops } from './drops/routes';` and `import { runCleanup } from './drops/cleanup';`
  - Add the mount next to `app.route('/admin', admin);`:

```ts
app.route('/drops', drops);
```

  - Replace `export default app;` (keep the `export type { Env };` line below it) with:

```ts
export default {
  fetch: app.fetch,
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runCleanup(env, Date.now()));
  },
};
```

- [ ] **Step 2: Add the cron trigger** — `cloud-worker/wrangler.jsonc`, add a top-level key:

```jsonc
"triggers": {
  "crons": ["0 3 * * *"]
}
```

- [ ] **Step 3: Typecheck + dry-run deploy + full suite**

Run:
```bash
cd cloud-worker
bunx wrangler types && bunx tsc --noEmit
bun run test:all
bunx wrangler deploy --dry-run
```
Expected: no type errors; all tests green; dry-run prints the worker bundle + the `0 3 * * *` trigger + the `FILES_DROPS` binding with no errors.

- [ ] **Step 4: Apply the remote migration + deploy** (the site dev points at this prod worker, so it must be live before Phase 4 integration)

Run:
```bash
cd cloud-worker
bun run db:migrate      # applies 0003_drops.sql to remote D1 'cloud'
bun run deploy
```
Expected: `0003_drops.sql` applied remotely; `wrangler deploy` succeeds and lists the cron trigger.

- [ ] **Step 5: Smoke the live Bearer guard** (no secret value on the command line — read from `.dev.vars`):

```bash
cd cloud-worker
curl -s -o /dev/null -w "%{http_code}\n" https://cloud-worker.mannanteam.workers.dev/drops      # expect 401
```
Expected: `401` (unauthorized without the Bearer) — proves the route is live and guarded.

- [ ] **Step 6: Commit**

```bash
git add cloud-worker/src/index.ts cloud-worker/wrangler.jsonc
git commit -m "feat(drops): mount /drops router + daily cleanup cron; ship worker"
```

---

## Phase 4 — Site worker-client + proxy routes

### Task 21: Client lib — `src/lib/drops-format.ts` (pure) + `src/lib/drops.ts` (server-only worker client)

**Files:**
- Create: `src/lib/drops-format.ts`, `src/lib/drops-format.test.ts`, `src/lib/drops.ts`

- [ ] **Step 1: Write the failing pure-helper test** — `src/lib/drops-format.test.ts`

```ts
import { describe, expect, test } from 'bun:test';
import { extOf, formatBytes } from './drops-format';

describe('drops-format', () => {
  test('formatBytes scales B/KB/MB/GB to one decimal', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2 * 1024 ** 3)).toBe('2.0 GB');
  });
  test('extOf lowercases the extension and tolerates no-dot names', () => {
    expect(extOf('Photo.JPG')).toBe('jpg');
    expect(extOf('archive.tar.gz')).toBe('gz');
    expect(extOf('noext')).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bun test src/lib/drops-format.test.ts`
Expected: FAIL — cannot find module `./drops-format`.

- [ ] **Step 3: Implement** — `src/lib/drops-format.ts`

```ts
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun test src/lib/drops-format.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the server-only worker client** — `src/lib/drops.ts`

```ts
import 'server-only';

const DEFAULT_WORKER_URL = 'https://cloud-worker.mannanteam.workers.dev';

function workerUrl(): string {
  return (process.env.CLOUDFLARE_AUTH_WORKER_URL ?? DEFAULT_WORKER_URL).replace(/\/+$/, '');
}
function secret(): string | null {
  return process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET ?? null;
}
export function dropsConfigured(): boolean {
  return Boolean(secret());
}

export type DropDirection = 'collect' | 'distribute' | 'exchange';
export type DropAccessMode = 'named' | 'open' | 'passcode';

export interface DropCreateInput {
  direction?: DropDirection;
  access_mode?: DropAccessMode;
  passcode?: string;
  title?: string;
  note?: string;
  require_name?: boolean;
  max_participants?: number | null;
  per_person_file_cap?: number | null;
  single_use?: boolean;
  max_file_bytes?: number | null;
  max_total_bytes?: number | null;
  allowed_types?: string[] | null;
  hold_for_approval?: boolean;
  expiry?: { basis: 'absolute' | 'created' | 'never'; days?: number; at?: number };
  invite_emails?: string[];
}

export interface DropView {
  id: string;
  title: string | null;
  note: string | null;
  direction: DropDirection;
  access_mode: DropAccessMode;
  require_name: boolean;
  requires_passcode: boolean;
  max_file_bytes: number | null;
  status: 'active' | 'expired';
}

export interface AdminDropEvent {
  id: string;
  participant_id: string | null;
  kind: string;
  object_key: string | null;
  filename: string | null;
  bytes: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}
export interface AdminDrop extends Omit<DropView, 'requires_passcode' | 'require_name'> {
  access_mode: DropAccessMode;
  pending: number;
  used_bytes: number;
  events: AdminDropEvent[];
  created_at: number;
}

export interface WorkerResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function workerFetch<T>(
  path: string,
  init: RequestInit & { ip?: string; participantToken?: string } = {},
): Promise<WorkerResult<T>> {
  const s = secret();
  if (!s) return { ok: false, status: 503, error: 'not-configured' };
  const { ip, participantToken, headers, ...rest } = init;
  const res = await fetch(`${workerUrl()}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${s}`,
      'content-type': 'application/json',
      ...(ip ? { 'x-site-auth-ip': ip } : {}),
      ...(participantToken ? { 'x-drop-participant': participantToken } : {}),
      ...(headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) return { ok: false, status: res.status, error: data?.error ?? 'worker-error' };
  return { ok: true, status: res.status, data: (data ?? undefined) as T };
}

export const createDrop = (input: DropCreateInput, ip: string) =>
  workerFetch<{ id: string }>('/drops', { method: 'POST', body: JSON.stringify(input), ip });
export const listDrops = () => workerFetch<{ drops: AdminDrop[] }>('/drops', { method: 'GET' });
export const approveUpload = (id: string, eventId: string) =>
  workerFetch<{ status: string }>(`/drops/${id}/approve`, { method: 'POST', body: JSON.stringify({ event_id: eventId }) });
export const rejectUpload = (id: string, eventId: string) =>
  workerFetch<{ status: string }>(`/drops/${id}/reject`, { method: 'POST', body: JSON.stringify({ event_id: eventId }) });
export const getDropView = (id: string) => workerFetch<DropView>(`/drops/${id}`, { method: 'GET' });
export const joinDrop = (id: string, body: { name?: string; passcode?: string; magic_token?: string }, ip: string) =>
  workerFetch<{ token: string; participant_id: string }>(`/drops/${id}/join`, { method: 'POST', body: JSON.stringify(body), ip });
export const presignUpload = (id: string, token: string, body: { filename: string; size: number; type: string }, ip: string) =>
  workerFetch<{ url: string; key: string; expires_in: number }>(`/drops/${id}/presign`, { method: 'POST', body: JSON.stringify(body), ip, participantToken: token });
export const commitUpload = (id: string, token: string, body: { key: string; filename: string }, ip: string) =>
  workerFetch<{ status: 'pending' | 'accepted'; event_id: string }>(`/drops/${id}/commit`, { method: 'POST', body: JSON.stringify(body), ip, participantToken: token });
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/drops-format.ts src/lib/drops-format.test.ts src/lib/drops.ts
git commit -m "feat(drops): site worker-client + pure format helpers"
```

### Task 22: Site-side join rate limiter — `src/lib/rate-limit.ts`

Outer brute-force layer on the public join route (the worker enforces the authoritative limit; this is defense-in-depth and shields the worker call).

**Files:**
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Add a sibling limiter** following the existing `limitDownload` shape. Near the other limiter exports in `src/lib/rate-limit.ts`:

```ts
const dropJoinUpstash =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(8, '60 s'),
        prefix: 'ratelimit:dropjoin',
        analytics: false,
      })
    : null;

export async function limitDropJoin(identifier: string): Promise<LimitResult> {
  if (!dropJoinUpstash) return memoryLimit(`dropjoin:${identifier}`, 8);
  try {
    const { success, limit, remaining, reset } = await dropJoinUpstash.limit(identifier);
    return { success, limit, remaining, reset };
  } catch {
    return memoryLimit(`dropjoin:${identifier}`, 8);
  }
}
```

(`url`, `token`, `memoryLimit`, `LimitResult` already exist in the module — reuse them; do not redeclare.)

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat(drops): site-side join rate limiter (Upstash + in-memory fallback)"
```

### Task 23: Admin proxy routes — `/api/drops`, `/api/drops/[id]/approve|reject`

All gated by `readSiteSession().admin`. The worker trusts the Bearer; the **site** is the admin gate.

**Files:**
- Create: `src/app/api/drops/route.ts`, `src/app/api/drops/[id]/approve/route.ts`, `src/app/api/drops/[id]/reject/route.ts`

- [ ] **Step 1: Create `src/app/api/drops/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { createDrop, listDrops, type DropCreateInput } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

async function requireAdmin(request: Request) {
  const session = await readSiteSession(request.headers.get('cookie'));
  return session?.admin ? session : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await listDrops();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as DropCreateInput | null;
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const result = await createDrop({ ...body, /* owner is fixed for now */ }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 2: Create `src/app/api/drops/[id]/approve/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { approveUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSiteSession(request.headers.get('cookie'));
  if (!session?.admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  const result = await approveUpload(id, body.event_id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 3: Create `src/app/api/drops/[id]/reject/route.ts`** — identical to approve but `import { rejectUpload }` and call `rejectUpload(id, body.event_id)`:

```ts
import { NextResponse } from 'next/server';
import { readSiteSession } from '@/lib/site-session';
import { rejectUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSiteSession(request.headers.get('cookie'));
  if (!session?.admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  const result = await rejectUpload(id, body.event_id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `bunx tsc --noEmit`
Expected: no errors.

```bash
git add src/app/api/drops/
git commit -m "feat(drops): admin proxy routes — create/list/approve/reject (session-gated)"
```

### Task 24: Public proxy routes — `/api/drop/[id]/join|presign|commit`

`join` rate-limits, calls the worker, and stores the returned participant token in an HttpOnly cookie scoped to the drop. `presign`/`commit` read that cookie and forward it.

**Files:**
- Create: `src/app/api/drop/[id]/join/route.ts`, `src/app/api/drop/[id]/presign/route.ts`, `src/app/api/drop/[id]/commit/route.ts`

- [ ] **Step 1: Create `src/app/api/drop/[id]/join/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { joinDrop } from '@/lib/drops';
import { limitDropJoin } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = ipOf(request);
  const limit = await limitDropJoin(`${ip}:${id}`);
  if (!limit.success) return NextResponse.json({ error: 'Too many attempts, try again shortly' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { name?: string; passcode?: string; magic_token?: string } | null;
  const result = await joinDrop(id, body ?? {}, ip);
  if (!result.ok || !result.data) return NextResponse.json({ error: result.error ?? 'join-failed' }, { status: result.status });

  const res = NextResponse.json({ ok: true, participant_id: result.data.participant_id });
  res.cookies.set(`drop_pt_${id}`, result.data.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 21_600,
  });
  return res;
}
```

- [ ] **Step 2: Create `src/app/api/drop/[id]/presign/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { presignUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get(`drop_pt_${id}`)?.value;
  if (!token) return NextResponse.json({ error: 'not-joined' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { filename?: string; size?: number; type?: string } | null;
  if (!body?.filename || typeof body.size !== 'number') return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  const result = await presignUpload(id, token, { filename: body.filename, size: body.size, type: body.type ?? 'application/octet-stream' }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 3: Create `src/app/api/drop/[id]/commit/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { commitUpload } from '@/lib/drops';

export const dynamic = 'force-dynamic';

function ipOf(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',');
  return (fwd?.[fwd.length - 1] ?? request.headers.get('x-real-ip') ?? 'unknown').trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get(`drop_pt_${id}`)?.value;
  if (!token) return NextResponse.json({ error: 'not-joined' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { key?: string; filename?: string } | null;
  if (!body?.key) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  const result = await commitUpload(id, token, { key: body.key, filename: body.filename ?? body.key.split('/').pop() ?? 'file' }, ipOf(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 4: Create `src/app/api/drop/[id]/view/route.ts`** (the recipient page fetches the view client-side through this, so the whole recipient flow is browser-stubbable in E2E):

```ts
import { NextResponse } from 'next/server';
import { getDropView } from '@/lib/drops';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getDropView(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `bunx tsc --noEmit`
Expected: no errors.

```bash
git add src/app/api/drop/
git commit -m "feat(drops): public proxy routes — view + join (cookie) + presign + commit"
```

---

## Phase 5 — Recipient page (`/drop/[id]`)

### Task 25: SSR recipient page + collect client (join → presigned PUT → commit)

The only place the real **browser → R2** transfer happens. Uses XHR for the PUT (progress events), the `.taste-prototype` Paper surface, and `robots: index:false` (recipient links must never be indexed). E2E regression lives in Phase 7; this task ends with a **real >100 MB** manual upload — the one true end-to-end check of the presigned path.

**Files:**
- Create: `src/app/drop/[id]/page.tsx`, `src/app/drop/[id]/collect-client.tsx`

- [ ] **Step 1: Create the page shell** — `src/app/drop/[id]/page.tsx` (a thin server shell; the client fetches the view through `/api/drop/[id]/view` so the whole flow is browser-stubbable in E2E)

```tsx
import type { Metadata } from 'next';
import { CollectClient } from './collect-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'A drop for you',
  robots: { index: false, follow: false },
};

export default async function DropPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  return (
    <main className="taste-prototype min-h-[100dvh] overflow-hidden bg-[var(--taste-bg)] text-[var(--taste-ink)]">
      <header className="taste-nav mx-auto flex h-[72px] max-w-2xl items-center justify-between px-5 sm:px-8">
        <span className="taste-logo rounded-full px-3 py-2 text-sm font-semibold">Mannan Javid</span>
      </header>
      <section className="mx-auto max-w-2xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="taste-panel taste-rise p-6 sm:p-8 [--delay:120ms]">
          <CollectClient dropId={id} magicToken={token ?? null} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create the client component** — `src/app/drop/[id]/collect-client.tsx`

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DropView } from '@/lib/drops';
import { extOf, formatBytes } from '@/lib/drops-format';

const BLOCKED = new Set(['exe', 'bat', 'sh', 'cmd', 'msi', 'com', 'scr', 'ps1']);

type Phase = 'join' | 'ready';
type ItemStatus = 'queued' | 'uploading' | 'pending' | 'accepted' | 'error';
interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: ItemStatus;
  error?: string;
}

function messageFor(code?: string): string {
  switch (code) {
    case 'bad-passcode':
      return 'That passcode is not right.';
    case 'name-required':
      return 'Please enter your name first.';
    case 'too-large':
      return 'That file is too large for this drop.';
    case 'quota':
      return 'This drop is full.';
    case 'file-cap':
      return 'You have reached the upload limit for this drop.';
    case 'expired':
      return 'This drop has expired.';
    case 'full':
      return 'This drop has reached its limit.';
    case 'bad-token':
      return 'This invite link is no longer valid.';
    default:
      return 'Something went wrong — please try again.';
  }
}

export function CollectClient({ dropId, magicToken }: { dropId: string; magicToken: string | null }) {
  const [view, setView] = useState<DropView | 'loading' | 'notfound'>('loading');
  const [phase, setPhase] = useState<Phase>('join');
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const join = useCallback(
    async (body: { name?: string; passcode?: string; magic_token?: string }): Promise<boolean> => {
      setJoining(true);
      setJoinError(null);
      try {
        const res = await fetch(`/api/drop/${dropId}/join`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setPhase('ready');
          return true;
        }
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setJoinError(messageFor(data.error));
        return false;
      } finally {
        setJoining(false);
      }
    },
    [dropId],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await fetch(`/api/drop/${dropId}/view`);
      if (!active) return;
      if (!res.ok) {
        setView('notfound');
        return;
      }
      const data = (await res.json()) as DropView;
      setView(data);
      if (magicToken && data.status !== 'expired') void join({ magic_token: magicToken });
    })();
    return () => {
      active = false;
    };
  }, [dropId, magicToken, join]);

  const uploadOne = useCallback(
    async (file: File, itemId: string) => {
      if (typeof view !== 'object') return;
      if (BLOCKED.has(extOf(file.name))) {
        update(itemId, { status: 'error', error: 'This file type is not allowed.' });
        return;
      }
      if (view.max_file_bytes && file.size > view.max_file_bytes) {
        update(itemId, { status: 'error', error: `Too large (max ${formatBytes(view.max_file_bytes)}).` });
        return;
      }
      const presignRes = await fetch(`/api/drop/${dropId}/presign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size, type: file.type || 'application/octet-stream' }),
      });
      if (!presignRes.ok) {
        const d = (await presignRes.json().catch(() => ({}))) as { error?: string };
        update(itemId, { status: 'error', error: messageFor(d.error) });
        return;
      }
      const { url, key } = (await presignRes.json()) as { url: string; key: string };

      update(itemId, { status: 'uploading', progress: 0 });
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          if (file.type) xhr.setRequestHeader('content-type', file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) update(itemId, { progress: Math.round((e.loaded / e.total) * 100) });
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT ${xhr.status}`)));
          xhr.onerror = () => reject(new Error('network'));
          xhr.send(file);
        });
      } catch {
        update(itemId, { status: 'error', error: 'Upload failed — please retry.' });
        return;
      }

      const commitRes = await fetch(`/api/drop/${dropId}/commit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, filename: file.name }),
      });
      if (!commitRes.ok) {
        const d = (await commitRes.json().catch(() => ({}))) as { error?: string };
        update(itemId, { status: 'error', error: messageFor(d.error) });
        return;
      }
      const { status } = (await commitRes.json()) as { status: 'pending' | 'accepted' };
      update(itemId, { status, progress: 100 });
    },
    [dropId, view, update],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        const itemId = `${file.name}-${file.size}-${items.length}-${Math.round(file.lastModified)}`;
        setItems((prev) => [...prev, { id: itemId, name: file.name, size: file.size, progress: 0, status: 'queued' }]);
        void uploadOne(file, itemId);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [items.length, uploadOne],
  );

  if (view === 'loading') {
    return <p className="mt-8 text-sm text-[var(--taste-muted)]">Loading…</p>;
  }
  if (view === 'notfound') {
    return (
      <p
        data-testid="drop-notfound"
        className="mt-8 rounded-2xl border border-[var(--taste-line)] bg-[var(--taste-panel-strong)] px-5 py-4 text-[15px]"
      >
        This drop link isn’t valid.
      </p>
    );
  }

  return (
    <div>
      <p className="taste-kicker">A drop for you</p>
      <h1 data-testid="drop-title" className="mt-5 text-3xl font-semibold leading-[1.05] sm:text-4xl">
        {view.title ?? 'Send Mannan some files'}
      </h1>
      {view.note ? <p className="mt-4 text-[15px] leading-relaxed text-[var(--taste-muted)]">{view.note}</p> : null}

      {view.status === 'expired' ? (
        <p
          data-testid="drop-expired"
          className="mt-8 rounded-2xl border border-[var(--taste-line)] bg-[var(--taste-panel-strong)] px-5 py-4 text-[15px]"
        >
          This drop has expired.
        </p>
      ) : phase === 'join' ? (
        <form
          data-testid="drop-join-form"
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void join({ name: name.trim() || undefined, passcode: passcode || undefined });
          }}
        >
          {view.require_name ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Your name
              <input
                data-testid="drop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-[var(--taste-line)] bg-[var(--taste-panel-solid)] px-4 py-3 text-[15px] outline-none focus:border-[var(--taste-accent)]"
                placeholder="Ann Smith"
              />
            </label>
          ) : null}
          {view.requires_passcode ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Passcode
              <input
                data-testid="drop-passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                type="password"
                className="rounded-xl border border-[var(--taste-line)] bg-[var(--taste-panel-solid)] px-4 py-3 text-[15px] outline-none focus:border-[var(--taste-accent)]"
                placeholder="••••••"
              />
            </label>
          ) : null}
          {joinError ? (
            <p data-testid="drop-join-error" className="text-sm text-[#b3261e]">
              {joinError}
            </p>
          ) : null}
          <button
            data-testid="drop-join-submit"
            type="submit"
            disabled={joining}
            className="taste-button taste-button-primary w-fit px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {joining ? 'Checking…' : 'Continue'}
          </button>
        </form>
      ) : (
        <div data-testid="drop-ready" className="mt-8 flex flex-col gap-5">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--taste-line)] bg-[var(--taste-panel-solid)] px-6 py-10 text-center transition hover:border-[var(--taste-accent)]">
            <span className="text-[15px] font-semibold">Choose files to send</span>
            <span className="text-sm text-[var(--taste-muted)]">
              {view.max_file_bytes ? `Up to ${formatBytes(view.max_file_bytes)} each` : 'Large files welcome'}
            </span>
            <input
              ref={inputRef}
              data-testid="drop-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>

          {items.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {items.map((it) => (
                <li
                  key={it.id}
                  data-testid="drop-upload-item"
                  className="rounded-xl border border-[var(--taste-line)] bg-[var(--taste-panel-solid)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{it.name}</span>
                    <span data-testid="drop-item-status" className="shrink-0 text-[var(--taste-muted)]">
                      {it.status === 'uploading'
                        ? `${it.progress}%`
                        : it.status === 'pending'
                          ? 'Sent — awaiting review'
                          : it.status === 'accepted'
                            ? 'Sent ✓'
                            : it.status === 'error'
                              ? (it.error ?? 'Error')
                              : 'Queued'}
                    </span>
                  </div>
                  {it.status === 'uploading' ? (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--taste-panel-strong)]">
                      <div className="h-full bg-[var(--taste-accent)] transition-all" style={{ width: `${it.progress}%` }} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Create a real drop for manual testing** (uses the live worker shipped in Phase 3; read the Bearer from the worker's `.dev.vars`, don't paste it):

```bash
SECRET=$(grep SITE_AUTH_EXCHANGE_SECRET cloud-worker/.dev.vars | cut -d= -f2)
curl -s -X POST https://cloud-worker.mannanteam.workers.dev/drops \
  -H "authorization: Bearer $SECRET" -H 'content-type: application/json' \
  -d '{"access_mode":"open","require_name":true,"title":"Manual test drop","max_file_bytes":6442450944}'
```
Expected: `{"id":"<16-char id>"}`. (Note `CLOUDFLARE_AUTH_WORKER_URL` in `.env.local` already points the site at this worker.)

- [ ] **Step 5: Manual end-to-end upload (>100 MB — the core requirement).** With the dev server already on `:3847`, open `http://localhost:3847/drop/<id>`, enter a name, and upload a **real file over 100 MB** (e.g. `mkfile -n 150m /tmp/big.bin` on macOS, or any large video). Confirm: the progress bar advances, the item resolves to **"Sent — awaiting review"** (hold-for-approval default for `open`), an email lands at `hello@mannan.is`, and the object exists:

```bash
cd cloud-worker && bunx wrangler r2 object get mannan-drops --remote --prefix "drops/<id>/" 2>/dev/null || bunx wrangler r2 bucket list
```
Verify the upload appears in the admin list:
```bash
curl -s https://cloud-worker.mannanteam.workers.dev/drops -H "authorization: Bearer $SECRET" | head -c 400
```
Expected: the drop shows `"pending":1` and an `events[0].bytes` matching the file size (proving the R2 `HEAD` true-size path ran end-to-end past 100 MB).

- [ ] **Step 6: Commit**

```bash
git add src/app/drop/
git commit -m "feat(drops): recipient page — join + presigned direct-to-R2 upload with progress"
```

---

## Phase 6 — Admin composer + inbox (`/drops`)

### Task 26: Server-gated `/drops` page + admin client (compose + approve/reject)

The composer surfaces the primary M1 dials (title, note, access mode + passcode, require-name, per-file ceiling, expiry days, hold-for-approval, named invites). The remaining dials (`max_total_bytes`, `per_person_file_cap`, `participants_visible`, allowlist) are supported by the model/worker and deferred to a post-M1 "advanced" UI — noted at the end of this plan.

**Files:**
- Create: `src/app/drops/page.tsx`, `src/app/drops/admin-client.tsx`

- [ ] **Step 1: Create the gated server page** — `src/app/drops/page.tsx`

```tsx
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSiteSession } from '@/lib/site-session';
import { listDrops, type AdminDrop } from '@/lib/drops';
import { DropsAdmin } from './admin-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Drops', robots: { index: false, follow: false } };

export default async function DropsPage() {
  const session = await readSiteSession((await headers()).get('cookie'));
  if (!session?.admin) redirect('/');
  const result = await listDrops();
  const initialDrops: AdminDrop[] = result.ok && result.data ? result.data.drops : [];

  return (
    <main className="taste-prototype min-h-[100dvh] overflow-hidden bg-[var(--taste-bg)] text-[var(--taste-ink)]">
      <header className="taste-nav mx-auto flex h-[72px] max-w-5xl items-center justify-between px-5 sm:px-8">
        <span className="taste-logo rounded-full px-3 py-2 text-sm font-semibold">Mannan Javid</span>
        <span className="text-sm text-[var(--taste-muted)]">Drops</span>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
        <DropsAdmin initialDrops={initialDrops} />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create the admin client** — `src/app/drops/admin-client.tsx`

```tsx
'use client';

import { useCallback, useState } from 'react';
import type { AdminDrop } from '@/lib/drops';
import { formatBytes } from '@/lib/drops-format';

const GB = 1024 ** 3;

export function DropsAdmin({ initialDrops }: { initialDrops: AdminDrop[] }) {
  const [drops, setDrops] = useState<AdminDrop[]>(initialDrops);
  const [accessMode, setAccessMode] = useState<'passcode' | 'open' | 'named'>('passcode');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [passcode, setPasscode] = useState('');
  const [requireName, setRequireName] = useState(true);
  const [maxFileGb, setMaxFileGb] = useState(2);
  const [expiryDays, setExpiryDays] = useState(14);
  const [holdForApproval, setHoldForApproval] = useState(true);
  const [inviteEmails, setInviteEmails] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/drops', { method: 'GET' });
    if (res.ok) setDrops(((await res.json()) as { drops: AdminDrop[] }).drops);
  }, []);

  const create = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);
      setCreateError(null);
      setLastLink(null);
      const payload = {
        access_mode: accessMode,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        passcode: accessMode === 'passcode' ? passcode : undefined,
        require_name: requireName,
        max_file_bytes: Math.round(maxFileGb * GB),
        hold_for_approval: holdForApproval,
        expiry: { basis: 'created' as const, days: expiryDays },
        invite_emails: accessMode === 'named' ? inviteEmails.split(/[,\s]+/).filter(Boolean) : undefined,
      };
      const res = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setCreating(false);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setCreateError(d.error ?? 'Could not create drop');
        return;
      }
      const { id } = (await res.json()) as { id: string };
      setLastLink(`${window.location.origin}/drop/${id}`);
      setPasscode('');
      setTitle('');
      setNote('');
      setInviteEmails('');
      await refresh();
    },
    [accessMode, title, note, passcode, requireName, maxFileGb, holdForApproval, expiryDays, inviteEmails, refresh],
  );

  const act = useCallback(
    async (id: string, eventId: string, action: 'approve' | 'reject') => {
      const res = await fetch(`/api/drops/${id}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) await refresh();
    },
    [refresh],
  );

  const field = 'rounded-xl border border-[var(--taste-line)] bg-[var(--taste-panel-solid)] px-4 py-3 text-[15px] outline-none focus:border-[var(--taste-accent)]';

  return (
    <div className="flex flex-col gap-10">
      <form data-testid="drop-create-form" onSubmit={create} className="taste-panel flex flex-col gap-4 p-6 sm:p-8">
        <p className="taste-kicker">Compose a drop</p>
        <input className={field} placeholder="Title (shown to the recipient)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={field} placeholder="A note for the recipient (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        <div className="flex flex-wrap gap-3">
          {(['passcode', 'open', 'named'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAccessMode(m)}
              className={`taste-button px-4 py-2 text-sm ${accessMode === m ? 'taste-button-primary' : 'taste-button-secondary'}`}
            >
              {m === 'passcode' ? 'Passcode link' : m === 'open' ? 'Open link' : 'Named invites'}
            </button>
          ))}
        </div>
        {accessMode === 'passcode' ? (
          <input data-testid="drop-passcode-input" className={field} placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
        ) : null}
        {accessMode === 'named' ? (
          <textarea className={field} placeholder="Invite emails (comma or space separated)" value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} rows={2} />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">Max file (GB)
            <input className={field} type="number" min={0.1} max={5} step={0.1} value={maxFileGb} onChange={(e) => setMaxFileGb(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Expires in (days)
            <input className={field} type="number" min={1} max={365} value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} />
          </label>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireName} onChange={(e) => setRequireName(e.target.checked)} /> Require name</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={holdForApproval} onChange={(e) => setHoldForApproval(e.target.checked)} /> Hold for approval</label>
          </div>
        </div>
        {createError ? <p className="text-sm text-[#b3261e]">{createError}</p> : null}
        <button data-testid="drop-create-submit" type="submit" disabled={creating} className="taste-button taste-button-primary w-fit px-6 py-3 text-sm font-semibold disabled:opacity-60">
          {creating ? 'Creating…' : 'Create drop'}
        </button>
        {lastLink ? (
          <p data-testid="drop-share-link" className="break-all rounded-xl border border-[var(--taste-line)] bg-[var(--taste-panel-strong)] px-4 py-3 text-sm">
            Share this link: <span className="font-medium">{lastLink}</span>
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-4">
        <p className="taste-kicker">Your drops</p>
        {drops.length === 0 ? <p className="text-sm text-[var(--taste-muted)]">No drops yet.</p> : null}
        {drops.map((d) => (
          <div key={d.id} data-testid="drop-admin-item" className="taste-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{d.title ?? 'Untitled drop'}</p>
                <p className="text-sm text-[var(--taste-muted)]">
                  {d.access_mode} · {d.status} · {formatBytes(d.used_bytes)} used ·{' '}
                  <span data-testid="drop-pending-count">{d.pending}</span> pending
                </p>
              </div>
              <code className="shrink-0 text-xs text-[var(--taste-muted)]">/drop/{d.id}</code>
            </div>
            {d.events.filter((e) => e.kind === 'upload').length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {d.events
                  .filter((e) => e.kind === 'upload')
                  .map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--taste-line)] px-3 py-2 text-sm">
                      <span className="truncate">{ev.filename ?? ev.object_key} · {ev.bytes ? formatBytes(ev.bytes) : ''}</span>
                      <span className="flex items-center gap-2">
                        <span data-testid="drop-event-status" className="text-[var(--taste-muted)]">{ev.status}</span>
                        {ev.status === 'pending' ? (
                          <>
                            <button data-testid="drop-approve" onClick={() => act(d.id, ev.id, 'approve')} className="taste-button taste-button-primary px-3 py-1 text-xs">Approve</button>
                            <button data-testid="drop-reject" onClick={() => act(d.id, ev.id, 'reject')} className="taste-button taste-button-secondary px-3 py-1 text-xs">Reject</button>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + manual admin check**

Run: `bunx tsc --noEmit`
Expected: no errors. Then (signed in as admin on `:3847`) open `http://localhost:3847/drops`, create a passcode drop, copy the link, and confirm the drop appears in "Your drops". Non-admins hitting `/drops` should be redirected to `/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/drops/
git commit -m "feat(drops): admin composer + inbox (server-gated, approve/reject)"
```

---

## Phase 7 — E2E, privacy guard, and the gate

### Task 27: Recipient E2E — collect + passcode (stubbed worker)

Per the house convention, the worker is **stubbed at the browser** (`page.route(...).fulfill(...)`). The recipient page is client-fetched, so every call is interceptable; no prod D1/R2/Redis is touched. The admin approve→accepted transition is covered authoritatively by worker integration Tasks 16–17 (with their mutations) and the manual check in Task 26 — an admin-page E2E is intentionally **deferred** (that page is SSR session-gated and would require forging a signed admin cookie; see "Deferred from M1").

**Files:**
- Create: `e2e/drops-collect.spec.ts`

- [ ] **Step 1: Write the spec** — `e2e/drops-collect.spec.ts`

```ts
import { test, expect, type Page } from '@playwright/test';

const DROP = '/drop/testdrop12345678';
const VIEW = {
  id: 'testdrop12345678',
  title: 'Send me files',
  note: 'Please upload your photos.',
  direction: 'collect',
  access_mode: 'passcode',
  require_name: true,
  requires_passcode: true,
  max_file_bytes: 2 * 1024 ** 3,
  status: 'active',
};

async function stubView(page: Page, view: Record<string, unknown> = VIEW) {
  await page.route('**/api/drop/*/view', (route) => route.fulfill({ json: view }));
}

test.describe('drops — collect + passcode (recipient)', () => {
  test('wrong passcode is rejected; right passcode reveals the upload area', async ({ page }) => {
    await stubView(page);
    let attempt = 0;
    await page.route('**/api/drop/*/join', (route) => {
      attempt += 1;
      return attempt === 1
        ? route.fulfill({ status: 403, json: { error: 'bad-passcode' } })
        : route.fulfill({ status: 200, json: { ok: true, participant_id: 'p1' } });
    });

    await page.goto(DROP);
    await expect(page.getByTestId('drop-title')).toHaveText('Send me files');

    await page.getByTestId('drop-name').fill('Ann');
    await page.getByTestId('drop-passcode').fill('wrong');
    await page.getByTestId('drop-join-submit').click();
    await expect(page.getByTestId('drop-join-error')).toHaveText('That passcode is not right.');
    await expect(page.getByTestId('drop-ready')).toHaveCount(0);

    await page.getByTestId('drop-passcode').fill('right');
    await page.getByTestId('drop-join-submit').click();
    await expect(page.getByTestId('drop-ready')).toBeVisible();
  });

  test('an upload runs presign → PUT → commit and shows the pending state', async ({ page }) => {
    await stubView(page);
    await page.route('**/api/drop/*/join', (route) => route.fulfill({ json: { ok: true, participant_id: 'p1' } }));
    await page.route('**/api/drop/*/presign', (route) =>
      route.fulfill({ json: { url: 'https://r2.example.test/put/obj', key: 'drops/testdrop12345678/p1/obj.bin', expires_in: 600 } }),
    );
    await page.route('https://r2.example.test/**', (route) => route.fulfill({ status: 200, body: '' }));
    let committed = false;
    await page.route('**/api/drop/*/commit', (route) => {
      committed = true;
      return route.fulfill({ json: { status: 'pending', event_id: 'e1' } });
    });

    await page.goto(DROP);
    await page.getByTestId('drop-name').fill('Ann');
    await page.getByTestId('drop-passcode').fill('right');
    await page.getByTestId('drop-join-submit').click();
    await expect(page.getByTestId('drop-ready')).toBeVisible();

    await page.getByTestId('drop-file-input').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('x'.repeat(4096)),
    });

    await expect(page.getByTestId('drop-item-status')).toHaveText('Sent — awaiting review');
    expect(committed).toBe(true);
  });

  test('an expired drop shows the expired notice and no join/upload UI', async ({ page }) => {
    await stubView(page, { ...VIEW, status: 'expired' });
    await page.goto(DROP);
    await expect(page.getByTestId('drop-expired')).toBeVisible();
    await expect(page.getByTestId('drop-join-form')).toHaveCount(0);
    await expect(page.getByTestId('drop-ready')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run it (server already on :3847)**

Run: `bunx playwright test e2e/drops-collect.spec.ts`
Expected: 3 passed.

- [ ] **Step 3: Mutation sweep (each scenario must catch a real defect).** Apply one at a time, run the single spec, confirm RED, revert:
  - In `collect-client.tsx` `join`, change `if (res.ok)` to `if (true)` (treat every join as success). → "wrong passcode is rejected…" goes RED (the `drop-ready` count-0 assertion fires after the wrong attempt). Revert.
  - In `collect-client.tsx`, change the item-status pending branch text from `'Sent — awaiting review'` to `'Sent ✓'`. → "an upload runs presign → PUT → commit…" goes RED. Revert.
  - In `collect-client.tsx` render, change `view.status === 'expired'` to `false`. → "an expired drop shows the expired notice…" goes RED. Revert.

- [ ] **Step 4: Commit**

```bash
git add e2e/drops-collect.spec.ts
git commit -m "test(drops): recipient E2E — passcode gate, pending upload, expired (stubbed worker)"
```

### Task 28: Privacy build-guard — Drops must never enter the MCP snapshot

The MCP build sources only `about.json` + `src/lib/{garden-articles,episodes,garden-products,downloads}.ts` and never reads cloud-worker D1, so Drops can't structurally leak — these additions are defense-in-depth against a future wiring mistake. Tokens are **specific** (a bare `shares`/`/drop/` would false-positive on prose).

**Files:**
- Modify: `scripts/build-mcp-data.mjs`, `mcp-worker/test/privacy.spec.ts`

- [ ] **Step 1: Extend the build-time denylist** — in `scripts/build-mcp-data.mjs`, add to the `FORBIDDEN` array:

```js
  "mannan-drops",
  "share_events",
```

- [ ] **Step 2: Extend the privacy test** — in `mcp-worker/test/privacy.spec.ts`, add to `FORBIDDEN_PATTERNS`:

```ts
  ['drops r2 bucket', /mannan-drops/i],
  ['drop share-events table', /share_events/i],
  ['drop slug route', /\/drop\/[0-9A-Za-z]{16}/],
```

- [ ] **Step 3: Verify the guards pass (nothing leaks today)**

Run: `bun run mcp:check && bun run mcp:test`
Expected: `mcp data: in sync` and the privacy spec green (Drops aren't in the snapshot, so the new patterns find nothing).

- [ ] **Step 4: Mutation check (prove the guards bite).**
  - Build-guard: temporarily add `mannan-drops` to any sourced string (e.g. a `description` in `public/data/about.json`). Run `bun run mcp:check`. Expected: exits non-zero with `forbidden content in snapshot: mannan-drops`. Revert.
  - Privacy test: temporarily insert `"mannan-drops"` into `mcp-worker/src/data.generated.json`. Run `bun run mcp:test`. Expected: the "bundled snapshot contains no gated or private content" assertion goes RED. Revert (or re-run `bun run mcp:build`).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-mcp-data.mjs mcp-worker/test/privacy.spec.ts
git commit -m "test(drops): privacy guards — assert no Drop data in the MCP snapshot"
```

### Task 29: Pre-merge gate + ship

No CI exists; this is the manual gate. Run all of it green before considering M1 done.

**Files:** none (verification + final deploy).

- [ ] **Step 1: Full test + typecheck sweep**

```bash
# Worker (pure units + miniflare integration)
cd cloud-worker && bun run test:all && bunx tsc --noEmit && cd ..
# Site units + typecheck
bun run test:unit
bunx tsc --noEmit
# Recipient E2E (reuses :3847)
bunx playwright test e2e/drops-collect.spec.ts
# MCP privacy guard + drift
bun run mcp:check && bun run mcp:test
```
Expected: every command exits 0.

- [ ] **Step 2: Production build verification (isolated — never `next build` against the running :3847 `.next`).** Use a throwaway worktree so the build has its own `.next`:

```bash
git worktree add /tmp/drops-build HEAD
cd /tmp/drops-build && bun install && bun run build
cd - && git worktree remove /tmp/drops-build --force
```
Expected: `bun run build` completes with no type/route errors; `/drop/[id]` and `/drops` appear in the route manifest.

- [ ] **Step 3: Ship the site** (the worker already shipped in Task 20). Commit any remaining changes, push, and let Vercel deploy — or `bunx vercel --prod` per the repo's norm.

- [ ] **Step 4: Production smoke (real browser, per the Vercel-checkpoint note — do not curl-poll mannan.is).** In a browser: create a passcode drop at `https://mannan.is/drops`, open the share link in a private window, upload a **>100 MB** file, confirm the pending state + the email at `hello@mannan.is`, then approve it in `/drops` and confirm it flips to accepted.

**Definition of done (M1 — Collect):**
- [ ] `0003_drops` applied remotely; `mannan-drops` bucket + CORS + R2 S3 secrets live.
- [ ] Worker `/drops/*` (create/list/get/join/presign/commit/approve/reject) + daily cleanup cron deployed and Bearer-guarded.
- [ ] Site composer (`/drops`), recipient page (`/drop/[id]`), and `/api/drop(s)/*` proxies deployed.
- [ ] All three access modes work (passcode, open, named-invite); hold-for-approval defaults honored.
- [ ] Real >100 MB upload verified end-to-end through presigned R2.
- [ ] Every test suite green; every E2E/integration scenario has a proven mutation; privacy guard asserts no Drop data in the MCP.

---

## Self-review (plan ↔ spec)

**Spec coverage (§ by §):** §2 doors/directions → config + access-mode handling (collect built; distribute/exchange model-supported, deferred to M2/M3). §3 architecture → Phase 4 proxies + Phase 1-3 worker. §4 presign/commit → Tasks 11, 15, 16 (true-size R2 `HEAD` is the keystone test). §5 dial-board → Task 9 `buildShareConfig` (locked defaults pinned). §6 schema → Task 2 migration (verbatim). §7 access/identity/security → passcode PBKDF2 (Task 5), participant token (Task 6), Bearer guard + policy chokepoint (Tasks 13-16), denylist (Task 7), rate limits (Tasks 8, 22), privacy guard (Task 28). §8 lifecycle/cleanup → Task 19 cron. §9 notifications → Task 12. §10 API surface → Tasks 13-18 (worker) + 23-24 (site). §11 testing/mutation → every test task carries a mutation; E2E in Task 27. §12 build order → Phases map to M1.

**Deviations from the spec, called out (not silent):**
1. **Passcode hash is PBKDF2** (Task 5), stronger than the spec's literal "SHA-256+salt" — same intent, better brute-force resistance.
2. **`first_open` expiry deferred** — the schema (per spec §6) has no window column to resolve it; M1 ships `absolute`/`created`/`never` (the defaults use `created`). Adding `first_open` later is an additive column + one branch in `buildShareConfig`.
3. **`used_bytes` tracks physical R2 footprint** (pending + accepted), not just accepted — so a flood of pending uploads can't bypass the quota. Reject refunds; this is stricter than the spec implied and is the safer reading of "enforce total-quota."
4. **Worker `/drops/*` are Bearer-guarded, not role-gated** — the cross-origin site↔worker channel can't carry the user cookie; the site enforces admin-vs-recipient (matches the existing `/auth/site/*` model). Documented in Grounding.
5. **Recipient + admin pages fetch view/list at the client/SSR boundary chosen for testability** — recipient view is client-fetched (browser-stubbable E2E); admin list is SSR behind the session gate (covered by worker integration tests).

**Type consistency:** `ShareRow` (Task 7) is the single shape used by `store`, `policy`, `routes`, `cleanup`, `notify`; `PolicyContext` is `{ now, participantFileCount }` everywhere; `DropView`/`AdminDrop` (Task 21) match the worker's `GET /drops/:id` and `GET /drops` JSON. Worker secret is `SITE_AUTH_EXCHANGE_SECRET`; the site sends `CLOUDFLARE_AUTH_EXCHANGE_SECRET` (same value) — verified distinct names.

**No placeholders:** every task ships real code, exact paths, exact commands with expected output, and a named mutation where a test exists.

## Deferred from M1 (tracked, not forgotten)

- **M2 Distribute / M3 Exchange:** model + worker already accept these directions; needs outbound file selection, download proxy (mirror `src/app/api/download/[slug]`), `participants_visible` UI. (Spec §12.)
- **M4 Multipart >5 GB:** additive `upload_id` + part presigning; schema/flow designed for it. (Spec §4, §14.)
- **`first_open` expiry:** add an `expiry_window_ms` column + one branch (deviation #2 above).
- **Advanced composer dials:** `max_total_bytes`, `per_person_file_cap`, `participants_visible`, type allowlist — supported by model/worker, not yet surfaced in the composer UI (Task 26).
- **Admin-page E2E:** needs a signed-admin-cookie fixture; logic is covered by worker integration tests today.
- **AV scanning, notification digests, second admin:** spec §14, out of scope for M1.

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-30-drops-m1-collect.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Best run in a dedicated worktree (`git worktree add ../mannan20-drops -b feat/drops-m1`) so the `:3847` dev server and its `.next` stay untouched; the worker integration suite and recipient E2E are the quality gates between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

**Which approach?** (Phase 0's Cloudflare provisioning is a human step — have the R2 dashboard handy before starting.)

