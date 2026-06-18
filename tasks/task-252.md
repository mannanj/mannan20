### Task 252: Standardize PDF download and listen action links

**Status: DONE.**

Create a shared action-link pattern for PDF downloads and PDF listening across reading
articles and Garden writings.

#### Context
- Reading article pages already use a compact cyan `Download PDF` text link with the rotated
  arrow glyph.
- Garden paper links should use the same wording and visual treatment.
- Garden papers now add temporary download feedback states:
  - `Download PDF`
  - `Downloading`
  - `Downloaded`
  - after a 5 second delay, `Download again`
- The same debounce/feedback behavior should be standardized instead of copy-pasted.
- Future PDF listening controls should sit inline with the download link.

#### Requirements
- [x] Create or identify a reusable component for article/Garden PDF actions.
- [x] Preserve the existing reading article download link style and wording:
      `Download PDF` plus the rotated arrow glyph.
- [x] Standardize download click limiting:
  - [x] Allow one download click at a time.
  - [x] Show an inline spinner and `Downloading` immediately after click.
  - [x] Show a check mark and `Downloaded` after the download starts.
  - [x] Keep repeat clicks disabled while in `Downloading` or `Downloaded`.
  - [x] After 5 seconds, show a refresh icon and `Download again`.
- [x] Apply the standardized download action to reading article pages and Garden paper links.
- [x] Add an inline `Listen` action for Garden paper PDFs.
- [x] Allow only one PDF listener/player to be active at a time across the visible page.
- [x] Keep download and listen controls visually aligned as one inline action row.
- [x] Respect `prefers-reduced-motion` for spinner/progress animation.
- [x] Generate and upload Garden paper PDF audio chunks to Cloudflare R2.
- [x] Add focused e2e coverage for:
  - [x] shared download wording/style,
  - [x] debounce/delay state transitions,
  - [x] one active PDF listener at a time,
  - [x] Garden paper listen controls appearing inline with download links.

#### Implementation note
- Garden paper download idle copy intentionally remains `Download` per accepted follow-up
  UI feedback; reading articles retain `Download PDF` plus the rotated arrow glyph.
- Garden PDF `Listen` uses the shared article audio player with generated Kokoro wav chunks
  served from Cloudflare R2 at `portfolio/audio/gmu-archr/` and `portfolio/audio/omf-dr/`.

#### Non-goals
- Do not replace the native PDF iframe previews.
- Do not change the article body layouts beyond the inline action row.

[Task-252]
