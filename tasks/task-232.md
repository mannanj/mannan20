### Task 232: Chicken game feel — slow it ~10×, stages, emotion faces + flapping, no hair, UI moves
- [x] Slow the chicken ~10×: `BASE_SPEED` 2.5→0.25, flat `speedForScore` (~0.25→0.45 px/frame), gentler avoidance (radius→110, strength→0.08) — it now floats, easy to catch
- [x] Clear ~30-click stages so a form holds before evolving: thresholds 0 / 30 / 64 / 100 / 140
- [x] Remove saiyan hair entirely; show the red comb crest on every stage
- [x] Dynamic faces: per-stage base mood + hot-streak heat (rapid clicking → angry/furious, cools ~2s) + pre-transition bump (`moodEyes`), via new `eyes` prop on `ChickenSvg`
- [x] Emotion-driven wing flap: lazy when smug/slow, brisk when faster, fast + wider (`agitated` keyframes) when angry/furious, brief excited flutter on evolution
- [x] Disable the bottom-right info icon/panel (component kept for later)
- [x] Move the Leaderboard link to the bottom-right corner
- [x] Document the game logic in `docs/chicken-game-logic.md`
- [x] Bridge `state()` exposes `mood`; e2e covers stages/no-hair, hot-streak anger, gentle speed, emotion flap, info gone — 17/17 green, `tsc` clean
- Location: `src/components/game/{chicken-game,chicken-svg,chicken-tiers,leaderboard-panel}.tsx`, `src/app/globals.css`, `e2e/chicken-game.spec.ts`, `docs/chicken-game-logic.md`

[Task-232]
