# Chicken Game — Hold-to-toss, ragdoll, split, reform, bandaid, rainbow pools

Status: design only (2026-11-02). Source idea: `docs/chicken-game-toss-orbs-hawk-raw.md`. Task: `tasks/task-303.md`.
Scope is this system only. Ability orbs, multi-cursor and the hawk are separate docs; interactions are in "Interactions".

## Summary

Hold the cursor on any chicken for 1.5s to grab it (a "hold to toss" bar counts up). Release to toss it with ragdoll
motion. The first impact splits it into 3 smaller chickens. Tossing a split chicken splits it into 3 again, and once
more: 3 split levels (1 -> 3 -> 9 -> 27 chickens). Pieces wander like the big chicken at a size-tuned speed, then run
back together and merge level by level. When the chicken has been split 3 levels deep and fully reformed to one, it
wears a wound line with a bandaid. Tossing a bandaided chicken takes 3 tosses to destroy the bandaid (it visibly
peels each toss). When the bandaid goes, the wound splits open, rainbow leaks out, and rainbow-water pools stay on the
ground for a while. Every squeezed (clicked) chicken scores 1, regardless of size.

## What exists today (build on it, do not duplicate)

- One main chicken: DOM element `chickenElRef` (`data-testid="chicken"`, `onClick={hit}`), 70x140 (`CHICKEN_W`, `CHICKEN_H`),
  physics in `physicsRef` (`p.x/p.y/vx/vy/rotation`), moved each frame by the rAF `animate` in `chicken-game.tsx`.
  Rotation is a torsional spring (`ROTATION_SPRING`, `ROTATION_DAMP`). `modeRef` is `'ground' | 'flying'`.
- `hit()` (about line 951) is the only scoring path: award 1 (100 hyper, 5 teleport), launch from ground, heat, tier-up,
  scream, squash (`applySquash`), feathers.
- Kids (Task 237) are the reusable pattern: React state `kids` holds only `{id, tier}`; per-frame motion lives in
  `kidMotionRef: Map<id, KidMotion>` and element refs in `kidElsRef`; the loop writes `el.style.transform` directly
  (no setState per frame). Merge = `mergeAt` timestamp -> `startKidMerge` sets `merging` -> loop walks `x` toward the
  chicken at `KID_MERGE_SPEED` -> inside `KID_MERGE_PROXIMITY` calls `removeKid`, bumps `sizeBoostRef`, feathers + squeak.
  Kids are ground-only, 26px, give no points, and are a different thing from split pieces.
- Full-screen `canvasRef` is cleared and redrawn each frame (aura, lightning, particles, feathers, portals);
  `chicken-effects.ts` holds `Feather`/`Streak`/`Portal` types and `make*/update*/draw*` helpers.
- `groundYFor(vh) = vh * GROUND_FRAC (0.76)` is the ground line pools sit on. `mouseRef` already tracks the cursor
  (`mousemove` listener, line ~1169). `ChickenSvg` is viewBox `0 0 80 160` with layered groups `chicken-sq-head/-eye/-wing-left/-wing-right/-legs`.
- Test bridge `window.__chicken` (`state()`, `boost`, `forceKid`, ...).

## State model

New file `src/components/game/chicken-split.ts` (types, constants, pure helpers). Same two-tier split as kids: React
state for what renders, refs for per-frame motion.

```ts
type SplitLevel = 0 | 1 | 2 | 3;               // 0 = full chicken, 3 = smallest
type ChickKind = 'root' | 'split' | 'clone';   // clone = orb "multiply" chickens (other agent)
type ChickPhase = 'free' | 'held' | 'tossed' | 'scatter' | 'returning';

interface Wound { bandaidHp: 0 | 1 | 2 | 3; open: boolean }   // bandaidHp 0 and !open = no wound at all

interface Chick {                    // React state: only changes on spawn/merge/wound/level change
  id: number;
  familyId: number;                  // everything that came from one root or clone
  parentId: number | null;           // sibling group id: the 3 pieces from one toss share parentId
  level: SplitLevel;
  kind: ChickKind;
  wound: Wound;
  tier: number;                      // same stage/skin as the root at spawn; follows tierRef on change
}

interface ChickMotion {              // ref Map, mutated in rAF
  x: number; y: number; vx: number; vy: number;
  rot: number; rv: number;           // rotation / angular velocity
  dir: number; phase: ChickPhase;
  nextTurnAt: number; mergeAt: number;
  holdMs: number;                    // accumulated hold, 0..HOLD_MS
  holdLostAt: number;                // pointer left the hitbox
  tossedAt: number;
  leakUntil: number;                 // rainbow drip window
  el: HTMLDivElement | null;
}
```

