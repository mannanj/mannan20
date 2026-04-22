### Task 169: [DEFERRED] Standardize article hero spacing between Community & Health

**Status:** attempted, reverted — caused visual regressions on unicorn graphic. Retry later.

**Goal:** Both garden articles share identical structural spacing. The ONLY differences allowed:
1. Top image/animation (height + which component)
2. Title variant (`community` vs `editorial` on `ArticleTitle`)
3. Meta type (`inline` vs `pill` on `ArticleMeta`)

**Current problem on Health article:**
- Meta pill → first body paragraph gap is massive (~129px).
- Community's equivalent gap is ~24px (driven by `ArticleMeta` inline `mb-6`).
- Inconsistency caused by structural difference: Health overlays caption/title/meta on a 900px full-bleed hero with `justify-end pb-[113px]`; Community flows them inline in the `max-w-2xl` column.

**Proposed approach (for retry):**
- Move caption/title/meta OUT of `GardenHero` into the page's content column, so both articles flow: graphic → caption → title → meta → body.
- Bake spacing into the reusable components:
  - `ArticleCaption`: `mb-2`
  - `ArticleTitle` both variants: `mb-2`
  - `ArticleMeta` both variants: `mb-6`
- `GardenHero` becomes graphic-only (configurable height + scene path + translate).
- Wrap Health's cluster in `flex flex-col items-center` for centered editorial alignment.

**Why the first attempt broke:**
- Shrinking `GardenHero` height to ~520px cropped the UnicornScene's working area, breaking the visible silhouette composition.
- The Unicorn animation is authored assuming a ~900px canvas — resizing requires re-tuning DPI / scene viewport.
- Need to keep hero at full 720/900 but figure out cleaner overlay vs flow pattern.

**Open questions to answer before retry:**
- Should Health's graphic remain full-bleed or match Community's inset-within-column pattern?
- If full-bleed, how do caption/title/meta visually attach to the graphic (overlay) while spacing-consistent with Community's inline flow?
- Can the editorial cluster sit inside the hero AND have community-equivalent gap to body (likely requires pulling body up with negative margin OR shrinking hero).

- Location: `src/components/garden/garden-hero.tsx`, `src/app/garden/article/health-longevity/page.tsx`, `src/components/article-title.tsx`, `src/components/article-meta.tsx`
