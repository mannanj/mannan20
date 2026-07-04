# PLAN — mannan20 Audit Remediation

## What this is

A full read-only audit of this repo ran 2026-07-04 (Next.js app + 3 Cloudflare Workers + the E2E suite — 256 files in `src/` alone). It produced ~60 deduplicated findings across security, correctness, test coverage, tech debt, performance, dependencies, and DX/docs, plus a separate "direction" section of grounded feature/roadmap options. Full narrative report with evidence, tables, and a "verified clean" section: https://claude.ai/code/artifact/7bb37a5f-a449-46ba-8bf6-c330a96d4f37. Independent verification of the audit's own claims: `.claude/session-memory/2026-07-04T0114-2c5d02ae-full-repo-audit-plan.md`.

## Why this exists

Three findings are live security exposure — not optional, not "when you get to it." Everything past those three is real but discretionary: the point of this document is to work down a prioritized backlog at a sustainable pace, not to treat all 60 findings as equally urgent.

## Roadmap / phasing

1. **P0 — fix now.** Live security exposure, 3 items, already written up as `001`-`003`.
2. **P1 — high leverage.** Real bugs and gaps worth fixing soon. `004` and `005` are written; the rest are queued in `README.md` without a detailed plan yet.
3. **P2 — real, lower urgency.** Do these as capacity allows.
4. **P3 / investigate.** Low priority, or needs a cheap investigation step before it's even clear a fix is warranted.
5. **Direction (separate track).** Not bugs — grounded feature/roadmap options from the audit's Direction section (Drops inbound file-sharing, jordan CRUD gaps, garden→Markdown, MCP Publisher Intent, leaderboard-identity reuse, chicken-game escape vehicles). **Do not start any of these without explicitly checking with Mannan first** — these are priority/taste calls, not engineering judgment calls a coordinator should make unilaterally.

Work the queue in `README.md` top to bottom within each phase. P0 always before P1 regardless of list position.

## Ground rules (apply to every plan; not repeated in each one)

- **Never modify source code without a written plan.** A discovery mid-work that looks like a new, separate issue gets added to `README.md`'s queue, not fixed opportunistically in the same diff.
- **This repo's actual conventions** (verified against `.claude/CLAUDE.md` and real `git log`, not assumed): no comments in code; Tailwind utilities over custom CSS (custom CSS only for `::before`/`::after`, `@keyframes`, or complex parent-state-dependent selectors); TypeScript strict, no `any`; functional components, `'use client'` only where state/effects/handlers require it, server components by default; `bun` as the package manager everywhere (never `npm`/`pnpm`/`yarn`).
- **The documented Task-N / post-commit-hook workflow in `.claude/CLAUDE.md` is aspirational, not real** — this audit found the git hook is dead (`core.hooksPath` is unset, `.git/hooks/post-commit` doesn't exist) and the last 5 real commits carry no `[Task-N]` tag despite the doc describing that as the convention (this mismatch is itself finding DX-03, folded into plan `005`). Match what commits **actually** look like today: a plain descriptive subject line, a body explaining the *why*, and a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer — not a tag convention nobody's currently using. Still create a `tasks/task-N.md` file per piece of work — that half of the convention genuinely is still in use (see `tasks/task-262.md` for the latest real example, plain content-planning, no commit tag tied to it) — just don't expect the (dead) hook to do anything with it.
- **The dev server matters.** A persistent `bun run dev` (port 3847) may already be running for the human's own use — check `lsof -ti:3847 -sTCP:LISTEN` before starting your own; `bun run dev` force-kills anything already listening there. Never run `next build` while it's up (shared `.next` corrupts both) — verify via HMR in the running server, or an isolated worktree build on a scratch port.

## Standing constraints (never silently violate — escalate instead)

- Never touch production Stripe keys or trigger a real charge. Checkout work is verified via mocks, not a live transaction.
- `/jordan` is a real, currently-used private workspace, not a test fixture. Any change to its auth model must preserve legitimate collaborator access — coordinate before shipping, don't just deploy and see.
- The game leaderboard is public and live. Changes to scoring/identity logic affect real recorded scores — don't wipe or renumber existing entries as a side effect of a fix.
- Never force-push. Never push to `main` without being asked. Follow the existing branch/commit workflow; only create commits when the human asks for one (see the repo's own global git-safety conventions).

## Full backlog

See `README.md` for the living status table — all findings, priority, category, and status. Detailed, self-contained, executor-ready plans exist today for the first five (`001`-`005`, three P0 + two P1). Everything else in the queue needs its own plan written in the same format (see any of `001`-`005` as the template, or `~/.claude/skills/improve/references/plan-template.md` if that skill is available in the executor's environment) before a subagent starts changing code — don't jump straight from a one-line queue entry to a diff.
