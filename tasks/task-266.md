### Task 266: Fix magic-token / site-session-code double-redeem race

- [x] Rewrite `consumeMagicToken` to use a single atomic `DELETE ... RETURNING` statement instead of SELECT-then-DELETE
- [x] Rewrite `consumeSiteSessionCode` to use the same atomic `DELETE ... RETURNING` pattern
- [x] Add `"test": "bun test"` script to `cloud-worker/package.json`
- [x] Add a minimal in-memory fake D1 binding in `auth.test.ts` (no existing reusable D1 mock found in `mcp-worker`, which doesn't use D1 at all)
- [x] Add test cases for both functions: single-consume success, double-consume returns `null` on the second call (the actual regression case), expired-token/code rejection, unknown-token/code rejection
- [x] Verify `cd cloud-worker && npx tsc --noEmit` introduces no new errors (auth.ts changes are clean; two pre-existing, unrelated errors remain — `admin.ts` type narrowing issues and `auth.test.ts`'s `bun:test` module resolution — both predate this change and are out of scope)
- [x] Verify `cd cloud-worker && bun test` — 11 pass, 0 fail
- [x] Verify root `bun test src` — 0 fail (pass count reflects other concurrent work in this shared worktree, not a regression)

Two `magic_tokens`/`site_session_codes` tables had no `used_at`/state column — SELECT-then-DELETE
let two concurrent requests both read the row before either deleted it, so both were treated
as a valid redemption. D1 supports `DELETE ... RETURNING`, which collapses the read-and-consume
into one atomic statement. This backs the real user-facing login flow: `consumeSiteSessionCode`
is called from `/auth/site/exchange`, which `src/lib/cloudflare-auth.ts` calls from
`src/app/api/auth/cloudflare-callback/route.ts`.

- Location: `cloud-worker/src/auth.ts`, `cloud-worker/src/auth.test.ts`, `cloud-worker/package.json`

[Task-266]
