### Task 182: Click-to-spawn meteor control on community-nodes canvas

Add a second floating control button below the magnifier toggle that lets the user click anywhere on the space canvas to spawn a meteor at that point. Direction follows cursor momentum, size follows the existing meteor/comet probability distribution, and the button icon updates to preview the next spawn when it would be a comet/mega.

#### UX

- [ ] Add meteor toggle button stacked below the magnifier toggle (`page-magnifier.tsx` mounts magnifier at `fixed right-6 top-[28%]`; meteor button at `top-[calc(28%+44px)]` or use a small flex column wrapper to keep them in sync if positioning shifts).
- [ ] Toggle states: off (default) → on (button highlighted, cursor becomes a meteor crosshair while hovering the canvas).
- [ ] When **on**, clicking anywhere on the page that hits a `[data-magnifiable]` canvas spawns a meteor at click coords. Clicking the button toggles off.
- [ ] When the magnifier is enabled, meteor mode is forcibly disabled (and vice versa) — the two are mutually exclusive cursor modes. Single source of truth: lift both into a small shared `cursor-mode` store or just `useState` in a parent so each toggle disables the other.
- [ ] Button icon swaps based on **what the next click will spawn** (computed up front, see "Spawn weighting" below): small circle for normal meteor, larger filled circle for big meteor, comet glyph (circle + short trail line) for comet, larger comet glyph for mega-comet. Re-roll & update icon after each spawn.
- [ ] Disable meteor mode automatically on route change (useEffect cleanup).

#### Spawn weighting

- [ ] Match `spawnExternalParticle` distribution in `community-nodes.tsx:464-534`:
  - 8% chance comet (`COMET_CHANCE`); within comets, 50% mega.
  - Non-comet: 80% small, 16% base, 4% large meteor.
- [ ] **Force a "bigger size" every N clicks** so the user reliably sees the upgraded icon. Spec: keep a counter; if `clicksSinceLastBig >= 4`, force the next spawn to roll from the comet bucket (still 50/50 mega vs normal comet). Reset counter on big spawn. Tune N after testing — 4 is the starting value.
- [ ] **Pre-roll** the next spawn's bucket on toggle-on and after every spawn so the button icon matches what *will* spawn on the next click. Store the pre-rolled `{kind, isMega}` in a ref/state; consume it on click.

#### Direction & velocity

- [ ] Track cursor velocity via a small ring buffer in `page-magnifier.tsx`'s mousemove (or co-located in the meteor controller): keep last ~6 mouse samples with timestamps, compute `(vx, vy)` as a weighted average over the last ~80ms.
- [ ] On click:
  - If recent cursor speed > threshold (e.g. 0.05 px/ms), use cursor direction normalized.
  - Else fall back to a random angle within the existing edge-spawn cone (to avoid stationary clicks producing degenerate trails).
- [ ] Speed: reuse the existing `PARTICLE_SPEED_MIN`/`PARTICLE_SPEED_MAX` range — comets/mega use the upper end (mirror current behavior).
- [ ] **Travel "the furthest it can"**: meteor should travel until it exits the viewport on the chosen heading. Existing particle loop already despawns particles once they leave bounds; just spawn at the click point and let it fly. For comets/megas, set `passthroughRemaining` per existing rules so they don't die at the first node hit.

#### Plumbing

- [ ] Expose a `spawnMeteorAt(x, y, vx, vy, kind)` imperative API from `community-nodes.tsx`. Two reasonable shapes:
  - Option A: imperative ref handle (`forwardRef` + `useImperativeHandle`) — cleanest, scoped to the canvas instance.
  - Option B: tiny shared module like `magnifier-state.ts` that exposes a queue (`pendingExternalSpawns: Spawn[]`); the canvas's animate loop drains the queue each frame and calls the existing internal spawner refactored to accept (x,y,vx,vy,kind) overrides.
  - Recommend Option B — matches the existing `magnifier-state` pattern, no prop drilling.
- [ ] Refactor `spawnExternalParticle` so the size bucket + start position + angle can be injected (currently all internal). Keep the existing edge-spawn path as the default when no override is provided.

#### Files

- New: `src/components/garden/meteor-controller.tsx` — owns toggle state, cursor velocity tracking, click handler, icon SVG that changes per pre-roll.
- New: `src/components/garden/meteor-spawn-state.ts` — shared spawn queue + pre-roll utility (mirrors `magnifier-state.ts`).
- Edit: `src/components/garden/community-nodes.tsx` — drain spawn queue per frame; refactor `spawnExternalParticle` to accept overrides.
- Edit: `src/components/garden/page-magnifier.tsx` (or a small new shared layout component) — render meteor button below magnifier; mutual-exclusion logic between modes.
- Edit: `src/app/garden/article/seeking-community/page.tsx` (and any other route that mounts `<CommunityNodes />`) — mount `<MeteorController />` alongside.

#### Edge cases / risks

- [ ] Click hits the magnifier button or article text → don't spawn (check `e.target.closest("[data-magnifiable]")`).
- [ ] Stationary click (no cursor movement) → use random fallback angle so users still get a meteor.
- [ ] Touch devices: pointer-down should use the touch's last-known velocity (pointer events expose this; verify on iOS).
- [ ] Multiple rapid clicks should be allowed — no debounce; queue handles concurrency.
- [ ] Verify pre-rolled icon stays in sync if the user toggles modes mid-roll.

#### Validation

- [ ] Click 20× with cursor moving → meteor flies in cursor direction each time.
- [ ] Click 20× stationary → spawns random-angle meteors, no degenerate clusters.
- [ ] Verify every ~4th-5th click produces a comet or mega and the button icon shows it *before* the click.
- [ ] Toggle magnifier on while meteor mode is on → meteor mode turns off (and vice versa).
- [ ] Comets pass through nodes; small meteors die on first hit (existing behavior preserved).
- [ ] No frame-rate regression vs the natural ambient spawn rate.

- Location: `src/components/garden/community-nodes.tsx`, `src/components/garden/page-magnifier.tsx`, `src/components/garden/meteor-controller.tsx` (new), `src/components/garden/meteor-spawn-state.ts` (new)
