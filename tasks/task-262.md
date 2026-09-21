### Task 262: Garden article — "The Basics of Health" (fundamentals / first principles)

A new long-form garden article laying out the *foundations* of health from first
principles. Companion piece to the existing "Health is an Artform"
(`health-longevity`) — that one is the personal/narrative arc; this one is the
practical fundamentals. Voice: first-person conviction earned from a decade of
practice — same register as `health-longevity`.

Content is partial — Mannan will share more pillars later. Build it so sections
are additive (one `<p>`/sub-section per pillar) and leave the structure open.

#### Content pillars (expand as more is shared)
- [ ] **Movement lubricates the body.** Motion is what keeps tissue alive and
      nourished — cells, muscles, ligaments, tendons, fascia, joints, lymph.
      Stillness starves; movement circulates. Frame movement as maintenance, not
      exercise-for-aesthetics.
- [ ] **Light drives our cellular chemistry & hormones.** Light is pivotal for
      cellular chemistry and whole-body hormonal production. *Sunlight* is the
      irreplaceable input (circadian signaling, etc.). Artificial light —
      including "sun-simulating" / full-spectrum bulbs marketed as a substitute —
      is harmful, misleading, and not a true replacement.
- [ ] **Water is structured, not just H₂O.** The magnetic / structured nature of
      water matters more than people think. Reverse-osmosis (RO) water does *not*
      replace this — stripping it of structure (and minerals) leaves "empty"
      water.
- [ ] **Salt & enzymes.** (Author to expand.) Real/mineral salt as an essential
      input; enzymes as the machinery of digestion & metabolism. Stub the section
      and flesh out when Mannan shares more.
- [ ] **(reserved)** Additional pillars — Mannan said "I can share more later."
      Keep the section list easy to extend.

#### Reuse what's already in the repo (per "other data already saved here")
- [ ] Mirror the existing health article's scaffolding rather than rebuilding:
      `ArticleLayout` + `ArticleHeader` / `ArticleCaption` / `ArticleTitle` /
      `ArticleTitleRow` / `ArticleMeta` + `GardenArticleActions`
      (see `src/app/garden/article/health-longevity/page.tsx`).
- [ ] Decide whether to reuse `HealthGoldHoverShell` + `GardenHero` hero treatment
      (the Unicorn "Health is an Artform" scene) or give this piece its own
      graphic. Cross-link the two articles either way.
- [ ] Author body as a sibling to `HealthArticleBody` (new
      `health-basics-article-body.tsx` using shared `ArticleBody`,
      `AdditionalReading`, `ArticleViews`) — do **not** overload the existing one.

#### Build steps (author → page → registry → MCP)
- [ ] Pick slug + title. Suggested slug `health-basics` (title e.g. "The Basics
      of Health" or "Health, From First Principles") — confirm with Mannan.
- [ ] Create route `src/app/garden/article/<slug>/page.tsx` with `metadata`
      (title/description + OpenGraph `type: article`, `publishedTime`, author,
      canonical `url`) + Twitter card — match the health-longevity page.
- [ ] Write the body component under `src/components/garden/`.
- [ ] Register in `GARDEN_ARTICLES` (`src/lib/garden-articles.ts`): title,
      description, `date`, `readingTime`, `wordCount`, `href`. (Public by default —
      omit `hidden`/`unavailable` unless Mannan wants it gated.)
- [ ] Regenerate the MCP snapshot so `list_writing`/`llms.txt` pick it up:
      `bun run mcp:build`, commit the regenerated `mcp-worker/src/data.generated.json`
      + `public/llms.txt`, then `bun run mcp:deploy`. (`bun run mcp:check` for drift.)
      If it should NOT be exposed publicly, set `robots: index:false` so the build
      guard keeps it out of the MCP.
- [ ] E2E: add/extend a garden article spec; verify the route renders, appears in
      the garden listing, and the actions (views/share) work. Mutation-test the
      load-bearing assertion.

- Location: `src/app/garden/article/<slug>/page.tsx`, `src/components/garden/health-basics-article-body.tsx`, `src/lib/garden-articles.ts`, `mcp-worker/src/data.generated.json`, `public/llms.txt`; reference `src/app/garden/article/health-longevity/page.tsx` + `src/components/garden/health-article-body.tsx`

[Task-262]
