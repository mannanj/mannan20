# Floating Chicken Game — Game Logic

The source of truth for how the `/game` chicken behaves. Code lives in `src/components/game/`
(`chicken-game.tsx` = state + rAF loop, `chicken-svg.tsx` = the sprite, `chicken-tiers.ts` =
stage data + helpers, `game-scenery.tsx` = backgrounds). Audio is in `src/lib/chicken-audio.ts`
+ `src/hooks/use-chicken-sounds.ts`.

## Goal & loop

The chicken starts **on the ground**, meandering the landscape and occasionally bending over to
graze and peck (`mode: 'ground'` — slow wander, pause-and-turn, peck-bob rotation toward its facing
side). The **first click launches it** into flight (`mode: 'flying'`) and the classic loop begins:
click it to score. Each click screams, squashes it like a rubber toy, sheds feathers, and nudges
its evolution. The chicken gently flees the cursor, so catching it is the game. Designed to be
**easy and toy-like** early, with real speed (and rare chaos modes) in the late stages.

## Scoring & stages

Score = total successful clicks. The chicken evolves through 5 **stages**, each held for ~30 clicks
so a form has time to breathe before the next evolution (`chicken-tiers.ts > TIERS`):

| Stage | Name         | Unlocks at | Body      | Base face   | Lightning      |
|-------|--------------|-----------:|-----------|-------------|----------------|
| 0     | Yard Bird    | 0          | yellow    | calm        | none (intro)   |
| 1     | Azure Comet  | 30         | blue      | determined  | blue, rare     |
| 2     | Jade Tempest | 64         | green     | determined  | blue→red       |
| 3     | Crimson Fury | 100        | red       | angry       | red            |
| 4     | Golden God   | 140        | gold      | ascended    | red→white      |

`tierForScore`, `tierProgress`, and `morphForScore` derive stage, in-stage progress (0–1), and the
color-morph amount. Body color **morphs continuously** toward the next stage's color across the
stage (so score 47 is visibly teal between blue and green), then snaps on evolution with a flash +
riser sound + shard burst.

## Difficulty (easy start, real late-game speed)

Effective speed per frame = `BASE_SPEED × speedForScore(score) × mercy × hyperFactor`.

- `BASE_SPEED = 0.25`, `MIN_SPEED = 0.15` (px/frame at 60fps).
- `speedForScore(score) = (1 + min(score,180) × 0.011) × TIER_SPEED_BUMP[tier]` with per-stage
  bumps `[1, 1.12, 1.28, 1.45, 1.65]` → ~1.0 at start, ~4.1 at Golden God. Late stages fly
  **~2.5× faster** than the old cap (still far below the original twitchy tuning).
- Cursor avoidance is light: `AVOIDANCE_RADIUS = 110`, `AVOIDANCE_STRENGTH = 0.08`. The chicken
  eases away from the pointer but never bolts.
- Per-frame travel is clamped (`MAX_FRAME_TRAVEL = 130px`) so hyperspeed can't tunnel walls.

### Hyperspeed bursts (rare, score ≥ 30, flying)

Every ~75–225s the chicken erupts for `HYPER_DURATION_MS` (3s) at **10–20×** speed, then sulks at
0.3× for 3.5s before normalizing. Catching it mid-burst pays `HYPER_BONUS = 100` points (shown as
a rising "+100" caption) and ends the burst immediately — one reward per burst.

### Teleportation (rare, score ≥ 64, flying)

Every ~40–120s the chicken blinks across the screen (≥30% of the diagonal): vertical light
streaks mark the departure and arrival points, the sprite vanishes for `TELEPORT_OUT_MS` (120ms),
and ghosts appear — sometimes a faint **pre-echo** at the destination (50%), usually an
**after-image** at the origin (85%), and sometimes 2–3 **decoy after-images** (40%) with only one
true chicken among them. When decoys are up, clicking the real chicken within
`TELEPORT_BONUS_FRAMES = 5` frames of arrival pays `TELEPORT_BONUS = 5` per click.

### Mercy (anti-frustration)

If the chicken goes unclicked it slows down so you can catch up (`mercyTargetFor`):

- Full speed (mercy = 1) for the first `MERCY_DELAY_MS` (5s) after the last hit.
- Then eases down over `MERCY_RAMP_MS` (10s) to `MERCY_FLOOR` (0.4) via a smoothstep.
- A hit recovers mercy gradually (`MERCY_RECOVERY_PER_MS`), not instantly.
- Below `MERCY_CAPTION_THRESHOLD` (0.7) the caption "the chicken grows smug… and slow" fades in.

