# Chicken Game — Ability Orbs (Multiply x3, Cursor x5, Cursor x3)

Source: `docs/chicken-game-toss-orbs-hawk-raw.md`. Tasks: `tasks/task-304.md`. Sibling: `docs/chicken-game-hawk.md`.
Split chickens (toss/split/bandaid) are a different kind from the orb clones here. Do not share arrays.

## Summary

Rainbow-gradient orbs with the ability name in the middle drift around the stage and vanish after 30s. Clicking one collects it.
- 500 points: **Multiply x3** (triples every chicken on screen, clones included). Flat 15s, then clones blink, teleport into tiny black holes, leave feathers.
- 750 points: **Cursor x5** (center cursor + 4 diagonals, an "X"). 30s, +0.1s per chicken click.
- 1250 points: **Cursor x3**. Multiplies the active cursor set by 3 (x5 -> 15 cursors). 30s, +0.1s per chicken click.
- Every chicken click = 1 point regardless of which chicken or cursor.

## State model (refs, same pattern as `hyperRef`/`teleportRef`)

```ts
type OrbKind = 'multiply' | 'cursor5' | 'cursor3';
interface Orb { id: number; kind: OrbKind; x: number; y: number; vx: number; vy: number; bornAt: number; phase: number }
interface OrbSchedule { fired: Record<OrbKind, boolean> }          // one-shot per run
interface CursorBuff { x5Until: number; x3Until: number }          // 0 = inactive
interface CloneChicken { id: number; x: number; y: number; vx: number; vy: number; tier: number; bornAt: number; phase: 'alive'|'blink'|'vanish' }
interface MultiplyState { until: number; clones: CloneChicken[]; level: number }   // level = times multiplied
interface BlackHole { id: number; x: number; y: number; bornAt: number }
```
Refs in `ChickenGameInner`: `orbsRef`, `orbScheduleRef`, `cursorBuffRef`, `multiplyRef`, `blackHolesRef`. React state only for the DOM lists (`orbs`, `clones`) following the `ghosts`/`kids` pattern (`setGhosts(ghostsRef.current)`). Reset all on run reset.

## Timeline and named constants

```ts
const ORB_MULTIPLY_SCORE = 500;  const ORB_CURSOR5_SCORE = 750;  const ORB_CURSOR3_SCORE = 1250;
const ORB_LIFETIME_MS = 30_000;  const ORB_RADIUS = 44;  const ORB_DRIFT_SPEED = 0.05;  const ORB_SPAWN_MARGIN = 80;
const MULTIPLY_FACTOR = 3;       const MULTIPLY_DURATION_MS = 15_000;
const MULTIPLY_BLINK_START_MS = 10_000;  const MULTIPLY_BLINK_PERIOD_MS = 220;
const MULTIPLY_VANISH_STAGGER_MS = 600;  // each clone teleports at a random time in [BLINK_START+2000, DURATION]
const BLACK_HOLE_LIFE_MS = 900;  const BLACK_HOLE_RADIUS = 16;  const VANISH_FEATHERS = 6;
const MAX_CHICKENS_ON_SCREEN = 48;       // multiply caps here; remaining slots fill, rest skipped
const CURSOR_BUFF_MS = 30_000;   const CURSOR_EXTEND_PER_CLICK_MS = 100;   // 0.1s, tunable
const CURSOR_X5_OFFSET = 48;     // px, diagonal arm length per axis: (+-48, +-48)
const CURSOR_X3_OFFSET = 30;     // px, horizontal spacing for the x3 trio
const MAX_CURSORS = 15;
```
Flow:
1. `hit()` already computes `next` score; after `scoreRef.current = next`, call `checkOrbSchedule(prev, next)`: for each kind whose threshold was crossed and not `fired`, `spawnOrb(kind)`. Uses `prev < T <= next` so HYPER_BONUS (+100) jumps cannot skip a threshold.
2. Orb spawns at a random edge point, drifts with sine wobble, bounces off the stage margin. `now - bornAt >= ORB_LIFETIME_MS` removes it (fade last 2s).
3. Collect (click, see Q1): remove orb, burst of rainbow shards via `spawnShards`, then:
   - multiply: `applyMultiply(now)`.
   - cursor5: `x5Until = max(now, x5Until) + CURSOR_BUFF_MS` (re-collect extends; orbs are one-shot so only matters via debug hook).
   - cursor3: `x3Until` likewise.
