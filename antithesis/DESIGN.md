# Antithesis workload design: chicken game logic

Status: built and launched (see `README.md`; first run `1b1ebf980c2bbfa3ea3f31635dab5aed-67-0`,
12 compute hours). Compute budget agreed: 60 compute hours total. The driver ended up in Python,
not Rust, because of VM disk limits; see README.
Scope chosen: **pure game logic** (not the browser UI, not the leaderboard/progress APIs).

## What gets tested

The game's rules live in pure TypeScript modules under `src/components/game/` with no browser
dependencies (checked: only `chicken-pacing.ts` imports another module, `chicken-orbs.ts`):

| Module | Logic under test |
| --- | --- |
| `chicken-tiers.ts` | score → stage, in-stage progress, color morph, mood/eyes, evolution decay |
| `chicken-split.ts` | toss velocity clamp, toss physics (`tossStep`), ragdoll, split fan, centroid, bandaid HP |
| `chicken-pacing.ts` | orb scheduler (`pickOrbKind`, `orbWeight`, `unlockedKinds`, `orbGapMs`), pace curve, eras |
| `chicken-orbs.ts` | orb thresholds (`crossedOrbs`), mystery picks, cursor offsets, scatter |
| `gear.ts` | freeze gun / ice state machine (`addFreezeShot`, `icePhase`, `iceSpeedFactor`) |
| `mounds.ts`, `cannon.ts` | mound phases/layout, toss-hit geometry, cannon dock/zone limits |

The rAF loop in `chicken-game-v2.tsx` that composes these is **not** covered. It's React state
interleaved with rendering. See "Limits" below.

## Architecture

```
antithesis/
  README.md
  DESIGN.md                 (this file)
  game-logic/
    config/docker-compose.yaml   # services: gamelogic, driver
    gamelogic/                   # the SUT image
      server.ts                  # HTTP JSON server; imports the real modules from src/components/game
      sdk.ts                     # JSON-lines Antithesis assertions (no JS SDK exists yet)
      Dockerfile                 # esbuild-bundles server.ts + modules to plain JS, runs on Node
    driver/                      # Rust hegel driver
      Cargo.toml, src/main.rs, Dockerfile, first_start_workload
    scripts/
      local.sh                   # docker compose up + read sdk.jsonl locally
      launch.sh <hours>          # build, snouty validate, snouty launch
```

**Why two languages.** The skill requires the driver to be a hegel concurrent state machine. Hegel's
TypeScript frontend can't do that yet, so the driver is **Rust** (the skill's default). The game logic
has to run as real TypeScript, so it lives in a small **Node service (`gamelogic`)** that imports the
modules unchanged and exposes them over HTTP. Antithesis instruments JavaScript itself, so it sees
branch coverage inside the game modules and can steer toward unexplored branches.

**The SUT is stateful.** `server.ts` holds game sessions in memory, each with a seeded clock and
a small model of the composed state:
`{score, heat, mercy, fired orbs, lastKinds, activeKinds, ice, split tree, toss pieces, playMs}`.
Endpoints are things like `POST /s/:id/click {n, bonus}`, `/toss {vx,vy,level}`, `/tick {dt}`,
`/freeze`, `/pick-orb {ctx overrides}`, `/state`. Every endpoint calls the real module functions.
The composition glue is deliberately thin, about 150 lines. Assertions on the pure functions' outputs
go in `server.ts` (in-SUT, via `sdk.ts`). Assertions on sequences go in the driver.

**Driver rules** (hegel draws every input):

- `click` (heavy weight): add 1–3 clicks, sometimes a hyper bonus (+100) or egg (+100/+500), so
  score jumps over several orb thresholds at once.
- `tick`: advance time by a drawn dt (1–5000 ms, occasionally a huge 60 s jump) to cover mercy
  decay, ice phases, and pace drift.
- `toss`: draw a pointer velocity (including near-zero and huge values) and viewport size (including
  tiny viewports smaller than the chick), then step the physics until it rests.
- `split` / `merge`: walk the split tree 1 → 3 → 9 → 27 and back.
- `freeze_shot`: fire bursts of freeze shots across block boundaries.
- `pick_orb`: build a scheduler context from session state plus drawn overrides (`behind`, `ahead`,
  `aimbotOwned`, `jevHeld`, era pool subsets, cooldowns), then ask for an orb.
- `eventually` (rare): end the timeline after checking a final full-state invariant pass.

**Faults.** There is one stateless-on-restart node, so use `--fault-tolerance resilient` (pauses and
network slowdowns, no kills or partitions) with `--fault-exclusions '^driver$'`. The value here is
Antithesis's deterministic, coverage-guided exploration of input and timing sequences, not
distributed faults. The driver treats a lost session (SUT restart) as "recreate and continue",
never as a failure.