## Faces / moods

The eyes are driven dynamically (`moodEyes(score, heat)` in `chicken-tiers.ts`), not just by stage:

- **Base** mood comes from the current stage (calm → determined → determined → angry → ascended).
- **Heat** = a hot-streak meter. Each click adds `HEAT_PER_CLICK` (0.22, capped at 1.4); it decays
  `HEAT_DECAY_PER_MS` (0.0006/ms ≈ 0.6/s). Sustained rapid clicking pushes the face up the ladder
  (calm → determined → angry → furious); casual clicking does not. It cools back in ~2s.
- **Pre-transition**: in the last 20% of a stage's progress the face bumps up one notch
  (anticipation of evolving).
- Stage 4 (Golden God) always shows the transcendent "ascended" eyes.
- Expression ladder: `calm < determined < angry < furious` (`ascended` is special to stage 4).

## Flight, wings, self-righting

The chicken should read as **flying**, not tumbling (`chicken-game.tsx` rAF):

- It stays **upright**. Rotation is a torsional spring toward 0:
  `rv += (−rotation·SPRING − rv·DAMP)·dt; rotation += rv·dt` (`ROTATION_SPRING = 0.02`,
  `ROTATION_DAMP = 0.16`). Disturbances decay back to upright in ~1s.
- **Rare** spin only: ~1-in-4 wall bounces (`SPIN_BOUNCE_CHANCE = 0.25`) impart a spin burst
  (`SPIN_BOUNCE_STRENGTH = 13`); the spring then visibly rights it.
- A gentle **bank** (`MAX_BANK = 10°`, lerped) leans into horizontal travel; a sine **wobble**
  (`±3°`) reads as hover.
- **Wings** (`chicken-svg.tsx`) flap via CSS keyframes (`chickenFlapLeft/Right` in `globals.css`),
  pivoting at the shoulder (`transform-box: view-box`). Wings use a derived darker fill + ink
  outline so they read at every stage.
- **Emotion-driven flapping** — the flap reflects what the chicken is doing, set from the rAF via
  `--flap-ms = FLAP_BASE / ((FLAP_SPEED_FLOOR + speed) × agitation)` where `agitation = 1 + heat ×
  FLAP_AGITATION`:
  - Smug / idle (mercy low) or cruising slowly → slow, lazy flaps (~520ms).
  - Faster travel → brisker flaps.
  - Hot streak / angry / furious → fast flaps; when the face is `angry`/`furious` the wings also
    swing **wider** (an `agitated` class swaps in the bigger `chickenFlap*Hard` keyframes).
  - Evolving spikes a brief excited flutter (`EVOLUTION_HEAT` heat bump on transition).
- **Facing**: the sprite mirrors (`scaleX(-1)`) to face its travel direction, with a deadzone
  (`FACING_DEADZONE = 0.25`) so near-vertical motion doesn't cause flutter. The flip lives on an
  inner element; the rAF owns the wrapper transform.

## Rubber squash (click feel)

Every click squashes the chicken like a rubber toy, layered by depth (`applySquash` +
`.chicken-rubber` / `.chicken-sq-*` CSS in `globals.css`):

- Squash amount = `0.5 + 0.13×(combo−1) + 0.12×heat` (capped at 1), where combo counts clicks
  within a 650ms window — faster mashing squeezes deeper. Click position sets a horizontal skew
  (`--sqx`) so the squash leans away from your finger.
- Layers move at different depths/delays for the rubbery feel: whole body compresses from the feet
  (scaleX up / scaleY down), the **head lags** then ducks, the **eyes bulge**, the **wings splay**,
  the **legs compress** — press snaps in ~70ms, release springs back with overshoot beziers.
- Deep squashes (≥ 0.75) trigger a quiet rubber-duck **squeak** (two detuned saw voices through a
  bandpass, vibrato, soft attack), logged as a `squeak` sound event.

## Feathers (click particles)

Normal clicks shed **2–3 feathers** (less litter than the old 7 shards): canvas-drawn teardrop
feathers with a quill line and barb hints that pop up, then flutter down with per-feather sway,
slow gravity, and a long fade. Colors are drawn from **all stages unlocked so far**
(`TIERS[0..tier].body/bodyDark`). Evolutions keep the 26-shard **energy burst** and add a
10-feather multicolor puff. Cap: `MAX_FEATHERS = 40`.