The existing main chicken is the `kind: 'root'`, `level: 0` Chick with id 0. Its physics stays in `physicsRef` and its
element stays `chickenElRef` (no rewrite of the 2100-line loop). Pieces and clones are rendered from a `chicks`
array like `kids.map(...)`. While the root is split, `rootSplitRef.current = true`: the root element is
`visibility:hidden`, root-only systems (hyper, teleport, scramble, ceremony, visit, avoidance, aura, lightning) are gated off
or deferred with the existing `EVENT_DEFER_CHANCE` logic. `physicsRef` is kept as the reform anchor and becomes the
merge point on reform.

Persisted across split/reform on the family (ref `familyRef: Map<familyId, {splitDepthMax, reformed, wound}>`):
`splitDepthMax` (deepest level reached since last reset), `reformed` (all pieces merged back to level 0), `wound`.
Held state is not stored on Chick: global `heldRef = {id, pointerId, grabX, grabY} | null`, at most one held chicken
(multi-cursor is a separate agent's problem; see Interactions).

## Constants

All in `chicken-split.ts`, named, no magic numbers inline.

| Constant | Value | Meaning |
|---|---|---|
| `HOLD_MS` | 1500 | hold needed to grab |
| `HOLD_HUD_DELAY_MS` | 180 | HUD hidden before this so plain squeezes do not flash it |
| `HOLD_SLACK_PX` | 10 | hitbox padding while holding |
| `HOLD_GRACE_MS` | 120 | pointer may leave hitbox this long before hold resets |
| `LEVEL_SCALE` | `[1, 0.65, 0.45, 0.32]` | sprite scale (70, 46, 32, 22 px wide) |
| `LEVEL_FREE_SPEED` | `[1, 0.8, 0.64, 0.5]` | multiplier on `BASE_SPEED * speedRef` when free: bigger = faster |
| `LEVEL_HELD_DRIFT` | `[0.25, 0.5, 0.9, 1.5]` | px/frame the chicken slips away while pointer is down (small = harder to hold) |
| `MIN_HIT_PX` | 28 | minimum click/hold hitbox for smallest pieces (invisible padding) |
| `SPLIT_COUNT` | 3 | pieces per toss |
| `MAX_SPLIT_LEVEL` | 3 | deepest level (27 chickens) |
| `TOSS_SPEED_MAX` | 38 | px/frame clamp on release velocity (EMA of last 100ms of pointer motion) |
| `TOSS_MIN_SPEED` | 6 | below this a default lob is applied: vy -14, vx random +-6 |
| `TOSS_GRAVITY` | 0.9 | px/frame^2 (dt-scaled like the rest of the loop) |
| `TOSS_DRAG` | 0.995 | per-frame air drag |
| `TOSS_BOUNCE_WALL` / `TOSS_BOUNCE_GROUND` | 0.55 / 0.4 | restitution |
| `TOSS_SPIN` | `vx * 0.05 + rand(-4,4)` | initial deg/frame spin |
| `TOSS_SPLIT_IMPACT_MIN` | 5 | min impact speed (px/frame) that triggers the split |
| `TOSS_SPLIT_FALLBACK_MS` | 900 | split anyway if no qualifying impact by now |
| `SCATTER_MS` | 600 | pieces tumble out before returning to wander |
| `SCATTER_SPEED` | 7..11 | fan-out speed, 3 pieces at -60/0/+60 degrees off vertical |
| `WANDER_MERGE_MIN_MS` / `_SPREAD_MS` | 14_000 / 8_000 | wander time before pieces start returning (per level: x`[-,1,0.8,0.6]`) |
| `RETURN_SPEED` | 3.4 * `LEVEL_FREE_SPEED` | same base as `KID_MERGE_SPEED` |
| `MERGE_PROXIMITY` | 22 | px between centers to complete a merge |
| `BANDAID_HP` | 3 | tosses to destroy |
| `WOUND_FRESH_PROTECT_MS` | 1200 | pieces cannot be grabbed for this long after spawning (prevents instant chain-splitting) |
| `MAX_CHICKS_ON_SCREEN` | 60 | hard cap (27 split + clones) |
| `RAINBOW_LEAK_MS` | 2500 | drip window after the bandaid breaks |
| `RAINBOW_DROP_BURST` | 28 | drops on the breaking toss; small seep tosses use 6 |
| `MAX_DROPS` / `MAX_POOLS` | 80 / 24 | caps |
| `POOL_LIFE_MS` / `POOL_FADE_MS` | 9000 / 2500 | pools stay, then fade over the last 2.5s |

## Flow: hold -> toss -> ragdoll

1. **Pointer down** on any chick element (root `chickenElRef` or a piece): start `holdMs = 0`, `heldRef` set to a pending
   hold. Do not score yet. Replace the root's plain `onClick={hit}` with `onPointerDown/Up/Cancel`: a pointerup before
   `HOLD_MS` is a normal squeeze and calls `hit(e, id)` exactly as today (same feel, no added latency). A pointerup after a
   completed hold is a toss and the browser's following click is swallowed (`suppressClickUntil = now + 50`).
2. **Holding** (in `animate`, new function `stepHold(ts, dt)`): while the pointer is down and inside the chick's rect
   padded by `HOLD_SLACK_PX`, `holdMs += dt`. Avoidance from the cursor is off for the held chick, and it drifts away from
   the pointer at `LEVEL_HELD_DRIFT[level] * dt`, so the player has to chase small ones. Pointer outside the padded rect
   for more than `HOLD_GRACE_MS` resets `holdMs = 0` and hides the HUD. Hit-testing uses `mouseRef` (already updated from
   `mousemove`; add `pointermove` for touch).
3. **HUD**: `src/components/game/hold-toss-hud.tsx`, one absolutely positioned div at cursor +(16,18), `pointer-events-none`,
   updated by direct style writes from the rAF (no React renders per frame). Label "hold to toss", a 56x5 px bar whose fill
   is `holdMs / HOLD_MS`, and a right-aligned readout `0.9 / 1.5s`. Appears after `HOLD_HUD_DELAY_MS`. At 100% the bar
   flashes once and the label reads "toss!". Same for every chicken, no per-size variation.
4. **Grab** (`holdMs >= HOLD_MS`): `phase = 'held'`. A small squeak and a feather puff. From now the chicken follows the
   pointer with ragdoll dangle: the body is a pendulum hanging from the grab point. Per frame:
   `target = pointer - grabOffset`; position eases to target (`k = 0.35`); angular accel `= -g/L * sin(angle) - (pointerAccelX)/L * cos(angle) - damp*rv`
   with `L = 70 * LEVEL_SCALE`, damp 0.08, angle clamped +-70 degrees. Squash/stretch from pointer speed: scaleY up to 1.25
   along motion. Secondary motion rides the existing squash layers via CSS custom properties set from the rAF
   (`--rag-head`, `--rag-wing`, `--rag-legs`: head lags the angle by 90ms, wings swing opposite, legs trail): no new SVG
   structure, reuse `chicken-sq-head`, `-wing-left/-right`, `-legs`. Flap rate is frantic (`--flap-ms` 90ms), as in kid flee.
5. **Release** (pointerup while `held`): velocity = pointer EMA clamped to `TOSS_SPEED_MAX`; below `TOSS_MIN_SPEED` apply the
   default lob so a gentle drop-and-release still tosses. `phase = 'tossed'`, `tossedAt = now`.
6. **Ragdoll flight** (`stepTossed`): gravity, drag, spin; wall/ceiling bounces with `TOSS_BOUNCE_WALL`; ground contact at
   `groundYFor(vh) - h` with `TOSS_BOUNCE_GROUND`; each impact adds a squash pulse (reuse `applySquash` for the root,
   same CSS classes for pieces), a small feather spray, a thud-ish squeak (existing `squeak(0.35)`) and a spin kick
   `rv += impactSpeed * 0.4 * sign`. Rotation is free during `tossed` (the self-righting spring is suspended) and re-enabled
   on `scatter`, so it visibly rights itself afterwards.
7. **Split moment**: first impact with speed >= `TOSS_SPLIT_IMPACT_MIN`, or `TOSS_SPLIT_FALLBACK_MS` after release. See Split rules.
8. Level-3 chickens are tossable (ragdoll + squash + feathers) but cannot split; they land and resume wandering.

Anything else that grabs the chicken (hawk, teleport, portal) wins: a `tossed`/`held` chick is excluded from root events
and `hit()` bonuses (no 100/5 bonus on a tossed chicken; award 1).

## Split / merge rules

- **Split** (`splitChick(id, impactX, impactY, impactVx)` in `chicken-game.tsx`): a chick at level L < `MAX_SPLIT_LEVEL`
  becomes 3 chicks at L+1, new ids, shared `parentId` (a fresh group id) and `familyId`, same `tier`, `kind` inherited.
  The parent element is removed (root: hidden). Pieces spawn at the impact point in `phase 'scatter'` fanned at -60/0/+60 degrees
  with `SCATTER_SPEED` and a random +-10% size jitter on speed; after `SCATTER_MS` they switch to `free`. Cap check: if
  spawning would exceed `MAX_CHICKS_ON_SCREEN`, split into the allowed count only (min 1 extra) rather than refuse the toss.
  `familyRef.splitDepthMax = max(splitDepthMax, L+1)`.
- **Free movement**: each piece reuses the root's flight pattern (wander + wall bounce + cursor avoidance + bank/wobble +
  `ROTATION_SPRING` self-righting), scaled by `LEVEL_FREE_SPEED[level]`, drawn at `LEVEL_SCALE[level]`. They are always at the
  root's current `tier`/skin ("same stage"). Pieces follow the root's `modeRef` (if the root was still on the ground,
  pieces graze/wander on the ground line at `GROUND_WANDER * LEVEL_FREE_SPEED`). Per-piece phase offsets in the sine wobble
  (`ts * 0.006 + id`, the kid trick) keep them from moving in lockstep.
