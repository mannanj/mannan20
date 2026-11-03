### Task 311: Chicken Game v2 — Plane polish, graceful stage transitions, 3D Earth→Moon
- [x] Plane never sticks on screen edges: steer away from edges with a soft margin force instead of bounce/clamp; disable edge portals/wraps while airborne in the plane
- [x] Plane flies with more personality: banking turns, barrel-roll twists, swooping arcs (heading-based flight model scoped to the pilot stage)
- [x] Suppress chicken set-pieces (portal, teleport, scramble, hyper, ceremony) during the pilot stage until the plane exits
- [x] Plane exit at the rocket threshold: the chicken floats out, the plane blows up (comedic, no gore) a few clicks later, and the chicken drifts in slow normal motion before ramping back to its normal speed
- [x] Rocket arrival: a rocket fades in in the background and becomes more prominent; the chicken slowly makes its way over, the door opens, the chicken climbs in, the door closes, liftoff
- [x] Flight Earth → Moon rendered in Three.js with a real Earth and Moon (reuse the globe/texture work in `~/Documents/sun`), lazy-loaded so v1 and early v2 stages pay nothing
- [x] Moon landing continues from the 3D scene into the Moon arena without a hard cut
- [x] Graceful transitions between every stage (crossfades, camera moves, no sudden swaps); review each stage boundary
- [x] Performance budget per Task 309 (3D scene only while it is on screen; dispose on exit)
- Location: `src/components/game/chicken-game-v2.tsx`, `src/components/game/escape-*.tsx`, new `src/components/game/space-flight-3d.tsx`, `~/Documents/sun` (reference only)

### Acceptance checklist (verified 2026-11-02, screenshots in ~/Desktop/chicken-game-new-designs/5-plane-rocket-3d/)
| # | Item | Result |
|---|------|--------|
| 1 | Plane never sticks to an edge (soft steering, min centre distance 35-57px over 60 s, no clamp) | PASS |
| 2 | Heading-based flight, bank/squash, barrel roll and loop | PASS |
| 3 | No portal, teleport, scramble, hyper, ceremony in pilot (e2e + sampling) | PASS |
| 4 | Chicken floats out, plane explodes after 3 clicks, slow drift then ramp to normal | PASS |
| 5 | Rocket fades in, grows, chicken approaches, door opens, boards, door closes, liftoff | PASS |
| 6 | Three.js Earth to Moon, textured, lazy-loaded, disposed on exit | PASS |
| 7 | Moon arrival continues from 3D (canvas fade + eased descent from the flight position) | PASS |
| 8 | Graceful stage boundaries (scenery crossfade layers, eased moves) | PASS |
| 9 | Scoring, leaderboard hardening, orbs, toss/split, bag unaffected (e2e 79 pass, 3 skipped) | PASS |
| 10 | Explosion reads photo-real (real fire/smoke sprites, sparks, burning debris) | PASS |
| 11 | Real Sun Signal Sun and Earth shaders and textures, credit "provided by sunsignal.app" bottom right left of the bag | PASS |
| 12 | Scene preloaded after loader (idle), `scene3dReady` true long before the rocket stage | PASS |
| 13 | Gate: ETA line above, "Downloading scene", bar and %, game paused | PASS |
| 14 | "skip instead?" below (2nd line desktop, 3rd line mobile 390x844), 2D fallback to the Moon | PASS |
| 15 | "Scene ready" + green check + arrow, "start?" blue no underline | PASS |
| 16 | 3, 2, 1 countdown then flight; no scoring while paused; timers shifted on resume | PASS |
