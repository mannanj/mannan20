Resuming as fleet coordinator for mannan20 (/Users/manblack/Documents/mannan20).

Before doing anything else:
1. Read `plans/PLAN.md`, then `plans/README.md` including the 2026-07-12 delivery snapshot and decision trail.
2. Reconcile live state: `git status -sb`, `git log --oneline -8`, `git worktree list`, and `git rev-list --left-right --count main...feat/drops-m1`.
3. Preserve the known user-owned local paths unless the user explicitly scopes them in: modified `.claude/claude.md`, untracked `portfolio/`, and untracked `tasks/task-262.md`.
4. Check port 3847 before any live-browser work. Do not run `bun run dev` reflexively because it force-kills the current listener. Do not run `next build` against a shared `.next` while a persistent server is active.
5. Re-run the narrow validation appropriate to the selected item. The latest Plan 006 repository baseline is: root typecheck + 117/117 unit tests pass; MCP snapshot is in sync and 44/44 tests pass; cloud-worker tests pass 70/70; cloud-worker typecheck has exactly 14 pre-existing `src/admin.ts` JSON-body failures tracked as `CORRECTNESS-13`; redacted intended-state/history Gitleaks scans pass.

Repository state at the 2026-07-12 handoff:
- `main` points to local commit `76d995a`; the locally known `origin/main` remains at `01357a9` (main is ahead 1). Do not push or equate either ref with a freshly verified production deployment.
- MCP generated data is in sync; do not regenerate or deploy it unless MCP source content changes or `bun run mcp:check` reports drift.
- Root CI exists for typecheck + unit tests. Playwright E2E is not yet in CI, so `DX-01` is PARTIAL.
- `TEST-03` is resolved: task 269 removed `CONTACT_CHALLENGE` and rewrote the contact flow/tests around Turnstile.
- The README/ledger were refreshed in task 271 to cover the fourth Worker and current pipeline state.

Highest-priority ready remediation work:
1. Plan `006` / `SEC-14`-`SEC-16` — repository implementation is verified but uncommitted. Before Gate A, confirm required secrets are provider-managed and obtain separate authorization before removing ignored local credential-bearing files. Bucket creation, migration credentials, object copy/delete, binding/public-access changes, deployment, commit, push, and all remote mutation remain unauthorized until Mannan approves the relevant action/gate.
2. `SEC-08` — CSRF state/nonce on login callback.
3. `SEC-09` — real server-side session invalidation on sign-out.
4. `SEC-05` — gameplay-proof token for leaderboard submissions.
5. Finish `DX-01` by deciding and implementing a practical Playwright CI strategy; `DX-02` ESLint remains separate.
6. `DEBT-03` + `PERF-02` — split `header.tsx` and remove the 60/sec garden-nav hover rerender.
7. Smaller ready work: `CORRECTNESS-13` cloud-worker admin type errors and `DEP-08` residual PostCSS advisory.

Substantial separate pipeline:
- `/Users/manblack/Documents/mannan20-drops` is the clean `feat/drops-m1` worktree at `7e4cd7e`.
- It has 28 feature-only commits and diverges from `main` by 28 main-only commits.
- It implements Drops worker/schema/policy/uploads/approval/cleanup plus site proxy routes, corresponding in substance to plan tasks 0–24.
- It is not merged or represented by a locally known remote ref. Remaining plan work starts at task 25: recipient page, admin UI, recipient E2E, MCP privacy guard, full pre-merge gate, reconciliation with current `main`, and authorized deployment/integration.
- Do not merge, push, deploy, or perform production migration/secrets work without Mannan's explicit authorization.

Human decisions / stop conditions:
- Direction items remain product-priority choices. Do not start them merely because they are documented.
- Jordan remains disabled. Reviving it requires Mannan's sign-off and the real auth fix before restoring routes.
- Never touch production Stripe keys, trigger real charges, wipe/renumber live leaderboard scores, force-push, or push/deploy without explicit authorization.
- If prioritizing Drops versus remediation, ask Mannan; that is a product priority choice, not an engineering judgment.

Coordinator discipline:
- Write a detailed plan before source changes, delegate bounded/disjoint work, and keep plan ledgers/integration/commits centralized.
- Inspect delegate diffs and run fresh checks yourself.
- Commit coherent verified units locally when authorized; never push by implication.
- Before reporting completion, run the `session-audit` skill and update this kickoff plus the ledger if state changed.

Storage-boundary guardrails:
- Keep `portfolio-files` public for intentional media/browser downloads and keep MCP bound there.
- Move only `general/*` to `portfolio-private-files`; do not sweep `portfolio/jordan/*` into this cutover.
- Preserve the MCP's exact six-file allowlist.
- Use the named authenticated storage canary before changing the production cloud Worker binding.
- Never delete public originals until copy equivalence, authenticated production access, external denial, and the observation window are proven.