- **Merge** (extends the Task 237 kid merge shape): each sibling group has one `mergeAt = now + WANDER_MERGE_MIN_MS +
  rand * WANDER_MERGE_SPREAD_MS` scaled per level. When it passes and all siblings are `free` (none held/tossed), every
  sibling goes `returning`: it steers toward the group's centroid at `RETURN_SPEED` (2D, not ground-only like kids; held
  piece is skipped and the group waits). When all siblings are within `MERGE_PROXIMITY` of the centroid, the group is
  removed and one chick at level L-1 is created there (feathers + `squeak(0.35)` + `recordPlay`, same as the kid merge
  call sequence). A group missing members (cloned family expired, hawk) merges whatever remains into the parent level.
  Merging cascades: L3 groups merge to L2 pieces, which join their own group's merge, up to L0, where the root element
  reappears at that point (`physicsRef.x/y` set, `rootSplitRef = false`).
- A piece clicked while `returning` just squeezes (score 1) and keeps returning; it does not flee (unlike kids).
- A piece grabbed while returning cancels the group's merge until it is released and `free` again.
- **Reform bookkeeping**: on reaching L0, `familyRef.reformed = true`. If `splitDepthMax === MAX_SPLIT_LEVEL` the chicken
  gets `wound = { bandaidHp: BANDAID_HP, open: false }` (see below). Otherwise it reforms clean. `splitDepthMax` resets to 0
  after reform.
