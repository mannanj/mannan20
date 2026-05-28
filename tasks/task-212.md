### Task 212: Custom per-article skeleton loaders so "Next article" / "Additional reading" navigation feels fast and progressive — no stutters

**Why.** Today, clicking "Next article" in the Garden grid or any link in the **Additional Reading** section results in a noticeable pause on slower connections — the browser holds the previous article visible while the next one's payload + chunks arrive, then snaps the new article in. There's no `loading.tsx` anywhere under `src/app/garden/`, so Next.js falls back to "do nothing visible." The article body components are also chunky (`taken-body.tsx` is 37 KB, `seeking-community-body.tsx` is 12.7 KB), which dominates the gap.

The fix is twofold: **(1)** custom skeleton loaders per article, shaped like that article's actual layout — so the transition feels intentional and progressive instead of frozen; **(2)** lean into the App Router's streaming/Suspense behavior so the skeleton appears immediately on click, then progressively swaps to real content as it streams in.

The skeletons should not be generic "gray rectangle" placeholders. Each article has a distinct rhythm — Taken's terminal-style telemetry blocks, Seeking Community's long-form narrative, Health & Longevity's structured sections, AI False Positives' compact list pieces, Funny Frustrations' vignette format. The skeleton mirrors that rhythm so the swap is invisibly smooth.

---

#### Inventory

Five live articles under `src/app/garden/article/`:

1. `taken/` — body: `src/components/garden/taken-body.tsx` (37 KB) — gated by `TakenAccessGate`. Layout = title block + tracking-receipt-style telemetry tables.
2. `seeking-community/` — body: `src/components/garden/seeking-community-body.tsx` (12.7 KB) — long-form essay, photo blocks.
3. `health-longevity/` — body: `src/components/garden/health-article-body.tsx` (4.8 KB) — structured sections.
4. `ai-false-positives/` — body: `src/components/garden/ai-false-positives-body.tsx` (4.6 KB) — short list-driven piece.
5. `funny-frustrations/` — body: `src/components/garden/funny-frustrations-body.tsx` (10.0 KB) — vignette format.

Entry points that trigger article navigation:

- `src/components/garden/article-inventory.tsx` (the Garden grid — "Next article" / sibling links)
- `src/components/garden/additional-reading.tsx` and `additional-reading-popout.tsx` (the in-article "more to read" section)

---

#### Subtasks

##### Foundation: a per-article skeleton primitive

- [ ] Create `src/components/garden/skeletons/article-skeleton-base.tsx` — a shared shell that reproduces `ArticleLayout` + `ArticleHeader` skeleton so the page's *frame* (top padding, max-width, side gutters) exactly matches the real article. Same `pt-40` (or whatever the target uses), same column width, same vertical rhythm. **The only thing that animates between skeleton and real is the inner content** — the frame is pixel-stable to eliminate any reflow stutter.
- [ ] Add a single shimmer / pulse keyframe in `src/app/globals.css` (e.g. `@keyframes skeletonPulse`) — subtle opacity oscillation between ~0.5 and ~0.9. No bright shimmer bands; this site's tone is restrained. Respect `prefers-reduced-motion` — collapse to a static muted block.
- [ ] Use a single skeleton color token (e.g. a near-white with low opacity) sourced from existing CSS vars; do not introduce new colors.

##### Per-article skeletons (the visceral fit)

For each article, build a dedicated skeleton component shaped like the *actual* article layout. The skeleton must match the real component's row count, block heights, and gutter spacing closely enough that the swap feels like content "filling in" — not "redrawing."

- [ ] `src/components/garden/skeletons/taken-skeleton.tsx`
  - Mirrors the gated entry: a placeholder for the access gate + a stack of telemetry-row blocks (label + value pairs, monospaced visual rhythm). Gate visible until passed; the *post-gate* skeleton is what shows on revisit / hot navigation.
  - Roughly 8–12 telemetry rows of varying widths (some ~60% wide, some ~85%) to imply variable-length values.
