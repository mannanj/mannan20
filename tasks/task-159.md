### Task 159: Clone faydakrouri.com article style for Seeking Community (redo properly)

**Status:** not started &mdash; previous attempt abandoned and reverted.

- [ ] Full visual + structural clone of the inspiration article
- [ ] Stand up a dedicated article variant / route (do not shoehorn a toggle)
- [ ] Match typography, spacing, color tokens, and layout shell pixel-close
- [ ] Validate against the live inspiration side-by-side in a browser
- Location: `src/components/garden/seeking-community-body.tsx`, `src/app/garden/article/seeking-community/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`

---

#### Inspiration (source of truth)
- **Live page:** https://faydakrouri.com/thoughts/how-ai-made-me-a-builder/?utm_source=substack&utm_medium=email
- **Intent:** bring the text closer, close gaps, smaller font, more considered typography &mdash; a quiet, readerly essay layout.

#### What was measured from the source (for reference; re-verify at clone time)
- Page shell is Astro; article CSS at `faydakrouri.com/_astro/how-ai-made-me-a-builder.*.css`.
- Root tokens observed:
  - `--content-max-width: 592px`, `--padding-x: 22px`, `--padding-y: 43px`
  - `--color-text: #656565`, `--color-text-secondary: #000`, `--color-text-tertiary: #949494`
  - `--color-bg: #ffffff`, `--font-size-base: 14px`
- Font: **Inter 400**, letter-spacing `0.01em` on body `p`.
- Rhythm: article `gap: 20px` between blocks, section `gap: 15px` inside. Title/section titles are the same 14px / weight 400 / `#000`.
- Back link + meta header row sits above an `intro` block (title only), then the article body.

#### Why the previous attempt did not meet the bar
1. **Toggle-based retrofit instead of a clone.** Tried to layer a "compact mode" onto the existing dark, Geist-based, timeline-driven layout. The inspiration is light-bg, Inter, narrow column, no timeline &mdash; toggling a few `space-y-*` and font classes can't get there.
2. **Only touched spacing and font-family.** Skipped the real drivers: background color, text color palette, content max-width, header pattern, the `intro` block, the removal of the side timeline, and the lack of dividers.
3. **Fought the existing component.** `SeekingCommunityBody` is tightly coupled to the side `Timeline`, `CommunityNodes` hero, `DraggablePopout`, and dividers. None of those exist in the inspiration; forcing them into a "compact" mode produced a hybrid that matched neither.
4. **No visual verification.** Changes were shipped without opening the live inspiration and the local page side-by-side. Matching this kind of design requires iteration against a screenshot diff, not vibes.
5. **UI chrome creep.** Added an F1/F2 text button, then a dial/knob &mdash; neither belongs on a reading page and both pulled focus away from the actual typography work.

#### Proper approach next time
1. **Treat it as a clone, not a toggle.** Use the `clone-website` skill workflow (or the figma-to-code / Chrome DevTools MCP iteration loop) pointed at the live URL. Extract assets, CSS tokens, and structure section-by-section.
2. **Scope decision up front.** Decide whether this replaces the current Seeking Community article or lives as a second variant (e.g. `/garden/article/seeking-community/read`). Do not mix styles on one page.
3. **Port the design tokens first.** Background, text colors, `--content-max-width`, `--font-size-base`, Inter via `next/font/google` &mdash; wire these into the route (or a scoped CSS layer) before touching markup.
4. **Rebuild the shell to match.** Header with back link + right-aligned meta date, `intro` block with just the title, article body as a flat vertical stack with the observed gap tokens. Drop the side timeline, hero nodes, and dividers for this variant.
5. **Iterate with visual diff.** Open the inspiration and the local page at identical widths. Compare line-for-line: header row, title size, paragraph rhythm, color of `em`, link hover, link underline (none), image treatment, footer padding. Fix until it reads the same.
6. **Only then consider dark mode.** The inspiration is light. If the portfolio must stay dark, design a dark translation of the same token system as a separate pass &mdash; do not skip straight to dark-on-first-try.
7. **No toggles on the reading page.** If both styles must coexist, use a route/variant, not a UI switch embedded in the article.

#### Out of scope for this task
- Changing the garden index or other articles.
- Migrating the site-wide font to Inter.
- Building a generic "reader mode" component.

[Task-159]
