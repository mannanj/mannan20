# Chicken Game — Hawk Event at 2000 points

Source: `docs/chicken-game-toss-orbs-hawk-raw.md`. Task: `tasks/task-305.md`. Sibling: `docs/chicken-game-ability-orbs.md`.

## Summary

At 2000 points a red-tailed hawk flies in, intercepts the chicken and grabs it in its talons, stopping where it met the chicken (clamped fully on screen). The hawk faces the viewer, body angled to the bottom right, right talon in front and prominent, left talon visible but staggered behind. Banner: "help the chicken escape!". Clicking the front (right) talon 25 times frees the right talon: each click is +1 point and plays a red-tailed hawk scream. Hawk and chicken drift around together. After 25 clicks the hawk recoils, the right talon pulls up to its body, then the left talon is the target (25 more clicks, assumed). Hints escalate on timers. While the left talon is tapped the hawk looks at the player every 5 taps. When freed, the hawk hovers in place, the chicken stands still for `HAWK_CALM_MS` (25 free stationary clicks), then resumes its pre-hawk speed and pattern; the hawk leaves after 5s, receding into a focal point at screen center; 25+ clicks on the receding hawk drop a hawk feather that goes into the shared inventory bag and can become a hawk skin (x1.25). See `## Aftermath` below.

## State model

```ts
type HawkPhase = 'idle' | 'approach' | 'grab' | 'right' | 'recoil' | 'left' | 'release' | 'hover' | 'depart' | 'recede' | 'done';
interface HawkState {
  phase: HawkPhase;
  phaseSince: number;        // performance.now()
  x: number; y: number;      // hawk top-left (chicken is anchored to it)
  vx: number; vy: number;
  interceptX: number; interceptY: number;
  rightClicks: number; leftClicks: number;
  talonHintAt: number;       // when the X+arrow appears for the active talon
  labelAt: number;           // when "click the claw" is added (left only)
  triggered: boolean;        // one-shot per run
  lookedAtTap: number;       // last tap count at which the hawk looked at the player
  recoveryClicks: number;    // clicks on the receding hawk
  feathered: boolean;        // feather already dropped this run
  snapshot: HawkSnapshot | null;
}
type HawkPhase2 = 'hover' | 'calm' | 'depart' | 'recede' | 'gone';
interface HawkSnapshot { speed: number; heat: number; vx: number; vy: number; facing: number; groundTurnAt: number; modeWas: 'flying' | 'ground' }
```
`hawkRef` in `ChickenGameInner`; React state only for `hawkPhase` (render swap) and `hawkClicks` (counter text, updated per click which is a user event, fine). Reset on run reset.

## Timeline and constants

