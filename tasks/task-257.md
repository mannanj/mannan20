### Task 257: Persist article audio playback across navigation

**Status: TODO. Do not implement as part of task creation.**

Move article and reading audio playback out of individual page components so audio can continue playing
after the reader navigates away from the original article, episode, paper, or reading page.

#### Context
- Today, article and paper pages mount `AudioPlayer` locally. Leaving the page unmounts the player and stops
  playback.
- The bottom audio player is already a portal-style bar in `src/components/episodes/audio-player.tsx`.
- Listen controls currently live in:
  - `src/components/episodes/*-article.tsx`
  - `src/components/garden/papers-section.tsx`
  - future Garden written articles that opt into audio assets
- Audio chunk metadata lives in `src/lib/audio-config.ts`.
- The shared inline link/button styling lives in `src/components/pdf-action-row.tsx`.

#### Requirements
- [ ] Audio must continue playing when the user leaves any article, episode, paper, or reading page that
      started playback.
- [ ] The audio player must stay fixed at the bottom of the viewport across route changes.
- [ ] Playback state must be global within the app shell:
  - [ ] current source,
  - [ ] current chunk,
  - [ ] current time,
  - [ ] loading/playing/paused state,
  - [ ] close/dismiss state.
- [ ] Starting a new audio source must replace the previous source cleanly.
- [ ] Returning to the original source page must keep the relevant `Listen` control in the right state:
  - [ ] `Downloading` while loading,
  - [ ] `Playing` or active while playing,
  - [ ] idle when the global player is closed.
- [ ] Article/listen controls must remain asset-gated: do not render source-specific controls unless real
      audio metadata is configured.
- [ ] When the user is no longer on the source page, show a return link flush with the top edge of the
      bottom audio player.
- [ ] Return link copy must be contextual:
  - [ ] `Return to article` for written articles,
  - [ ] `Return to reading` for reading/episode pages,
  - [ ] `Return to paper` for Garden papers,
  - [ ] allow future source types through typed metadata instead of string checks in the UI.
- [ ] The return link must navigate back to the source route or section that started the audio.
- [ ] The return link must use the same cyan inline-action visual language as `Download PDF` and `Listen`.
- [ ] Hovering/focusing the return link must enlarge it slightly, matching the existing action feedback
      pattern.
- [ ] The return link must not appear while the user is already on the source page.
- [ ] The player must remain keyboard accessible:
  - [ ] return link is a real link,
  - [ ] focus ring is visible,
  - [ ] close, play/pause, progress, and chunk buttons still work.
- [ ] Respect `prefers-reduced-motion` for player transition, return-link hover motion, spinner, and waveform.

#### Proposed architecture
- [ ] Add a global audio provider under `src/app/layout.tsx`, likely through a small client component such as
      `src/components/audio/global-audio-provider.tsx`.
- [ ] Move source ownership into a typed global API, for example:
  - `AudioSource.id`
  - `AudioSource.title`
  - `AudioSource.kind: "article" | "reading" | "paper"`
  - `AudioSource.href`
  - `AudioSource.chunks`
- [ ] Create a global player host that renders one `AudioPlayer` instance at the app root.
- [ ] Refactor `AudioPlayer` so it can be controlled by the global provider without remounting on ordinary
      route changes.
- [ ] Replace page-local `showPlayer` / `playerStatus` state with calls into the global audio API.
- [ ] Extend the player bar with a top-attached return affordance when `currentPath !== source.href`.
- [ ] Keep `PdfActionRow`, `PdfDownloadAction`, `PdfListenAction`, and `ArticleListenAction` as the public
      inline controls; do not duplicate their visual style.

#### Suggested files
- Modify: `src/app/layout.tsx`
- Create: `src/components/audio/global-audio-provider.tsx`
- Create: `src/components/audio/use-global-audio.ts`
- Create: `src/components/audio/audio-source-types.ts`
- Modify: `src/components/episodes/audio-player.tsx`
- Modify: `src/components/episodes/immortalism-manifesto-article.tsx`
- Modify: `src/components/episodes/mcp-intent-spike-article.tsx`
- Modify: `src/components/episodes/affiliate-leads-redesign-article.tsx`
- Modify: `src/components/garden/papers-section.tsx`
- Modify: future Garden written article action integration from the header-link task
- Test: `e2e/audio-player.spec.ts`
- Test: `e2e/garden-papers.spec.ts`

#### Test coverage
- [ ] Add an e2e test that starts audio on an episode/reading page, navigates to another route, and confirms
      the bottom player remains visible and playable.
- [ ] Add an e2e test that confirms the return link appears only after leaving the source page.
- [ ] Add an e2e test that clicks `Return to reading` and verifies navigation back to the source route.
- [ ] Add an e2e test that starts Garden paper audio, leaves `/garden`, and verifies `Return to paper`.
- [ ] Add an e2e test that checks return-link hover/focus has the same slight scale feedback as the shared
      inline action links.
- [ ] Add an e2e test that starts one audio source, starts a second source, and verifies only the second
      source remains active.
- [ ] Preserve existing tests for download action states, chunk selection, progress seeking, close behavior,
      and IndexedDB caching.

#### Non-goals
- Do not add playlists or queues.
- Do not autoplay across a fresh browser session.
- Do not persist playback after reload unless the implementation naturally supports it without extra state
  storage.
- Do not show return links for closed players.
- Do not start playback for articles without configured audio assets.

#### Acceptance criteria
- A reader can start audio, navigate elsewhere, and keep listening from the bottom player.
- A contextual cyan `Return to ...` link appears flush above the player only when away from the source page.
- Hovering or focusing the return link gives clear scale feedback before click.
- Clicking the return link navigates back to the original article, reading, or paper.
- Existing page-level listen controls still reflect the global audio state when the user returns.

[Task-257]
