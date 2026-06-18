### Task 252: Standardize PDF download and listen action links

**Status: TODO. Do not implement as part of task creation.**

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
- [ ] Create or identify a reusable component for article/Garden PDF actions.
- [ ] Preserve the existing reading article download link style and wording:
      `Download PDF` plus the rotated arrow glyph.
- [ ] Standardize download click limiting:
  - [ ] Allow one download click at a time.
  - [ ] Show an inline spinner and `Downloading` immediately after click.
  - [ ] Show a check mark and `Downloaded` after the download starts.
  - [ ] Keep repeat clicks disabled while in `Downloading` or `Downloaded`.
  - [ ] After 5 seconds, show a refresh icon and `Download again`.
- [ ] Apply the standardized download action to reading article pages and Garden paper links.
- [ ] Add an inline `Listen` action for Garden paper PDFs.
- [ ] Allow only one PDF listener/player to be active at a time across the visible page.
- [ ] Keep download and listen controls visually aligned as one inline action row.
- [ ] Respect `prefers-reduced-motion` for spinner/progress animation.
- [ ] Add focused e2e coverage for:
  - [ ] shared download wording/style,
  - [ ] debounce/delay state transitions,
  - [ ] one active PDF listener at a time,
  - [ ] Garden paper listen controls appearing inline with download links.

#### Non-goals
- Do not replace the native PDF iframe previews.
- Do not implement full PDF audio generation without a separate audio/content pipeline decision.
- Do not change the article body layouts beyond the inline action row.

[Task-252]