```ts
const HAWK_TRIGGER_SCORE = 2000;
const HAWK_W = 260; const HAWK_H = 220;          // render box incl. talons, tune to art
const HAWK_EDGE_MARGIN = 24;
const HAWK_APPROACH_SPEED = 0.9;                  // px/ms, ~1s sweep
const HAWK_INTERCEPT_LEAD_MS = 450;               // aim at chicken position predicted this far ahead
const HAWK_GRAB_MS = 450;                         // wings flare, talons close, chicken gets pinned
const HAWK_CLICKS_PER_TALON = 25;                 // tunable per talon: HAWK_RIGHT_CLICKS, HAWK_LEFT_CLICKS
const HAWK_HINT_DELAY_MS = 10_000;                // red X + arrow + tapping cursor (both talons)
const HAWK_LABEL_DELAY_MS = 30_000;               // after hint is shown, left talon only: "click the claw"
const HAWK_RECOIL_MS = 700;
const HAWK_DRIFT_SPEED = 0.05;                    // joint motion
const HAWK_RELEASE_MS = 900;
const HAWK_EXIT_MS = 1400;                        // legacy; replaced by the aftermath constants below
const HAWK_BANNER_TEXT = 'help the chicken escape!';
const HAWK_LABEL_TEXT = 'click the claw';
```
Flow:
1. **Trigger**: in `hit()` after `scoreRef.current = next`, if `!hawk.triggered && prev < HAWK_TRIGGER_SCORE <= next && hawk.phase==='idle'` -> `startHawk(now)`. Defer if a portal/teleport/ceremony/hyper is mid-flight (`EVENT_DEFER_CHANCE` pattern: retry next frame until the main chicken is `modeRef==='flying'` and no `portalRef`/`teleportRef.phase==='out'`/`ceremonyRef.phase!=='idle'`). Despawn kids and clones (see orbs doc Q8).
2. **approach**: hawk spawns off-screen on the side with most room, flies on a curve toward the chicken's predicted point `p + v * HAWK_INTERCEPT_LEAD_MS`. Intercept point is then clamped: `x in [M, vw - HAWK_W - M]`, `y in [M, vh - HAWK_H - M]` so hawk AND chicken are fully visible (chicken is positioned at a fixed offset inside the hawk box: held between the talons). The chicken is pulled to that clamped point during the final 150ms (ease), not teleported. Banner appears at `grab`.
3. **grab** (`HAWK_GRAB_MS`): chicken `modeRef` set to `'held'` (new mode), physics frozen; `hit()` on the chicken no longer scores (the chicken body is not clickable during the event, clicks go to talons). Chicken squash/squeak plays once.
4. **right** phase: banner shown, right talon `data-testid="hawk-talon-right"` is the only hit target. Each click: `awardClick` (+1 point, reuses score/heat/tier path; no chicken scream), `playHawkScream()`, talon shakes (CSS transform), 3-4 feathers fall off the hawk. Hawk+chicken drift jointly: velocity vector with wall bounce inside the clamp rect, same `phaseSince`-based wander as `GroundState` turn timers. Moving target makes clicking mildly harder; keep speed low (accessibility).
5. **Hint 1**: `now - phaseSince >= HAWK_HINT_DELAY_MS` and `rightClicks === 0` ... recommended condition: 10s since phase start with fewer than 25 clicks, resets 10s timer on each click (so it only shows if the player is stuck). Show red X over the talon and an arrow with the tapping cursor icon pointing at it (see Assets). Hide on next click.
6. **recoil** at 25 clicks: hawk recoils (translate up/back, rotates -8deg, screech), right talon animates up toward the body (CSS transform on the `<g>`), becomes inert, chicken drops slightly, banner text unchanged. `HAWK_RECOIL_MS`.
7. **left** phase: left talon becomes prominent (moved to front via SVG ordering/translate) and is the only target. No hint at first. After `HAWK_HINT_DELAY_MS` without clicks: X + arrow. After a further `HAWK_LABEL_DELAY_MS` still without a click: add `click the claw` text next to the arrow. Any click resets timers and hides the hints (assumption, Q4).
8. **release** at 25 left clicks: left talon retracts, chicken drops free with a rainbow feather burst (`spawnFeathers`, `spawnShards`), hawk screams once. **Superseded by the follow-up (2026-11-02):** the hawk does NOT fly off immediately; it hovers where it is (see Aftermath). Chicken enters `calm` (below), not `flying`.

## Aftermath (follow-up 2026-11-02; supersedes the old release/exit)

Source: the "Follow-up" section of `docs/chicken-game-toss-orbs-hawk-raw.md`. Shared bird-exit machinery is reused by the eagle and phoenix (`docs/chicken-game-eagle-phoenix.md`): build it once as `birdDeparture(kind)` data-driven by `BIRD_FOCAL_OFFSET`.

### Looks at the player
- During `left` (the 2nd talon): every `HAWK_LOOK_EVERY_TAPS = 5` taps (`leftClicks % 5 === 0`), the hawk head turns to the player's viewpoint (toward the viewer/cursor) for `HAWK_LOOK_MS = 600` and returns. Implement as a `data-look` attribute switching an SVG head group transform. The `right` talon phase does not look (analog for the phoenix in its 2nd talon: heat pulse on the same cadence).
- On the freeing click (`leftClicks === HAWK_LEFT_CLICKS`): one last look at the player (the "look at you after undoing the 2nd claw").

