# Chicken v2 — power-up variety and pacing

Design only (2026-11-03). Target: a good player goes 0 → past the phoenix (25,000) in **10–15 min** (5 landed clicks/s ≈ 10–11 min, 8/s ≈ 7–8, 3/s ≈ 14 with catch-up); after that the game keeps going (§6). Every click is `1 × skin × frenzy` today and the game needs ~14,000 landed clicks, so the schedule below has to lift the average points per landed click (ppc) from ~1.8 to ~9. The engine for that is the **golden chickens** (permanent 5× targets, max 3), the burst layer is **Multiply × Cursor × Chain**, and the floor is **catch-up** against the pace curve. All numbers are constants for `chicken-orbs.ts` / `chicken-pacing.ts`.

## 1. Unlock order (score-gated, one new toy per era)

| Era (scene) | Score | Becomes possible | Fixed spawns |
|---|---|---|---|
| Backyard | 0–250 | nothing: learn to click | — |
| Escape (surf 250, plane 350, rocket 450, 3D flight, Moon 540) | 250–600 | Multiply x3 | **x3 at 300** (on the surfboard) |
| Moon | 600–2,000 | Cursor x5, Cursor x3, Frenzy x2 | **Cursor x5 at 600, Cursor x3 at 900, Frenzy at 1,200** |
| Hawk (x1.25) | 2,000 | — | hawk grab |
| Moon, after the hawk | 2,200–5,000 | **Golden Eggs** (2,200), Multiply x5 (2,500) | **Golden Eggs at 2,200** (first eggs are guaranteed; the player learns to let three hatch) |
| Moon, late | 5,000–10,000 | Chain Lightning (5,000), Multiply x10 (7,000) | — |
| Eagle (x2) → Cosmos | 10,000–17,000 | Multiply x25 (11,000, big moment) | — |
| Jupiter (Martian x3) | 17,000–25,000 | Multiply x100 (18,000, big moment) | — |
| Phoenix (x3) | 25,000 | endless phase, §7 | phoenix grab |

Catch-up early access: a player ≥ 30 % behind pace may be offered the next tier from 0.7 × its unlock score (e.g. x5 from 1,750, Chain from 3,500); x25/x100 never before 10,000/17,000.

## 2. Spawn scheduler

