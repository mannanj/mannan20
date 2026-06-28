### Task 253: Keep audio player part labels on one line

**Status: TODO. Do not implement as part of task creation.**

Update the bottom audio player so chunk selector labels such as `Part 1`, `Part 5`, and
`Part 10` never wrap across two lines.

#### Context
- Current surface: the fixed bottom audio player opened by reading/article/PDF `Listen`.
- Current implementation:
  - `src/components/episodes/audio-player.tsx`
- Current issue:
  - In the bottom player, each chunk selector can wrap `Part` and the number onto separate
    lines, especially when the player has many chunks.
  - The expected visual is a compact one-line label: `Part 1`, `Part 2`, `Part 10`, etc.

#### Requirements
- [ ] Keep every chunk selector label on one line.
- [ ] Preserve horizontal scrolling for long chunk lists.
- [ ] Do not make the bottom player taller just to fit chunk labels.
- [ ] Keep the selected chunk styling intact.
- [ ] Keep the controls usable on desktop and mobile widths.
- [ ] Verify `Part 10` also stays on one line, not only single-digit parts.
- [ ] Add focused e2e or component coverage proving the labels do not wrap.

#### Suggested implementation approach
- In `src/components/episodes/audio-player.tsx`, update chunk selector buttons with a
  no-wrap class such as `whitespace-nowrap`.
- Consider keeping each button width content-based while preserving the existing scroll container.
- If needed, slightly increase the selector container max width on desktop, but do not let it
  crowd the play button, progress bar, time display, or close button.

#### Validation
- [ ] Run `pnpm test:e2e e2e/garden-papers.spec.ts --grep "paper Listen opens"`.
- [ ] Run a focused Playwright check or screenshot assertion for a 10-part paper audio player.
- [ ] Run `pnpm build`.

#### Non-goals
- Do not redesign the whole audio player.
- Do not change audio chunk counts or audio URLs.
- Do not change playback behavior.

[Task-253]
