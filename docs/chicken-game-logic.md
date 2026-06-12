# Floating Chicken Game — Game Logic

The source of truth for how the `/game` chicken behaves. Code lives in `src/components/game/`
(`chicken-game.tsx` = state + rAF loop, `chicken-svg.tsx` = the sprite, `chicken-tiers.ts` =
stage data + helpers, `game-scenery.tsx` = backgrounds). Audio is in `src/lib/chicken-audio.ts`
+ `src/hooks/use-chicken-sounds.ts`.

## Goal & loop

A cartoon chicken drifts around the screen. Click it to score. Each click screams, spawns shards,
and nudges the chicken's evolution. The chicken gently flees the cursor, so catching it is the game.
Designed to be **easy and toy-like**, not twitchy.

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

## Difficulty (tuned to be easy)

Effective speed per frame = `BASE_SPEED × speedForScore(score) × mercy`. Deliberately slow — the
chicken **floats**, it doesn't dart (roughly 10× slower than the original tuning).

- `BASE_SPEED = 0.25`, `MIN_SPEED = 0.15` (px/frame at 60fps).
- `speedForScore(score) = 1 + min(score,160) × 0.005` → ranges ~1.0 (start) to ~1.8 (cap).
- So top speed only climbs from ~0.25 to ~0.45 px/frame — a gentle, very catchable drift.
- Cursor avoidance is light: `AVOIDANCE_RADIUS = 110`, `AVOIDANCE_STRENGTH = 0.08`. The chicken
  eases away from the pointer but never bolts.

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

## Aura & lightning

Drawn on the full-screen canvas behind the sprite (`drawAura` + the arc system in the rAF):

- **Flame aura** (`drawAura`): a Saiyan-style energy flame. A white-hot core hugs the body, and
  colored tongues lick **upward** (taller at the top, short at the sides — they rise like fire) and
  flicker via layered sine noise. It grows with stage and in-stage progress (`auraLevelFor`), is
  colored per stage (`auraRgbFor`: blue / green / red / gold), dampened a little by mercy, and uses
  additive (`lighter`) blending so overlaps glow white-hot.
- **Lightning** (`lightningForScore` → arc system): sharp jagged bolts that radiate outward past the
  flame and crackle around the chicken. It starts **late and rare** (from score `LIGHTNING_START`
  = 15, ~3.2s apart) and ramps **more frequent** with score (down to ~0.48s), with color progressing
  **blue → red → white** (independent of the body color). Each bolt draws a soft colored glow, a
  colored core, and a white-hot center line, lives ~240ms, and triggers a crackle throttled by
  `CRACKLE_MIN_GAP_MS` so the audio never spams at high frequency.

## Background scenery

`game-scenery.tsx` renders hand-drawn cartoon landscapes (mountains, lake, hills, desert) as
inline SVG, roughened by an `feDisplacementMap` for a wobbly hand-drawn line. They sit behind the
transparent game canvas at low opacity, drift slowly, and **crossfade between scenes** on a slow
cycle (~48s, 2.6s fade) so the chicken appears to travel through changing landscapes.

## Sounds

Event-only — no background/ambient beds (`chicken-audio.ts`):

- **Scream** on click — one sound "sticks" per click-window, retriggered on each click, rotating to
  a new scream after ~25–35 clicks or ~8s idle. Pitch drops with stage (deeper at higher tiers).
- **Riser** on evolution. **Crackle** on lightning.
- Resilient loader (R2 → local → html5 fallback); the game runs silently if all sound fails.

## Test bridge

`window.__chicken` (e2e backbone, `e2e/chicken-game.spec.ts`):
`plays` (sound log), `state()` →
`{score, tier, mercy, morph, auraLevel, rotation, vx, vy, mood, lightning, arcs}`,
`boost(n)` (n clicks), `spin(v)` (impart angular velocity). `window.__scenery` → `advance()`,
`index()` for the background cycle.
