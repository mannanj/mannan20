### Task 307: Chicken Game — Bald eagle & phoenix (v2 only)
- [x] One data-driven bird machine: `BIRD_SPECS` + `BIRD_ORDER`, `queueBirdsForScore` / `queueBird` / `nextBird` queue events in order (hawk 2000, eagle 10,000, phoenix `BIRD_TRIGGER_SCORE.phoenix = 25_000`), one at a time, each once per run, waiting while the chicken is split, held, in a portal or teleport
- [x] Bald eagle at 10,000: 50 clicks per talon, same grab composition, hints, look-at-you, calm and free clicks; fly-off focal `(0.62, 0.40)` (up-right of the hawk's centre); 25 clicks on the receding eagle drop the photoreal eagle feather -> `eagle-feather` -> `eagle` skin x2
- [x] Phoenix at 25,000: 100 clicks per talon; fly-off focal `(0.40, 0.38)` (top-left); 25 clicks drop the phoenix feather -> `phoenix-feather` -> `phoenix` skin x3
- [x] Phoenix talon 1: Web Audio sizzle loop (`EffectsSynth.sizzle`, volume and pitch rise with progress), `distress=1` face (squint, raised brow, wavy mouth), 3 realistic sweat drops rolling down the body, 2 steam wisps, faint warm tint
- [x] Phoenix talon 2: `distress=2` face, 6 heavier sweat drops, heat pulse every `BIRD_PULSE_EVERY_TAPS = 5` taps (photoreal fire puff at the grip, screen-blended, plus a screen-edge warm flash capped at `FLASH_MAX_OPACITY = 0.18`), heat shimmer over the chicken, bare-skin circle at the grip darkening through pink -> red -> brown -> char (`BURN_STAGES`) with ember specks, toasted feather particle per tap (12 alive max) drifting to the side, clickable; collected into the bag as `toasted-feather`, capped at `TOASTED_MAX = 10`
- [x] Permanent char: recorded at release for the worn skin id in `localStorage['chicken-skin-char-v1']`, rendered under a body-coloured feather layer at 0.55 opacity (`char-spot` / `char-feathers`), feathers regrow over `REGROW_MS = 3500` after release, other skins unaffected
- [x] Multipliers apply through the same floored-score path as the hawk; only the worn skin's multiplier applies
- [x] Assets (4 x $0.067 = $0.27): eagle feather, phoenix feather, toasted feather, fire puff; keyed with `scripts/birds/key.mjs` (fire via luminance alpha); logged in `scripts/birds/budget.json`; sources in `docs/chicken-art-sources.md`
- [x] Bridge: `forceBird('eagle' | 'phoenix')`, `state().bird` gains `kind, queue, finished, heat, pulses, burn, toastedAlive, toastedSpawned`
- [x] Playwright: 5 cases in `e2e/chicken-game-v2.spec.ts` ("chicken game v2 eagle and phoenix events"); `chicken-game-v2.spec.ts` + `chicken-game.spec.ts`: 89 passed, 3 skipped (pre-existing skips); `bunx tsc --noEmit -p .` clean
- Location: `src/components/game/bird-event.tsx`, `src/components/game/chicken-game-v2.tsx`, `src/components/game/chicken-svg.tsx`, `src/components/game/chicken-skins.ts`, `src/lib/chicken-audio.ts`, `src/hooks/use-chicken-sounds.ts`, `src/components/inventory/items.ts`, `src/components/inventory/item-art.tsx`, `src/app/globals.css`, `public/game/birds/{eagle,phoenix,fx}/`, `scripts/birds/{jobs,generate,key}.mjs`, `e2e/chicken-game-v2.spec.ts`

#### Proof: `/Users/manblack/Desktop/chicken-game-new-designs/6-eagle-phoenix/`

| # | Checklist item (docs/chicken-game-hawk.md) | Eagle | Phoenix |
|---|---|---|---|
| 1 | Intercept point, nudged only to fit, clear of the HUD | pass (01) | pass (05) |
| 2 | Chicken gripped in the talons, vehicle set aside | pass (01) | pass (05, 05b) |
| 3 | Facing us, three-quarter | pass | pass |
| 4 | Body toward bottom-right, head upper-left | pass | pass |
| 5 | Right claw in front, prominent, over the chicken | pass | pass |
| 6 | Left claw staggered up and behind | pass | pass |
| 7 | Gaze down at the chicken | pass | pass |
| 8 | Layering wings/body, left talon, chicken, right talon | pass | pass |
| 9 | Same composition as the hawk | pass | pass |
| 10 | Photoreal cut-outs, no vector birds | pass | pass |
| 11 | Red X drawn on the target claw, follows it | pass (02) | pass (same code path) |
| 12 | Arrow head touches the X, tap cursor at the tail | pass (02) | pass |
| 13 | Counter attached beside the target talon ("front claw 0 / 50", "back claw 45 / 100") | pass (01) | pass (06) |
| 14 | Real flight: bank/3q/far frames, eased path, shrink into the focal point | pass (03, up-right of centre) | pass (08, top-left of centre) |
| 15 | Same flight system for every bird | pass | pass |
| P1 | Talon 1: sizzle + sweating face + sweat drops + steam | — | pass (05b; drops are small at the 70px chicken, readable in the close-up) |
| P2 | Talon 2: fire pulse every 5 taps, warm flash, shimmer | — | pass (06) |
| P3 | Bare-skin circle at the grip, darkening to char | — | pass (06b) |
| P4 | Toasted feathers fly aside, collectible, capped at 10 | — | pass (06, 07; cap covered by test) |
| P5 | Char persists per skin across reload, under translucent regrown feathers | — | pass (09, 09b; reload covered by test) |
| S | Skins: eagle x2 (04), phoenix x3 (10) | pass | pass |

#### Decisions for Mannan
- Phoenix threshold is the doc's proposed 25,000 (`BIRD_TRIGGER_SCORE.phoenix`); change the constant if you want another number.
- Phoenix drops a feather and a `phoenix` skin at x3, as the doc proposed.
- Eagle and phoenix talon clicks reuse the hawk scream pool (no licensed eagle/phoenix cries sourced); the sizzle is synthesized, not a clip.
- The char is never removable (no fire-proof item exists); it is cosmetic only and keyed by skin id.
- Collected toasted feathers have no use yet (collection only, 10 max); a crafting use is open.
- Asset budget: $0.27 spent of the $0.60 allowance; `scripts/birds/budget.json` cap raised to 3.60 so the generator's stop line (now read from the file) allows it.

#### Follow-up (sizes, connected talons, smoothness, swaps) — round log

Sizes now hawk 110 / eagle 120 / phoenix 150 px (`BIRD_SPECS[kind].bodyWidth`), chicken 70 px. Talon layers and the chicken offset are laid out relative to the bird body (`TalonLayout.h/dx/dy` in body units, `chickenOffset`), so the leg emerges from the belly and the foot wraps the chicken's head and shoulders at every size. Separate invisible talon hit squares (`bird-talon-hit-right/left`, >= 56 px, never overlapping; X, arrow and counter anchor to them). Flight frames are placed by a normalized span (`spanRect`: the frame's longer side = the bird's span) and crossfade through a second layer (`bird-flight-prev`, 140 ms), hover bob starts at zero on release, recoil lift is eased in-out, look-at-you crossfades instead of toggling. Phoenix re-rendered to the golden-plumage reference (grab body + both talons + 6 flight frames, 9 x $0.067 = $0.61, logged). Proof: `/Users/manblack/Desktop/chicken-game-new-designs/6-eagle-phoenix/v2/r1..r4/*-sheet.png` (fly-in, grab, hint, recoil x4, back hint, last tap, release x4, recede swaps x6, skin).

| Round | Issues found | Fixes |
|---|---|---|
| r1 (hawk, eagle) | Talons sized to the chicken towered above the 110/120 px body, detached; lifted claw floated over the head; feather litter from calm clicks; eagle skin muddy under tier tint | Body-relative talon layout and chicken offset; tuck 35%/-35deg; no feather emission while a bird is busy; eagle/phoenix `tierBlend` 0.08 and a white eagle head |
| r2 (all three) | Hint arrow tail flipped above and crossed the wing; toasted feathers oversized and piling; back-claw counter grazed the tail; dark duplicate bird confirmed gone (look crossfade) | Arrow tail on the outer-lower side of the target talon; toasted 0.34x chicken width; back counter gap doubled |
| r3 (all three) | Phoenix only: HUD avoidance pushes the 150 px bird down so the arrow flipped above the wing again; toasted feathers still lingered | Vertical flip replaced by a horizontal tail beside the talon; toasted life 1.6-2.8 s |
| r4 (phoenix) | Nothing broken | — |

Sweep notes: no flicker at swaps (prev layer hidden once the crossfade ends, asserted in e2e), no halos on the new phoenix key, z-order body < left talon < chicken < right talon kept, banner stays in the top slot, no clipping (settle clamp includes the talon rects). The parked rocket overlapping the score is the other agent's.
