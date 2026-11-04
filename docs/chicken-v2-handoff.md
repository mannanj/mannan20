# Chicken game v2 — handoff (paused 2026-11-02, 22:50)

Everything below lives on `main` (latest `652ccd0`) and is served only at `/game?variant=2`. The default `/game` is byte-identical to the pre-v2 game. Prod (mannan.is) runs the v2 build from the earlier deploy (`cce709ed`, escape stages only). **Nothing after that has been deployed.**

## Built (v2)
- Escape vehicles: surf (250), pilot (350), plane exit and explosion, rocket boarding, a 3D Earth→Moon flight (Sun Signal scene, credited), download gate (progress, ETA, skip, ready → start → 3-2-1), Moon (540+). Tasks 244, 311.
- Ability orbs (500/750/1250), with cursor layouts: triangle plus hidden center, X, anchor plus rings of 6 and 8. Task 304.
- Toss / split / reform / bandaid / rainbow pools. Task 303.
- Inventory bag (shared storage with the garden). Task 308.
- Birds: hawk at 2,000, eagle at 10,000, phoenix at 25,000. Photoreal, connected talons, sizes 110/120/150 px, skins x1.25 / x2 / x3, phoenix char memory. Tasks 305, 307.
- Cosmos journey → Jupiter (17,000) with photoreal Martians; 100 clicks → Martian skin x3. Task 310.
- Photoreal polish: rocket, NASA Earth, black hole, pools, exhaust, explosion.
- Leaderboard hardening; owner-only admin board rename (state worker plus site route, not deployed yet).
- Testing: the local-only `?start=N` marker; `scripts/jev/player.mjs` (full Jev run, records with audio); `scripts/jev/clip.mjs` (short scenario clips).

## Tests
`e2e/chicken-game-v2.spec.ts` + `e2e/chicken-game.spec.ts`: 98 passed, 3 skipped, 1 timing-flaky under full load ("hawk skin x1.25"; passes alone). State worker: 11/11.

## Status (2026-11-03): DEPLOYED
- QA: internal round + independent screenshot-only review (1 blocker / 14 majors) + Fable fix round; re-reviewed; no blockers/majors left (`tasks/task-314.md`, `~/Desktop/chicken-game-new-designs/9-qa/`).
- Next.js 16.4.3 + @opennextjs/cloudflare 1.20.13 on main; prod deployed (site version `d235a3a1`, 38/38 bindings), no unsupported-version flag.
- Prod verified: `/`, `/garden`, `/upload`, `/mcp`, `/game` (original), `/game?variant=2` (v2).
- State worker deployed (`a02590bd`, admin board rename); old `jev` row renamed to **My Name Jev**; route 404 without owner session, 200 with. Jev owner id in keychain `chicken-game-jev-owner`.
- Hawk screams uploaded to R2 (`sounds/chicken/hawk-scream-*.mp3`).
- Final Jev walkthrough on prod: `~/Desktop/jev-plays-chicken-2026-11-04T00-57-40.mp4` (8 min, audio), score 2,041 posted as My Name Jev.

## Follow-ups
- Jev player: add a talon Box question so it can free the chicken from birds (final run stalled at the hawk with front claw 1/25 for ~4 min).
- Minors from the independent review (logged in task-314): chalk start scene, cartoon plane/clouds, orb label size, bag panel contrast, small header tap targets, asteroid belt detail.
- `AGENTS.md` was rewritten by Next's install in the next16 worktree; left uncommitted for review.
- Tasks 312 (your-world mode) and 313 (real squeezes, codes, saved progress, crowned boards) are future ideas.

## Spend
Images (OpenRouter): $3.54 session total (`scripts/birds/budget.json`); about $1.25 of that counts against the $5 approved for remaining generation. Jev (TypeSafe): about $0.6–0.7.

## Decisions waiting for Mannan
Phoenix at 25,000; collected toasted feathers have no use yet; the char is never removable; multipliers stack with orbs; the 3D gate always shows ("ready / start?") even when preloaded; skin multipliers vs leaderboard fairness (Tasks 306/313).

## Worktrees
`.worktrees/chicken-escape` (main line; dev server :3861), plus `chicken-311`, `chicken-polish` and `chicken-cosmos` (all merged, safe to remove).
