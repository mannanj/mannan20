### Task 316: Chicken Game v2 — silhouette energy aura + late-game lightning colors

Mannan (2026-11-03, verbatim):
> "can you also upgrade the chicken energy animation and form to be more around the chicken's frame shape rather than just an oval"
> "and also lightning color effects on later levels can have it be red, and later black with red inside the black outline"

- [x] Aura follows the chicken's real silhouette (head, neck, body, wings, tail, from the ChickenSvg geometry, with facing/flip, scale, squash and skins honoured) instead of an oval: flames, sparks and spikes are emitted from points along the outline, plus a soft edge-hugging glow. Tier colors and intensity ramp are kept.
- [x] The aura stays suppressed in vehicles and bird grabs (QA rule from Task 314).
- [x] Lightning colors by progression: the current blue → red → white ramp becomes, on later levels, **red** arcs; and later still **black arcs with a red core**: a black outer stroke (outline) with a red inner line inside it. Name the score/stage thresholds as constants (suggest: red from the eagle era ~10,000; black-with-red-core from the phoenix era ~25,000 and into the endless phase).
- [x] Performance: precompute the outline path once per skin and facing; keep per-frame cost within Task 309 budgets; no regression at 150 clones (aura stays root-only).
- [x] Screenshots of the aura on classic, hawk, eagle and phoenix skins, and of the red and black/red lightning, to `~/Desktop/chicken-game-new-designs/11-aura/`; e2e check that the lightning color switches at the thresholds.
- Location: `src/components/game/chicken-game-v2.tsx` (drawAura, lightningForScore), `src/components/game/chicken-effects.ts` (v2-only additions), `src/components/game/chicken-svg.tsx` (geometry reference; no v1 visual change)

#### Addendum — the chicken takes on fire (Mannan, verbatim)
> "also later levels have the chicken be flaming and turn to fire. and the phoenix scene lets introduce a part where the chicken itself also gets on fire for brief moments"
> "so that sort of led to the chicken taking on the fire nature"

- [x] **Phoenix scene seeds it:** during the phoenix grab (talon-2 heat phase), the chicken itself briefly catches fire, with short photoreal flame bursts on its body (1–2s each, a few times), on top of the sweat and char. This is the story beat where the chicken "takes on the fire nature".
- [x] **After the phoenix, the fire form:** from the phoenix release onward (and into the endless phase), the chicken is progressively flaming: photoreal flames licking along the silhouette outline (sharing the Task 316 outline emitter), embers trailing its flight, heat shimmer, and at the highest level fully "turned to fire" (the body reads as living flame while staying recognisable as the chicken). Thresholds as constants (e.g. flaming from the phoenix release, full fire form from ~35,000 or the first endless era).
- [x] The fire form pairs with the black/red-core lightning; the aura is replaced by flame emission in the fire form; vehicles and grabs still suppress it.
- [x] Performance within Task 309 budgets; screenshots of the brief phoenix-scene ignitions, the flaming stage and the full fire form to `~/Desktop/chicken-game-new-designs/11-aura/`.

- Endless-phase placement, drops, orb pools and build order: `docs/chicken-endless-phase.md`.

#### Built (2026-11-03)
- Outline geometry: `src/components/game/chicken-outline.ts` (ray-marched union of the ChickenSvg head, neck, body, comb, beak, wattle, wings and the hawk/eagle/phoenix tails and crests; cached per pattern; projected per frame with facing, scale, roll, squash and rotation). Rendering: `src/components/game/chicken-fire.ts` (edge-hugging glow, outline spikes, procedural flame sprites, embers, heat shimmer, fire body overlay, lightning styles, ignition schedule).
- Constants: `LIGHTNING_RED_SCORE` 10,000, `LIGHTNING_BLACK_SCORE` 25,000, `FIRE_FLAMING_SCORE` 25,000, `FIRE_FULL_SCORE` 35,000, `FIRE_BODY_START` 0.5, `MAX_EMBERS` 120.
- `jupiter` was removed from `AURA_SHIELD_STAGES`: it is free flight on the surface (no vehicle) and is where the phoenix era, the black/red lightning and the fire form live; `cosmos` (rocket) and the other vehicle stages stay shielded, as do bird grabs and the moon rocket park.
- Bridge: `state().fire / ignition / ignitionBursts / auraDrawn`, `lightning.style`, `auraEmitters()`, `forceIgnition()`.
- Screenshots (five rounds, `r1`..`r5`): `~/Desktop/chicken-game-new-designs/12-aura-fire/`. No external textures or AI images were used (flame sprites are drawn procedurally); spend $0.
