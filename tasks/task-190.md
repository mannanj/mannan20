### Task 190: Page Magnifier — fix recurring "lens goes black" bug

- [x] Diagnose root cause (cloned canvas `z-index: -1` sinks behind opaque page wrapper)
- [x] Try hybrid rewrite: snapdom snapshot + `canvas.captureStream()` overlay
- [x] **Reverted hybrid** — too laggy in real use, snapshot-stale content showed wrong page state
- [x] Apply Approach A targeted patches: mirror source z-index, set explicit width/height, drop `garden-wrapper` hack, debounce rebuild
- [x] Playwright regression test asserting lens is non-uniform (catches "lens went black" on any future page)
- [x] Visual smoke test capturing all 3 zoom levels
- [x] Console-error test
- Location: `src/components/garden/page-magnifier.tsx`, `e2e/community-magnifier.spec.ts`, `e2e/community-magnifier-visual.spec.ts`, `e2e/community-magnifier-console.spec.ts`

---

## Problem

User reports zoom is broken on the community page (`/garden/article/seeking-community`).
Inside the lens: black background, no nodes, no meteors, no edges. Outside the lens
the page renders fine. Bug has recurred multiple times across changes — keeps coming back.

Screenshots: lens shows solid `#0b0b0b` with surrounding text only; canvas content
(nodes/meteors/comets) entirely missing.

## Root cause (current architecture)

`page-magnifier.tsx` clones `document.body` into a transformed div for the lens, then
mutates the cloned magnifiable canvas:

```ts
bodyClone.querySelectorAll("canvas[data-magnifiable]").forEach((c) => {
  c.style.zIndex = "-1";           // ← causes the bug
});
// in copyCanvas:
dst.style.position = "absolute";   // flips stacking from fixed → absolute
dst.style.top = `${window.scrollY}px`;
dst.style.left = "0px";
```

In the live DOM the canvas is `fixed inset-0 z-0` → its own stacking context above
the in-flow wrapper. In the clone the canvas becomes `position: absolute; z-index: -1`,
and the article wrapper `<div className="min-h-screen bg-[#0b0b0b]">`
(`article-layout.tsx:29`) is `z-auto, in-flow, opaque` → it paints on top of the
`z: -1` canvas. Lens turns black; canvas content vanishes.

Secondary issues:
1. `dst.style.width/height` never set, so `inset-0` (right:0; bottom:0) re-asserts
   on scroll → box collapses or stretches oddly.
2. `buildClone()` runs on every scroll/resize → flicker, races against `copyCanvas`.
3. `garden-wrapper` z-index override targets the **header plant icon**
   (`header.tsx:621`), not any content wrapper — does nothing useful.

**Why it keeps recurring**: DOM cloning replicates rendering manually. Any new
wrapper, stacking context, or background re-triggers the same class of bug. There
is no test for "lens isn't solid background", so regressions are invisible.

---

## Approaches considered (research log — keep for future reference)

### Approach A — Targeted patches to existing DOM-clone (ORIGINAL PLAN, NOT TAKEN)

This was the **first plan** before the user asked for deeper research. It's a
3-layer patch to the existing DOM-clone architecture — fixes the symptom but
keeps the brittle foundation. We did **not** ship this; we chose Approach G
(hybrid) instead. **Documented here in full so we can revert to it quickly if
the hybrid rewrite fails.**

Layer 1 — fix the immediate bug (`page-magnifier.tsx`):
- Remove `c.style.zIndex = "-1"`. Mirror source z-index instead:
  `dst.style.zIndex = getComputedStyle(src).zIndex || "0"`.
- In `copyCanvas`, neutralize `inset-0` after switching to absolute:
  set `right: auto; bottom: auto; width: ${viewportW}px; height: ${viewportH}px`.
- Drop the `garden-wrapper` z-index override entirely (wrong target — it's the
  header plant icon, not a content wrapper).

Layer 2 — make the lens resilient by construction:
- Build the clone once on enable; rebuild only on real DOM mutations (debounced
  `MutationObserver`). On scroll/resize only update `transform` on `cloneRoot`
  and `top: scrollY` on the cloned canvas. Removes per-frame flicker and
  stacking-mid-rebuild races.
