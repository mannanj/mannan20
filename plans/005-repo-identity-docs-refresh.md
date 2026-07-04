# Plan 005: Rewrite README, retire the dead git hook, fix `.vscode/`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 04dbc8e..HEAD -- README.md best-practices.md .githooks .vscode .claude/CLAUDE.md`. If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live files before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs / dx
- **Planned at**: commit `04dbc8e`, 2026-07-04

## Why this matters

This repo was originally an Angular 20 + Spring Boot project and was fully rewritten to Next.js (see `git log`, commit `343e703` "Migrate from Angular 20 to Next.js 15 (App Router)"), but several onboarding-facing artifacts were never updated to match: `README.md` still describes the old Angular/Spring Boot stack with setup commands that don't exist (`./setup.sh`, `cd backend && ./mvnw spring-boot:run`, `bun run ws-server`); the post-commit hook it (and `.claude/CLAUDE.md`) describe as active is completely dead (`core.hooksPath` is unset, `.git/hooks/post-commit` doesn't exist, and the hook's own output files were never created); and `.vscode/` still recommends an Angular extension and has launch/task configs for `ng serve`/`ng test` that don't apply to this app at all (one of the task configs will hang indefinitely waiting for an Angular CLI message `next dev --turbopack` never prints). Every fresh clone — human or AI agent — hits a wrong-stack wall immediately on following the README.

## Current state

- `README.md` — full current content (2,835 bytes) describes Angular 20 / Spring Boot 3.5.6 / Java 25 / NgRx, a `./run.sh`/`./setup.sh` setup flow, a `backend/` and `server/` directory structure that doesn't exist, and a whole "Dev Stats" cookie-gated commit-history panel with no matching code anywhere in `src/` (confirmed: zero hits for `dev-commits.json`/`isMannanDev`/`tasks.json` in `src/`). Last edited 2026-03-12, per its file history — three-plus months of Next.js-era commits since without a correction.

- `best-practices.md` (repo root, full current content) — a generic Angular/TypeScript boilerplate doc (NgModules, signals, `@HostBinding`, `NgOptimizedImage`, standalone components, Reactive forms) with nothing relevant to this Next.js/React/Tailwind codebase. `.claude/CLAUDE.md` already documents this repo's real conventions (stack, React/Tailwind/TypeScript standards, project structure) — `best-practices.md` is fully redundant with it, not a second source of anything real.

