# Chicken Game — Future Feature Ideas

Feature backlog for the Floating Chicken Game at `/game`. Current implementation covers phases 1-5 (floating physics, click scoring, particles, sounds, difficulty scaling). These are ideas for future development.

## Demonic / Exorcist Mode

Occasionally the chicken transforms into a demonic entity:
- **Stiff monster walk** — movement shifts from bouncy floating to rigid, jerky, stiff-limbed walking (like The Exorcist)
- **Demonic voice** — sound effects swap to distorted, pitch-shifted demonic versions (voice changers / AI voice transformation)
- **Fourth wall break** — chicken looks directly at the player, lunges toward the screen as if trying to jump through and break it
- **Screen distortion** — visual effects that make the monitor itself look affected (CRT glitch, static, screen crack overlays, color corruption, flicker)

## Chicken Personality & Behavior

The chicken develops emotional states based on gameplay:
- **Showboating** — when you can't catch him for a while, he taunts, does mockery animations, plays teasing sound effects
- **Chicken laugh** — slows down periodically when untouched, laughs, eyes scan around looking for the cursor
- **Hypersensitive mode** — after taunting, becomes extremely reactive: explosive particle burst + fire trail on dodge, pathfinding that intentionally avoids cursor (never walks into your cursor as a game logic mechanic)
- **Anger** — gets visibly frustrated at certain thresholds
- **Fire effects** — chicken can catch fire to indicate state changes (rage, hypersensitivity), fire trail particles behind it

## Tuning Backlog

- **Particle trail** — repeatedly hard to land via prose ("more transparent" reads differently at different sizes/lifetimes because overlapping particles stack opacity). As of Task 237 it is deliberately small and faint (size 2–4, alpha 0.05–0.10, halved emission). Future: tune it interactively with Mannan watching (live sliders or a debug panel), not by adjusting constants blind.

## Skins & Unlockables

- ✅ Cosmetic skins shipped in Task 236 (2026-06-11): 5 free League-style skins (Classic Yard, Void Walker, Mecha Cluck, Magma Core, Frostfall) with a top-right picker, localStorage persistence, tier colors tinting through each skin
- Still open: skins *unlocked* by score thresholds / leaderboard status, displayed as prizes, tied to progression

## Escape Vehicles & Scene Escalation

> **Raw idea dump (verbatim):** [`chicken-game-escape-scenes-raw.md`](./chicken-game-escape-scenes-raw.md)
> — the unedited original discussion (2026-06-12). This section is the cleaned-up version.
> Future-work task: [`tasks/task-244.md`](../tasks/task-244.md).

The big swing: the chase stops being a chicken on a static backdrop and becomes an
**escalating escape narrative**. As the player keeps catching (or fails to catch) the chicken,
the *world* changes around it — new backdrop scenes, new vehicles, new comedy beats — while the
core mechanic stays the same: **the target dodges the cursor with the same escalating escape
speeds we already have.** Each scene is just a new skin over that dodge loop, with the comedy
ramping up and getting funnier as you progress.

### Stage 1 — Surfing

- Background shifts to an **ocean / surfing scene**: rolling waves, horizon.
- Chicken **gets on a surfboard**; the board moves and the **waves push it around**.
- We click it; it dodges by riding the wave. **Surfing intensifies as it tries to escape** —
  bigger waves, faster carving, more dramatic spray — reusing the current escape-speed curve.

### Stage 2 — Pilot / Airplane

- Comedy intro beat: chicken puts on **swim/aviator goggles first**. Little **stick-figure
  hands magically grow out** for the effect, **giggles and lols**, **flexes the goggles** like
  you snap-stretch swim goggles before a dive, then **pulls them onto its head**.
- An **airplane** flies in; chicken hops in and **flies around to escape clicks**. Now you're
  chasing/clicking a flying plane.
- The progression keeps getting **more and more, and funnier**.

### Stage 3 — Rocket / Space (zoom-out mechanic)

- Chicken escalates into a **rocket to space**; **camera follows it up**.
- The **scene zooms out** — the chicken gets **smaller and harder to see/click**, until all you
  can practically click is the **rocket itself**. The shrinking target *is* the difficulty.