- Wrap `cloneRoot` in `isolation: isolate; contain: layout paint` so the cloned
  page has its own stacking context — host page can't leak in.
- Extract `cloneMagnifiableCanvas(src, dst)` helper owning: matching `width`/
  `height` attrs (DPR-aware), CSS box from `getBoundingClientRect()` (not pixel
  attrs), preserving z-index, and `drawImage`. One choke point.

Layer 3 — prevent regression:
- Playwright test: open lens, capture lens bbox, assert >N% non-`#0b0b0b`
  pixels. Catches "lens went black" on any page using `[data-magnifiable]`.
- Dev-only runtime check: console-warn if cloned canvas z-index ≠ source's, or
  if cloneRoot's first opaque child has lower z-index than the canvas.
- Comment block at top of `page-magnifier.tsx` listing invariants pages must
  respect (canvas must be `fixed` with explicit `z-index`; opaque page bg must
  not sit at `z-auto` above `z: 0`; no `data-testid="garden-wrapper"`
  repurposing).

**Why we did not ship this**: it patches a leaky abstraction. Every future page
addition or wrapper change is one stacking surprise away from breaking the lens
again. The user asked for a robust solution that doesn't keep coming back —
patching the DOM-clone approach doesn't meet that bar.

### Approach B — CSS `element()` background (REJECTED — Firefox only)