## Properties (first batch of 12)

Always (must hold on every evaluation):

1. **Stage is monotone in score**, and `tierForScore(clicksAfterDecay(s))` is exactly one stage
   below `tierForScore(s)` (or 0 at stage 0).
2. **`tierProgress` ∈ [0, 1] and `morphForScore` ∈ [0, 1)** for every reachable score.
3. **Mood never drops below the stage's base mood**; `ascended` iff final stage.
4. **Toss physics stays in bounds**: after every `tossStep`, the piece is inside the viewport/ground,
   no NaN/Infinity, `impact ≥ 0`, `squash ≤ IMPACT_SQUASH_MAX`, and a resting piece has `vy = 0`.
5. **`tossVelocity` speed ≤ `TOSS_SPEED_MAX`**; ragdoll rotation stays within ±`RAG_MAX_DEG`.
6. **Split conservation**: pieces at split level L number 3^L, and a full merge returns exactly one root.
7. **The orb scheduler returns a valid answer**: `null` or an unlocked, in-pool kind, **never
   `undefined`**, and **never a kind whose `orbWeight` is 0** (on the weighted path).
8. **Big orbs respect gating**: never picked while `ahead`, inside `BIG_MOMENT_COOLDOWN_MS`, over
   `BIG_MOMENT_MAX_CLONES`, or right after another big orb.
9. **Each threshold orb fires at most once** per session and always fires when its threshold is
   crossed, including multi-threshold jumps.
10. **Ice state machine**: speed factor ∈ {0, 0.35, 1}; a block lasts 10–20 s; phases go
    solid → cracking → heating → chilled/none and never skip backwards.
11. **`orbGapMs` > 0, and ≥ `ORB_GAP_MIN_MS` when behind.**
12. **`paceTarget` is non-decreasing in play time**, and cursor offsets never exceed `MAX_CURSORS`.

Sometimes (exploration assertions, proving the workload reaches the interesting states):
reached Golden God (stage 4); a full 3-level split and re-merge; a solid ice block; a big orb picked;
the behind-force scheduler path taken; one click crossing ≥2 orb thresholds; a toss in a viewport
smaller than the chick.

## Likely findings already (reproduced locally with Bun, outside Antithesis)

These came from reading the code for this design. Property 7 is written to catch both.

1. **`pickOrbKind` returns `undefined` instead of `null`** on the behind-force path when every
   pool candidate is a big orb with weight 0 (in cooldown). Repro: `behind: 0.9`, `ahead: false`,
   `sinceBigMs: 0`, `pool: ['multiply25', 'multiply100']` → `undefined`. The caller in
   `chicken-game-v2.tsx:2908` expects `OrbKind | null`.
2. **`pickOrbKind` can pick a zero-weight kind when `rng()` returns exactly 0.** The weighted loop
   uses `roll <= 0`, so with `roll = 0` it returns `pool[0]` even if its weight is 0. Repro:
   `aimbotOwned: true`, `pool: ['aimbot', 'frenzy']`, `rng: () => 0` → `aimbot` (weight 0).
   Rare with `Math.random`, but real. A strict `< 0` (as `pickMysteryEffect` uses) or skipping
   zero weights fixes it.

Worth probing (not yet confirmed): `addFreezeShot` never resets `iceMs` itself.
`gear-layer.tsx:243` resets it, so the property should check the composed behavior. `tossStep`
with a viewport narrower than the chick puts the two wall clamps in conflict.

## Limits

- The composition in `server.ts` is a re-assembly of the pure functions, not the real rAF loop.
  Bugs that live only in `chicken-game-v2.tsx`'s glue won't be found. The fix is to extract that
  glue into a pure reducer (`step(state, input, dt, rng) → state`) that both the component and the
  SUT call. That's the recommended follow-up refactor.
- Some helpers call `Math.random` directly (`tossVelocity`, `mergeDelayFor`). That's fine under
  Antithesis (deterministic), but they can't be steered by hegel. Passing `rng` in, as `pickOrbKind`
  already does, would let the driver control them.

## Plan once credentials are set (skill workflow)

1. Install snouty, `snouty doctor`.
2. Build the workload (workload module steps 5–10): `server.ts` + `sdk.ts`, Rust driver, compose,
   Dockerfiles, `snouty validate`, local loop with c8 coverage.
3. Add the 12 properties above (properties module, "define"). Check locally that 7 fails as expected.
4. Short run (~3–5 compute hours, `resilient`), triage, fix the workload. Then one 24-hour run.
   Total stays within 60 compute hours.
5. Triage and summarize the findings.
