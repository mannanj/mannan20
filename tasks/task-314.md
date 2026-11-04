### Task 314: QA round 1 - Floating Chicken Game v2 visual artifacts
- [x] Sun in the 3D scene is self-lit: flat emissive shader, no lit-planet limb crescent
- [x] Tier aura, lightning and aura particles suppressed in vehicle stages (surf, pilot, rocket, cosmos, jupiter), during bird grabs and held by a bird; DOM drop-shadow glow also removed
- [x] Feather litter rate-limited (22 max, 140ms gap), no elongated or drifter feathers, life capped, small
- [x] Streak lines shortened and fewer (v2 wrapper around teleport streaks; v1 untouched)
- [x] Yellow blob by the exhaust: traced to aura glow/feathers around the rocket, suppressed by the shield
- [x] Text readability: adaptive text shadow on HUD, score, caption, leaderboard link, credit; radial HUD scrim and bottom ground scrim on Jupiter
- [x] Hawk skin: removed head cap that read as a visor, pale streaked belly, rufous tail
- [x] Decision A: phoenix burn mark stays permanent; regrown translucent feathers use the current skin's body colour with bodyDark flecks (verified on classic, hawk, phoenix in 9-qa/r2)
- [x] Decision B: 3D scene starts directly when fully downloaded at start time; otherwise downloading gate, then ready, start, 3-2-1. e2e covers both
- Rounds: r1 (baseline), r2 (after fixes), r3 (verification) in ~/Desktop/chicken-game-new-designs/9-qa/
- Location: `src/components/game/chicken-game-v2.tsx`, `space-flight-3d.tsx`, `chicken-svg.tsx`

### Independent review 1 (9-qa/independent/REVIEW.md) - verdicts
Rounds: independent-r2 (fixed reviewer script, 1280x800 + 390x844). New rule: HUD safe zone (`hud-safe-zone.ts`, score block 200-356px tall, 340px wide at top centre). Plane, drifting chicken, free-flying chicken (all stages), clones and orbs are steered or pushed out of it; the explosion and Jupiter get a scrim behind it.
- [x] BLOCKER rocket boarding / 3D flight never happened: harness. The script waited 18s of a 26.7s sequence (planeExit 1.8 + explode 2.6 + drift 7.5 + approach 11 + boarding 3.8) and its `boost(3)` landed before score 450, so the explosion waited for the 7s fallback. Verified from `start=448` with the fixed script: planeExit -> explode -> drift -> rocketApproach -> boarding -> flight3d -> moon, both viewports. The rocket is the photoreal webp at every step (no SVG rocket exists in v2; "clip-art" was the approach-phase rocket at 0.45 scale). `state()` now exposes `gate`.
- [x] Plane covers the score: real. Fixed: HUD avoidance in `stepFlight` (plane and drifting chicken, detached plane) plus a hard push-out each frame.
- [x] Plane clipped at the mobile edge: real. Fixed: narrow-viewport flight margin (36% of width) and an x clamp of plane half-width (125px).
- [x] Explosion washes out the score: real. Fixed: HUD scrim during `explode`; explosion scaled to `min(1, vw/760)` so it no longer fills the mobile width.
- [x] Jupiter text unreadable: real. Fixed: stronger, larger HUD scrim (0.6 centre). Chicken overlapping a Martian: real. Fixed twice: Martians spawn away from the chicken (16% or 170px), and on Jupiter the chicken is pushed sideways out of any Martian's footprint when it is in the lower half (`martianSpotsRef`). Composite seam / flat chicken: won't-fix this round (art, not layout).
- [x] Claw counter clipped / covered: real. Fixed: hint tail and label clamped inside the viewport (label flips above when near the bottom).
- [x] Hint arrow and mouse icon off the right edge on mobile: real, same clamp.
- [x] Clones and orbs on the score: real. Fixed by the safe zone (clones and orbs are pushed out and bounce).
- [x] Toss: giant rocket + no pools: harness. `forceToss` was called while the hawk still held the chicken (the reviewer never freed it), so the toss acted on a held chicken; the "giant rocket" is the parked ship the chicken landed in (by design). Script now frees the bird first (taps the active talon until `bird.phase` is `done`). Rainbow pools still did not show in the capture window; not reproduced as a bug, pools come from drips on impact.
- [x] Hawk grips for 25s+: harness. The bird only leaves after the talons are tapped (25 + 25) or 60s calm. Script taps the active talon until the bird lets go.
- [x] Mobile Leaderboard label over the sunsignal credit: real. Fixed: credit moves to bottom-right above the bag on `<sm` (cosmos credit now matches the flight credit).
- [x] Inventory panel stays open under the leaderboard: real. Fixed: Escape closes the bag, opening the sheet closes the bag and opening the bag closes the sheet (`forceClosed` / `onOpenChange` on `InventoryBag`).
- [x] Cosmos stray streak / ring: real. The rainbow smear is the chicken's edge-wrap streak drawn in a vehicle stage; streaks are now dropped in surf, pilot, rocket, cosmos and Jupiter. Banner now sits below Skins on mobile. The fixed reviewer script is `9-qa/independent-r2/qa.mjs` (polls `state()` for seq/gate/bird instead of fixed sleeps).
- Minors left as-is: chalk start scene (deliberate style), moon behind the title on mobile surf, flat Moon/Earth art on the moon stage, orb label size, mercy hint size, bag panel contrast, small header tap targets, asteroid belt visibility, cartoon plane and clouds.
