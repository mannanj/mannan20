# Chicken Game — Cosmos journey, Jupiter and Martians

Design only (2026-11-02). Source: "Follow-up: cosmos, Jupiter, Martians" in [chicken-game-toss-orbs-hawk-raw.md](chicken-game-toss-orbs-hawk-raw.md). Task: `tasks/task-310.md`. Builds on the shipped escape stages (`src/components/game/escape-stages.ts`, `escape-scenery.tsx`: surf 250, pilot 350, rocket 450, Moon 540), the [eagle/phoenix doc](chicken-game-eagle-phoenix.md), the [hawk doc](chicken-game-hawk.md), the [inventory doc](chicken-game-inventory.md) and the budgets in `tasks/task-309.md`.

## 1. Research: Martian visual references (Q1)

Web search found general support only; it did not verify specific illustrators, so treat everything below as conventions to riff on, not sources to copy. No specific trademarked character is a reference (no Marvin the Martian, no Toy Story aliens, no Mars Attacks, no Bugs-era cartoons).

- Pop-culture tropes (general): green skin, big head, antennae, bubble/fishbowl helmets, ray guns, flying saucers. Worth using only as a vocabulary; combine so the result is not recognizable as one character.
- 1950s pulp covers: exposed glass domes on helmets and cockpits, a ray gun angled across the frame as a diagonal, bold saturated flats, rocky ground, a monstrous or alien figure facing a space-suited human. A comment on a pulp blog notes the recurring "solid dome glass helmet"; a forum post describes pulps building a "visual grammar" later reused by 1950s films. Frank R. Paul painted saucers before the 1947 sightings. Further reading (not yet opened): Rian Hughes, *Rayguns and Rocketships*; Planet Stories / Startling Stories covers. [unverified beyond search snippets]
- H.G. Wells tripods: the novel's fighting machine has a hood-like head holding one operator, three long legs moving by artificial muscle, metallic tentacles hanging below for grasping, a heat-ray and toxic smoke. Warwick Goble illustrated the 1897 Pearson's serial; whether Wells approved is contested between sources. Use as a distant background silhouette only (three stilt legs, hooded head), friendly, never firing.
- NASA Mars palette: JPL says much of Mars looks butterscotch up close, reddish from afar because of airborne dust; approximate true-color rover images suggest a reddish/salmon sky, bluish near the sun at dusk. Olympus Mons is the tallest known mountain in the solar system (about 3x Everest): a very wide low shield, not a spike. Phobos is potato-shaped and heavily cratered (about 27 km), Deimos smaller and smoother (about 15 km). Search did not confirm how the moons look from the surface; draw Phobos large and lumpy, Deimos a small bright dot.

