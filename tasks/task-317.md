### Task 317: Chicken Game v2 — Boss: the living trees + the sword (FUTURE, endless phase)

Mannan (2026-11-03, verbatim):
> "later boss ideas: moving and alive trees, with faces, that grab the chicken, and the chicken moves around and sort of pecks at it and chips away at the tree. and you too can click and chip away at the tree. a sword being embedded in one of the trees that if we click 25x we unlock into our inventory. the sword is an item we can use to split any chickens we swipe it on, we can split them very fast by swiping them with the sword (show the sword on the cursor as a tiny sword and the swiping animation when we click chicken with it) and let us have up to 1000 chickens this way with the sword. make sure those chickens are slowly working on combining and be careful and frugal with animations when there's so many chickens test performance to improve it if need be with so many chickens"

- [ ] **Boss era (endless phase):** photoreal living trees with faces walk or sway in. One grabs the chicken in its branches; the chicken struggles, pecks and chips away at the bark (visible chips and wood splinters); the player clicks to chip away too (tree HP bar; clicks on the tree score and damage it). The tree releases the chicken when chipped down; the trees can recur as eras rotate.
- [ ] **Sword in a tree:** one tree has a photoreal sword embedded in it. 25 clicks on the sword pull it free, and it flies into the inventory bag (`sword` item).
- [ ] **Sword item:** use it from the bag to equip it. The cursor becomes a tiny sword; clicking or swiping across chickens plays a slash animation and splits each chicken hit (reusing the Task 303 split system), very fast with swipes. Toggle it off from the bag.
- [ ] **Up to 1000 chickens via the sword:** split chickens slowly work on merging back (the Task 303 group-merge behaviour, slower at high counts).
- [ ] **Performance (hard requirement):** at hundreds to 1000 chickens, switch to a frugal render path: a canvas or instanced sprite batch instead of DOM nodes above a threshold (e.g. >60), shared animation clocks, culled particles and feathers, no per-chicken filters or auras, and LOD (tiny chickens get simplified art). Profile with the Task 309 harness; target ≥50 fps at 1000 chickens on a 2020-class laptop; add an e2e perf check.
- [ ] Jev strategy: a tree grab means clicking the tree (bark) or the sword; equip the sword and swipe clusters for points.
- Location: `src/components/game/chicken-game-v2.tsx`, new `tree-boss.tsx`, `sword.ts`, `src/components/inventory/`, the split system (`chicken-split.ts`), `docs/chicken-orb-pacing.md` (endless registry)

- Endless-phase placement, drops, orb pools and build order: `docs/chicken-endless-phase.md`.
