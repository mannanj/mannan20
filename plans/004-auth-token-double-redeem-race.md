# Plan 004: Fix the magic-token / site-session-code double-redeem race

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 04dbc8e..HEAD -- cloud-worker/src/auth.ts cloud-worker/src/auth.test.ts`. If either changed since this plan was written, compare the "Current state" excerpt against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `04dbc8e`, 2026-07-04

## Why this matters

`consumeMagicToken` and `consumeSiteSessionCode` in `cloud-worker/src/auth.ts` both implement single-use tokens as SELECT-then-DELETE-then-check-the-row-you-already-fetched, rather than one atomic operation. Two concurrent requests presenting the same single-use token both pass the `SELECT` before either runs its `DELETE`, and both then use their own already-fetched row to decide success — meaning both get treated as a valid redemption. This is a real, plausible scenario, not a theoretical one: email security scanners routinely pre-fetch links in emails at the same moment (or before) a real user clicks them, and this exact pattern is reachable from the main site's own login callback (`consumeSiteSessionCode` backs `/auth/site/verify` and `/auth/site/exchange`, which `src/lib/cloudflare-auth.ts` calls from `src/app/api/auth/cloudflare-callback/route.ts` — the user-facing login flow). D1 (this worker's SQLite-compatible database) supports `DELETE ... RETURNING`, which collapses the whole race into one atomic statement.

## Current state

- `cloud-worker/src/auth.ts` — both vulnerable functions, current content:

```ts
export async function consumeMagicToken(
  env: Env,
  token: string,
  purpose: 'cloud' | 'site' = 'cloud',
): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT email, expires_at FROM magic_tokens WHERE token = ? AND purpose = ?',
  )
    .bind(await hashSecret(token), purpose)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM magic_tokens WHERE token = ?').bind(await hashSecret(token)).run();
  if (row.expires_at < Date.now()) return null;
  return row.email;
}
```

```ts
export async function consumeSiteSessionCode(
  env: Env,
  code: string,
): Promise<{ email: string; role: string } | null> {
  const codeHash = await hashSecret(code);
  const row = await env.DB.prepare(
    'SELECT email, expires_at FROM site_session_codes WHERE code_hash = ?',
  )
    .bind(codeHash)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM site_session_codes WHERE code_hash = ?').bind(codeHash).run();
  if (row.expires_at < Date.now()) return null;
  return getUser(env, row.email);
}
```

- D1 schema for both tables (`cloud-worker/migrations/`), confirming there's no unique constraint or state column beyond the primary key that could be used as an alternative fix (e.g. no `used_at` column to conditionally update instead):

```sql
CREATE TABLE magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX magic_tokens_email_idx ON magic_tokens(email);
-- (later migration) ALTER TABLE magic_tokens ADD COLUMN purpose TEXT NOT NULL DEFAULT 'cloud';
CREATE INDEX magic_tokens_purpose_email_idx ON magic_tokens(purpose, email);

