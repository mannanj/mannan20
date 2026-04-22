### Task 166: Reusable ArticleTitle + ArticleMeta components, tighten health hero spacing
- [x] Create `ArticleTitle` with `community` (default) and `editorial` variants
- [x] Create `ArticleMeta` with `inline` (default) and `pill` variants, supports date/readTime/wordCount
- [x] Refactor `GardenHero` to use both components internally
- [x] Tighten title↔meta gap in hero (gap-6 flex split → inner gap-3 cluster)
- [x] Refactor `seeking-community-body` to use both components
- Location: `src/components/article-title.tsx`, `src/components/article-meta.tsx`, `src/components/garden/garden-hero.tsx`, `src/components/garden/seeking-community-body.tsx`
