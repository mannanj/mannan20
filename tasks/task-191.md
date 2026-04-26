### Task 191: Health-is-an-Artform — full-page continuous upward bar flow + gold mouse-infection + scene continuity through header

## Current state recap (what's already done)

- ✅ Header is transparent on `/garden/article/health-longevity` so the existing Unicorn Studio scene's edges/glitch bars/glow now extend visually all the way to the top of the page (behind the header).
- ✅ Header bottom border RESTORED (I removed it without consent on the first pass — apologies; that's reverted).
- ⚠️ My first pass at "ambient lines" added a small set of static-position bars at the page edges with `ambientDrift` (gentle ±20px Y wiggle) + `ambientGlitch`. Result is wrong for what you want: (1) the bars don't visibly *flow* upward, they just wiggle in place; (2) they're confined to edges, not behind the article text; (3) they introduced jank near the WebGL canvas (likely caused by `filter: blur + drop-shadow` on the bars sitting next to a high-DPI WebGL canvas — both compete for paint).
- ❌ Telescope (`PageMagnifier`) still shows on this page; you want it removed (it belongs to the community page).
- ❌ No gold-infection mouse hover on the rest of the page (currently only attached to the hero `<section>`).

## Goals (consolidated from your messages)

1. **Continuous upward bar flow across the entire page.** The chunky vertical glitch bars from the hero should appear over the *whole page* — above (already works via header transparency), to the sides, AND behind/through the article body — and they should *visibly drift upward* in a continuous loop. Same chunky aesthetic as the hero (banded multi-stop gradients, varying widths ~10–40px, varying heights, magenta/cyan/lime palette), not thin pinstripes.
2. **No stutter or pop-in.** The hero scene itself must keep playing smoothly — no artifacts/jarring on the man's silhouette.
3. **Gold-infection mouse hover effect, page-wide.** The same hover effect that lights up the hero (the `gold-infection` context — radial CSS-var origin + particle canvas) should respond to mouse movement *anywhere on the article page*, not just inside the hero `<section>`.
4. **Remove the telescope (`PageMagnifier`)** on this page only.
5. **Keep the man's position untouched** and keep the white header border line.

## Question you raised: do I need a new Unicorn Studio scene?

**No, I don't think so — and I think trying to is the wrong path here.** Reasoning:

- The hero scene (`/unicorn/health-hero-scene.json`) is a single composition: man silhouette + side bars + ambient color. It's authored as one scene; we can't "remove the man" from it without re-exporting from Unicorn Studio (which is your tool, not mine to drive). Adding a second instance of that scene over the rest of the page would (a) double the WebGL cost, (b) render a second man somewhere visible, and (c) still be locked to viewport coords — it can't naturally "flow upward."
- The bars in the hero are *part of the scene's animation* — they're not on a separate timeline I can extract. From the screenshot they appear ambient/static-glitch, not actively translating up.
- What you're describing — *bars slowly moving upward across the whole page* — is best done as a **separate CSS/DOM layer** that visually matches the bar style of the hero. That gives me precise control over count, density, motion path, and where they appear (edges + behind text).

So: keep the hero's Unicorn scene exactly as is (man + hero bars stay perfect), and add a hand-built **bar-flow layer** that mimics the hero's bar style across the full page.

## Plan — 4 changes

### 1. New `<HealthBarFlow>` component (replaces `HealthAmbientLines`)

File: `src/components/garden/health-bar-flow.tsx`

- `position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 5` — full viewport, behind article text (`z-20`) but above page bg.
- Renders ~14 chunky bars at deterministic horizontal positions distributed across the **full width** (left edge → through the text column → right edge): e.g. `left: 4%, 9%, 17%, 26%, 35%, 44%, 56%, 64%, 72%, 81%, 88%, 93%, 96%, 99%`. Bars positioned over the text column will be at lower opacity (so they don't fight with reading) — bars on the edges can be more opaque.
- Each bar is a vertical rectangle, width 10–38px, height 90–280px, with a multi-stop banded linear-gradient (`transparent → color → mid → color → transparent`) in one of three palette colors: magenta `255,45,111` / cyan `34,224,255` / lime `124,255,91`. No `filter: blur` or `drop-shadow` — those caused the hero stutter; we use pure gradient + opacity.
- **Upward-flow animation:** new `@keyframes barFlow` that animates `translateY` from `+110vh` to `-30vh` linearly over a long duration (40–70s per bar, staggered). Each bar starts at a random-but-deterministic point in its cycle via a negative `animation-delay`, so on first paint the page is already populated with bars at all stages of their journey — no "first-frame empty" pop-in.
- `will-change: transform` + `transform: translate3d(0,0,0)` on each bar to force GPU compositor layer (so this layer doesn't share paint passes with the hero's WebGL canvas).
- Because the layer is `position: fixed`, the bars float upward through the viewport regardless of scroll — at every scroll position the user sees the same continuous upward stream behind the content, including behind the text.

### 2. Page-wide gold-infection mouse handlers

File: `src/app/garden/article/health-longevity/page.tsx`

- Wrap the whole page render (or `ArticleLayout`'s output) in a client wrapper that attaches `onMouseEnter`/`onMouseMove`/`onMouseLeave` and calls the existing `useOptionalGoldInfection()` hook. The provider (`GoldInfectionProvider`) is already mounted at the `garden/layout.tsx` level, and the particle canvas is rendered globally — we just need to feed it pointer events from outside the hero `<section>`.
- Approach: a small new client component `<HealthGoldHoverShell>` that wraps `children`, with mouse handlers on a `div` covering the article. It does NOT use `pointer-events-none` (we need real events) but it also doesn't intercept clicks — `onMouseMove` etc. don't block them. Article content sits inside as `children`.
- Effect: as the cursor moves across the article body, the gold-infection particle canvas (already mounted globally via `GoldInfectionWrapper`) receives the same origin updates and renders the gold spread/retract just like in the hero.

### 3. Remove telescope on this page

File: `src/components/garden/page-magnifier.tsx`

- Add `const pathname = usePathname()` at top.
- Early-return `null` when `pathname === "/garden/article/health-longevity"`.
- Single-page guard, doesn't touch other garden routes (community, page-magnifier still appears there).

### 4. Cleanup

- Delete the old `ambientDrift` + `ambientGlitch` keyframes from `globals.css` (replaced by `barFlow`).
- Delete `src/components/garden/health-ambient-lines.tsx`.
- Remove its import + usage from `page.tsx` (replaced by `<HealthBarFlow />`).

## Risk / verification checklist

- [ ] Hero scene's smoothness — record visually that the man's silhouette and hero bars look identical to the live reference (no stutter introduced by the new layer).
- [ ] Bars are visibly *flowing upward* across the whole page (not wiggling in place).
- [ ] Bars appear over edges AND through the text area (faintly, at low opacity).
- [ ] Mouse-move anywhere on the page triggers the gold particle effect.
- [ ] Telescope toggle is gone on health-longevity, still present on seeking-community.
- [ ] White header border line remains visible at top.
- [ ] No hydration warnings, no TypeScript errors.

## Implementation status

- [x] Telescope removed from health-longevity (`page-magnifier.tsx` — `usePathname()` early-return on this pathname only).
- [x] `health-bar-flow.tsx` — 14 chunky banded-gradient bars, full-width distribution, `translateY +110vh → -30vh` linearly over 46–65s (staggered with negative `animation-delay` so first paint already shows bars at every cycle position — no pop-in).
- [x] Page-wide gold-infection mouse hover — `health-gold-hover-shell.tsx` wraps the article and forwards `onMouseEnter`/`Move`/`Leave` to the existing `useOptionalGoldInfection()` (provider + particle canvas already global at `garden/layout.tsx`). Validated: dispatching mouse events on a `<p>` 1200px down the page caused `--gr` to grow to 405px and `--gi` to 1.
- [x] Old `HealthAmbientLines` component + `ambientDrift`/`ambientGlitch` keyframes deleted; replaced by `barFlow` keyframe in `globals.css`.
- [x] White header border line restored (apologies for removing it on the first pass).
- [x] `tsc --noEmit` clean.

- Location: `src/components/garden/health-bar-flow.tsx`, `src/components/garden/health-gold-hover-shell.tsx`, `src/components/garden/page-magnifier.tsx`, `src/app/garden/article/health-longevity/page.tsx`, `src/app/globals.css`