CREATE TABLE site_session_codes (
  code_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX site_session_codes_email_idx ON site_session_codes(email);
```

- `cloud-worker/src/auth.test.ts` — the existing test file this plan adds cases to; it currently covers `dbRoleForEmail`, `siteRoleFromDbRole`, and `hashSecret` only (pure-function tests, no D1 interaction) — open it to match its exact test style/imports before adding new cases.
- Callers, for context on blast radius (do not modify these): `consumeMagicToken` is called from `cloud-worker/src/index.ts` (magic-link verification for the `/cloud` file-sharing login) and reached indirectly for the `'site'` purpose via `/auth/site/verify`; `consumeSiteSessionCode` backs `/auth/site/exchange`, which `src/lib/cloudflare-auth.ts` calls from the main Next.js app's `src/app/api/auth/cloudflare-callback/route.ts` — this is the real, user-facing login path for the portfolio site itself, not just an admin/internal tool.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (cloud-worker has its own tsconfig, excluded from root) | `cd cloud-worker && npx tsc --noEmit` | exit 0 |
| Unit tests | `cd cloud-worker && bun test` (note: `cloud-worker/package.json` has no `test` script wired today — see `DX-05` in `plans/README.md`; run `bun test` directly from within `cloud-worker/` rather than via a root script) | existing 3 tests + new race-condition tests pass |
| Root unit tests still pass | `bun test src` (from repo root) | 19 pass, 0 fail — unaffected by this change, but confirm nothing else broke |

## Scope

**In scope** (the only files you should modify):
- `cloud-worker/src/auth.ts` — rewrite `consumeMagicToken` and `consumeSiteSessionCode` to use a single atomic `DELETE ... RETURNING` statement instead of SELECT-then-DELETE.
- `cloud-worker/src/auth.test.ts` — add test cases proving the fix.
- `cloud-worker/package.json` — add a `"test": "bun test"` script (currently missing entirely — this plan's own verification step needs it, and it's a one-line fix for a separately-tracked finding, `DX-05`; fine to fix here since you're already touching this exact gap to run your own tests).

**Out of scope** (do NOT touch, even though they look related):
- `mintMagicToken`, `mintSiteSessionCode` — the issuing side is not part of this race; leave unchanged.
- `cloud-worker/src/index.ts` — the route handlers that call these functions don't need to change; the fix is entirely inside `auth.ts`'s function bodies, same signatures, same return semantics.
- The main Next.js app's `src/lib/cloudflare-auth.ts` — calls into `cloud-worker` over HTTP, doesn't need to change for this fix.
- Any other function in `auth.ts` (`createSessionCookie`, `readSession`, `canAccess`, etc.) — untested but out of scope for this plan (tracked separately under `TEST-05`).

## Git workflow

- Create `tasks/task-266.md` documenting this fix (mirror `tasks/task-190.md`'s structure).
- Commit message: plain descriptive subject (e.g. "Fix magic-token/site-session-code double-redeem race"), body explaining the SELECT-then-DELETE race and the atomic `RETURNING` fix, ending with `Co-Authored-By: Claude <noreply@anthropic.com>` — match the actual style in `git log`, not the unused `[Task-N]`-tag convention (see `plans/PLAN.md`).
- Do not push unless asked.

## Steps

### Step 1: Rewrite `consumeMagicToken`

Replace the SELECT-then-DELETE with one atomic statement:

```ts
export async function consumeMagicToken(
  env: Env,
  token: string,
  purpose: 'cloud' | 'site' = 'cloud',
): Promise<string | null> {
  const row = await env.DB.prepare(
    'DELETE FROM magic_tokens WHERE token = ? AND purpose = ? RETURNING email, expires_at',
  )
    .bind(await hashSecret(token), purpose)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  return row.email;
}
```

The `.first()` call works identically against a `DELETE ... RETURNING` result set as it does against a `SELECT` — it takes the first (and here, only) row. If no row matches `token`+`purpose`, `.first()` returns `null` (already-consumed or never-existed token), which is exactly the existing "invalid" behavior — no caller-visible change to the function's contract.

**Verify**: `cd cloud-worker && npx tsc --noEmit` → exit 0.

### Step 2: Rewrite `consumeSiteSessionCode`

Same pattern:

```ts
export async function consumeSiteSessionCode(
  env: Env,
  code: string,
): Promise<{ email: string; role: string } | null> {
  const codeHash = await hashSecret(code);
  const row = await env.DB.prepare(
    'DELETE FROM site_session_codes WHERE code_hash = ? RETURNING email, expires_at',
  )
    .bind(codeHash)
    .first<{ email: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  return getUser(env, row.email);
}
```

**Verify**: `cd cloud-worker && npx tsc --noEmit` → exit 0.

### Step 3: Add the missing `test` script

In `cloud-worker/package.json`, add `"test": "bun test"` to the `"scripts"` object (alongside the existing `dev`, `deploy`, `tail`, `types`, `db:migrate*`, `db:studio` entries).

**Verify**: `cd cloud-worker && bun run test` executes (rather than failing with "missing script").

### Step 4: Add race-condition test cases

In `cloud-worker/src/auth.test.ts`, following its existing style (open it first — it's a small pure-function test file today with no D1 mocking, so you'll need to introduce a minimal fake/mock `Env['DB']` if one doesn't already exist elsewhere in this package to test against; check whether `mcp-worker`'s test setup has a reusable D1-mocking pattern via `@cloudflare/vitest-pool-workers` before inventing a new one — note this package uses `bun:test`, not `vitest`, so a direct copy may not apply, but the *shape* of how they fake a D1 binding might still be a useful reference). Add cases proving:
  - A single valid token is consumed successfully once.
  - Consuming the same token twice: the second call returns `null` (this is the actual regression test for the race — even without literal concurrency, it proves the row is really gone after one consumption, which is the property `RETURNING` guarantees atomically).
  - An expired token/code is rejected (row existed, but `expires_at` was in the past).
  - A malformed/never-issued token returns `null` cleanly.

**Verify**: `cd cloud-worker && bun test` → all previous + new cases pass.

### Step 5: Confirm the root app is unaffected

**Verify**: from the repo root, `bun test src` → 19 pass, 0 fail (this change is isolated to `cloud-worker/`, but confirm nothing in the root app assumed the old two-step behavior).

## Test plan

- New cases in `cloud-worker/src/auth.test.ts` per Step 4 above: single-consume success, double-consume returns `null` on the second call (the actual regression case), expired-token rejection, unknown-token rejection.
- Model the test file's structure after its own existing tests (`dbRoleForEmail`/`siteRoleFromDbRole`/`hashSecret` cases) for style, even though these new cases need a D1 mock those don't.
- Verification: `cd cloud-worker && bun test` → all pass, including the 4+ new cases.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd cloud-worker && npx tsc --noEmit` exits 0
- [ ] `cd cloud-worker && bun test` exits 0, including new double-consume/expired/unknown-token cases
- [ ] `grep -n "SELECT email, expires_at FROM magic_tokens" cloud-worker/src/auth.ts` returns no matches (old SELECT is gone)
- [ ] `grep -n "RETURNING" cloud-worker/src/auth.ts` shows exactly 2 matches (one per rewritten function)
- [ ] `bun test src` (root) exits 0, 19 pass, 0 fail
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for plan 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `DELETE ... RETURNING` fails against the actual D1 binding (some older D1 compatibility dates predate `RETURNING` support) — check the `compatibility_date` in `cloud-worker/wrangler.jsonc`/`wrangler.toml` if this happens; do not fall back to a non-atomic workaround without reporting this first, since the whole point of the fix is atomicity.
- The current content of either function doesn't match the "Current state" excerpts above — the codebase has drifted since this plan was written.
- Introducing the D1 mock for testing turns out to require significant new test infrastructure (more than a small local fake) — pause and report rather than building a large new testing framework as a side effect of this plan; a narrower fix (e.g. testing via a real local D1 instance with `wrangler d1 migrations apply cloud --local`) may be more appropriate and worth discussing first.

## Maintenance notes

- Any future single-use-token pattern added to this worker should use the same `DELETE ... RETURNING` idiom from the start rather than SELECT-then-DELETE — this plan's diff is the reference example.
- `cloud-worker/src/auth.ts` has ~10 more exported functions with zero test coverage beyond what this plan adds (`mintMagicToken`, `createSessionCookie`, `readSession`, `canAccess`, `listAllowedFolders`, `ensureUser`, `getUser`, `ensureUser`) — that's a separate, already-queued finding (`TEST-05`); don't expand this plan's scope to cover them.