- **Pace curve** (replaces `PACE_CURVE`): `0→0, 1 min→300, 2→800, 4→2,000, 7→10,000, 9.5→17,000, 12→25,000`. `behind = (target − score)/target`, `ahead = score > 1.25 × target`.
- **One orb on screen**, lifetime 30 s (20 s for x25/x100). Next spawn `ORB_GAP_MS = 28_000 ± 6_000` after the previous orb is collected or expires; `gap × (1 − min(behind, 0.6))` when behind (floor 11 s), `× 1.3` when ahead. Check every second (replace the 45 s tick); the fixed spawns in §1 bypass the gap but still wait for a free screen.
- **Blocked** (no spawn, orb timers frozen, buffs frozen): gate ≠ none, `flight3d`, plane exit/explosion, bird `pending` or phase in grab/right/recoil/left/hover/depart/recede. Not blocked by `calm` (today's `isBirdBusy` blocks catch-up for up to 60 s after every bird; drop that).
- **Weighted random** among unlocked kinds. Base weights: x3 10, Cursor x5 10, Cursor x3 6, Frenzy 8, Golden 9, x5 8, Chain 8, x10 5, x25 2, x100 1. Modifiers: last kind × 0.1, second-last × 0.4 (no back-to-back); behind ≥ 0.3 → x5/x10/x25/Frenzy/Golden × 2; behind ≥ 0.55 → forced pick of the strongest unlocked (Frenzy if no multiply ≥ x5 is unlocked); Golden × 0.3 once 3 golden chickens exist; Chain × 0.4 unless ≥ 4 clones are on screen or a multiply ended < 10 s ago (synergy); the kind whose buff is still active × 0.2; ahead → big moments excluded.
- **Big moment rule** (x25, x100): cooldown `BIG_MOMENT_COOLDOWN_MS = 150_000` after any big one, never twice in a row, never while > 20 clones are present, never when behind < 0 and ahead. Expect 1–2 per game.

## 3. Effects, stacking and caps

| Orb | Effect | Duration |
|---|---|---|
| Multiply xN (3/5/10/25/100) | each chicken, kid and clone on screen spawns N−1 clones, total chickens capped `MAX_CHICKENS_ON_SCREEN = 150` (fill from the real chicken outward, so x100 on a bare screen gives 99, on a 60-clone swarm gives 90) | 15 s (x25 12 s, x100 10 s); new multiply resets every clone's vanish timer, as today |
| Cursor x5 / x3 | unchanged layouts | 30 s, +100 ms per click, **new cap 60 s** (at 8 clicks/s the current extension is effectively permanent) |
| Frenzy x2 | all points × 2 | 20 s, +100 ms/click, cap 40 s (as implemented) |
| Chain Lightning | every landed click of the **primary cursor** arcs to chickens/clones within 200 px, max `CHAIN_MAX_ARCS = 6`, each arc = 1 hit | 15 s |
| Golden Eggs | chicken lays an egg every 2 s for 16 s (8 eggs); egg click = +100 raw, 15 % are big eggs = +500; an egg untouched for 10 s hatches a **golden chicken** (runs like the chicken, 5 raw per hit, permanent, max 3; once 3 exist eggs only pay) | 16 s laying; goldens persist through everything except the grab/gate/flight blocks (hidden then) |

Stacking: `points = min(raw, MAX_RAW_PER_CLICK) × skin × frenzy`, where raw is the sum over all hits of one click (every cursor point × every rect it lands in × chain arcs; a golden hit counts 5). `MAX_RAW_PER_CLICK = 30`; clones of a golden chicken are plain (1); arcs are always 1; extra cursors do not chain; eggs and talon taps take skin and frenzy like any hit. Rolling `MAX_POINTS_PER_SECOND = 600` (excess clicks still animate, score 0). Worst case is then 180 per click / 600 per second, i.e. 25k needs ≥ 42 s of a peak that only exists with Cursor x5 + Frenzy + Martian + goldens at 8 clicks/s; realistic peaks last 10–15 s. Skins stack with everything (standing decision). Golden chickens are never grabbed by birds and count as chickens for Multiply and Chain. Performance: 150 clones × 60 fps is the budget; drop clone wobble above 60.

## 4. Simulated timelines (model: `/private/tmp/claude-501/-Users-manblack-Documents-mannan20/e0fd10b7-9782-4ce0-9800-3e2391121b21/scratchpad/orb-sim.mjs`, 1 s steps, ppc per orb: x3 2.2, Cursor x5 3.2, x3 2.6, x5 3.5, Chain +2.5, x10 6, x25 12, x100 20; dead time: 35 s escape sequences, grab = taps/cps + 9 s, Martians 100/cps + 7 s)

**Good player, 5 clicks/s (≈ 10 min):** 0:00–1:05 backyard → surf; 1:05 x3 (first toy); 1:40 plane exit, 3D flight, gate; 2:00 Moon, Cursor x5; 2:20 Cursor x3; 2:30 Frenzy; **2:40 hawk** (24 s); 3:05 Cursor x5; **3:15 Golden Eggs, three hatch** (ppc jumps to ~6); 4:00 Frenzy; 4:45 x10 on the swarm (first big screen); 5:25 Cursor x5; **5:50 eagle** (39 s), x2; 6:30 Frenzy; 7:00 x10; 7:50 Frenzy; **8:20 Jupiter, 100 Martian clicks**, x3; 8:30 x3; 9:10 x5 (or an x25/x100 once in two games); **9:55 phoenix** (200 taps ≈ 50 s) → endless phase at ~10:45.

**Behind-pace player, 3 clicks/s (≈ 14 min with catch-up, 17½ without):** first toy at 1:40, Moon at 2:30; orbs every 15–20 s instead of 30–40 (gap × 0.5–0.7, strong tiers × 2): Cursor x5 twice, Cursor x3, Frenzy; hawk 3:40 (34 s); Golden Eggs 4:35 (hatch 3); x5 at 4:55 (early access), x3, Cursor x5, x5, Cursor x3, x5, Frenzy roughly every 20 s through 8:00; eagle 8:10 (59 s); Cosmos: x5, eggs (pay only), Cursor x5, x3, Frenzy, Cursor x5; Jupiter 11:50; x25 at 11:55; x5, Chain, Frenzy; phoenix ≈ 13:40.

Estimates to 25k: **3/s 13–14 min** (catch-up on) / 17 min (off); **5/s 10–11 min**; **8/s 7–8 min** (dead time ~1.7 min is the floor). An 8/s player is faster than the 10-min target; if that matters, raise `ahead` damping to × 1.6 and cap goldens at 2 for them. The behind thresholds (0.15 / 0.3 / 0.55) stay as in `chicken-pacing.ts`.

## 5. Jev player implications

Always grab: Golden Eggs (let the first three eggs hatch, click the rest), Frenzy, Cursor x5, any Multiply ≥ x5 (then aim at the densest part of the swarm, centre not belly). Grab when cheap: x3, Cursor x3 (worth less on top of x5), Chain (only with clones present). Never chase: an orb while a bird grips or the bird is receding (the talon/feather windows score more), an orb > 1.5 s away during Frenzy. Once goldens exist, the default target is the nearest golden chicken (5×), not the main chicken, except during grabs. The strategy entry per orb is one line in `strategy.mjs`: `{kind, priority, aimAfter}`.

## 6. After 15 minutes: the endless phase

Past the phoenix the scheduler keeps running; new content plugs in through one registry, `ORB_REGISTRY: Record<OrbKind, OrbDef>` with `{ label, unlock: { score?, era?, minutes? }, weight, duration, cooldown, big?, catchUpTier, apply(ctx), modifiers?(ctx) → weight multiplier }`, and `ERA_REGISTRY: EraDef[]` with `{ id, from: { score | minutes }, scene, pool: OrbKind[], birdOrEvent? }`. Adding an idea = one registry entry (+ its `apply`), no scheduler change.

- **Rotating eras every 3 min** after the phoenix (or every 8,000 points, whichever first), each with its own scene and a pool of 4–5 orbs so each era feels different: *Saturn's rings* (Giant, Magnet, Vacuum + x25), *Asteroid mine* (Freeze, Chain, Golden, x10), *Deep space* (Helper Chick, Combo, Feather Storm), *Return to Earth* (Shield before the next bird, Mystery ???). Scenes beyond Jupiter reuse the cosmos bands (Saturn, Neptune, a nebula, Earth from orbit).
- **Rarer power-ups** from Task 315 enter the registry as `weight 3–5`, `cooldown 90 s`, each era-locked; Mystery ??? (weight 2) rolls any unlocked kind including big moments and ties into the Task 313 "???" codes.
- **Birds return** every other era with higher tap counts (phoenix 2: 150+150, talons weighted by multiplier as today) so the x3 skin keeps being earned, not kept.
- **Real-chicken mode (Task 313) at 50,000**: with 3 goldens and x3 the endless phase runs at ~60–80 pts/s at 5 clicks/s, so 50k arrives ~6 min after the phoenix (≈ 16–17 min total), which is where the tone change belongs.
- **Caps stay** (30 raw / 600 pps), so the leaderboard grows roughly linearly with minutes played after 25k; a board that shows minutes-to-phoenix next to the score makes the 10–15-min goal visible.

## 7. Open questions for Mannan

1. Golden chickens are the main engine (permanent 5×). Keep them permanent, or let them walk off after e.g. 3 min so the late game depends on orbs again?
2. Caps: 30 raw per click and 600 points/s acceptable, and should the existing leaderboard be reset or split (v1 / v2) when this ships?
3. 8 clicks/s finishes in ~7–8 min with this curve. Fine ("good player 10–15" covers 3–6/s), or should the ahead-damping be stronger?
4. Endless phase: rotating era every 3 min / 8,000 points, and birds returning with bigger tap counts, OK as the framework?

## Decisions (Mannan, 2026-11-03) — these override the proposals above
1. **Golden chickens expire after 33 seconds** (max 3 at once; fly off in a golden burst).
2. **No caps**: remove the 30-hits-per-click and 600-points/sec caps. v2 scores keep going to the normal leaderboard.
3. **Fast players may finish in ~7–8 min**: no extra damping when far ahead.
4. **Endless framework: yes.** A new era every ~3 min or 8,000 points (rotating scenes, returning birds, rarer orbs: Giant, Magnet, Freeze, Helper Chick, Mystery ???), real-chicken mode at 50,000. Build the framework now with one or two eras; more later as registry entries.
- Also: Golden egg +100, big golden egg +500 (points, not a multiplier); an egg left 10s hatches a golden chicken worth 5× the normal click value. Multiply tiers x5/x10/x25/x100 with the clone cap raised to 150. No slow-mo.

## Implemented (2026-11-03)

Shipped in `chicken-pacing.ts` (registry, eras, scheduler) and `chicken-game-v2.tsx`; the live constants and the final sim table are in `docs/chicken-game-features.md` > "Pacing & catch-up". Differences from the proposal above: no caps (decision 2); golden chickens expire after 33 s (decision 1); egg points are flat (100 / 500) and do not take the skin multiplier; per-click buff extension is 50 ms instead of 100 ms; base gap 20 s with a steeper behind response (`1 - min(2 x behind, 0.7)`, floor 8 s); behind thresholds 0.2 (weight boost) and 0.4 (forced strongest); clones flock back toward the chicken so Multiply keeps paying after the first second; clones above 60 render as canvas sprites. The endless-era framework (section 6) is data-ready in `ERA_REGISTRY` but no post-phoenix era is defined yet.
