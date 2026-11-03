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

## Remaining (resume here, in order)
1. **QA round** with an independent screenshot-only reviewer. Known artifacts: the Sun shows a crescent shadow (shaded like a planet); the chicken's purple aura spikes show around vehicles; purple feather litter; a yellow blob in the exhaust over Earth; thin vertical streaks in the black-hole scene; text over Jupiter's bright clouds and ground needs a scrim; the hawk skin's belly reads like a visor.
2. **Deploy v2 to prod** (approved): `rm -rf .next`; `bunx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion`; mint the `full-stack-project` token; deploy `--env production`; diff the 38 bindings; verify that `/game` is unchanged and `?variant=2` works.
3. **Deploy the state worker** (`-c state-worker/wrangler.jsonc`), then run the admin rename `jev` → "My Name Jev" (owner session from keychain `mannan-session-secret`; save the new owner id to keychain `chicken-game-jev-owner`). Verify the route returns 404 without a session and 200 with one.
4. **Upload the hawk screams** to R2: `bun scripts/upload-chicken-sounds.mjs`.
5. **Next 16** (approved): rebase branch `next16-upgrade` (`.claude/worktrees/agent-aee559fc191cebb8f`, commit 87ffbc1) onto main, re-run the build without the flag plus the suites, deploy, verify, and roll back if broken. Then drop `--dangerouslyUseUnsupportedNextVersion`.
6. **Final Jev walkthrough** on prod `?variant=2`, recorded with audio to the Desktop, posted as "My Name Jev".
7. Future ideas: Task 312 (your-world mode) and Task 313 (real-chicken squeezes, codes, saved progress, crowned boards).

## Spend
Images (OpenRouter): $3.54 session total (`scripts/birds/budget.json`); about $1.25 of that counts against the $5 approved for remaining generation. Jev (TypeSafe): about $0.6–0.7.

## Decisions waiting for Mannan
Phoenix at 25,000; collected toasted feathers have no use yet; the char is never removable; multipliers stack with orbs; the 3D gate always shows ("ready / start?") even when preloaded; skin multipliers vs leaderboard fairness (Tasks 306/313).

## Worktrees
`.worktrees/chicken-escape` (main line; dev server :3861), plus `chicken-311`, `chicken-polish` and `chicken-cosmos` (all merged, safe to remove).