- **No `sizeBoost`** from piece merges (Task 237 `sizeBoostRef` stays kid-only) so the two merge systems do not stack.

## Wound, bandaid, rainbow

**Bandaid trigger**: a root (or clone) that reached split depth 3 and fully reformed. Not before (honors the raw text).

**Visual** (new optional prop on `ChickenSvg`: `wound?: { bandaidHp: 0..3; open: boolean }`, drawn in the 80x160 viewBox
over the body group, below the wings so they still cover it):
- Wound line: a short jagged diagonal stroke on the flank in ink color, 2px, with 3 tiny stitch ticks.
- Bandaid: tan rounded rect (22x8) rotated -35 degrees over the line, pad in the centre, subtle seam dots.
  - `bandaidHp 3`: fully stuck.
  - `2`: one corner lifted (skewed polygon + small shadow).
  - `1`: half peeled, curling, hanging at an angle.
  - `0` and `open`: bandaid gone (it falls as a feather-like particle with a short flutter), the wound line splits into two
    lips with a rainbow gradient (`#ff4d4d, #ffb84d, #f4ff4d, #4dff88, #4dc3ff, #a64dff`) glowing between them.
- Each toss's peel is animated: on the toss that decrements `bandaidHp`, run a 400ms CSS keyframe (`bandaid-peel-N`) so you
  see it coming undone. Keyframes live in `globals.css` (allowed: `@keyframes`).

