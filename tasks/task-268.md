### Task 268: Disable jordan instead of adding server-side auth (plan 002 superseded)

- [x] Confirmed no code path (nav link, redirect, or otherwise) references `/jordan` outside its own route/component tree — repo-wide grep came back clean
- [x] Renamed `src/app/jordan/` → `src/app/_jordan/` (Next.js App Router treats underscore-prefixed folders as private/unroutable; zero files deleted or edited inside)
- [x] Renamed `src/app/api/jordan/` → `src/app/api/_jordan/` (same private-folder mechanism; all six data routes + auth route untouched, just unroutable)
- [x] Renamed `e2e/jordan-workspace.spec.ts` → `e2e/jordan-workspace.spec.ts.disabled` (falls outside Playwright's default test-match pattern, so the suite is no longer discovered; test content untouched)
- [x] `src/components/jordan/`, `src/components/canvas/` (the generic canvas tree jordan was the only consumer of) left fully intact
- [x] Verified: `npx tsc --noEmit` exits 0, `bun test src` 27/27 pass, `npx playwright test --list` shows zero jordan tests discovered
- Location: `src/app/_jordan/` (was `src/app/jordan/`), `src/app/api/_jordan/` (was `src/app/api/jordan/`), `e2e/jordan-workspace.spec.ts.disabled` (was `e2e/jordan-workspace.spec.ts`)

Supersedes `plans/002-jordan-server-side-auth.md`. That plan's executor correctly stopped before writing code when it found the required auth check would break all 33 tests in the e2e suite's `beforeEach` (an unauthenticated reset call), and flagged it as a human decision per the plan's own STOP condition. Asked Mannan directly: he no longer uses jordan and asked to disable it entirely (app + tests) rather than fix its auth, in a way that's easy to revive later. This is that revival path — nothing was deleted, only renamed out of routing/test-discovery. See `plans/README.md`'s decision trail for full detail. If jordan is ever revived, land plan 002's real auth fix before re-exposing it to real users; renaming the folders back alone would resurrect the original unauthenticated-wipe vulnerability.
