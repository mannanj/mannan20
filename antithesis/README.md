# Antithesis workloads

## game-logic

Tests the chicken game's rules (`src/components/game/*.ts`) under Antithesis. See `DESIGN.md` for why.

- **SUT, `game-logic/gamelogic/`:** a Node HTTP server (`server.ts`) that imports the game's real
  modules unchanged: tiers, toss/ragdoll physics, orb scheduler, orb thresholds, mystery picks,
  cursors, freeze-gun ice, and era pools. Each action runs them, and Always/Sometimes assertions
  (JSON lines, `sdk.ts`) judge the results. esbuild bundles it to CommonJS with a source map.
  Antithesis instruments it from `/opt/antithesis/catalog`.
- **Driver, `game-logic/driver/workload.py`:** a hegel concurrent state machine in Python. It's
  Python rather than Rust because the dev VM's 10 GB disk can't hold the Rust toolchain image, and
  hegel's TypeScript frontend can't run a driver yet. Python isn't instrumented. Rules: click
  (with score jumps), tick, toss, ragdoll, hitbox/cursors, pick_orb (real era pools, edge-case
  contexts, rng values including exactly 0), mystery, freeze bursts, check_state, and a rare
  eventually that stops faults, checks recovery and exits 0. Cross-call properties (scores never go
  backwards, each orb fires once) are asserted here.
- **Faults:** `resilient` (pauses, slow network, clock jitter). There's one in-memory node, so no
  kills. Sessions lost to a restart are dropped from the model, not counted as failures.

### Run it

```bash
game-logic/scripts/local.sh 180                                        # local loop, lists failing assertions
DRIVER_NO_EVENTUALLY=0 DRIVER_EVENTUALLY_AFTER_S=20 game-logic/scripts/local.sh 45   # check the eventually
game-logic/scripts/launch.sh 12                                        # build, snouty validate, launch (compute hours)
```

Needs `ANTITHESIS_TENANT`, `ANTITHESIS_API_KEY`, `ANTITHESIS_REPOSITORY` (and `ANTITHESIS_BASE_URL`
if proxied) in the environment.

### Known findings (SUT bugs, assertions kept)

1. `pickOrbKind` returns `undefined` (not `null`) on the behind-force path when the pool holds
   only big orbs that are gated off (for example pool `['multiply25']`, `behind: 1`, in cooldown).
2. `pickOrbKind` picks a zero-weight kind when `rng()` returns exactly 0: the weighted loop tests
   `roll <= 0`. Symptoms: an owned aimbot is offered again, and a big ×100 orb is offered inside its
   150 s cooldown. Fix: `roll < 0` (as `pickMysteryEffect` does), or skip zero weights.

### Runs (orbitinghail tenant)

| Run | Compute h | Result |
| --- | --- | --- |
| `1b1ebf980c2bbfa3ea3f31635dab5aed-67-0` | 12 | 3 SUT bugs + 2 workload bugs (mood check assumed 5 stages; unreachable restart check), fixed |
| `96348cb8932918acb3e15475de7867fe-67-0` | 24 | 3 SUT bugs + 1 workload race in the eventually's snapshot, fixed |
| `640863f55b5d1a06fce8e82e1f076a28-67-0` | 24 | Clean except the 3 known SUT bugs; 66 properties pass; instrumentation OK |