4. `applyMultiply`: snapshot the live chickens (main chicken + `kidMotionRef` kids + existing clones). For each, add `MULTIPLY_FACTOR - 1` clones at the source position with a small random velocity, capped at `MAX_CHICKENS_ON_SCREEN`. `multiplyRef.until = now + MULTIPLY_DURATION_MS` (a second collect cannot happen in-run, but a debug re-trigger resets it). Tripling "including already multiplied" falls out of snapshotting clones.
5. Clone lifecycle by `now - (until - MULTIPLY_DURATION_MS)`: alive; at `MULTIPLY_BLINK_START_MS` set `phase='blink'` (opacity toggles every `MULTIPLY_BLINK_PERIOD_MS/2`, done via a CSS class so React does not re-render); each clone has its own `vanishAt` between blink start +2s and `until`. At `vanishAt`: spawn `BlackHole` at the clone, reuse the teleport streak effect (`makeTeleportStreaks` in `chicken-effects.ts`) toward the hole, `spawnFeathers(cx, cy, VANISH_FEATHERS)` (feathers float on their own via `updateFeather`), remove clone. Only clones vanish; the original chicken and kids are never removed.
6. Clone clicks call the same scoring path as `hit()` (see "Hooks"). Clones do not trigger evolution/ceremony beyond what the score change causes.

### Cursor layouts (offsets relative to the real pointer)
- **x5**: `[(0,0), (-O,-O), (O,-O), (-O,O), (O,O)]`, `O = CURSOR_X5_OFFSET`.
- **x3 alone**: `[(-P,0), (0,0), (P,0)]`, `P = CURSOR_X3_OFFSET`. Chosen horizontal so it reads differently from the X.
- **x3 on top of x5**: every existing cursor gets two companions at `(+-P, 0)`, giving 15 cursors (five side-by-side trios). `buildCursorOffsets(x5Active, x3Active)` is a pure function: `base = x5 ? X5 : [(0,0)]; return x3 ? base.flatMap(o => [o, o+(-P,0), o+(P,0)]) : base`. Dedupe coincident points. Unit-testable.
- Buff expiry is independent: if x5 ends first, x3 continues as a trio on the single pointer.
- Cursor duration: each chicken click while a buff is active adds `CURSOR_EXTEND_PER_CLICK_MS` to that buff's `Until` (both if both active). One click on N cursors that all land counts as N chicken clicks and extends N x 0.1s (see Q4).

## Rendering

- Orbs: absolutely-positioned DOM `div`s (max 3 ever, one per kind) with `conic-gradient` rainbow rotating via a keyframe, inner dark disc plus label text ("Multiply x3", "Cursor x5", "Cursor x3"). `pointer-events-auto`, `cursor` inherits the hand. Position updated imperatively in `animate` via refs (same as `kidElsRef`), no per-frame setState. Style: Tailwind arbitrary values; keyframes (`orbSpin`, `cloneBlink`) go in `globals.css` (allowed: keyframes). Subtle, per project quality rules: no glow pulse; a slow rotation only.
- Extra cursors: a fixed `div` layer (`data-testid="chicken-extra-cursor"`) of inline SVG hands (copy the hand path from `.chicken-hand-cursor` in `globals.css`, Task 237) translated each frame from `mouseRef` + offsets. The real OS pointer stays the center cursor, so only `N-1` overlays render (max 14). Overlays are `pointer-events-none`. Mousedown scales the overlays to the pressed (fist) shape to mirror `.chicken-hand-cursor:active`.
- Clones: render the same `ChickenSvg` as kids (`kids.map` block, ~line 2043), at `w-[70px]` scale for clones of the main chicken, kid size for clones of kids. Positioned in `animate` via refs like `kidElsRef`.
- Black holes: draw on the existing canvas (drawPortals-style helper in `chicken-effects.ts`, new `drawBlackHoles`): dark disc with a thin accretion ring, shrinking over `BLACK_HOLE_LIFE_MS`.

## Hooks into the existing loop

- `chicken-game.tsx`:
  - `hit()` (line ~950): after score update call `checkOrbSchedule`; add `extendCursorBuffs(now)`.
  - Refactor `hit()` into `awardClick(e, source)` (score, heat, tier change, scream, feathers) and `hit(e)` that calls it, so clones and extra cursors reuse one path with no duplication. Only the real chicken applies `applySquash`; clones skip squash.
  - Mouse tracking effect (line ~1167): `onMove` already feeds `mouseRef`. Add one `mousedown` listener that, when cursor buffs are active, runs `fanOutClick(e)`: for each offset, compute point `m + offset`, test against chicken rect (`physicsRef`, `CHICKEN_W x CHICKEN_H`), kids, clones, and orbs by geometry (not `elementsFromPoint`), then call `awardClick` per hit. The real pointer's own DOM `onClick={hit}` on the chicken stays; the fan-out skips offset `(0,0)` for DOM-handled targets to avoid double counting, or (simpler, recommended) removes the DOM onClick during a buff and handles all offsets uniformly. Decide at implementation; test below covers it.
  - `animate` (rAF, line ~1185-1908): add `updateOrbs`, `updateClones`, `updateBlackHoles`, `updateCursorOverlays` calls; schedule next to the existing hyper/teleport/scramble blocks.
  - Bridge (line ~379 `ChickenBridge`, ~1042 `useEffect`): add `setScore(n)`, `forceOrb(kind)`, `collectOrb(kind)`, `state().orbs/cursors/clones/cursorBuffMs`. Note `boost(n)` calls `hit()` n times, so reaching 500+ needs 500 calls and hits the thresholds naturally; `setScore` is the fast path.
