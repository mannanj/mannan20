### Task 316: Chicken Game v2 — silhouette energy aura + late-game lightning colors

Mannan (2026-11-03, verbatim):
> "can you also upgrade the chicken energy animation and form to be more around the chicken's frame shape rather than just an oval"
> "and also lightning color effects on later levels can have it be red, and later black with red inside the black outline"

- [ ] Aura follows the chicken's real silhouette (head, neck, body, wings, tail, from the ChickenSvg geometry, with facing/flip, scale, squash and skins honoured) instead of an oval: flames, sparks and spikes are emitted from points along the outline, plus a soft edge-hugging glow. Tier colors and intensity ramp are kept.
- [ ] The aura stays suppressed in vehicles and bird grabs (QA rule from Task 314).
- [ ] Lightning colors by progression: the current blue → red → white ramp becomes, on later levels, **red** arcs; and later still **black arcs with a red core**: a black outer stroke (outline) with a red inner line inside it. Name the score/stage thresholds as constants (suggest: red from the eagle era ~10,000; black-with-red-core from the phoenix era ~25,000 and into the endless phase).
- [ ] Performance: precompute the outline path once per skin and facing; keep per-frame cost within Task 309 budgets; no regression at 150 clones (aura stays root-only).
- [ ] Screenshots of the aura on classic, hawk, eagle and phoenix skins, and of the red and black/red lightning, to `~/Desktop/chicken-game-new-designs/11-aura/`; e2e check that the lightning color switches at the thresholds.
- Location: `src/components/game/chicken-game-v2.tsx` (drawAura, lightningForScore), `src/components/game/chicken-effects.ts` (v2-only additions), `src/components/game/chicken-svg.tsx` (geometry reference; no v1 visual change)