`-moz-element(#id)` lets a live DOM element be a CSS background-image. Truly live,
zero cloning, perfect for a circular lens. Firefox-only since 2011, never shipped
in Chrome/Safari (Chromium issue 40389086 — won't fix). Dead end for public web.

### Approach C — `getDisplayMedia()` / Screen Capture (REJECTED — UX)

Captures full screen → `MediaStream` → `<video>` → magnify with `transform: scale`
or WebGL fragment shader. Truly live, GPU-accelerated, handles everything (canvas,
WebGL, video, iframe). Hard blocker: requires user permission prompt every time.
Unacceptable for a hover lens.

### Approach D — `html2canvas` (REJECTED — too slow)

Walks DOM, reimplements layout/paint into a canvas. 50-300ms per snapshot.
CORS-tainted. Wrong tool for this.

### Approach E — `HTMLElement.captureStream()` (REJECTED — doesn't exist)

Was prototyped only on Firefox as `mozCaptureStream`, removed. No standard.

### Approach F — SVG `<foreignObject>` mirror (REJECTED — same as #3 internally)

Embed DOM clone in SVG, apply SVG filter. This is what snapdom/dom-to-image use
internally. Manually requires inlining all CSS. Not live. Same CORS taint.

### Approach G — Hybrid: snapdom + `canvas.captureStream()` (TRIED, REVERTED)

Two stacked layers inside the lens circle:

1. **HTML/text/images layer** — `snapdom(document.documentElement)` once on lens
   activation → result becomes `background-image` on lens div with `background-size:
   200%/400%` and cursor-driven `background-position`. Re-snapshot only on scroll
   (debounced ~100ms) and on `MutationObserver` events. ~5-30ms cost, GPU-composited,
   sidesteps stacking-context bugs entirely (sampling pixels, not DOM).

2. **Live canvas layer** — `canvas.captureStream()` → `<video>` clipped inside lens,
   layered above snapshot. Live nodes/meteors/comets at 60fps via GPU pipe, zero
   cloning.

Why durable:
- No DOM cloning → no class of bug where wrappers/z-index/backgrounds hide content.
- No per-frame work on the host page → snapshot reused across cursor moves;
  captureStream is a GPU pipe, not JS.
- No special-cases per page — new pages with `[data-magnifiable]` Just Work.
- Browser support: snapdom is pure JS; `canvas.captureStream` in all evergreen
  browsers (Chrome 51+, Firefox, Safari 16.4+).

Tradeoffs:
- snapdom adds ~30 KB → lazy-load inside `PageMagnifier` so only lens users pay.
- HTML layer is a snapshot, not live — text selections, hovers, animations on HTML
  don't update inside lens. Acceptable for click-through circular lens.
- Cross-origin images without CORS taint snapshot. Vercel Blob (`hq19kliyhzkpvads…`)
  should serve permissive CORS — verify during implementation.

**Why we reverted from Approach G to Approach A**:
User testing (including incognito) reported the hybrid approach was very laggy
and showed wrong content. Root causes:
1. snapdom snapshot of `document.documentElement` on a long article page takes
   ~80-300ms per refresh — too slow for live magnification. Even with debouncing,
   the snapshot lagged behind scroll, producing a "ghost page" effect.
2. Fixed-position elements (header) baked into the snapshot at the position they
   occupied at snapshot-time, which then translated incorrectly when the user
   scrolled — wrong content appeared at unexpected document coordinates.
3. The 30 KB lazy-loaded chunk + per-snapshot serialization → SVG → image decode
   pipeline introduces visible jank on every refresh.

The hybrid is theoretically more robust, but in practice the snapshot-based
approach can't keep up with continuous user input on a long page. The targeted
patches in Approach A fix the actual bug (z-index hierarchy in clone) without
adding the snapshot pipeline overhead.

## Adversarial review findings (post-ship validation)

After shipping, ran a code-reviewer pass. Confirmed issues, in-scope fixes:

### High — fixing now
1. **Per-frame React re-render via `forceTick`.** Used only to update the
   cosmetic `+` cursor SVG position. Causes a full reconcile every frame at
   60fps. Drop `forceTick`; drive the cursor SVG imperatively via a ref.
2. **Stale clone — no MutationObserver.** Clone only rebuilds on
   scroll/resize/initial mount. Inventory bag opening, splats appearing,
   FlyingEgg portals, ThrowOverlay being added — none trigger a rebuild. Add
   debounced `MutationObserver` on `document.body`.
3. **`wheel` and `contextmenu` not swallowed.** Right-click in the lens shows
   the browser context menu (e.g. "Save image" on the canvas) breaking the
   illusion. Wheel passes through to handlers under the lens. Add to swallow
   list.

### Acknowledged, not changing
- **DraggablePopout drag broken while lens open.** Confirmed by user as
  intended ("don't need to move popouts with the lens open").
- **Tab key navigation under lens.** Low impact; would require keymap that
  swallows Tab too. Skipping unless reported.
- **Canvas index-pairing fragility.** Currently aligned (filter on live side
  matches removal on clone side). Latent only — leaving as-is with a comment.
- **Rapid toggle race.** Theoretical; React batches state updates so the
  enabled effect cleanup runs before the next effect setup. Leaving.

### Out of scope
Other e2e failures observed during validation (health-article, contact-form,
gem-rain, etc.) are not magnifier-related. Not investigating.

## Final implementation (Approach A, what shipped)

In `page-magnifier.tsx`:
- Removed `c.style.zIndex = "-1"`. Replaced with `styleClonedCanvas()` helper
  that mirrors `getComputedStyle(src).zIndex` (defaults to "0").
- Set explicit `style.width/height = innerWidth/innerHeight` and
  `right: auto; bottom: auto` so the cloned canvas's CSS box doesn't collapse
  when `inset-0` from the className tries to re-assert.
- Removed the `garden-wrapper` z-index override entirely (wrong target).
- Added `isolation: isolate` on the lens div + `contain: layout paint` on the
  cloneRoot so the lens is its own stacking context.
- Debounced `buildClone` on scroll/resize (200ms) — full DOM clones still happen
  on real scroll/resize but not per-frame.

Tests live at:
- `e2e/community-magnifier.spec.ts` — pixel histogram assertion (lens not solid bg).
- `e2e/community-magnifier-visual.spec.ts` — captures all 3 zoom levels.
- `e2e/community-magnifier-console.spec.ts` — no console errors when toggled.

snapdom dependency was added (`@zumer/snapdom@2.9.0`) but is no longer used by
`page-magnifier.tsx`. Could be removed; leaving in `package.json` for now in
case we revisit Approach G with optimizations (e.g. snapshotting only the lens
viewport region instead of the whole document).