- `.claude/CLAUDE.md` (this repo's real conventions doc) currently contains, under "Post-Commit Hook" and "Task Workflow": a description of `.githooks/post-commit` "auto-generat[ing] task tracking data" and a `[Task-N]` commit-tag convention. Directly confirmed during planning: `git config --get core.hooksPath` returns nothing (exit 1, unset) and `.git/hooks/post-commit` does not exist — the hook has never actually run. Independently confirmed: the last 5 real commits in `git log` (as of `04dbc8e`) carry no `[Task-N]` tag anywhere in subject or body, despite this being described as required practice — the convention is not currently followed even manually, tag or no hook.

- `.vscode/extensions.json` — recommends `angular.ng-template` only.
- `.vscode/launch.json` — defines only an `"ng serve"` (port 4200) and an `"ng test"` (Karma) debug config; no Next.js dev-server launch config exists.
- `.vscode/tasks.json` — defines `npm: start`/`npm: test` background tasks whose `problemMatcher.background.endsPattern` is `"bundle generation complete"` (an Angular CLI message `next dev --turbopack` never prints — triggering these via Cmd+Shift+B hangs indefinitely).
- `.vscode/settings.json` — has `java.configuration.updateBuildConfiguration`/`java.compile.nullAnalysis.mode` keys left over from the retired Spring Boot backend.

- Real dev workflow, for the README rewrite to describe accurately: `bun install` (auto-runs `scripts/apply-unicorn-transforms.mjs` via `postinstall`), `bun run dev` (kills anything on port 3847 first, then `next dev --turbopack -p 3847`), `bun run build` / `bun run start`, `bun run test:unit` (`bun test src`), `bun run test:e2e` (`bunx playwright test`), plus the `mcp:*` and `visits:*` scripts for the two auxiliary workers — all read directly from the real `package.json` during planning, not assumed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Confirm hook truly unwired (re-verify before acting) | `git config --get core.hooksPath` | exit 1 / empty |
| Confirm hook target files still don't exist | `ls public/data/dev-commits.json public/data/tasks.json 2>&1` | "No such file or directory" for both |
| Typecheck (docs-only change, should be unaffected) | `npx tsc --noEmit` | exit 0 |
| Unit tests (unaffected) | `bun test src` | 19 pass, 0 fail |

## Scope

**In scope** (the only files you should modify/remove):
- `README.md` — rewrite entirely.
- `best-practices.md` — delete (see Step 2 for the reasoning and the escape hatch if you'd rather keep it).
- `.claude/CLAUDE.md` — edit only the "Post-Commit Hook" and "Task Workflow" sections to match reality (see Step 3); do not rewrite unrelated sections.
- `.vscode/extensions.json`, `.vscode/launch.json`, `.vscode/tasks.json`, `.vscode/settings.json` — rewrite each for this stack.

**Out of scope** (do NOT touch, even though they look related):
- `.githooks/post-commit` itself — this plan does not decide to wire it up or delete the script; it only corrects the *documentation* claiming it's active. Actually enabling it (or formally retiring the script file) is a product decision for Mannan, not an engineering judgment call — see Step 3's escape hatch.
- `tasks/*.md` — the per-task-file convention is genuinely still in use (see `tasks/task-262.md`) and is not part of this plan's scope; only the commit-message tagging half of the documented convention is being corrected.
- Any other `.claude/CLAUDE.md` section (React/Tailwind/TypeScript conventions, project structure, MCP worker notes, etc.) — those are accurate or covered by a separate finding (`DEBT-04`/`DOCS-01` in `plans/README.md`); don't touch them here.

## Git workflow

- Create `tasks/task-267.md` documenting this fix (mirror `tasks/task-190.md`'s structure).
- Commit message: plain descriptive subject (e.g. "Rewrite README and retire stale Angular-era tooling docs"), body naming what was wrong and why, ending with `Co-Authored-By: Claude <noreply@anthropic.com>` — match the actual style in `git log`, not the unused `[Task-N]`-tag convention this very plan is correcting the documentation of.
- Do not push unless asked.

## Steps

### Step 1: Rewrite `README.md`

Replace the entire file. It should cover, accurately:
- What this is: Mannan's personal portfolio site (Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4), plus three attached Cloudflare Worker services (`cloud-worker/`, `mcp-worker/`, `visits-worker/`).
- Quick start: `bun install`, `bun run dev` (notes it runs on port **3847**, not the Next.js default 3000, and that it force-kills anything already listening there first), `bun run build`, `bun run start`.
- Testing: `bun run test:unit` and `bun run test:e2e` (Playwright, config at `playwright.config.ts`, reuses an existing dev server on 3847 if one's running).
- The three Worker sub-projects, one line each on what they do and how to work on them (`cd <worker> && bun run dev`/`deploy`), pointing at their own `README`/`.dev.vars.example` where those exist rather than duplicating detail.
- The `mcp:*` scripts (`mcp:build`/`mcp:check`/`mcp:test`/`mcp:deploy`) and what they're for, briefly — full detail already lives in `.claude/CLAUDE.md` and `mcp-worker/README.md`; don't duplicate it here, just point to it.
- Do NOT reintroduce a "Dev Stats" / cookie-gated commit-history panel section — that feature doesn't exist in the current codebase; if it's wanted, it's a new feature request, not a docs fix.
- Do NOT describe the Task-N/post-commit-hook workflow as active — see Step 3.

**Verify**: `grep -iE "angular|spring boot|ngrx|mvnw|ws-server" README.md` returns no matches.

### Step 2: Remove `best-practices.md`

Delete `best-practices.md`. `.claude/CLAUDE.md` is this repo's real, current conventions doc and already covers TypeScript/React/Tailwind standards — `best-practices.md` added nothing beyond being wrong.

**Escape hatch**: if you'd rather keep a `best-practices.md` file for some reason (e.g. a team convention of always having one), rewrite it for the real stack instead of deleting it — but check with the drift-check discipline that nothing else in the repo references this exact filename before assuming either choice is risk-free. Note which you chose in the commit body.

**Verify**: `test -f best-practices.md` fails (or, if rewritten instead of deleted, `grep -iE "angular|ngmodule|standalone component" best-practices.md` returns no matches).

### Step 3: Correct `.claude/CLAUDE.md`'s hook/task-tagging sections

Find the "Post-Commit Hook" and "Task Workflow" sections. Replace the claim that the hook is active with an accurate statement: the hook script exists at `.githooks/post-commit` but is not wired up (`core.hooksPath` is unset) and has never run; commits in practice do not carry a `[Task-N]` tag despite this section previously describing that as required. Keep the *task-file* part of the workflow (create `tasks/task-N.md`, mark subtasks complete) since that part is genuinely still followed — only correct the commit-tagging and hook-activity claims.

**This is a judgment call worth flagging, not silently deciding**: there are two reasonable directions here — (a) document reality (hook is dead, tagging isn't practiced) and stop there, which is what this step does by default, or (b) actually wire up `core.hooksPath` and resume real `[Task-N]` tagging going forward, reviving the intended workflow. This plan's default is (a) — it's the lower-risk, purely-corrective option, and reviving a workflow nobody's used in the last 5+ commits is a product/process preference, not something to decide unilaterally. If you have a channel to ask Mannan directly, ask; otherwise default to (a) and note the alternative in your report so it's easy to revisit.

**Verify**: `git config --get core.hooksPath` still returns nothing UNLESS you took the escalation path in the note above and deliberately wired it up (in which case, verify it fires correctly on a real commit instead).

### Step 4: Fix `.vscode/extensions.json`

Replace `"recommendations": ["angular.ng-template"]` with either an empty array (`[]`) or a small Next.js/Tailwind-appropriate set if a strong convention exists elsewhere in the org (e.g. `bradlc.vscode-tailwindcss`) — check whether any other Mannan project's `.vscode/extensions.json` has an established pattern before inventing one; if none is evident, `[]` is a safe, honest default (no wrong recommendation is better than a wrong one).

**Verify**: `grep -n "angular" .vscode/extensions.json` returns no matches.

### Step 5: Fix `.vscode/launch.json`

Replace the `"ng serve"`/`"ng test"` configurations with a Next.js-appropriate one — e.g. a Chrome launch config pointed at `http://localhost:3847` (matching the real dev port), with no `preLaunchTask` unless you also fix `tasks.json` to match (see Step 6) and want them wired together.

**Verify**: `grep -n "ng serve\|4200\|debug.html" .vscode/launch.json` returns no matches.

### Step 6: Fix `.vscode/tasks.json`

Replace the `npm: start`/`npm: test` background tasks (with their Angular-CLI-specific `endsPattern`) with either nothing (delete the file if no VS Code task integration is actually wanted) or a corrected task that runs `bun run dev` with a problem matcher pattern that actually matches Next.js/Turbopack's real startup output (check what `next dev --turbopack` actually prints on ready — do not guess a regex, run it and look, since a wrong pattern here reproduces exactly the same hanging-task bug this plan is fixing).

**Verify**: `grep -n "bundle generation complete\|ng " .vscode/tasks.json` returns no matches (or the file no longer exists, if deleted).

### Step 7: Fix `.vscode/settings.json`

Remove the `java.configuration.updateBuildConfiguration`/`java.compile.nullAnalysis.mode` keys. If nothing else is in the file afterward, it's fine for it to be `{}` or to add genuinely useful TS/Next.js-relevant settings (e.g. `"typescript.tsdk": "node_modules/typescript/lib"`) if that's an established pattern elsewhere — don't invent settings with no basis.

**Verify**: `grep -n "java\." .vscode/settings.json` returns no matches.

### Step 8: Confirm nothing else broke

**Verify**: `npx tsc --noEmit` → exit 0. `bun test src` → 19 pass, 0 fail. (This plan is docs/tooling-only — these should be unaffected; running them just confirms no accidental collateral edit.)

## Test plan

No new automated tests — this plan changes documentation and editor configuration, not application behavior. The verification commands in each step (mostly `grep`-based negative checks confirming stale references are gone) are the test plan here.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -iE "angular|spring boot|ngrx|mvnw|ws-server" README.md` → no matches
- [ ] `test -f best-practices.md` fails, OR (if kept) it contains no Angular-specific content
- [ ] `.claude/CLAUDE.md`'s hook/task-tagging sections no longer claim the hook is active (unless deliberately wired up per Step 3's escape hatch, in which case it's verified actually working)
- [ ] `grep -n "angular" .vscode/extensions.json` → no matches
- [ ] `grep -n "ng serve\|4200\|debug.html" .vscode/launch.json` → no matches
- [ ] `grep -n "bundle generation complete\|ng " .vscode/tasks.json` → no matches (or file removed)
- [ ] `grep -n "java\." .vscode/settings.json` → no matches
- [ ] `npx tsc --noEmit` exits 0; `bun test src` exits 0 (19 pass, 0 fail)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for plan 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Any in-scope file's current content doesn't match the "Current state" description above — the codebase has drifted since this plan was written.
- You're unsure whether reviving the post-commit hook (Step 3's escalation option) is wanted — default to documenting reality and flag it in your report; do not silently wire up `core.hooksPath` on a guess, since that changes real commit behavior (a second auto-commit per tagged commit) going forward.
- Fixing `.vscode/tasks.json`'s problem matcher (Step 6) isn't straightforward because `next dev --turbopack`'s actual ready-output doesn't cleanly match any simple regex — it's fine to just delete the task rather than force a fragile pattern; note that choice.

## Maintenance notes

- This plan corrects documentation and editor config to match today's reality; it doesn't change the underlying fact that this repo currently has **no automated enforcement** of anything (no CI, no lint) — that's `DX-01`/`DX-02`, separately queued and higher-leverage than this plan.
- Once `DEBT-04`/`DOCS-01` (refresh `.claude/CLAUDE.md`'s state-management and project-structure sections) lands, `.claude/CLAUDE.md` will have had two separate correction passes in short succession — worth a final read-through end to end at that point to make sure the whole file still reads coherently, not just correct section-by-section.