**Toss rules on a bandaided chick** (recommended default, see open questions):
- Toss 1 (`hp 3 -> 2`) and toss 2 (`2 -> 1`): full ragdoll toss, bandaid peels, small rainbow seep (`6` drops from the wound
  line), **no split** - the bandaid holds it together.
- Toss 3 (`1 -> 0`): bandaid tears off, wound opens, rainbow bursts (`RAINBOW_DROP_BURST`) and the chick splits into 3
  (level 1) as usual. Each of the 3 pieces drips for `RAINBOW_LEAK_MS` (1 drop per 90ms).
- After this the wound is **healed** (no mark) and the cycle starts over: another full 3-level split + reform is needed
  for a new bandaid. (Alternative in open questions.)

**Rainbow drops and pools** (in `chicken-effects.ts`, drawn in the existing canvas pass, after feathers):
- `RainbowDrop { x, y, vx, vy, hue, r, born }`: radius 2..4, ballistic with gravity 0.35 px/frame^2, hue cycles per drop
  (`hue = (born / 6 + i * 47) % 360`), drawn as a small `hsl(hue 95% 62%)` circle with a lighter highlight dot and a faint
  1-frame trail. Cap `MAX_DROPS`.
- A drop reaching the ground line becomes a `Pool { x, y, rx, ry, born, hueSeed }` with `y = groundYFor(vh) + rand(0, 10)`
  (slight depth scatter), `rx 14..30`, `ry 3..6`. Drawn as a flattened ellipse with a horizontal rainbow
  `createLinearGradient` (gradient cached on the pool object), a darker rim, a white specular sliver, and a slow shimmer
  (`ry * (1 + 0.08 * sin(ts * 0.004 + hueSeed))`). Alpha 0.85, fading to 0 over the last `POOL_FADE_MS` of `POOL_LIFE_MS`.
  Nearby pools merge visually by simply overlapping (additive alpha), no physics. If `MAX_POOLS` is exceeded the oldest is dropped.
  A drop that lands on a chick-free ground only; drops that fall off-screen die.
- Pools are decorative: no collision with chickens (deferred: slipping/trails).

## Scoring

- A click/squeeze on any chicken of any level scores exactly 1. `hit()` gains a second parameter `id` and an early branch:
  pieces and clones skip `hyper`/`teleport` bonuses (`award = 1`), skip ground->flying launch, and skip `visit` logic.
  Tier-up, heat, combo squash, scream, feathers all stay shared. The pointerup of a *toss* is not a click and scores 0;
  grabbing and tossing is not a scoring action. Test bridge exposes `score` unchanged so existing score tests stay valid.
- The bandaid hit points are not score.
- Orb scoring thresholds (500/750/1250/2000) count the same single `scoreRef`.

## How it plugs into the existing loop

