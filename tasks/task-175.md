### Task 175: Full-page fixed stars backdrop on /garden/article/seeking-community

Lift the `CommunityNodes` canvas out of the 349px inline graphic slot and pin it as a fixed, full-viewport backdrop behind the entire community article. Page chrome (header, title, body copy, meta, `ArticleNav` controls) reads on top of the stars; scrolling the article slides content over a stationary star sky (fixed-position parallax). Star/row/dust density stays at the resolution shown in the reference screenshot — i.e. spacing constants and density multipliers are preserved while overall canvas dimensions grow to fill the viewport.

#### Goals
- Stars cover **100vw × 100vh** and stay put while the article scrolls (`position: fixed`, behind content).
- All article elements (header copy, title, meta, prose, control bar) remain fully legible above the stars.
- Existing star/row/comet/galaxy/sun behaviour is untouched — only the surface it draws on changes.
- Density (rows, stars, dust) at the new size matches the screenshot — no thinning, no clumping.

#### Subtasks
- [ ] Add a `fullViewport` (or similar) variant of `CommunityNodes` so it sizes from `window.innerWidth/innerHeight` instead of `container.clientWidth/clientHeight`. Wrap container in `fixed inset-0 -z-0` (behind content) with `pointer-events-none` so text/links/nav stay interactive.
- [ ] Add a `resize` listener that rebuilds the canvas backing store + regenerates nodes/edges/dust on viewport changes (debounced). Current effect runs once on mount with fixed dims — must react to viewport resize for the full-page version.
- [ ] Verify density constants still hit the screenshot resolution at desktop sizes:
  - `ROW_SPACING = 30.5`, `ROW_PADDING_TOP = 11`, `TARGET_COL_SPACING = 124` — leave as-is so row/col counts scale with viewport area.
  - Dust multipliers (`DUST_TINY_COUNT_MULTIPLIER`, `DUST_COUNT_MULTIPLIER`, `DUST_MID_COUNT_MULTIPLIER`) scale off `nodes.length`, so they auto-track. Confirm visually.
- [ ] Decide on the magnifier lens: with `pointer-events-none` the existing lens cannot receive `pointermove`. Either (a) drop the lens for the full-page variant, or (b) keep an opt-in interactive sub-layer. Default plan: **drop the lens** for this variant — full-page version is ambient backdrop, not a focal interactive element. Confirm with user before implementing if uncertain.
- [ ] Update `src/app/garden/article/seeking-community/page.tsx`:
  - Remove the `graphic` + `graphicLayout="inline"` props (no inline 349px slot).
  - Render the new full-viewport backdrop component at the page root (sibling to `ArticleLayout`, or via a new `backdrop` prop on `ArticleLayout`).
  - Restore default top padding (`pt-8`) since the inline graphic is gone.
- [ ] Update `src/components/article-layout.tsx` (if needed): allow rendering a fixed `backdrop` slot. Make the layout's `bg-[#0b0b0b]` either transparent for this article, or move the dark base colour to the backdrop layer so stars still read against pure black.
- [ ] Stacking: backdrop `z-0`, layout content `relative z-10`. No element except the backdrop should set `position: fixed` in this stack.
- [ ] Verify the article header preview (`community-nodes-preview.tsx`) and `/garden` index card are **not** affected — only the article page changes. The preview keeps its bounded inline canvas.
- [ ] Visual QA at 1440px, 1920px, 1280px, and a tall page-scroll: confirm stars feel stationary, content scrolls cleanly over them, no horizontal overflow, no flicker on resize.
- [ ] Lighthouse / perf sanity: a viewport-sized canvas with more nodes and dust will cost more per frame. Confirm rAF cost stays acceptable; cap dpr at 2 (already done) and consider capping max nodes if very large monitors push counts too high.
- Location: `src/app/garden/article/seeking-community/page.tsx`, `src/components/garden/community-nodes.tsx`, `src/components/article-layout.tsx`

#### Open questions for user before implementing
1. **Lens magnifier**: keep it on the full-page backdrop (requires re-architecting interaction) or drop it for this variant? Default: drop.
2. **Other articles**: should the same fixed-backdrop treatment apply to the other `/garden/article/*` pages, or only to `seeking-community`? Default: only `seeking-community` for now.
3. **Mobile**: stars on mobile too, or desktop-only (perf / readability)? Default: enabled everywhere, with the same density rules.