- **Normal (default) outcome:** the rocket just keeps going and **lands on the Moon** — deploys
  **little landing legs**, the chicken **slowly emerges**. As it lands, the **camera zooms in**
  (lean into the camera/zoom play here), and we **continue the game in space.** New space arena.

### Rare Easter Egg — "Break into the rocket" (inventory-gated)

- While the rocket is **in flight**, a mini-game to **break in**: a **shovel / pick-axe** tool —
  hitting the hull **opens a little notch** (it does **NOT explode** — gentle, comedic). Through
  the notch you can see the **chicken's butt** (clickable) or its **head** (clickable) as
  alternate hit targets.
- **Gated:** this only unlocks if the player **picked up the shovel** elsewhere on the site.
  See **Cross-app inventory** below.

### Cross-app inventory (shared items)

- The site's **articles pages** already feature pickup-able items: **ID cards, eggs, bags, and
  other objects**, with a **little bag/inventory shown bottom-right** on those pages.
- Idea: make those items **usable inside the game** — carry the same **bottom-right bag** into
  `/game`, and let held items (e.g. the **shovel**) unlock interactions like the rocket break-in.
- This stitches the game into the broader site rather than keeping it a sealed sandbox.

### Open questions / things to figure out later

- **Trigger model:** what advances stages — score thresholds, time-untouched, or a scripted
  sequence? (Mirrors the existing difficulty/personality escalation.)
- **Rendering approach:** these scenes (waves, camera zoom-out, Moon landing) are heavier than
  the current 2D float — decide between staying in the existing canvas/DOM approach vs. a
  camera/parallax layer, and watch the bundle budget (deep-dive is already lazy-loaded).
- **Reset/loop:** after the Moon/space arena, does it loop, branch, or end?
- More "**other fun ideas of how to continue**" welcome — this list is a starting point, not a
  closed spec.

## Chicken Friends

- At certain thresholds, additional chickens can join the screen
- Multiple targets = new gameplay dynamics

## Pause System

- "Pause" text displayed inline next to "Click the chicken"
- Clickable to freeze game state at any time

## Chat Panel (Phase 6 in task-154)

- Small floating panel at bottom, reuses contact modal glassmorphism style
- Collapsible section: "Chat with the chicken — ask him special requests"
- No backend yet, just UI shell

## Leaderboard (Phase 7 in task-154) — SHIPPED (task-226)

Live: top-right "Leaderboard" link opens a bottom sheet with Human and Agent boards (self-identify checkbox), Upstash Redis persistence (best score per name), name + identity remembered via cookies, and a feedback path gated by the main site's contact validation. Original ideas not yet built:
- Players can leave contact info (email / website) for free advertising

## Rubber Chicken Replica (exact look)

Make the chicken an **exact rubber chicken replica** — the classic glossy yellow squeeze toy: long
limp neck, open red gullet, vacant side-eyes, stubby wings molded flat against the body, seam lines,
specular highlights. Carry the replica treatment through **every evolution**: each tier keeps its
color/palette but reads as the same molded rubber toy (matte→glossy material, painted-on details).
**Keep all special energy effects** — flame aura, lightning shroud, evolution flash/shards, teleport
streaks stay exactly as they are; only the bird's body rendering changes. The squash-on-click system
(task-234) already moves like rubber — this is the visual skin to match it.

## Ability orbs and the hawk (designed 2026-11-02)

- [Ability orbs: Multiply x3, Cursor x5, Cursor x3](chicken-game-ability-orbs.md) — task-304.
- [Hawk event at 2000 points](chicken-game-hawk.md) — task-305.
- Raw source: [chicken-game-toss-orbs-hawk-raw.md](chicken-game-toss-orbs-hawk-raw.md).

## Hold-to-toss, split & bandaid (Task 303)

Hold a chicken 1.5s to grab it, release to toss it with ragdoll motion; each toss splits it into 3 (3 levels, up to 27
chickens), pieces wander then merge back, and a chicken that fully reformed after 3 splits wears a wound + bandaid that
takes 3 tosses to destroy before rainbow leaks and pools. Every squeeze scores 1 regardless of size. Design:
[chicken-game-toss-split.md](chicken-game-toss-split.md), tasks: `tasks/task-303.md`.