## Ground life: grazing & chicken kids

- **Grazing** (pre-first-click): on the ground the chicken wanders at `GROUND_WANDER = 0.055`,
  pauses ~35% of the time, and every ~4–9s bends over (rotation eases to ~34° toward its facing
  side) and pecks (3Hz bob) for 1.5–3s.
- **Chicken kids**: every ~45–165s (at most one at a time) a tiny chick (`w-[26px]`, random color
  from any stage unlocked so far) spawns on the ground line and meanders. Clicking it makes it
  **bolt off-screen** at ~5px/frame with frantic 90ms flaps; it despawns past the edge. No points —
  it's a critter, not a target.

## Aura & lightning

Drawn on the full-screen canvas behind the sprite (`drawAura` + the arc system in the rAF):

- **Flame aura** (`drawAura`): a Saiyan-style energy flame. A white-hot core hugs the body, and
  colored tongues lick **upward** (taller at the top, short at the sides — they rise like fire) and
  flicker via layered sine noise. It grows with stage and in-stage progress (`auraLevelFor`), is
  colored per stage (`auraRgbFor`: blue / green / red / gold), dampened a little by mercy, and uses
  additive (`lighter`) blending so overlaps glow white-hot.
- **Lightning** (`lightningForScore` → arc system): sharp jagged bolts that crackle tight around
  the chicken — about **1/3 the old size** (radii 6–12 → 26–44px, stroke widths 3.2/1.5/0.85) but
  **3× as many per burst** (3–9 arcs, capped at `MAX_ARCS = 48`), reading as a dense electric
  shroud rather than long stray bolts. It starts **late and rare** (from score `LIGHTNING_START`
  = 15, ~3.2s apart) and ramps **more frequent** with score (down to ~0.48s), with color progressing
  **blue → red → white** (independent of the body color). Each bolt draws a soft colored glow, a
  colored core, and a white-hot center line, lives ~240ms, and triggers a crackle throttled by
  `CRACKLE_MIN_GAP_MS` so the audio never spams at high frequency.

## Background scenery

`game-scenery.tsx` renders hand-drawn cartoon landscapes (mountains, lake, hills, desert) as
inline SVG, roughened by an `feDisplacementMap` for a wobbly hand-drawn line. They sit behind the
transparent game canvas, drift slowly, and **crossfade between scenes** on a slow cycle (~48s,
2.6s fade). The landscape also **transforms with evolution**: each tier-up immediately crossfades
to the next scene, every scene gains sparse extra details per tier (sun rays, snowcap fills,
blossoms, reeds, cactus flowers, star sparkles) stroked in that stage's accent color
(`TIER_ACCENT`, ~0.3–0.4 opacity — color used sparingly), and the displacement wobble deepens with
tier (`scale = 7 + tier×1.8`). The container exposes `data-tier` + `data-scene` for tests.

## Sounds

Event-only — no background/ambient beds (`chicken-audio.ts`):

- **Scream** on click — one sound "sticks" per click-window, retriggered on each click, rotating to
  a new scream after ~25–35 clicks or ~8s idle. Pitch drops with stage (deeper at higher tiers).
- **Crackle** on lightning — rebuilt as a real electric zap: a sparky bandpass-swept noise burst
  (3.4kHz → 700Hz), a sawtooth whine (2.2kHz → 240Hz), and a low thunder thump (130 → 46Hz). Every
  voice attacks from `EXP_FLOOR` over 5–12ms — the old square-wave gain snap (the audible "click"
  artifact) is gone.
- **Riser** synth fallback on evolution — dual detuned saws through a rising bandpass sweep plus a
  high shimmer-noise tail (the MP3 risers still take priority when loaded).
- **Squeak** on deep rubber squashes (see Rubber squash).
- Resilient loader (R2 → local → html5 fallback); the game runs silently if all sound fails.

## Test bridge

`window.__chicken` (e2e backbone, `e2e/chicken-game.spec.ts`):
`plays` (sound log incl. `squeak`), `state()` →
`{score, tier, mercy, morph, auraLevel, rotation, vx, vy, mood, lightning, arcs, mode, feathers,
hyper, ghosts, teleportFrames, squash, kids}`,
`boost(n)` (n clicks), `spin(v)` (impart angular velocity), `forceHyper()`,
`forceTeleport(decoys)`, `forceKid()` for deterministic tests of the rare modes.
`window.__scenery` → `advance()`, `index()` for the background cycle.
