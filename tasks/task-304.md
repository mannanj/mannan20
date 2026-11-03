### Task 304: Chicken Game — Ability orbs (Multiply, Cursor x5, Cursor x3)
- [x] Extract `awardClick` from `hit()` in `chicken-game.tsx` so clones and extra cursors share one scoring path
- [x] Orb entities: score-threshold scheduling (500 Multiply x3, 750 Cursor x5, 1250 Cursor x3), rainbow DOM orb, drift, 30s expiry, click to collect
- [x] Multiply x3: clone snapshot incl. prior clones, 48-chicken cap, 15s lifetime, blink at 10s, black-hole vanish with feathers
- [x] Multi-cursor: pure `buildCursorOffsets` (X layout, x3 trio, 15 combined), overlay hand cursors, mousedown fan-out hit-testing, 30s buff + 0.1s per click
- [x] Bridge hooks: `setScore`, `forceOrb`, orb/clone/cursor state in `__chicken.state()`
- [x] Playwright cases in `e2e/chicken-game-v2.spec.ts` per the plan in `docs/chicken-game-ability-orbs.md`
- Location: `src/components/game/chicken-game.tsx`, `src/components/game/chicken-effects.ts`, `src/app/globals.css`, `e2e/orbs.spec.ts`, spec `docs/chicken-game-ability-orbs.md`