### hover and calm
- On release, `hawk.phase='hover'`: hawk stops drifting and freezes at its current position (`x,y` and `vx=vy=0`), wings idle-flap gently (CSS), the hawk is clickable but nothing yet.
- Snapshot BEFORE the grab (in `startHawk`, not at release): `hawk.snapshot = { speed: speedRef.current, heat: heatRef.current, vx: p.vx, vy: p.vy, facing, groundTurnAt, modeWas }`. The chicken's `modeRef` is `'held'` during the event so `animate` leaves `speedRef` untouched; restore from the snapshot anyway. Restore `snapshot.speed` exactly, not `speedForScore(score)` (the 50 talon clicks and calm clicks raise the score, but Mannan wants the pace it had before the hawk).
- `calm` runs `HAWK_CALM_MS` with `modeRef='calm'` (new mode): chicken stands still at the release position, normal `hit()` scoring is ON (this is the "25 free clicks": the score effect of each click is the usual +1 times the skin multiplier), no movement, no events (orbs, kids, clones, teleport are suppressed). Counter the free clicks: `calmClicks` increments each click.
- When `HAWK_CALM_MS` elapses, `modeRef` returns to the snapshot's mode, `speedRef.current = snapshot.speed`, `heatRef`, velocity and facing restored; the chicken eases from standing to speed over `HAWK_RESUME_EASE_MS` rather than snapping. The pattern (flying path / ground wander turn timers) resumes because those are held in `physicsRef` and `GroundState` untouched.

**FLAG (conflict):** Mannan wrote "waiting for a few minutes, giving you a free 25 clicks". A few minutes of enforced stillness is far longer than 25 clicks needs (25 clicks take ~5-10 s) and feels like a stall; "free 25 clicks" may be the intended unit, not the duration. Constants: `HAWK_CALM_MS = 3 * 60_000` (literal reading, default) and `HAWK_CALM_FREE_CLICKS = 25`. Recommended alternative: end calm at whichever comes first, 25 clicks or `HAWK_CALM_MS`, with `HAWK_CALM_MS = 20_000`. This is Open Question 9; the default stays literal until Mannan answers.

### Departure (the hawk leaves 5s after release)
```ts
const HAWK_DEPART_DELAY_MS = 5000;     // after release, hawk begins to leave
const HAWK_FLAP_EVERY_MS = 2000;       // single wing flap cadence while hovering
const HAWK_BIG_FLAP_AT_MS = 6000;      // 6th second after release: several flaps
const HAWK_BIG_FLAPS = 4;
const HAWK_RECEDE_MS = 10_000;         // shrink to nothing
const HAWK_FOCAL = { x: 0.5, y: 0.5 }; // fraction of viewport (the middle)
const HAWK_FEATHER_CLICKS = 25;        // "at least 25" clicks on the receding hawk
const HAWK_END_SCALE = 0.02;
```
Timeline from release (`t=0`): flap at 2s and 4s (and 0s optional); at `HAWK_DEPART_DELAY_MS=5s` `depart` starts (hawk lifts and begins to move; wings still flap each 2s); at 6s the multi-flap (`HAWK_BIG_FLAPS` quick flaps) plays while the hawk begins slowly flying off; `recede` runs `HAWK_RECEDE_MS` where position lerps from hover point to `HAWK_FOCAL` and `scale` goes 1 -> `HAWK_END_SCALE` with an ease-out curve (fast at first, slowing like a bird going to the horizon), opacity fades over the last 15%. Transform-only (translate + scale), `will-change: transform`, one element. The hawk is rotated to face away (back view art swap at ~40% progress, or just reuse a mirrored shape; art question 7).

Where "5s" and "6th second" overlap: 6s is measured from release too, so the multi-flap begins 1s after the depart starts. Wing-flap cadence = a CSS animation restarted by a class toggle.

### Easter egg: click the receding hawk
- Receding hawk keeps `pointer-events: auto` (hit area padded to min 44px via an invisible circle so a tiny hawk is still clickable).
- Each click increments `recoveryClicks` and scores a normal click (decision: yes, via `awardClick`; flagged Q10), plus a tiny wing flutter. No counter shown (it is a secret).
- At `recoveryClicks >= HAWK_FEATHER_CLICKS` (once per run, `feathered`), spawn a full-size hawk feather at the hawk's current screen position (even if tiny: it appears full size, as a drop). It falls to the ground: `HAWK_FEATHER_FALL_MS = 2200` with a side-to-side flutter (`translateX` sinusoid + rotation), lands at the ground band used by `GroundState`, and then waits, pulsing softly, until the player picks it up. If the hawk fully recedes before 25, the egg is lost for this run (it can still be done next run; flagged Q11 if it should persist).
- Click/tap the landed feather: it flies into the inventory bag (shared component, `docs/chicken-game-inventory.md`) via `flyToBag(from: DOMRect, itemId: 'hawk-feather')`. Item added: `hawk-feather`.
- The feather spawns as an item only if the player does not already own the hawk skin (Q12: or always, since count caps at 1 in the bag).

