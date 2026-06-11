### Task 231: Chicken flight — flapping wings, upright self-righting, hand-drawn scenery
- [x] Replace constant random rotation with an upright torsional spring; chicken stays upright in flight and rights itself within ~1s after a rare wall-bounce spin
- [x] Rare spin only on ~1-in-4 wall bounces (was every bounce); spring converges rotation back to ~0
- [x] Flapping wings (`chicken-svg.tsx`) — two wing groups pivoting at the shoulder via `transform-box: view-box`, flap speed driven by `--flap-ms` set from the rAF (scales with effective speed)
- [x] Wings read clearly at every tier — derived darker fill + soft ink outline, slightly enlarged
- [x] Sprite faces its travel direction (scaleX flip on an inner element, deadzone hysteresis), gentle velocity bank
- [x] Hand-drawn cartoon landscape scenery (`game-scenery.tsx`) — 4 inline-SVG scenes (mountains, lake, hills, desert) with a `feDisplacementMap` hand-drawn wobble, subtle slow drift, slow crossfade cycling behind the transparent canvas
- [x] Bridge extended for tests: `state()` exposes `rotation`/`vx`/`vy`, new `spin()`; `window.__scenery` exposes `advance()`/`index()`
- [x] e2e: self-righting (peak then settle), wing flap/facing consistency, scenery crossfade — full suite 14/14 green, `tsc --noEmit` clean
- Location: `src/components/game/chicken-game.tsx`, `src/components/game/chicken-svg.tsx`, `src/components/game/game-scenery.tsx`, `src/app/globals.css`, `e2e/chicken-game.spec.ts`

[Task-231]
