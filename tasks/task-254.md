### Task 254: Anchor Garden article download/listen links to metadata rows

**Status: TODO. Do not implement as part of task creation.**

Add the same compact `Download` and `Listen` action links used by the PDF/reading work to the
Garden article hero metadata row, anchored to the date/read-time/word-count treatment rather than
to the title.

#### Context
- Desired placement: inline with the metadata row/pill that currently shows text like
  `MARCH 15, 2026 · 3 MIN READ` on `Health is an Artform`.
- Latest visual direction:
  - On article pages, do **not** anchor `Download` / `Listen` to the title row.
  - Anchor them to the metadata treatment instead:
    - inline metadata example: `April 7, 2026 · 8 min read · 1,800 words`,
    - pill metadata example: `MARCH 15, 2026 · 3 MIN READ`.
  - The action group must be absolutely placed to the right of the metadata treatment when it fits.
  - The action group must bottom-align to the metadata treatment, not center-align to the title.
  - The metadata text/pill must not move, shift, or expand because actions exist.
  - If the action group cannot fit to the right of the metadata treatment, it may wrap tightly below,
    but the metadata treatment still must not move.
- Current article metadata component:
  - `src/components/article-meta.tsx`
- Current Garden article pages:
  - `src/app/garden/article/health-longevity/page.tsx`
  - `src/app/garden/article/seeking-community/page.tsx`
  - `src/app/garden/article/self-parenting/page.tsx`
  - `src/app/garden/article/ai-false-positives/page.tsx`
  - `src/app/garden/article/taken/page.tsx`
  - `src/app/garden/article/funny-frustrations/page.tsx`
- Reusable action components from Task 252:
  - `src/components/pdf-action-row.tsx`
  - `src/components/header-action-row.tsx`
  - `src/components/episodes/audio-player.tsx`
  - `src/lib/audio-config.ts`
- Recent commits to know:
  - `85699a0 feat: enable garden article reading assets`
  - `1e24850 fix: standardize header action layout`

#### Requirements
- [ ] Add compact `Download` and `Listen` actions inline with the article metadata row.
- [ ] The visible download link text on Garden written articles must be `Download`, not
      `Download PDF`, even when the underlying artifact is a PDF.
- [ ] The actions must sit on the same visual line as the date/read-time where space allows.
- [ ] The action group must be bottom-aligned with the metadata text/pill.
- [ ] The action group must not be anchored to `ArticleTitleRow` or the article title.
- [ ] The article title must not move left/right/up/down when actions render.
- [ ] The metadata row/pill must not move left/right/up/down when actions render.
- [ ] On narrow screens, wrapping should remain intentional and polished; no overlapping text.
- [ ] Use the shared action styling from Task 252 so the links match the reading/PDF action links.
- [ ] `Listen` should open the existing bottom audio player, not a separate audio UI.
- [ ] Only one article listener/player should be active on the page at a time.
- [ ] `Download` should point to a real downloadable article artifact.
- [ ] If an article does not yet have generated audio or a downloadable artifact, create/generate
      the missing asset as part of this task before showing the control.
- [ ] Do not show dead or placeholder `Listen`/`Download` links.
- [ ] Preserve current article title, caption, and layout hierarchy.
- [ ] For article pages that have generated assets but do not currently render `ArticleMeta`,
      add or restore an appropriate metadata row from `src/lib/garden-articles.ts` rather than
      leaving actions title-anchored.

#### Asset requirements
- [ ] Inventory which Garden articles already have audio/download assets.
- [ ] Decide the canonical download format for Garden articles: PDF if available, otherwise
      generated markdown/PDF, then document that choice in the task completion notes.
- [ ] Upload any generated audio/download artifacts to the existing Cloudflare R2 structure.
- [ ] Add typed audio/download config entries so UI code does not hard-code URLs inside page files.

#### Suggested implementation approach
- Extend or wrap `ArticleMeta` so it can accept an `actions` slot, for example:
  ```tsx
  <ArticleMeta
    variant="inline"
    date="April 7, 2026"
    readTime="8 min read"
    wordCount="1,800 words"
    actions={<GardenArticleActions slug="seeking-community" />}
  />
  ```
- Keep `ArticleMeta` responsible for metadata layout, not audio state.
- Implement the positioning inside `ArticleMeta` or a small `ArticleMetaActionRow` helper:
  - render the metadata treatment in normal flow,
  - render the action slot in an absolutely positioned wrapper,
  - use `left-full`/`bottom-0` style placement when the action group fits to the right,
  - fall back to a tight next line when it does not fit,
  - never include the action slot in the metadata element's intrinsic width.
- Create a small Garden article actions component if multiple article pages need the same stateful
  download/listen behavior.
- Reuse `HeaderActionRow`, `PdfDownloadAction`, `PdfListenAction`, and `AudioPlayer` where possible.
- Add Garden article audio chunk arrays to `src/lib/audio-config.ts` only after assets exist.
- Remove `actions={<GardenArticleActions ... />}` from `ArticleTitleRow` usages on Garden article pages.
- Keep or simplify `ArticleTitleRow` only if another page still needs title-adjacent layout; do not
  use it for Garden article download/listen actions after this task.

#### Validation
- [ ] Add focused e2e coverage for `Health is an Artform` proving:
  - date/read-time text remains visible,
  - the pill remains centered where it was,
  - `Download` and `Listen` appear to the right of the pill when they fit,
  - the action group bottom-aligns with the pill,
  - the title remains centered and is not shifted by the actions,
  - clicking `Listen` opens the bottom audio player,
  - clicking `Download` uses a real downloadable URL.
- [ ] Add coverage for at least one non-Health Garden article.
- [ ] Add focused e2e coverage for `On Seeking Community` proving:
  - the actions are no longer aligned with the title row,
  - the actions are to the right of the inline metadata row,
  - the action group bottom-aligns with the inline metadata row,
  - the inline metadata row's position is not changed by actions.
- [ ] Add coverage for a narrow viewport proving:
  - the metadata remains readable,
  - actions wrap tightly below only when they cannot fit to the right,
  - no overlap occurs.
- [ ] Run the relevant Garden article e2e specs.
- [ ] Run `pnpm build`.

#### Non-goals
- Do not redesign the Garden article hero.
- Do not move the metadata row away from the title/caption area.
- Do not add placeholder actions for articles that do not have real assets.
- Do not change the Garden article body content.
- Do not change reading/episode header action layout unless a shared primitive change requires
  preserving existing behavior there.

[Task-254]