### Hawk feather -> hawk skin (x1.25)
- Open the bag in `/game` (bag button bottom right); the `hawk-feather` row has a "use" action. Tap it: consumes the feather and unlocks the skin `hawk` (persisted, see below), and applies it immediately. The player can switch back to other skins through the existing skins sheet; the multiplier only applies while the hawk skin is the selected skin ("from that point on per click" is read as: while worn).
- **Skin model finding:** `ChickenSkin` in `src/components/game/chicken-skins.ts` has only colors (`body, bodyDark, belly, comb, mouth, beakTop, beakBottom, wattle, legs`), a `tierBlend` number and an `accessory: 'none'|'visor'|'spikes'|'halo'`. `chicken-svg.tsx` draws one fixed body path, recoloring it (`mixHex(skin.body, tierBody, skin.tierBlend)`) and adding accessory `<g>` overlays. A skin therefore CANNOT change body shape today. To get a "hawk body type base layer", add an optional `bodyShape: 'chicken' | 'hawk' | 'eagle'` (plus `multiplier?: number`, `unlock?: string`, `layers?` for the feather/char overlays) to `ChickenSkin`, and in `chicken-svg.tsx` branch the body/wing/tail/head/beak paths on `bodyShape` (hooked bird silhouette, barred brown/cream underparts, taloned legs, dark belly band). Hawk colors: `body #7A4A2B`, `bodyDark #5B3519`, `belly #E8D9BC`, `comb` none, `beakTop #C9A227`, `legs #D9A92C`, red tail fan `#B5472A`. Keep tier blend low (0.3) so heat/tier tint still reads.
- Skin ids: `hawk` (x1.25). `SKIN_STORAGE_KEY` ('chicken-skin') stays the selected-skin key; add `UNLOCKED_SKINS_KEY = 'chicken-skins-unlocked'` (JSON string[]) in localStorage. The skins sheet lists locked skins greyed with their requirement.

### Fractional points and multipliers
- **Current scoring** (`hit()` at `chicken-game.tsx` ~950): `award` is an integer, `scoreRef.current + award`, `speedForScore(next)`, `tierForScore(next)`, bonus/hyper/teleport awards (`HYPER_BONUS`, `TELEPORT_BONUS`), then ability-orb `awardClick` (task-304) will own this path.
- **Definition:** keep `scoreRef` as a float accumulator, `score = Math.floor(scoreRef.current)` everywhere it is displayed, compared against thresholds (`HAWK_TRIGGER_SCORE`, tiers, orb thresholds, `speedForScore`) and submitted. Add `skinMultRef` (from the worn skin). `awardClick(base)` does `scoreRef.current += base * skinMultRef.current`. Threshold crossing checks use `Math.floor(prev) < T <= Math.floor(next)`. A click with x1.25 gives +1.25: the displayed number advances 1,1,1,2 pattern as the fraction accumulates (1.25, 2.5, 3.75, 5.0). Persist/restore uses the float (no loss), display and leaderboard use floor.
- **Which awards are multiplied:** every click award routed through `awardClick` (normal, hyper burst, teleport bonus, clone clicks, extra cursors, talon clicks, calm clicks). Reason: single path, simplest rule, and the skin is worn only after earning it.
- **Do multipliers stack?** Per-skin multipliers do NOT stack with each other, only one skin is worn at a time (hawk 1.25, eagle 2.0, phoenix proposed, see eagle doc); they DO multiply with the temporary orb effects (Multiply x3 clones each award the skin multiplier; Cursor xN fan-out also), so hawk skin + Multiply x3 is x3.75 per original click. Flagged Q13 (it is easy to cap: `MAX_COMBINED_MULT`).
- **Leaderboard finding:** `src/app/api/game/leaderboard/route.ts` only checks `typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= SCORE_MAX` (`SCORE_MAX = 1_000_000` in `src/lib/leaderboard-store.ts`), plus name regex and a `limitLeaderboard(ip)` rate limit. There is no server-side plausibility validation of scores; the client posts the number (`leaderboard-panel.tsx:155`). Consequences: (1) fractional points MUST be floored client-side before submit or the API 400s; (2) multipliers need no server change to be accepted; (3) the board is trivially forgeable already, so multipliers add no new exposure; (4) there is a design question that scores with x2 eagle skin are not comparable with x1 scores (Q14: tag the entry with `skin`/`mult` or keep a single board). If a tag is wanted, `Entry` is `{ name, score }` and the submit goes through `callPortfolioState('/v1/scores/submit')`, so it needs a state-worker change (see the memory note on state worker kinds). Paused play will need a separate board anyway (`tasks/task-306.md`), which would be the moment to segment by skin as well.
- Max reachable score with multipliers stays well under `SCORE_MAX`? At x2 and orbs, 1,000,000 can be reached in-run; note the cap clamps rather than rejects only if the client clamps: client must `Math.min(floor, SCORE_MAX)`.