- [ ] `src/components/garden/skeletons/seeking-community-skeleton.tsx`
  - Long-form: ~6 paragraph blocks (3–5 lines each, last line shorter), with 1–2 image-aspect placeholders interleaved.
- [ ] `src/components/garden/skeletons/health-article-skeleton.tsx`
  - Structured: ~3 section headers + 2–3 paragraphs each.
- [ ] `src/components/garden/skeletons/ai-false-positives-skeleton.tsx`
  - List-driven: ~5–7 list-item blocks with a leading bullet/number marker.
- [ ] `src/components/garden/skeletons/funny-frustrations-skeleton.tsx`
  - Vignette format: ~4 short blocks separated by visible dividers, each with a small heading + 2-line body.

Each skeleton component must:
- Be a server component (no client JS) — pure markup + CSS.
- Use the same `ArticleLayout` wrapper + same `topPadding` value as its real article so the header/title region doesn't shift.
- Avoid any layout-affecting animations (no width/height keyframes — opacity only).

##### Wire the App Router streaming slots

- [ ] For each of the five article routes, add a sibling `loading.tsx` that renders the matching skeleton:
  - `src/app/garden/article/taken/loading.tsx`
  - `src/app/garden/article/seeking-community/loading.tsx`
  - `src/app/garden/article/health-longevity/loading.tsx`
  - `src/app/garden/article/ai-false-positives/loading.tsx`
  - `src/app/garden/article/funny-frustrations/loading.tsx`
- [ ] Add `src/app/garden/loading.tsx` for the index too — generic "garden grid" skeleton (article cards in a grid).
- [ ] Confirm Next.js App Router serves `loading.tsx` immediately on navigation start; the skeleton becomes the visible state during the chunk fetch.

##### Make the navigation itself feel fast

- [ ] Verify article links use `next/link` with default prefetching (most likely already true — confirm in `article-inventory.tsx`, `additional-reading.tsx`, `additional-reading-popout.tsx`). Prefetch on hover/viewport means the chunk is often already warm by click time.
- [ ] Identify any heavy imports that block first paint. `taken-body.tsx` at 37 KB likely contains big static data structures — investigate whether portions can be:
  - Lazy-loaded with `next/dynamic` and rendered inside a `<Suspense fallback={…}>` boundary, so the article header + above-the-fold text renders instantly while telemetry blocks stream in below.
  - Split into smaller server components so the streaming SSR can flush the top of the article before the bottom is ready.
- [ ] Add `<Suspense>` boundaries inside the heavier article bodies (Taken, Seeking Community) around clearly-deferrable sections, with a tiny inline skeleton fallback (re-use the per-article skeleton primitives, scoped to just that section).

##### Validation

- [ ] Throttle network to "Slow 3G" in DevTools and click between every pair of articles via:
  - Garden grid → article
  - In-article "Next article" / Additional Reading → next article
  - Browser back/forward
- [ ] In every case, confirm: skeleton appears within 1 frame of the click; layout is stable; real content fills in without a visible jump or reflow.
- [ ] Run Lighthouse on each article — CLS should remain ~0; LCP shouldn't regress.
- [ ] Check on a real iOS Safari device — App Router streaming behaves slightly differently there.
- [ ] Verify with `prefers-reduced-motion: reduce` that no skeleton oscillates.

##### Out of scope

- No view transitions API (separate task — would be a sibling enhancement).
- No persisted "last article read" indicator on the skeleton.
- Don't change the article copy or visual design of the real article bodies — skeletons must conform to the existing layout, not the other way around.

---

- Location:
  - `src/app/garden/article/{taken,seeking-community,health-longevity,ai-false-positives,funny-frustrations}/loading.tsx` (new)
  - `src/app/garden/loading.tsx` (new)
  - `src/components/garden/skeletons/` (new directory)
  - `src/app/globals.css` (add `@keyframes skeletonPulse` + `prefers-reduced-motion` guard)
  - Possible `<Suspense>` boundary edits inside `taken-body.tsx`, `seeking-community-body.tsx`

[Task-212]