| Where | Change |
|---|---|
| `chicken-split.ts` (new) | types, constants, pure helpers: `heldDriftFor(level)`, `splitFan(n)`, `ragdollStep(m, pointer, dt)`, `tossStep(m, bounds, dt)`, `groupCentroid`, `peelStage(hp)` |
| `chicken-game.tsx` | add `chicks` state + `chickMotionRef`/`chickElsRef`/`familyRef`/`heldRef`/`rootSplitRef`; `spawnPieces`, `splitChick`, `removeChick`, `startGroupMerge` modeled on `spawnKid/removeKid/startKidMerge`; replace root `onClick={hit}` with pointer handlers; `hit(e, id?)`; render `chicks.map` next to `kids.map` (line ~2040) |
| `animate` (rAF) | insert `stepHold` before the root block (~line 1243 where `mouseRef` is read), `stepChicks` next to the kids loop (~line 1722); gate root-only systems on `!rootSplitRef.current`; add drop/pool update + draw in the canvas pass (~line 1838) |
| `chicken-effects.ts` | `RainbowDrop`, `Pool`, `makeDrop`, `updateDrop`, `makePool`, `drawPools`, `drawDrops` |
| `chicken-svg.tsx` | optional `wound` prop + bandaid/wound SVG, `scale` driven by wrapper not the SVG |
| `hold-toss-hud.tsx` (new) | cursor-adjacent bar + label |
| `globals.css` | `@keyframes` for bandaid peel and bar flash only (keyframes are allowed there) |
| bridge (`window.__chicken`) | extend `state()` and add forcers (see tests) |
| `docs/chicken-game-logic.md` | add a "Tossing & splitting" section when shipped |

Rendering stays DOM + CSS transforms (like kids), not canvas sprites: `ChickenSvg` already carries skins/tiers/eyes, and
27 small elements is cheap. Piece sprites use `className="w-[70px]"` with `transform: translate(x,y) scale(LEVEL_SCALE) rotate(rot)`.

## Performance budget

- Max on screen: `MAX_CHICKS_ON_SCREEN = 60`. One fully split family is 27; the rest is headroom for orb clones.
- Per-frame cost is O(chicks): one transform write each, zero React renders in-frame; React updates only on spawn / merge /
  wound change / tier change (at most a few per second).
- Group merge detection is O(group size); centroid computed once per frame per returning group.
- Particles: `MAX_DROPS = 80`, `MAX_POOLS = 24` (cached gradients, 24 ellipses is negligible), existing `MAX_FEATHERS = 40` unchanged.
  Leak emission is throttled (1 drop/90ms/chick) and counted against `MAX_DROPS`.
- Hit-testing for hold: only the one pointer-down chick, no per-frame scan of all chicks.
- `will-change: transform` on piece wrappers (as for kids); remove `filter`/`glowStyle` from pieces (aura is root-only).

## Interactions with other features