## Rendering

- New `src/components/game/hawk-svg.tsx` (hand-drawn inline SVG, same style as `chicken-svg.tsx`): viewBox facing viewer, body angled toward bottom right, layers: tail/wings, body, head with intent eyes, left talon group `#talon-left` (behind, offset up and left), right talon group `#talon-right` (front, larger, drawn last). Each talon is a `<g>` with an invisible oversized `<circle>` hit area (min 56px) and `pointer-events` on only the active one; props `activeTalon: 'right'|'left'|null`, `onTalonClick`.
- Chicken held in the talons: reuse the main `ChickenSvg` DOM node at the anchor position (pose: slight rotation, no wings flap, mood `'scared'` if available in `moodEyes`).
- Banner: top-center DOM text, Tailwind, same slot as the `Squeeze the chicken` caption (`top-[225px]`); minimal per feedback_no_navigating_text (one line only).
- Hint overlay: red X (two strokes, absolute positioned over the active talon) + curved arrow SVG ending at the talon + tapping-cursor icon at the tail of the arrow (with its own tap animation). Fixed positions computed from hawk box + talon offset constants. All placed in one container `data-testid="hawk-hint"` that follows the hawk each frame via the same ref-driven transform.
- Motion: hawk container and chicken moved in `animate` through a single `hawkElRef` transform. No per-frame `setState`.

## Hooks into the existing loop

- `chicken-game.tsx`:
  - `hit()` (~950): trigger check; early-return branch if `hawkRef.phase` is held/active so the chicken body does not score.
  - `awardClick` (extract from `hit`, shared with orbs doc): used by talon clicks.
  - `animate` (~1185): add `updateHawk(ts, dt)` beside the hyper/teleport/scramble/visit blocks; while hawk phase is active, skip ground-wander, edge-special (portal/wrap), teleport, scramble, visit, jump (`GroundState`, `EDGE_*`, `TELEPORT_*`, `SCRAMBLE_*`, `VISIT_*`, `JUMP_*`) scheduling and push their `nextAt` forward by the event duration.
  - JSX (~2056): render `<HawkSvg>` wrapper after the chicken element; chicken element transform comes from hawk anchor when `modeRef==='held'`.
  - Bridge (`ChickenBridge`, ~379): add `forceHawk()`, `setScore(n)`, `state().hawk = { phase, rightClicks, leftClicks, x, y, hintVisible, labelVisible }`.
- `src/lib/chicken-audio.ts`: add `HAWKS: SoundDef[]` = `[{ key: 'hawk', file: 'red-tailed-hawk.mp3', volume: 0.8 }]` with the same `loadWithFallback` (R2 first, local fallback) and a `playHawk(): ScreamResult | null` method modeled on `playScream`; add a `SoundEvent` type `'hawk'` for `recordPlay`. Plays on every talon click: use a Howl pool (e.g. 3 voices) and a min gap of ~60ms so 25 fast clicks do not clip; slight random `rate` 0.95-1.05.
- Upload: place `red-tailed-hawk.mp3` in `public/sounds/chicken/`; `scripts/upload-chicken-sounds.mjs` already uploads every `*.mp3` there to R2 `sounds/chicken/`. Keep clip <= 2.5s, mono, ~64-96 kbps, trim silence.
- `SoundLoader` (`sound-loader.tsx`) progress should include the new file so first hawk click has no latency.