- `chicken-effects.ts`: add `drawBlackHoles`, rainbow orb helper if canvas is used.
- Audio: reuse `playPowerUp` on collect; vanish uses the existing teleport sound path if one exists; no new asset required.

## Performance limits

- Chickens <= `MAX_CHICKENS_ON_SCREEN` (48) incl. main, kids (`KID_MAX` = 4), clones. Multiply x3 on top of x3 from 1+4 chickens: 5 -> 15 -> 45, cap holds. Only DOM nodes with `ChickenSvg`: 48 SVGs is acceptable; if frame time degrades, render clones with a shared lightweight `<symbol>`/`<use>`.
- Cursors <= 15. Click cost: 15 x 48 rect tests = 720 comparisons, negligible. Per-frame cursor overlays: 14 transforms.
- Worst-case score per physical click: 15 x (chickens under cursors). Overlapping clusters can award many points per click; accepted (see Q4).
- No per-frame `setState`; lists mutate in refs, React state updates only on add/remove.

## Playwright test plan (`e2e/orbs.spec.ts`, mirrors `e2e/chicken-game.spec.ts`)

Use `window.__chicken` bridge (as `chicken-game.spec.ts` does for `boost`/`state`/`forceHyper`). New bridge: `setScore`, `forceOrb`.
1. Orb spawns at 500 not before: `setScore(499)` -> `state().orbs` empty; click once -> one `multiply` orb with label "Multiply x3"; 750 -> "Cursor x5"; 1250 -> "Cursor x3". `HYPER_BONUS` jump across a threshold still spawns.
2. Orb expires: install fake clock (`page.clock`) and advance `ORB_LIFETIME_MS`; orb gone.
3. Collect multiply: with 1 chicken + `forceKid()`, collect -> `state().clones` = 2 x (chickens) ... total chickens 3 x 2 = 6 (main + kid tripled). Second multiply (debug) triples again, capped at 48.
4. Multiply timing: clock advance 10s -> clones have class `blinking`; advance to 15s -> zero clones, black-hole events fired, `feathers` > 0, main chicken still present.
5. Cursor x5: collect -> 4 extra cursor overlays at `(+-O, +-O)` from a known mouse position (assert via `boundingBox`). Click the chicken with offset overlay on it -> score +1 per cursor overlapping.
6. Cursor x3 on x5 -> 14 overlays (15 total); x3 alone -> 2 overlays.
7. Duration: buff active at 29s, gone at 31s; 10 chicken clicks extend by 1s (use `state().cursorBuffMs`).
8. Every click +1: score delta equals number of landing cursors; clone click +1.
9. Screenshot checks of orb and the X cursor layout (project's screenshot-validation habit).
10. Regression: the existing `chicken-game.spec.ts` still passes (hit refactor).

## Open questions

1. Collect by click assumed. Alternatives: touch with any cursor, or hover/proximity. With a cursor buff active, should extra cursors also collect orbs?
2. Raw text names the 500 orb both "multiple cursor mode" (5 cursors, crosshair/X) and "multiply" (chicken x3). Decided: 500 = Multiply x3, 750 = Cursor x5, 1250 = Cursor x3. Confirm.
3. Does Multiply x3 apply to ground-mode chickens and kids, and do clones follow the same physics/ground wander or only drift? Proposed: simple drift/flee, no evolution.
4. Does every cursor landing on a chicken score +1 (up to 15 points per physical click), or does one physical click score at most once per chicken? Proposed: per cursor per chicken.
5. Orb re-spawn if a threshold orb expires uncollected (only once per run assumed).
6. x3 layout (horizontal trio, `CURSOR_X3_OFFSET = 30`) is a proposal, tune live.
7. Do clones grant evolution/hyper/ceremony progress via heat, or only score?
8. Does hawk event (2000) clear clones and cursor buffs? Proposed: hawk ignores buffs but clones despawn at hawk start.