## Follow-up: hawk aftermath, eagle, phoenix, inventory, skins (designed 2026-11-02)

- [Hawk event, aftermath, feather and hawk skin x1.25](chicken-game-hawk.md#aftermath-follow-up-2026-11-02-supersedes-the-old-releaseexit) — task-305.
- [Bald eagle (10000, x2 skin) and phoenix (heat, permanent char)](chicken-game-eagle-phoenix.md) — task-307.
- [Shared inventory bag (extracted from the garden) and game items](chicken-game-inventory.md) — task-308.
- Pause, deferred on purpose (separate item, separate leaderboard): `tasks/task-306.md`.

## Follow-up: cosmos, Jupiter, Martians (designed 2026-11-02)

- [Cosmos journey from 10,000, Jupiter with imaginary ground, Martian friends (100 clicks -> item + x3 skin)](chicken-game-cosmos-jupiter.md) — task-310. Raw: [chicken-game-toss-orbs-hawk-raw.md](chicken-game-toss-orbs-hawk-raw.md).

## Art direction for all new v2 features (Mannan, 2026-11-02)

> "try to make the exposions look realistic too of th eplane real fires and stuff thanks" — "same for our other features thanks"

Effects in every new feature are **photo-real**, not cartoon: the plane explosion, rocket exhaust and smoke, phoenix fire and heat shimmer, toasted feathers, black holes, rainbow-water pools, sweat, and the cosmos/Jupiter scenery and Martians. Use photographic sprite frames (licensed footage, or AI-generated and green-screen keyed via `scripts/birds/key.mjs`), with additive/screen blending, real smoke and ember particles, and lighting that matches the scene. Record every asset's source and cost in `docs/chicken-art-sources.md`. The chicken itself stays the existing rubber-chicken art. Existing shipped v2 effects that read as cartoon (rocket flame, black holes, rainbow pools, explosion debris) go on a polish pass after the feature chain.

## Pacing & catch-up

Target (Mannan, 2026-11-03): the whole game (0 to past the phoenix at 25,000) in 10-15 minutes for a good player. Constants live in `src/components/game/chicken-pacing.ts`; the sim is `bun scripts/pace-sim.mjs`.

- Pace curve (play time, gates and hidden tab excluded): surf 250 at 0:30, hawk 2,000 at 2:30, eagle 10,000 at 6:30, Jupiter 17,000 at 9:30, phoenix 25,000 at 12:00, linear in between.
- Check every 30 s of play. If the score is more than 10% under the curve and no orb is on screen and the last catch-up orb was 45 s ago or more, spawn one. `CATCHUP_LADDER` picks by how far behind: 10%+ Cursor x5 / Cursor x3 alternating, 25%+ Multiply x3, 45%+ Frenzy x2 (all points x2 for 20 s, +0.1 s per landed click, cap 40 s, stacks with the skin). Add an orb kind by adding a ladder entry and an `OrbKind`.
- Eagle and phoenix talons: each talon needs `ceil(clicks / skin multiplier)` taps, fixed when the bird arrives. Hawk stays 25.
- Rocket sequence phases roughly halved; the pilot stage now runs 350 to 700 (moon at 800), the plane never freezes, teleports once, and the explosion is bigger (4.8 s, shockwave, secondary blasts, shake, synthesized boom).
- Test bridge: `state().pace = { target, actual, behindPct, nextCheckIn, playMs }`, `forcePaceCheck()`, `state().frenzyMs`, `state().pilotTeleports`.

Simulated time to 25,000 (mean of 40 runs per cell, steady landed clicks per second):

| Scenario | 3 clicks/s | 5 clicks/s | 8 clicks/s |
|---|---|---|---|
| Before (old talons and sequences, no catch-up) | 82.5 min | 48.7 min | 27.4 min |
| New talons and sequences, no catch-up | 81.4 min | 48.0 min | 27.0 min |
| After (catch-up orbs on) | 58.1 min | 32.4 min | 18.7 min |

Reading: orbs and the talon change cut an 8 clicks/s run from 27 to 19 minutes, but the 10-15 minute target needs more than catch-up orbs (about 14,000 landed clicks are required today). Open decision for the pacing design doc: lower the score gates, raise skin multipliers, or make catch-up orbs more frequent.