## Assets (scouting, nothing downloaded or integrated)

### Tapping-cursor icon (Sun Signal)
- File: `/Users/manblack/Documents/sun/frontend/app/components/RightClickHint.tsx`
- Component: default export `RightClickHint({ textColor, touch, left, top, label, testId })`. Draws a mouse whose right button presses on a loop (keyframes `rightClickPress`, `rightClickRipple`); on touch it becomes a fingertip with a fill ring (`holdHint*`). It is a fixed-position overlay with its own `<style>` block and `data-rch` attribute.
- Reuse plan: do not import across repos. Copy only the mouse SVG plus the press/ripple keyframes into a small `src/components/game/tap-cursor-icon.tsx` (`TapCursorIcon`) with no fixed positioning, so it can sit at the arrow tail. Note: the mannan20 CLAUDE.md says no comments in code, so strip the file's comments when copying.
- Copy of the Sun app also exists in other clones (`sun-signal-schedule` not checked; not needed).

### Red-tailed hawk scream, candidates (Mannan picks; none downloaded)
Mannan asked for a YouTube source. YouTube audio has no blanket reuse license; the upload would be personal/unlicensed use unless the video is marked Creative Commons. Verify each before picking.
1. YouTube, "Red Tail Hawk Scream" (DrJohnHammond, ~2.5M views): https://www.youtube.com/embed/77_oa_Cyw3g (the search listing also named it as the most-watched). License: standard YouTube license (not verified). Duration: not verified.
2. YouTube, "Red tailed Hawk SCREAM [No Narration]" (Arizona recording, several screams, 2022): https://www.youtube.com/watch?v=mBEm094cHuY . License: standard YouTube (not verified). Duration: not verified. Best for realism, no voice-over.
3. YouTube, "The Real Red Tailed Hawk Call" (classic "kee-eeeee-arr" scream): https://www.youtube.com/watch?v=BA7GG0nrpKs . License and duration not verified.
4. License-safe: Freesound "R30-34-Red Tailed Hawk.wav" by craigsmith, **CC0**, about 15s, three calls, vintage Hollywood effect so possible noise: https://freesound.org/people/craigsmith/sounds/479610/ . Trim one call to ~2s.
5. Others seen but license unconfirmed or attribution needed: freesoundslibrary.com "Red Tailed Hawk Call" is CC BY 4.0 (credit required): https://www.freesoundslibrary.com/red-tailed-hawk-call/ ; Uppbeat "Red tailed hawk screech" (royalty-free platform, terms apply): https://uppbeat.io/sfx/red-tailed-hawk-screech/168420/56805 ; Orange Free Sounds claims public domain: https://orangefreesounds.com/red-tailed-hawk-sound/ .
Recommendation: use the CC0 Freesound clip (candidate 4) in production, since the file ships from a public R2 bucket. If Mannan prefers a YouTube one, use `yt-download` locally and accept the licensing risk.

## Performance limits

- One hawk, one chicken: two SVG trees. Hint overlay is 3 small elements. No cursor-multiplier interaction needed: extra cursors from the orbs may click the talon; fan-out (max 15 cursors) must count each overlapping cursor as a click (25 clicks free the talon faster) - or suppress extra cursors during the hawk event (Q5). Click cost: 15 geometry tests.
- Scream pool: <= 3 concurrent voices, 60ms min gap.

## Playwright test plan (`e2e/hawk.spec.ts`)

