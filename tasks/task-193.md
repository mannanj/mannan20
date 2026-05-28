### Task 193: Ruby Gem tooltip inside page-magnifier lens

Render the Ruby Gem easter egg's tooltip *inside* the magnifier lens (so it visually lives within the magnifying glass) while keeping the text crisp at native size and matching the existing in-DOM tooltip style.

- [ ] Remove the current external/overlay tooltip implementation in `page-magnifier.tsx` (the `tooltipRef` rendered outside the lens at z-10003)
- [ ] Render a tooltip element as a child of `lensRef` (NOT inside `cloneRef`), so it is clipped by the lens but unaffected by the lens's `transform: scale(zoom)` on the cloned content
- [ ] Position it relative to the cloned ruby's effective lens position (below the cloned ruby, clamped to lens bounds)
- [ ] Style it to match the in-DOM tooltip: `text-[10px] px-2 py-1 rounded bg-black/90 text-white whitespace-nowrap leading-tight`, two `<span class="block">` lines ("Ruby Gem" / "Tap to claim")
- [ ] Drive show/hide from existing `tooltipText` state set by `onInteractiveOver` / `onInteractiveOut`
- [ ] Verify text remains sharp at all zoom levels (level 0–2, zoom 2.6× → 10.4×) and fits inside the lens (radius 18×2^level)
- [ ] Do NOT regress: click-through to real ruby, fly-to-bag animation, suppression of other header tooltips, magnifier-catcher pointer absorption
- [ ] `bun run build` must pass cleanly

**Acceptance:** On `/garden/article/seeking-community`, with magnifier active, hovering the cloned ruby on the avatar shows a tooltip *inside* the lens that looks identical to the original in-DOM tooltip and stays readable at all three zoom levels.

- Location: `src/components/garden/page-magnifier.tsx`, `src/components/garden/article-inventory.tsx`, `src/components/garden/magnifier-state.ts`

**Context / prior investigation:**
- Path 3 from the handoff (sibling-of-cloneRef inside lensRef, native size, no inverse-scaling) is the recommended approach
- Path 1 (counter-scale via CSS variable) was considered but adds complexity in the cloned tree
- Lens transform is set in `tick()` in `page-magnifier.tsx`
- Constants: `MAGNIFIER_LENS_RADIUS=18`, `MAGNIFIER_LENS_ZOOM=2.6`, `MAGNIFIER_MAX_LEVEL=2`
- Cloned tooltip is hidden globally via `[data-page-magnifier-root] [role="tooltip"] { display:none !important }` — keep that
- Test: clear `localStorage.article-inventory-v1`, reload `http://localhost:3847/garden/article/seeking-community`, toggle magnifier (top-right), hover ruby on avatar