- **Orb "multiply" chickens** are `kind: 'clone'`, a separate mechanism that duplicates whatever is on screen. They count
  against `MAX_CHICKS_ON_SCREEN` (multiply skips clones it cannot fit, never splits existing groups), they have their own
  `familyId`, and their lifetime belongs to the orb (15s, blink, black hole). Clones are tossable and split with the same
  rules, but they never get bandaids (`wound` is root-only) and never reform into a root: when a clone family's timer
  ends every piece in it vanishes with the black-hole effect regardless of level. Multiplying while the root is split
  clones the currently visible pieces (each clone carries its source's `level`).
- **Multi-cursor**: hold/toss is per pointer. Default: a second cursor cannot grab the same chick while it is `held`;
  `heldRef` becomes `Map<pointerId, ...>` if multi-cursor needs several simultaneous holds (the multi-cursor doc owns this).
  Synthetic cursors do not produce real `pointerdown`, so the cursor agent must call `beginHold(id, pointerKey)` itself.
- **Hawk**: an actively held/tossed chick cannot be targeted. If the root is split when the 2000-point hawk is due, delay
  the hawk until reform (or the nearest L0 piece is not a thing). Hawk owns `rootSplitRef` conflicts: it should wait.

## Test plan (Playwright, style of `e2e/chicken-game.spec.ts`)

Bridge additions (extend `ChickenState` in the spec): `chicks` (count), `splitLevels` (sorted array, e.g. `[1,1,1]`),
`held` (bool), `holdProgress` (0..1), `bandaid` (0..3 or null), `woundOpen`, `drops`, `pools`, `rootSplit`.
Forcers: `forceToss()` (toss the root/first chick with a fixed velocity), `forceReform()` (skip wander timers),
`forceBandaid()`, `holdMsOverride(ms)` (reduces `HOLD_MS` for speed tests), `setSeed` not needed.

Cases:
1. `hold shows the hold-to-toss bar and counts up` - mouse down on chicken, wait 600ms: HUD visible, label "hold to toss",
   `holdProgress` in (0.2, 0.6); screenshot assertion on the HUD.
2. `a quick click still squeezes for 1 point` - click, `score === 1`, no HUD, `held === false`.
3. `holding 1.5s grabs the chicken` - mouse down, wait ~1.6s, `held === true`; chicken center follows mouse.
4. `leaving the chicken resets the hold` - move away for >200ms, `holdProgress === 0`.
5. `releasing a toss splits the chicken into 3` - hold, move, release: eventually `chicks === 3`, `splitLevels` is `[1,1,1]`,
   `score` unchanged (toss scores 0), root hidden.
6. `tossing a piece splits it again, three levels max` - toss to levels `[2 x3, 1 x2]`, then 9 at level 3, `chicks <= 27`;
   a level-3 toss does not split.
7. `smaller chickens slip away faster while held` - compare drift speed of held L0 vs L3 via `state()` over 300ms.
8. `pieces share the root's stage` - at tier 2, all pieces' `data-tier` is 2.
9. `squeezing a piece scores 1 regardless of size` - boost to known score, click an L3 piece, `+1`.
10. `pieces wander then merge back into one` - `forceReform()`; `chicks === 1`, `rootSplit === false`, `splitLevels` empty.
11. `no bandaid before a full 3-level reform` - reform after only 2 levels: `bandaid === null`.
12. `bandaid appears after 3 split levels and a reform` - `bandaid === 3`, wound SVG present (`[data-testid=wound-line]`).
13. `bandaid takes 3 tosses` - toss thrice: `bandaid` 3->2->1->0 with no split on tosses 1-2, split on 3, `woundOpen`.
14. `rainbow drops fall and leave pools that fade` - after toss 3: `drops > 0` then `pools > 0`; after `POOL_LIFE_MS` (mock
    `performance.now` or `page.clock`) `pools === 0`; `pools <= 24`.
15. `performance` - fully split to 27 chicks, 2s sample of rAF frame times (via `page.evaluate`) p95 < 20ms.
16. `kid merge still works` - existing kid tests unaffected, `sizeBoost` unchanged by piece merges.
Use `page.clock` for time-driven cases (merge, pool fade) rather than real waits; hold-timing cases use `holdMsOverride`
except case 3 which uses the real 1.5s once. Existing score/hit tests must pass unchanged.

## Open questions (recommended default first)

1. Does the first toss of a fresh chicken split it? **Default: yes** (first impact splits it, per "after you've tossed a chicken once... split it into 3"). Alt: first toss only bruises/ragdolls, split on the second.
2. What happens after the bandaid is destroyed? **Default: wound heals, cycle restarts** (needs another full 3-level split + reform). Alt: wound stays open and every later toss leaks rainbow and splits.
3. Do tosses 1 and 2 on a bandaided chicken split it? **Default: no, only the 3rd (bandaid-breaking) toss splits.** Alt: every toss splits, bandaid persisting across reforms.
4. Does a level-3 chicken toss do anything? **Default: ragdoll only, no split.** Alt: a 4th split level or a puff of feathers and a bonus.
5. Does the bandaid stay on the reformed chicken through further reforms (e.g. a partially peeled one splits then merges back)? **Default: not applicable, only the breaking toss splits.**
6. Can the held chicken be released without a toss (e.g. drop)? **Default: release always tosses.** Alt: release with near-zero velocity drops and does not count.
7. Should aura/lightning continue on pieces while the root is split? **Default: suppressed while split.** Alt: shrunken aura on each piece (cost x27).
8. Is grab allowed in `ground` mode before the first click launches the chicken? **Default: yes.**
9. Hold at the minimum on mobile/touch (finger covers the label): HUD above-left of the touch point.
10. Clone chickens and wound: **Default: no bandaid on clones.**

## Deferred

- Shake/escape-while-held pattern (held chickens wriggling free): removed for now, follow-up task.
- Bruising on the body before the bandaid; chicken-flesh-breaking-off visual.
- Slipping/trails or splashes when chickens run through rainbow pools; pools reacting to wind.
- Aura/lightning on pieces; pieces having their own mood/faces.
- Sound design for toss/split/rip (reuse `squeak` + existing screams for v1).
- Level-4 splits; per-size scream pitch.