Sources: [pulp helmets blog](https://detritusofempire.blogspot.com/2014/12/pulp-science-fiction-guys-in-helmets.html?m=1), [Rayguns and Rocketships](https://downthetubes.net/?p=129760), [Fighting machine (War of the Worlds)](https://en.wikipedia.org/wiki/Fighting_machine_(The_War_of_the_Worlds)), [Goble on Victorian Web](https://victorianweb.org/victorian/art/illustration/goble/cooke.html), [JPL Mars color](https://jpl.nasa.gov/videos/mars-in-a-minute-is-mars-really-red), [Mars surface color](https://www.Wikipedia.com/wiki/Mars_surface_color). All [unverified]: only search snippets were read, no pages opened.

### Palette (ground and sky)
- Ground: butterscotch `#c98a4b`, rust `#a44a2a`, dark basalt `#4a2a22`.
- Sky: salmon `#e8a27c` at the horizon to dusty rose `#b36a5e`, with a blue-grey glow `#8fa6b8` near the sun.
- Accents: Martian skin/outfit colors below, kept out of the red range so they read on the ground.

### Original Martian concepts (hand-drawn, flat shapes with a rough outline)

1. **Pip, the dome-head scout.** Silhouette: a tall egg head with two short bobbing bead-tipped antennae, a stubby body, thin legs, and a round glass dome helmet that is only a rim and a highlight. Outfit: mustard puffy jumpsuit with a patched round belt buckle. Colors: pale teal skin `#7fd1b9`, mustard `#e0a83a`, cream glass. Idle: antennae sway out of phase, slow blink, weight shift left/right every 2s. Entrance: peeks from behind a rock, the chicken notices, Pip does a shy two-finger wave, then trots over and offers a tiny glowing pebble.
2. **Moss, the wide gardener.** Silhouette: low, wide, bean-shaped with three stalk eyes, no helmet, a big leafy collar. Outfit: rust-orange poncho with a hanging tool belt and a watering can. Colors: lime-olive skin `#9bb84a`, poncho `#c4562a`. Idle: stalk eyes track the chicken independently, waters an invisible plant. Entrance: walks in carrying a seedling, plants it, it sprouts a flower next to the chicken, then Moss bows.
3. **Zap, the saucer pilot.** Silhouette: slim with a visor cap, two coiled antennae and a toy ray gun that fires bubbles. Outfit: silver-lavender flight suit with a chunky fin on the back and tiny saucer badge. Colors: lilac skin `#b79ae0`, silver `#c9d1dc`, orange visor. Idle: spins the ray gun on a finger, blows a bubble that pops. Entrance: a mini saucer wobbles down, beams Zap onto the ground, Zap salutes and shoots a bubble that lands on the chicken as a harmless sparkle.

Recommended: all three appear; a skin look is "Pip" (the most readable in 48px). Open question: which one is the skin art.

## 2. Cosmos journey (starts at 10,000)

### Ordering with the eagle (OPEN)
The eagle is already at 10,000 (`chicken-game-eagle-phoenix.md`). Proposal: **eagle event first, lift-off after.** At 10,000 the eagle event fires as designed. When it resolves (eagle leaves, feather dropped, or the player has wiped it), a latch `eagleDone` lets `cosmos` begin. If the eagle is still on screen at 10,200, force the exit (hard cap so players cannot stall). Alternative: lift-off at 10,000 and the eagle chases the chicken into orbit (cool, but more art and a second hostile in a calm stage). Flagged as open question 1.

### Flow
- The chicken leaves Earth again (or the Moon, if the Moon stage is still the last scenery: the rocket reuses the existing rocket art and `ROCKET_LEG_BOTTOM`). Intro like `rocket` (about 1.6s), then the cosmos backdrop takes over.
- The chicken keeps bouncing off the viewport edges; the existing dodge loop is reused unchanged (squeeze/click scoring, hazards). The backdrop moves independently, driven only by score.
- Planets are passed in order outward from Earth. Skipping Mercury and Venus (they are sunward, wrong direction). Fictional compression is fine.

| Band (score) | Backdrop | Notes |
|---|---|---|
| 10,000-10,600 | Earth orbit: blue limb sinking at the bottom, stars fade in, thin sun glow | Earth shrinks (scale 1 to 0.15) |
| 10,600-11,400 | Moon flyby: grey sphere sliding across at 0.4 parallax speed | Optional reuse of moon art |
| 11,400-13,000 | Mars: rust disc grows then slides off; Phobos/Deimos pass as small bodies | Martians' home; first teaser silhouette of a tripod on the disc |
| 13,000-15,000 | Asteroid belt: scattered rocks parallax at three depths | Rocks are decorative, not hit targets |
| 15,000-17,000 | Jupiter approach: banded orange/cream disc grows to fill the lower half, Great Red Spot, tiny Galilean dots | Brightness ramps for the landing |
| 17,000+ | Jupiter arrival (stage `jupiter`) | See section 3 |

All numbers are starting points (OPEN, tune by play). At the current rate the 17,000 mark means about 7,000 points of cosmos; tune the band widths against the average points per minute.

## 3. Jupiter arrival

**Fiction disclaimer, shown in the design and a code constant comment-free label:** Jupiter is a gas giant with no solid surface. The ground in the game is imaginary, a made-up floating cloud shelf, a dreamy stand-in, not science. Name it in-game "Cloud Meadow" so nobody reads it as real. (The repo bans code comments, so the disclaimer lives here and in the test names.)

- Backdrop: flat banded cloud-top ground in cream/orange/rust stripes with soft wave edges; sky is deep ochre fading to near-black with distant stars; a huge Great Red Spot oval low on the horizon; the Galilean moons (Io, Europa, Ganymede, Callisto) as four dots.
- Martians in the background: a row of small distant figures and a few tripod silhouettes (friendly, slowly strolling), plus a saucer drifting by. They are decoration (not clickable) at 0.35 scale and 25% desaturation to separate them from the clickable foreground friends.
- The chicken lands (a short descent like `MOON_DESCENT_FRAC`), then keeps bouncing off the edges as before.

## 4. Martian friends (foreground, clickable)

- Spawn: every `MARTIAN_SPAWN_MIN_MS`-`MARTIAN_SPAWN_MAX_MS` (proposal 25-45s random), only in stage `jupiter`, plus a rarer cameo (1 per 90s) during the Mars band. Cap `MARTIAN_MAX_ON_SCREEN = 2`. They walk in from a side, wear one of the three outfits, linger 20-30s (idle), wave, then walk off. No spawn while a hawk or eagle event is live, or while a modal/skins panel is open.
- Clicking: one click = one hit. Each Martian has a hit counter `n/100`. Progress is **per Martian type, saved** (`martian-clicks`, localStorage) so players can finish across visits and across different friends (the counter is global, not per walker; otherwise a 30s lifespan makes 100 clicks unreachable).
- Do clicks on a Martian also score? Proposal: **no, they do not score** (they are a collectible chase, not a farm; keeps the x3 skin from being an infinite loop and stops pace-of-play distortion). The Martian clicks still count toward the 100. OPEN question 2 (alternative: +1 each, scored as normal squeezes).
- Click-progress UI: a thin 40px ring under the Martian's feet that fills clockwise per click; a tiny `37/100` label fades in on the first click and fades out 2s after the last. A click pulse (scale 1.0 to 1.08, 120ms) and a heart/sparkle every 10 clicks. Taps behave the same (pointer events, 44px min hit target). Use `data-testid="martian"`, `martian-progress`.
- Reward at 100: the Martian does a joyful hop, hands over a "Martian token"; it flies to the bag with the generic `FlyToBag` (see the inventory doc) and adds `martian-token` (max 1, `action: 'wear-skin'`). The bag action unlocks and applies the `martian` skin.
- Not a friend killer: clicks never hurt them; the Martian giggles.

## 5. Plugging in (code plan; nothing implemented)

- `escape-stages.ts`: extend the union with `'cosmos' | 'jupiter'`; add `{ stage: 'cosmos', threshold: 10_000, introMs: 1600 }` and `{ stage: 'jupiter', threshold: 17_000, introMs: 3400 }` to `ESCAPE_STAGES`. Add `COSMOS_END_SCORE = 17_000`, `cosmosProgress(score) => clamp01((score - 10_000) / 7_000)`. `stageForScore` stays threshold-based; the eagle latch gates `cosmos` in the caller, not in this pure function.
- `escape-scenery.tsx`: `{stage === 'cosmos' && <CosmosSky progress={...} />}` and `{stage === 'jupiter' && <JupiterGround />}` next to the existing four. The `key={stage}` remount on each stage change keeps the intro behaviour. `CosmosSky` takes the progress as a prop; the rAF loop already running should write it as a CSS custom property `--cosmos-p` on the scenery root (no React state per frame, per task-309).
- Parallax and zoom, no new dependencies: 3 to 4 absolutely positioned layers (stars far, planets mid, rocks near), each `transform: translate3d(...) scale(...)` computed from `--cosmos-p` in CSS `calc()`, with `will-change: transform` only on the planets. Planet disks are SVG radial gradients (not filters). Zoom = scale on the planet layer, like the existing rocket zoom (`ROCKET_ZOOM_MS`, `ROCKET_MIN_SCALE`). Stars: one static SVG pattern or a pre-rendered `<canvas>` painted once.
- Per task-309: the hidden `GameScenery` must be unmounted once an escape stage is live, and no `feTurbulence` filter on cosmos layers.
- Martian skin: add `martian` to the skins list with multiplier 3.

### Multipliers
Skins never stack with each other (one worn at a time): hawk x1.25, eagle x2, phoenix proposed x3 (OPEN in the eagle doc), Martian x3. Wearing Martian replaces the others, it does not multiply (not 3 x 2). Skin multipliers do stack with orbs as defined in the hawk doc, with the float score floored on submit (leaderboard accepts an integer 1..1,000,000 only). Note that Martian x3 ties the phoenix at x3; open question 3 asks whether Martian should be above (e.g. x3 vs phoenix x4 for the harder-to-get item) or equal. At x3 the 1,000,000 cap is reachable 3x faster for diehards: confirm the cap remains.

## 6. Performance (task-309 budgets)

- Frame budget 16.7ms desktop; p95 enforced by the perf smoke.
- Cosmos layers: at most 4 full-screen composited layers, no SVG filters, no blur on large areas, planets as gradients; one canvas for stars painted once.
- At most 2 foreground Martians plus 8 background figures (static SVG `<use>` or a single pre-rendered sprite strip with CSS translate); animation by `transform`/`opacity` only; idle loops as CSS keyframes (they are globally allowed in `globals.css`; the project rule prefers Tailwind, but keyframes are an allowed exception).
- Background Martians pause when `document.hidden`; the Martian spawn timer uses the rAF clock or a single `setTimeout` chain (not intervals per Martian).
- Interaction with other load: up to 60 split chickens + 15 cursors may coexist; a Martian spawn is skipped if more than 30 chicken nodes are alive. Number of clickable per-frame state updates: the click counter lives in a ref and writes to React state only when the integer changes.

## 7. Playwright plan (`e2e/chicken-cosmos.spec.ts`)

Use `window.__chicken.boost(n)` and `state().stage` (existing hooks).
1. `boost(10000)`: eagle event appears first; wait for it to resolve (or force exit); `state().stage` becomes `cosmos` after, and never before, the eagle resolves.
2. Walk the bands: `boost` to 10,600, 11,400, 13,000, 15,000 and assert the `data-cosmos-band` attribute on the scenery root (`earth`, `moon`, `mars`, `belt`, `jupiter-approach`); screenshot each.
3. `boost` to 17,000: stage `jupiter`, ground and background Martians present (`data-testid=martian-bg`).
4. Spawn: set the spawn constants fast via a test hook (or `clock.fastForward` with Playwright's clock), assert 1 to 2 `martian` elements and never more than the cap.
5. Click 99 times: `martian-progress` shows 99, no item in the bag; the 100th click adds `martian-token` to `inventory-bag` and the skin is selectable. Persist: reload, the counter survives.
6. Skin multiplier: wear `martian`, click the chicken once, score rises by 3 (with a stubbed leaderboard route); switch to hawk, rises by 1.25-based amounts; assert no stacking.
7. Perf smoke: 10s at score 12,000 and at Jupiter with two Martians; p95 frame delta under the task-309 budget.
8. Martian click does not change score (if open question 2 resolves to "no").
Stub the leaderboard routes (dev hits prod Redis).

## 8. Open questions

1. Eagle vs lift-off order: eagle first then lift-off (proposed), or the eagle chasing into orbit?
2. Do Martian clicks also score (+1 each), or only count toward the 100 (proposed)?
3. Martian multiplier x3 equals the proposed phoenix x3; keep equal, or raise the phoenix?
4. Do the 100 clicks accumulate across all Martians and visits (proposed) or per individual?
5. Bands: are 17,000 and the planet widths right, and should Mercury/Venus/Saturn be included?
6. Which concept is the skin art (Pip proposed), and is the bubble-gun Zap too gun-like for the site's tone?
7. Do background Martians appear on earlier stages (Moon, Mars teaser) too?
8. Does reaching Jupiter end the stages (final), or does anything come after 17,000?
