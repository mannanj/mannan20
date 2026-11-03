# Chicken Game — Bald eagle (10000) and phoenix

Source: "Follow-up" in `docs/chicken-game-toss-orbs-hawk-raw.md`. Tasks: `tasks/task-307.md` (events), `tasks/task-308.md` (bag). Builds on `docs/chicken-game-hawk.md` (state machine, aftermath, fractional points, skins) and `docs/chicken-game-inventory.md`.

## Shared structure: one data-driven bird event

Generalize the hawk machine to `BirdEvent` driven by a config so the three birds are one code path (no duplication):

```ts
type BirdKind = 'hawk' | 'eagle' | 'phoenix';
interface BirdConfig {
  kind: BirdKind;
  triggerScore: number;
  clicksPerTalon: number;
  banner: string;
  focalOffset: { x: number; y: number };   // fraction of viewport added to HAWK_FOCAL
  feather: 'hawk-feather' | 'eagle-feather' | 'phoenix-feather';
  skinId: 'hawk' | 'eagle' | 'phoenix';
  skinMult: number;
  heat: boolean;                            // phoenix talon effects
}
const BIRDS: Record<BirdKind, BirdConfig> = {
  hawk:    { kind: 'hawk',    triggerScore: 2000,   clicksPerTalon: 25,  banner: 'help the chicken escape!', focalOffset: { x: 0, y: 0 },        feather: 'hawk-feather',    skinId: 'hawk',    skinMult: 1.25, heat: false },
  eagle:   { kind: 'eagle',   triggerScore: 10_000, clicksPerTalon: 50,  banner: 'help the chicken escape!', focalOffset: { x: 0.12, y: -0.1 }, feather: 'eagle-feather',   skinId: 'eagle',   skinMult: 2,    heat: false },
  phoenix: { kind: 'phoenix', triggerScore: 25_000, clicksPerTalon: 100, banner: 'help the chicken escape!', focalOffset: { x: -0.1, y: -0.12 },feather: 'phoenix-feather', skinId: 'phoenix', skinMult: 3,    heat: true  },
};
const BIRD_CLICK_GROWTH = 2;   // each bird needs 2x the previous bird's clicks per talon
```
Focal offsets: hawk recedes to the viewport center (0.5, 0.5). Eagle flies "slightly up and to the right" of that point: (0.62, 0.40). Phoenix "a bit to the top left": (0.40, 0.38). Each is a point in `HAWK_FOCAL + focalOffset`. `clicksPerTalon` is applied to both talons (25 -> 50 -> 100).

Trigger order: one bird active at a time; eagle only after the hawk event is `done` (or skipped), phoenix after the eagle; each one-shot per run, same defer rules as the hawk (portal/teleport/ceremony/hyper). If the player jumps past two thresholds in one run (e.g. orbs), queue them: events run in order, each needing the previous `done`.

## Bald eagle (10000 points)

- Same interaction as the hawk: intercept, grab, front talon (50 clicks), recoil, second talon (50 clicks), looks at the player every 5 taps on talon 2, release, hover, calm (chicken stands, free 25 clicks / duration per hawk Q9 constant `BIRD_CALM_MS` shared), restore the snapshot, departure.
- Art: `eagle-svg.tsx`: white head and tail, dark brown body, yellow hooked beak, larger than the hawk (`EAGLE_W/H` ~ 1.2x). Scream: bald eagle (the classic call is a red-tailed hawk dub in film, so the source question carries over, flagged Q1 in the hawk doc).
- Departure: same `birdDeparture`, flies "into" `(0.62, 0.40)`. Receding eagle click rule identical: 25+ clicks (`HAWK_FEATHER_CLICKS` reused, since Mannan said "same number of times") drops the full-size eagle feather, falls, picked up, flies into the bag as `eagle-feather`.
- Eagle skin: tap `eagle-feather` in the bag -> unlock + apply `eagle` skin (bald eagle body type: white head and tail, brown body), each click x2 (while worn).

## Multiplier stacking
Only one skin is worn at a time, so skin multipliers (1.25 / 2 / proposed 3) never stack with each other; they stack with orbs as defined in the hawk doc (fractional points and leaderboard section). Wearing the eagle skin replaces the hawk's 1.25 (it does not become 2.5). Server finding recap: `src/app/api/game/leaderboard/route.ts` accepts only an integer 1..`SCORE_MAX` (1,000,000), no plausibility check, so client floors the float score; see hawk doc.