Via `__chicken` bridge: `setScore(1999)`, `forceHawk()`, `state().hawk`.
1. Trigger: `setScore(1999)`; one click -> `state().hawk.phase` leaves `idle`; `data-testid="hawk"` visible; banner text equals "help the chicken escape!".
2. On-screen clamp: for viewport sizes 1280x720 and 390x844, after `grab` both `hawk` and `chicken` bounding boxes are within the viewport. Force chicken near each corner by `setPosition` debug hook (add `placeChicken(x,y)`) to test clamping.
3. Right talon: click `hawk-talon-right` 25 times (`click({ clickCount })` or loop) -> score +25, `plays` contains 25 `hawk` events; left talon is not clickable before recoil (click does nothing).
4. Hint: with clock control (`page.clock`), advance 10s with no click -> `hawk-hint` visible with X and arrow; click once -> hidden.
5. Recoil: after 25th click phase = `recoil` -> `left`; right talon transform differs (pulled up).
6. Left talon: no hint at t=0; hint at 10s; label "click the claw" absent at 39s, present at 41s (10s + 30s).
7. End: 25 left clicks -> phase `release` -> `hover`; hawk position unchanged for the calm window; chicken `calm` (does not move) and scores on click; during `left`, `data-look` toggles at taps 5,10,15,20,25.
7a. Calm resume: with `page.clock`, after `HAWK_CALM_MS` the chicken's speed, heat and mode equal the pre-hawk snapshot (`state().hawk.snapshot`), not `speedForScore(score)`.
7b. Departure: wing flaps at 2s intervals, multi-flap at 6s, `recede` scale decreases monotonically to < 0.05 over ~10s; hawk gone, phase `done`.
7c. Easter egg: 25 clicks on `hawk-receding` -> `hawk-feather` appears, falls, lands; click -> flies into `inventory-bag`; `inventory` contains `hawk-feather` x1 (persists across reload). 24 clicks drop nothing.
7d. Skin: tap the feather in the bag -> skin `hawk` applied, `data-skin="hawk"`, `localStorage['chicken-skins-unlocked']` has `hawk`; 4 clicks raise `score` by 5 (1.25 each, floored display 1,2,3,5); leaderboard submit sends an integer.
7e. Skin switch back to Classic -> multiplier 1.
8. Hawk never re-triggers on further clicks past 2000; reload resets.
9. Chicken body click during the event does not score.
10. Screenshot pose check (facing viewer, body to bottom right, right talon in front).
11. Regression: `chicken-game.spec.ts` passes.

## Open questions

1. After the left talon is freed: recommended default is release plus hawk exit with a feather burst (above). Alternatives: hawk grabs again, chicken becomes a boss reward. Confirm.
2. Does the left talon need 25 clicks too (assumed) and does escaping award a bonus (none assumed)?
3. Do the hint timers reset on each click (assumed: yes, only when stuck) or run from phase start?
4. Left talon: does "no hint at first" mean the 10s timer starts at the beginning of the left phase (assumed)? And the label timer starts when the X appears.
5. Should extra cursors (orbs) and clones be disabled during the event?
6. Scream: which source from the list; one clip for every click vs two or three variants.
7. Hawk art: hand-drawn SVG (planned) or an illustrated asset from Mannan?
8. Is 2000 a one-shot per run, or does the hawk recur every N points?
9. Calm duration: literal "a few minutes" (`HAWK_CALM_MS = 180000`) vs 25 free clicks (end at 25 clicks or 20s). Which?
10. Do clicks on the receding hawk score? (assumed yes, through `awardClick`.)
11. Does the hawk feather persist if missed in-run, or is the egg once per run?
12. If the player already owns the hawk skin, does the feather still spawn (stackable curio) or not?
13. Cap combined multiplier (skin x orbs)?
14. Separate leaderboard (or tag) per skin multiplier? Server has no score validation, so tagging is trust-based.

## Art direction (Mannan, 2026-11-02) — PHOTOREALISTIC birds, not cartoons

