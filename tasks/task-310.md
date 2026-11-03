### Task 310: Chicken Game — Cosmos journey, Jupiter & Martians
- [ ] Resolve open questions in `docs/chicken-game-cosmos-jupiter.md` (eagle order, Martian click scoring, x3 vs phoenix, band widths) before building
- [ ] Extend `EscapeStage` with `cosmos` and `jupiter`, add thresholds (10,000 gated by the eagle latch, 17,000), and `cosmosProgress(score)`
- [ ] `CosmosSky` in `escape-scenery.tsx`: Earth orbit, Moon, Mars (Phobos/Deimos), asteroid belt, Jupiter approach; parallax via `--cosmos-p`, no new dependencies, no SVG filters
- [ ] `JupiterGround` ("Cloud Meadow", imaginary solid ground) with background Martians, tripod silhouettes and a drifting saucer
- [ ] Original Martian art (Pip, Moss, Zap) as SVG, with idle animations and entrances
- [ ] Foreground Martian friends: spawn cadence and cap, click counter (100, persisted), progress ring, reward flies to the bag as `martian-token`
- [ ] `martian` skin with x3 multiplier (one skin worn at a time), bag action to wear it
- [ ] Performance: stay in the `tasks/task-309.md` budgets; unmount `GameScenery` in escape stages
- [ ] Playwright `e2e/chicken-cosmos.spec.ts` using `window.__chicken.boost` and `state().stage`
- Location: `src/components/game/escape-stages.ts`, `src/components/game/escape-scenery.tsx`, `src/components/game/chicken-game.tsx`, `e2e/`, `docs/chicken-game-cosmos-jupiter.md`

## Build notes (v2 only, branch chicken-cosmos)

- Cosmos starts at 10,000 once no bird is pending or busy (so the eagle goes first), or at 10,500 regardless (`COSMOS_FORCE_SCORE`). Jupiter at 17,000. Martian clicks count only toward the 100.
- Three.js `cosmos-3d.tsx` (Earth, Moon, Mars + Phobos/Deimos, instanced asteroid belt, Jupiter) shares `space-preload.ts` with the moon trip, so the existing download gate already covers the new textures.
- `martian-friend` inventory item (usable) applies the `martian` skin, x3.

### Review rounds (screenshots in `~/Desktop/chicken-game-new-designs/8-cosmos-jupiter/r1..r3`)
1. r1: Jupiter showed from the first frame, Earth was off-screen, Mars passed before its band, the belt was invisible (it also orbited off-screen around the world origin), Martian labels sat on the Leaderboard link, the progress ring drew as a tick, the bag item was a cartoon.
2. r2 (after fixes: bodies scale in with distance, camera starts looking at Earth, Mars and belt re-spaced, rotation removed, labels raised, ring fixed, item art is the real Pip render): belt rocks read as low-poly faceted and a rock filled a corner.
3. r3 (merged-vertex smooth rocks, rock-free flight lane, smaller rocks): clean; no score overlap, no aura through vehicles, no particle litter. The tiny blue figures on the ground are the game's own chicks.

### Open
- Spawn cadence is 14-26s, stay 26s (doc proposed 25-45s); tune by play.
- No tripods or saucer art (cost); Zap beams in with a light column.
