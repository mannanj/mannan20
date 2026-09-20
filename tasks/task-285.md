### Task 285: "What Andrew Huberman Didn't Say" short + Shorts section
- [x] Make the YouTube popout reusable outside the homepage (`VideoPopoutHost` owns the `open-video-popout` listener; `about.tsx` uses it controlled so the `?video=archr` deep link and same-URL toggle are unchanged)
- [x] Add `YoutubeInlineButton` + `YoutubeIcon` for an inline, in-paragraph video trigger
- [x] New article at `/garden/article/what-huberman-didnt-say` with painted sunrise/sunset backdrop
- [x] Add `short?: boolean` to `GardenArticle` and render a Shorts group above the longform list
- [x] Narrate with Kokoro (`af_heart`), upload to R2, wire the Listen action
- [x] MCP content file + snapshot rebuild, sitemap picked up via the shared array
- [x] e2e coverage for the new article, and regression coverage for the existing Watch demo / ARCHR deep-link flow
- Location: `src/app/garden/article/what-huberman-didnt-say`, `src/components/garden`, `src/components/video-popout-host.tsx`, `src/components/youtube-inline-button.tsx`, `src/lib/garden-articles.ts`, `e2e/huberman-short.spec.ts`
