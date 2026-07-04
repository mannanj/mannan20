Resuming as fleet coordinator for mannan20 audit remediation (/Users/manblack/Documents/mannan20).

Before doing anything else:
1. Read plans/PLAN.md — the why/what/roadmap. Stable; don't expect it to have changed much.
2. Read plans/README.md — the living where-are-we. This is the one that moves every session.
3. Verify the crux yourself, don't trust either doc blindly:
   - `lsof -ti:3847 -sTCP:LISTEN` — is the persistent dev server already running? Don't start your own and don't run `bun run dev` reflexively — it force-kills anything already on that port first.
   - `git status -sb` and `git log --oneline -5` — confirm no surprise uncommitted state or commits since this queue was written.
   - `npx tsc --noEmit && bun test src` — expect 0 errors / 19 pass, 0 fail. If not, something changed since the audit and reality wins over the docs — fix the doc, then proceed.
   If reality disagrees with the docs, reality wins: fix the doc first, then proceed.

You are the coordinator for this work unit, not a solo implementer:
- Decompose the next item(s) in the priority queue below into independent, subagent-able pieces.
- Dispatch concurrent subagents (Agent tool; background where it doesn't block your next move). Give each one full self-contained context, an explicit scope, explicit constraints on what NOT to touch, and this instruction: flag a finding rather than silently deciding when it's a genuine fork, a scope-changing discovery, or anything risky/irreversible — otherwise, make the reasonable call and say what you decided.
- Report to me as subagents land — short and concrete, not silence until the end.
- Subagents may recurse (dispatch their own subagents) for genuinely large sub-pieces, same rules one level down. Use an agent type with its own Agent-tool access (e.g. general-purpose) for any piece that might itself need to fan out further.
- Two-tier escalation: what's your engineering judgment call, decide it and log the why in plans/README.md's decision trail. What's my taste/priority/authorization to give, ask me directly (AskUserQuestion or plain text) — don't guess.

Current priority queue (top of plans/README.md, in order — all 5 already have complete, self-contained, executor-ready plans; start executing them, don't re-plan them):
1. plans/001-tts-command-injection.md — delete the unauthenticated /api/tts command-injection route (P0, effort S, no deps)
2. plans/002-jordan-server-side-auth.md — give /api/jordan/* real server-side session auth (P0, effort M, no deps)
3. plans/003-dependency-cve-upgrade.md — `bun update next postcss` to close 9 HIGH + 1 moderate CVE, already within the existing package.json ranges (P0, effort S, no deps)
4. plans/004-auth-token-double-redeem-race.md — fix the magic-token/site-session-code double-redeem race in cloud-worker (P1, effort S, no deps)
5. plans/005-repo-identity-docs-refresh.md — rewrite README.md, retire the dead-git-hook claims in CLAUDE.md, fix .vscode/ (P1, effort M, no deps)

001-003 are independent of each other and safe to dispatch concurrently. 004 and 005 are also independent of 001-003 and of each other — safe to run all 5 in parallel if you want maximum throughput this work unit, since none share a file.

After those 5 land, the queue continues into ~37 more P1/P2/P3 findings plus 6 "Direction" options in plans/README.md — none of those have a detailed plan yet. Write one (same template as 001-005) before dispatching a subagent to execute it; don't jump straight from a one-line queue row to a diff. Suggested next batch after 001-005, in priority order: the CSRF/sign-out/leaderboard-proof security trio (SEC-08, SEC-09, SEC-05), then the header.tsx god-component split paired with its re-render fix (DEBT-03 + PERF-02, same file — do together), then DX-01/DX-02 (CI + lint), since those two make every plan after them safer to execute unattended.

Known blockers that need me specifically, not more agent work:
- TEST-03 (13 contact-form e2e tests permanently red behind the CONTACT_CHALLENGE flag): needs my decision — enable the feature, or explicitly skip those tests. Don't guess either way.
- Any of the 6 "Direction" items at the bottom of plans/README.md (Drops inbound file-sharing, jordan CRUD gaps, garden→Markdown, MCP Publisher Intent, leaderboard-identity reuse, chicken-game escape vehicles): do not start scoping or building any of these without asking me first. Priority/taste calls, not yours to make.
- Plan 002 has a built-in escape hatch on whether to revive the dead post-commit hook vs. just document its retirement in CLAUDE.md — default is "document retirement," ask me if you'd rather actually revive it.

Standing constraints for this project (must not be silently violated):
- Never touch production Stripe keys or trigger a real charge — checkout work is verified via mocks only.
- /jordan is a real private workspace I actively use, not a fixture — any auth-model change must preserve my own legitimate access; tell me before deploying a change there, don't just ship it silently.
- The game leaderboard is public and live — don't wipe or renumber real recorded scores as a side effect of any fix.
- A persistent dev server may already be running on port 3847 — always check before starting your own. Never run `next build` while it's up (shared `.next` corrupts both) — use an isolated worktree build on a scratch port instead.
- Commit locally as each plan completes (this repo's own convention: a tasks/task-N.md file + a descriptive commit with a Co-Authored-By: Claude trailer — see plans/PLAN.md's ground rules for why NOT to use the documented-but-unused [Task-N] commit-tag/hook convention). Do NOT push, and do NOT open a PR, until I explicitly ask — this repo auto-deploys to production on push to main via Vercel's git integration, so a push is a real production deploy, not a reversible local action.
- Never force-push.

At the end of this work unit:
1. Update plans/README.md: what shipped, what got decided and why, what's next, what's still open.
2. Run the session-audit skill; report completion from the audit file, not from working memory.
3. Run the handoff skill too if context is heavy or you're stopping mid-thread.
4. Fill out this same template fresh (plans/KICKOFF.md — priorities and blockers will have changed) and give it to me as the next kickoff prompt.
