### Task 309: Chicken Game — Performance pass

Measure first, then fix. The game is about to get much heavier: escape stages, up to 60 split/clone chickens, 15 cursors, rainbow pools, three birds of prey. Set a frame budget now and hold every new feature to it.

#### Measure
- [ ] Baseline: Chrome DevTools Performance trace of `/game` at score 0, 150 (aura + lightning), 250 (surf), 450 (rocket zoom), and with 4 kids on screen. Record FPS, main-thread ms per frame, and GPU/raster time on a 2020-class laptop and a mid-range phone
- [ ] Add a dev-only FPS/frame-time readout (behind `?perf=1`) so regressions are visible while playing
- [ ] Playwright perf smoke: run 10s at a fixed score via `window.__chicken.boost`, sample `requestAnimationFrame` deltas, fail if p95 frame time exceeds the budget (target 16.7ms desktop)

#### Suspected hotspots (verify with the trace before changing)
- [ ] Scenery SVG filters: `game-scenery.tsx` animates `feTurbulence` + `feDisplacementMap` on two full-screen layers forever, which is likely the biggest raster cost. Options: pause the hidden slot, freeze the filter while the escape scenery covers it (stage != none), or pre-render the rough look to a static image
- [ ] Animated `filter: drop-shadow(...)` glow on the chicken (`chicken-game.tsx`, `glowStyle`) re-rasterizes every frame, and more often as the aura grows. Move the glow to the canvas aura or a pre-blurred sprite
- [ ] React state set from inside the rAF loop (`setStagePhase`, `setMood`, `setMercyCaption`, countdown, kids…): confirm each one only fires on change and doesn't re-render the whole 2100-line component per frame. Split the static chrome (skins panel, leaderboard, captions) into memoized children
- [ ] Canvas: particle, feather and arc loops use `save/restore`, and `hsl()` strings get built per particle per frame. Cache fill styles and batch by color; cap counts by device class
- [ ] Hidden scenery stays mounted under the escape backdrop. Unmount `GameScenery` once an escape stage is live
- [ ] Surf wave: `drawSurf` strokes 4 full-width paths per frame. Fine now; recheck at large widths
- [ ] Bundle/load: check what `/game` ships (sounds preload, leaderboard panel, feedback popup). Lazy-load panels that aren't open

#### Budgets for upcoming features (Tasks 303–308)
- [ ] Write per-feature budgets into each design doc: max DOM chickens, max particles, max pools, max cursors, and when to switch many chickens from DOM nodes to canvas sprites
- [ ] Decide the DOM → canvas threshold for split/clone chickens (e.g. more than 12 chickens means canvas-rendered)

#### Done when
- [ ] p95 frame time within budget at every measured score on desktop, and documented numbers for mobile
- [ ] Perf smoke test is in `e2e/` and passing

- Location: `src/components/game/` (`chicken-game.tsx`, `game-scenery.tsx`, `chicken-effects.ts`, `escape-*.tsx`), `src/app/game/page.tsx`, `e2e/`
