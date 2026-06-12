### Task 233: Chicken DBZ flame aura + progressive blue→red→white lightning
- [x] Rework `drawAura` into a Saiyan-style flame: white-hot core hugging the body + colored tongues that lick **upward** (taller at top, short at sides) and flicker; additive blending; colored per stage, scaled by aura level
- [x] Progressive lightning (`lightningForScore`): starts late & rare (from score 15, ~3.2s apart), ramps more frequent with score (down to ~0.48s)
- [x] Lightning color progresses **blue → red → white** (independent of body color)
- [x] Bolts radiate outward past the flame as sharp jagged zigzags (glow + colored core + white-hot center line), ~240ms life — read clearly against the aura
- [x] Crackle throttled (`CRACKLE_MIN_GAP_MS`) so audio never spams at high lightning frequency
- [x] Removed obsolete per-tier `electricityMs` (single score-driven authority)
- [x] Bridge `state()` exposes `lightning` + live `arcs`; e2e asserts intro timing, color ramp, frequency ramp, and that arcs actually spawn — 18/18 green, `tsc` clean
- Location: `src/components/game/chicken-game.tsx`, `src/components/game/chicken-tiers.ts`, `e2e/chicken-game.spec.ts`, `docs/chicken-game-logic.md`

[Task-233]