Mannan rejected cartoon/SVG birds. The hawk (red-tailed hawk), bald eagle and phoenix must look photo-real:
- Source **real photographs** with a license that allows use on a public site: Wikimedia Commons (CC0 / CC BY / CC BY-SA, with attribution recorded), Unsplash, or Pexels. Mannan's references: a red-tailed hawk banking with wings spread (dorsal view, rufous tail fanned), the same bird soaring head-on with wings fully spread and talons tucked, and a perched hawk side view.
- Cut each bird out to a transparent PNG/WebP locally (e.g. `rembg` in a uv venv), and clean the edges. Store under `public/game/birds/` and record source URL, author and license in `docs/chicken-sounds-sources.md`, or a new `docs/chicken-art-sources.md`.
- Needed poses: (1) wings spread, approaching head-on (fly-in); (2) wings up, legs/talons extended forward (grab / landing pose: the game composites the chicken between the talons, with the right talon in front); (3) a small soaring silhouette for fly-off; (4) wing-flap frames, from 2–3 photos or a subtle CSS skew/rotate of the wing region.
- Animate with transforms only (position, scale, rotate, slight skew for flaps); never redraw the bird as vector art. Talon hit areas are invisible ellipses placed over the photo's talons.
- Phoenix: there is no real photo, so composite a real raptor photo with real fire/ember footage or photo layers (blend modes, glow) so it reads photo-real, not cartoon.

## Grab positioning — Mannan's words (verbatim) and the acceptance checklist

> "after 2000 points have a flying hawk come in and come to and grab your chicken, in its claws. have it stop at the point at which it intercepted the chicken, but make sure the spot is one where the chicken and hawk are fully visible on screen. i imagine the hawk coming in and grabbing and orienting itself to our view by being facing us its body facing bottom right, its right claw in the front and prominently visible, its left [claw] also visible but a bit staggered and behind the front right claw. its target and point of focus is the chicken."

The first concept mockup (2026-11-02) failed every point: the hawk was perched on the rocket, square to the camera, both claws identical, chicken not gripped, overlapping the score. The composition must pass ALL of these, checked on a screenshot before it is shown to Mannan:

1. **Intercept point**: the hawk flies in, meets the chicken where the chicken is, and stops there. It does not teleport or move to a preset spot. The stop point is then nudged only as much as needed so the whole hawk and the whole chicken are inside the viewport, with a margin, and clear of the score/label block at top center.
2. **Gripped**: the chicken is held IN the talons, hanging just below and in front of the hawk's body. Any vehicle is gone or set aside, so the chicken itself is what's gripped and is fully visible.
3. **Facing us**: three-quarter view, chest toward the viewer; NOT a profile and NOT a symmetric front-on spread.
4. **Body toward bottom-right**: the body axis tilts down-right, about 30–40° from vertical, head upper-left, tail lower-right of the body.
5. **Right claw in front, prominent**: the bird's right talon is nearest the viewer, larger, and drawn IN FRONT of the chicken, wrapped around it.
6. **Left claw staggered behind**: the left talon is also visible, but offset up and behind the right one, partly behind the chicken (layered behind it).
7. **Focus on the chicken**: the head and gaze point down at the chicken.
8. **Layering**: wings and body behind; then the left talon; then the chicken; then the right talon on top.
9. **Same composition** for the bald eagle and the phoenix.
10. **Photoreal** (see Art direction): real cut-out photos, transformed, never vector cartoons.
11. **Hint X on the claw itself**: the red X is drawn ON the target talon (the front-right one first, the back-left one second), anchored to it and moving with it every frame. It is never a fixed screen position beside the bird. (Mockup failure: the X floated beside the rocket, away from both claws.)
12. **Arrow to that claw**: the arrow's head touches the X / target talon and follows it as the bird moves. The tapping-cursor icon sits at the arrow's tail, and the "click the claw" label (after 30s) sits next to the arrow, not covering the bird or the chicken.
13. **Counter**: the claw counter ("front claw 3 / 25") is attached near the target talon, not at a random offset.

## Flight realism — Mannan's words (verbatim, 2026-11-02)

> "when the hawk is flying that sohuld look liek a real hawk turning flying away etc not jut some silly cartoon fixed one also phoorealistic same style patterns introduce for the other birds"

14. **Real flight, not a fixed sprite.** Fly-in, carrying, and fly-off must read as a real hawk: banking turns (roll into the turn), wingbeats with the wings actually changing shape (several real photo frames: wings up, level, down; a gliding frame), and turning away from the camera on the fly-off. Switch to rear and three-quarter-away photo frames as it recedes, never just one front-facing image shrinking. Use eased paths (curves, not straight lines), slight altitude bob per wingbeat, and a shadow or atmospheric fade as it recedes into the focal point.
15. **Same pattern for every bird.** The eagle and phoenix reuse the same flight system (frame sets plus path plus banking), each with its own photo set.
