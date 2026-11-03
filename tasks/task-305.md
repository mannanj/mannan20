### Task 305: Chicken Game — Hawk event at 2000 points (+ aftermath, feather, hawk skin)

v2 only (`?variant=2`). Bird logic lives in `src/components/game/bird-event.tsx`, parameterized by `BIRD_SPECS[kind]` (assets, clicks per talon, focal offset, skin, multiplier) so the eagle and phoenix reuse it.

- [x] Screams: `public/sounds/chicken/hawk-scream-1/2/3.mp3` wired as `HAWKS` in `chicken-audio.ts` (`playHawk()`, 3-voice rotation, 60 ms min gap, rate jitter, loader progress). Loads R2 first, local fallback. TODO (lead): run `scripts/upload-chicken-sounds.mjs` so the three clips exist on R2; until then prod serves them from `/sounds/chicken/` after the R2 attempt fails.
- [x] Photoreal layers instead of `hawk-svg.tsx`: `grab-body` + `talon-left` (behind the chicken) + `talon-right` (in front), numbers ported from `scripts/birds/compose.json`; flight frames `fly-up/level/down`, `bank`, `away-3q`, `away-far`
- [x] `tap-cursor-icon.tsx` (mouse glyph + press/ripple keyframes copied from Sun Signal `RightClickHint`)
- [x] State machine: approach (eased quadratic curve, bank roll, wingbeat frames, scale-in), grab (crossfade, chicken eased to the settled anchor), right, recoil, left, hover, depart, recede, done; intercept clamped only as needed (viewport margin + HUD rect measured from `[data-hud]`), joint drift that bounces off the bounds and the HUD
- [x] Hints: 10 s red X on the active talon + arrow + tapping cursor; "click the claw" after 30 s more on the left talon; counter anchored beside the talon; all redrawn every frame
- [x] Look at the player every 5 taps on the 2nd talon and on the freeing tap (`data-look`, fly-level frame flash)
- [x] Pre-hawk snapshot/restore (speed, heat, velocity, facing, mode); calm = 25 free clicks or `BIRD_CALM_MS` (60 s), whichever first
- [x] Departure: flaps every 2 s, depart at 5 s, 4 quick flaps at 6 s, recede ~10 s into the focal point (bank -> away-3q -> away-far, wingbeat pulse, fade over the last 15 %)
- [x] Easter egg: 25 clicks on the receding hawk drop a full-size photoreal feather (`public/game/birds/hawk/feather.webp`, generated + keyed, $0.0675 logged in `scripts/birds/budget.json`); click -> flies into the bag as `hawk-feather`
- [x] Float score accumulator + `multRef`; display, thresholds and leaderboard use `Math.floor`
- [x] `pattern`/`multiplier` on `ChickenSkin`, `UNLOCKABLE_SKINS` (`hawk`, x1.25), hawk overlay in `chicken-svg.tsx`, unlocked skins in localStorage; v1 untouched (hawk is not in `SKINS`)
- [x] Bridge: `forceBird`, `placeChicken`, `useItem`, `selectSkin`, `state().bird`, `state().scoreExact/speed/mult`; `fastForward` shifts bird timers
- [x] Playwright: 6 cases in `e2e/chicken-game-v2.spec.ts` ("chicken game v2 hawk event")
- [ ] Open for Mannan: calm duration (25 clicks or 60 s used), whether the feather should drop when the skin is already owned (currently always; bag caps at 1), multiplier stacking with orbs (stacks), leaderboard tagging per skin
- Location: `src/components/game/bird-event.tsx`, `src/components/game/tap-cursor-icon.tsx`, `src/components/game/chicken-game-v2.tsx`, `src/components/game/chicken-skins.ts`, `src/components/game/chicken-svg.tsx`, `src/lib/chicken-audio.ts`, `src/hooks/use-chicken-sounds.ts`, `e2e/chicken-game-v2.spec.ts`, spec `docs/chicken-game-hawk.md`

#### Checklist (screenshots in `~/Desktop/chicken-game-new-designs/4-hawk/`, 1280x800)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Intercept point, nudged only as needed, clear of the score block | pass | `02-grab.png`; state: intercept (641,511) -> settled (774,505), nudge x=+126 (body would overlap the score), y=0; e2e asserts settled = intercept + nudge, chicken centre = anchor |
| 2 | Gripped between the talons, vehicle set aside | pass | `02-grab.png`: rocket vehicle hidden, parked rocket hidden while gripped, chicken hangs under the body between the claws |
| 3 | Facing us, three-quarter view | pass | `02-grab.png` (grab-body asset) |
| 4 | Body axis down-right, head upper-left, tail lower-right | pass | `02-grab.png` (asset keyed with a 20 deg rotation) |
| 5 | Right claw in front, larger, over the chicken | pass | `02-grab.png`, `03-hint-front-talon.png`; e2e: talon-right left of the chicken centre, rendered after the chicken |
| 6 | Left claw staggered up and behind, partly behind the chicken | pass | `02-grab.png`; e2e: talon-left top < talon-right top, rendered before the chicken |
| 7 | Head and gaze down at the chicken | pass | `02-grab.png` |
| 8 | Layering body -> left talon -> chicken -> right talon | pass | DOM order (`BirdLayer part="back"` before the chicken, `part="front"` after) |
| 9 | Same composition for eagle and phoenix | pass (data) | `BIRD_SPECS.eagle/phoenix` carry compose.json numbers; not triggered yet (10 000 / 25 000) |
| 10 | Photoreal cut-outs, transforms only | pass | all layers are `<img>` of the keyed webp frames |
| 11 | Hint X drawn on the target claw, follows it | pass | `03-hint-front-talon.png`, `04-second-talon-hint-label.png`; e2e: X centre inside the talon rect |
| 12 | Arrow head touches the X, cursor at the tail, label next to the arrow | pass | `03`, `04` |
| 13 | Counter attached beside the target talon | pass | `03` ("front claw 0 / 25" left of the front claw), `04` ("back claw 0 / 25" right of the back claw) |
| 14 | Real flight: curved eased path, bank roll + bank frame, wingbeat frames and bob, rear frames on the way out, fade | pass | `01-fly-in-banking.png` (bank frame, rolled), `07-flying-away-turning.png` (bank), `07b-flying-away-mid.png` (away-3q, mid-size), `08-far-away.png` (away-far, scale 0.15) |
| 15 | Same flight system for every bird | pass | `tickBird` is bird-agnostic; frames come from `manifest.json[kind]` |

Other shots: `04a-recoil.png`, `05-look-at-you.png`, `06-freed-hovering.png`, `09-feather-falling.png`, `10-feather-in-bag.png`, `11-hawk-skin.png`.