## Phoenix

Threshold: proposed 25,000 points (**OPEN**, Q1: Mannan did not name one; any score between 10,000 and the practical ceiling works, 25,000 keeps the eagle's x2 period meaningful). Talons need 100 clicks each.

Phases are the hawk's (approach, grab, `right` talon, recoil, `left` talon, release...) with per-talon effects layered on top:

### Talon 1 (the first 100 clicks): slow sizzle, gentle discomfort
- Audio: looping slow sizzle (`playSizzle()`), volume ramps up with `rightClicks / clicksPerTalon`, starts on grab, stops on recoil. New sound: a short loopable sizzle (CC0 candidate to be sourced; none downloaded), plus the phoenix cry on each click (voice pool as hawk).
- Chicken visuals (`chicken-svg.tsx` gets `distress: 0..2` prop): face swaps to a sweating, uncomfortable face (eyes squinted, mouth wavy, one brow up), sweat drops (3-4 `<path>` teardrops) roll down the body from head to belly on a looped 2.4s CSS animation; body gets a faint warm tint (`mixHex(body, '#FF7043', 0.12 * progress)`). Cartoon overheated cues, gentle: tiny steam wisps (2 puffs, low opacity), no flames yet.

### Talon 2 (the next 100 clicks): intense heat
- Heat pulse on the same cadence as the hawk's look: every `BIRD_PULSE_EVERY_TAPS = 5` taps (`leftClicks % 5 === 0`) a wave: an expanding radial gradient ring from the talon (`fire-wave` keyframes, 500ms), a screen-edge warm flash (opacity <= 0.18, not strobing, accessibility), and a short fire puff at the grip. Also a wavy heat-distortion overlay (SVG `feTurbulence` displacement is expensive; use a translucent gradient shimmer instead).
- Face goes to its intense state (open mouth, wide eyes, heavy sweat), sizzle louder and higher, shake amplitude up.
- **Bare-skin circle at the grip:** a circle (radius ~ `BURN_R = 14`% of chicken width) on the body at the grasp point is drawn as an `<ellipse>` of skin color (`#F3C7A0`) over the feathers, with a ragged edge (path with jitter). Feathers around the edge are burned off over time. The burn spot darkens through stages as `leftClicks` grows: skin pink -> red -> brown -> char (`BURN_STAGES = ['#F3C7A0','#E0856B','#9A5B3C','#2B1B14']`), interpolated by `leftClicks / clicksPerTalon`; tiny ember specks and smoke at the late stages.
- **Toasted feathers:** charred feather particles (`ToastFeather`, scorched brown with an orange rim) are emitted from the spot at rate ~1 per click, drifting to the side (random x +-120..260px, slow falling spin, 2.5-4s life if not collected). The player clicks one to collect it: it flies to the bag (`toasted-feather`), up to `TOASTED_MAX = 10` total in the bag (`max: 10` in the item registry). Beyond the cap, clicks on feathers just pop them (no pickup), and the bag tooltip reads "10/10".
- Cap per event: at most 12 toasted feathers alive at once (performance).

### Release and permanent char
- On release the burn spot stops intensifying; chicken drops free; the hover/calm/restore aftermath is identical to the hawk's (snapshot/restore), the bird recedes to the top-left focal point.
- Receding phoenix: 25+ clicks drop a full-size **phoenix feather** (needs a name/value; Q3: does the phoenix drop a feather and skin? Mannan only specified feather+skin for hawk and eagle; assumed yes with a flame-shifting skin `phoenix`, multiplier proposed x3, **OPEN**).
- **Permanent char memory:** at release, record `charByskin[wornSkinId] = { x, y, r, stage: 3 }` where `(x,y)` are in the chicken's local SVG coordinates (viewBox space, not screen), `r` the radius, `stage` the final darkness (always max at release). The skin worn when the burn happened is `skin` at the time of `startBird('phoenix')` (hawk, eagle or classic, etc.).
- Rendering for that skin forever after: the spot is drawn UNDER a feather layer: the bare-skin circle with the char color is part of the body layer; the feather texture/overlay above it uses reduced opacity (`0.55`) clipped to the spot (`clipPath` with the same circle plus a feathered edge) so "the feathers are slightly translucent and the burn visible underneath". Other skins are unaffected (the burn belongs to "this particular skin model you were wearing"). If the player wears a different skin later, no char; if they switch back, the char is there.
- Regrowth: right after release, animate 3-4s from bare skin to translucent feathers (feather particles regrow into the spot) so the player sees the memory forming.
- **Persistence (proposed):** `localStorage['chicken-skin-char-v1']` = JSON `Record<skinId, { x:number; y:number; r:number }[]>` (array allows future burns; Phoenix runs once so one entry normally). Written once at release inside try/catch like the skin key (`chicken-game.tsx` ~791). Not tied to the run, survives reload, and is cleared only by an explicit "reset skins" action (does not exist; OPEN Q4: should it be removable, e.g. by a fire-proof item?). It is read by `chicken-svg.tsx` through a `char?: CharSpot[]` prop passed from the selected skin. It should also be part of the bag HUD save/load if skins are ever exported (they are not today).
- Server/leaderboard: no impact; char is cosmetic.

## Playwright test plan (`e2e/eagle-phoenix.spec.ts`)
Bridge: `setScore`, `forceBird('eagle'|'phoenix')`, `state().bird`.
1. `setScore(9999)` + click -> eagle `grab`; talon needs 50 clicks (49 does not recoil); second talon 50; release; hover; calm; snapshot restore (as hawk 7a).
2. Eagle recede focal point differs from hawk: final bounding box center is up-right of viewport center.
3. 25 clicks on the receding eagle -> `eagle-feather` in bag; tap -> `data-skin="eagle"`; 4 clicks -> +8.
4. Phoenix: 100 clicks per talon; sizzle audio playing during talon 1 (`state().plays` contains `sizzle`), `data-distress` 1 on talon 1 and 2 on talon 2; heat pulse at taps 5,10,...; burn stage increases monotonically (data attribute).
5. Toasted feathers: up to 10 collected, 11th click does not add; bag shows `toasted-feather` x10.
6. After release: `localStorage['chicken-skin-char-v1']` has an entry for the worn skin; reload; wearing that skin shows `[data-testid="char-spot"]`; switching to another skin hides it.
7. Screenshot checks of talon 1 vs talon 2 vs post-release feather overlay.

## Performance
Fire waves and sweat are CSS transform/opacity only. Max alive: 12 toasted feathers, 6 sweat drops, 1 flash overlay. Burn spot is a static SVG group with a CSS color transition (no per-frame React state).

## Open questions
1. Phoenix threshold (25,000 proposed).
2. What collected toasted feathers do: collection only, accessory at 10, or crafting toward the phoenix feather.
3. Does the phoenix drop a feather and give a skin (name, multiplier x3 proposed)?
4. Can the permanent char ever be removed?
5. Should the phoenix's sizzle/heat obey a "reduce effects" accessibility setting? (Recommended yes: flashes are capped and low opacity regardless.)
6. Eagle/phoenix art and sounds: SVG hand-drawn vs assets; scream source.

## Art direction (Mannan, 2026-11-02) — PHOTOREALISTIC birds, not cartoons

Mannan rejected cartoon/SVG birds. The hawk (red-tailed hawk), bald eagle and phoenix must look photo-real:
- Source **real photographs** with a license that allows use on a public site: Wikimedia Commons (CC0 / CC BY / CC BY-SA, with attribution recorded), Unsplash, or Pexels. Mannan's references: a red-tailed hawk banking with wings spread (dorsal view, rufous tail fanned), the same bird soaring head-on with wings fully spread and talons tucked, and a perched hawk side view.
- Cut each bird out to a transparent PNG/WebP locally (e.g. `rembg` in a uv venv), and clean the edges. Store under `public/game/birds/` and record source URL, author and license in `docs/chicken-sounds-sources.md`, or a new `docs/chicken-art-sources.md`.
- Needed poses: (1) wings spread, approaching head-on (fly-in); (2) wings up, legs/talons extended forward (grab / landing pose: the game composites the chicken between the talons, with the right talon in front); (3) a small soaring silhouette for fly-off; (4) wing-flap frames, from 2–3 photos or a subtle CSS skew/rotate of the wing region.
- Animate with transforms only (position, scale, rotate, slight skew for flaps); never redraw the bird as vector art. Talon hit areas are invisible ellipses placed over the photo's talons.
- Phoenix: there is no real photo, so composite a real raptor photo with real fire/ember footage or photo layers (blend modes, glow) so it reads photo-real, not cartoon.
