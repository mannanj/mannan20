### Task 181: Shooting stars never stop on hit (idea: only stop on big stars later)
- [x] Remove the "stop on first hit" branch for meteors/comets/internal-emitted particles in `community-nodes.tsx`. Particles now fly through every node and only despawn via the existing 30s `PARTICLE_LIFE_MS` timeout. Bounce/glow effects on node hit are unchanged.
- Location: `src/components/garden/community-nodes.tsx`

### Future idea: collide only with "big stars"
- "Big stars" = nodes where `isSun || isGalaxy` (~1% of all nodes — Sun is XL tier ~0.2%, Galaxy is LARGE tier ~0.8%).
- Desired refactor (deferred): on collision, branch on `node.isSun || node.isGalaxy`:
  - **Big star hit** → use the existing `passthroughRemaining` semantics (small/base meteors stop, large meteors pass once, comets pass twice, mega-comets pass through forever). Stopping a meteor on a sun could be a satisfying "burnt up" moment.
  - **Small/base/mid node hit** → keep flying (current behavior after this task).
- Bonus polish ideas to consider when implementing:
  - On a sun/galaxy stop: brighter, longer-lived flash/glow at the impact point. Maybe a small ring expansion.
  - Optional small "burnup" trail tail that fades quickly after impact instead of the current trail freeze.
  - Bounce probability can be increased on big-star hits (rare, dramatic chain reactions).
- Why deferred: simpler "never stop" version is enough for the current visual goal of more streaking action. Big-star-only stopping adds gameplay-like feedback that's worth dedicated styling.
