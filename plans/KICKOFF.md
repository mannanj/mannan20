Resuming as fleet coordinator for mannan20 audit remediation (/Users/manblack/Documents/mannan20).

Before doing anything else:
1. Read plans/PLAN.md — the why/what/roadmap. Stable; don't expect it to have changed much.
2. Read plans/README.md — the living where-are-we, including the "Decision trail" section near the bottom (documents what got decided and why in the last work unit — jordan's disabled now, not authed; read it before assuming anything about jordan).
3. Verify the crux yourself, don't trust either doc blindly:
   - `lsof -ti:3847 -sTCP:LISTEN` — is the persistent dev server running? It was found DOWN at the end of the last session (not killed by any remediation work — most likely exited independently). If it's still down, ask Mannan whether to start one before doing anything that needs live verification; don't reflexively run `bun run dev` if something new is already listening on 3847, since it force-kills whatever's there first.
   - `git status -sb` and `git log --oneline -8` — confirm no surprise uncommitted state or commits since this queue was written. Expect `tasks/task-262.md` and `portfolio/` as pre-existing untracked paths, unrelated to this work — leave them alone.
   - `npx tsc --noEmit && bun test src` (repo root) — expect 0 errors / 27 pass, 0 fail (not 19 — that was the pre-remediation baseline; plans 002's jordan-disable and 004's auth fix each added tests).
   - `cd cloud-worker && npx tsc --noEmit` — expect ~14-15 errors, ALL in `src/admin.ts` (a pre-existing, separately-tracked finding, `CORRECTNESS-13` — not something to fix as a side effect of anything else). Zero errors should reference `auth.ts` or `auth.test.ts`.
   - `cd cloud-worker && bun test` — expect 11 pass, 0 fail.
   If reality disagrees with the docs, reality wins: fix the doc first, then proceed.

You are the coordinator for this work unit, not a solo implementer:
- Decompose the next item(s) into independent, subagent-able pieces.
- Dispatch concurrent subagents (Agent tool; background where it doesn't block your next move). Give each one full self-contained context, an explicit scope, explicit constraints on what NOT to touch, and this instruction: flag a finding rather than silently deciding when it's a genuine fork, a scope-changing discovery, or anything risky/irreversible — otherwise, make the reasonable call and say what you decided.
- **Don't let concurrent agents commit for themselves.** Last session, multiple agents editing `plans/README.md` concurrently caused a lost-update race (one agent's status-row edit silently reverted by another agent's stale write-back). Have each subagent implement + verify only; you review and `git add`/commit centrally, one plan at a time, re-reading `plans/README.md` fresh immediately before each edit to it.
- Report to me as subagents land — short and concrete, not silence until the end.
- Subagents may recurse (dispatch their own subagents) for genuinely large sub-pieces, same rules one level down. Use an agent type with its own Agent-tool access (e.g. general-purpose) for any piece that might itself need to fan out further.
- Two-tier escalation: what's your engineering judgment call, decide it and log the why in plans/README.md's decision trail. What's my taste/priority/authorization to give, ask me directly (AskUserQuestion or plain text) — don't guess.

What shipped last session (all committed locally, nothing pushed):
- **001** DONE — deleted the unauthenticated `/api/tts` command-injection route.
- **002** REJECTED/superseded — was going to add real server-side auth to `/jordan`; instead, on Mannan's explicit instruction, jordan was disabled entirely (`src/app/jordan`→`_jordan`, `src/app/api/jordan`→`_api/_jordan`, `e2e/jordan-workspace.spec.ts`→`.disabled` — all reversible renames, zero deletions). **If jordan is ever revived, plan 002's real auth fix must land before re-exposing it** — disabling only made the vulnerability unreachable, it didn't fix it.
- **003** DONE (partial, accepted) — `next` 15.5.10→15.5.20 closes all 9 HIGH CVEs; a residual moderate postcss advisory persists via nested/vendored copies not reachable by `bun update` alone, tracked as new finding `DEP-08` (needs a package.json `overrides` field or an upstream Next.js release).
- **004** DONE — fixed the magic-token/site-session-code double-redeem race in `cloud-worker/src/auth.ts` via atomic `DELETE ... RETURNING`; added `cloud-worker`'s first test suite (11 tests) and its missing `test` script; a follow-up fix (this session) added the `@types/bun` dependency the new test file needed to typecheck.
- **005** DONE — rewrote `README.md`/deleted stale `best-practices.md`, corrected `.claude/CLAUDE.md`'s hook/task-tagging claims to match reality (hook is dead, not reviving it), fixed all four stale Angular-era `.vscode/*.json` files.
- New findings logged from this session's own work: `CORRECTNESS-13` (pre-existing `cloud-worker/src/admin.ts` type errors, unrelated to any fix), `DEP-08` (residual postcss advisory).
- Two independent audits ran this session (`.claude/session-memory/2026-07-04T1655-06d4806b-repo-identity-docs-refresh.md`) — both confirmed clean with zero unresolved items by the end.

Current priority queue (none of these have a detailed plan yet — write one in the `plans/00N-*.md` template before dispatching an executor, don't jump straight from a one-line row to a diff):
1. **CSRF/sign-out/leaderboard-proof security trio** — `SEC-08` (CSRF state/nonce on the login callback), `SEC-09` (sign-out doesn't actually invalidate sessions server-side), `SEC-05` (leaderboard scores need a real gameplay-proof token). All P1, real security gaps, independent of each other — good candidates for 3 parallel plans.
2. **`header.tsx` god-component split + re-render fix** — `DEBT-03` + `PERF-02` (60/sec re-render on garden-nav hover). Do together, same file, one plan.
3. **DX-01 + DX-02** — add CI (typecheck + unit + e2e on push/PR) and ESLint (`eslint-config-next`, at minimum `react-hooks/exhaustive-deps`). No CI exists today; landing this makes every plan after it safer to execute unattended.
4. New from last session: `DEP-08` (residual postcss advisory — small, needs an `overrides` field, worth an easy plan) and `CORRECTNESS-13` (`admin.ts` type errors — small, mechanical).

~30 more P2/P3 findings remain queued in `plans/README.md` below this batch; work top to bottom within each phase once the above lands.

Known blockers that need Mannan specifically, not more agent work:
- **TEST-03** (13 contact-form e2e tests permanently red behind the `CONTACT_CHALLENGE` flag): needs his decision — enable the feature, or explicitly skip those tests. Don't guess either way. Untouched this session.
- Any of the 6 "Direction" items at the bottom of `plans/README.md` (Drops inbound file-sharing, jordan CRUD gaps [now doubly moot — jordan's disabled], garden→Markdown, MCP Publisher Intent, leaderboard-identity reuse, chicken-game escape vehicles): do not start scoping or building any of these without asking first. Priority/taste calls, not yours to make.
- **Dev server status**: found down at the end of last session, cause unknown (not killed by any remediation work) — check whether it's back up; if not, ask before doing anything that needs live browser verification.

Standing constraints for this project (must not be silently violated):
- Never touch production Stripe keys or trigger a real charge — checkout work is verified via mocks only.
- **Jordan's status has changed**: it's disabled (unroutable, not deleted), not an active workspace anymore, per Mannan's explicit instruction last session. The old "coordinate before touching /jordan" constraint is superseded by that instruction — but if a future task proposes reviving it, that revival itself needs his sign-off (it was a "come back to it later" ask, not "never mention it again").
- The game leaderboard is public and live — don't wipe or renumber real recorded scores as a side effect of any fix.
- A persistent dev server may or may not be running on port 3847 (status unknown as of last session's end) — always check before starting your own; never run `bun run dev` reflexively since it force-kills anything already listening. Never run `next build` while a server is up (shared `.next` corrupts both) — use an isolated worktree build on a scratch port instead.
- Commit locally as each plan completes (this repo's own convention: a `tasks/task-N.md` file + a descriptive commit with a `Co-Authored-By: Claude` trailer — plain descriptive subjects, no `[Task-N]` tag, per plan 005's correction to `.claude/CLAUDE.md`). Do NOT push, and do NOT open a PR, until explicitly asked — this repo auto-deploys to production on push to main via Vercel's git integration, so a push is a real production deploy, not a reversible local action.
- Never force-push.

At the end of this work unit:
1. Update `plans/README.md`: what shipped, what got decided and why (append to the Decision trail, don't replace it), what's next, what's still open.
2. Run the session-audit skill; report completion from the audit file, not from working memory. If you make a fix in direct response to something the audit found, get one more independent check before reporting — don't self-certify your own fix.
3. Run the handoff skill too if context is heavy or you're stopping mid-thread.
4. Fill out this same template fresh (`plans/KICKOFF.md` — priorities and blockers will have changed) and give it to Mannan as the next kickoff prompt.
