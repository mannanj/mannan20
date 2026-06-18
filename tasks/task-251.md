### Task 251: Collapse Garden paper PDFs behind an inline accordion

**Status: TODO. Do not implement as part of task creation.**

Update the Garden Writings page paper previews so the PDF embeds are not loaded or visible until
the visitor explicitly expands a paper.

#### Context
- Current surface: `/garden`, Writings tab.
- Current implementation:
  - `src/components/garden/papers-section.tsx`
  - `src/components/garden/garden-explorer.tsx`
  - `src/app/globals.css`
  - `e2e/garden-papers.spec.ts`
- Current behavior: the Papers section renders two native lazy PDF iframes with animated swirly
  skeleton loaders. The iframe `src` values point at static public files:
  - `/data/documents/GMU-ARCHR.pdf#toolbar=0&navpanes=0&view=FitH`
  - `/data/documents/OMF-DR.pdf#toolbar=0&navpanes=0&view=FitH`
- Keep the no-PDF-rendering-package constraint unless the implementer proves a native browser
  approach cannot meet the requirements.

#### Requirements
- [ ] Convert the paper previews into accordion items inside the existing Papers section.
- [ ] Show the accordion controls inline with the Papers section header.
  - The Papers heading should remain visible.
  - The controls should read as part of that header row, not as separate cards above the content.
- [ ] Show each paper title and description while collapsed.
- [ ] Do not render or load a paper iframe while its accordion item is collapsed.
- [ ] Render the native PDF iframe only after that paper item is expanded.
- [ ] If the visitor collapses the item again, hide the paper iframe and remove it from the DOM
      or otherwise clear its `src` so the browser can release the embedded PDF viewer.
- [ ] Preserve direct download links for each paper.
- [ ] Preserve a polished loading state when an expanded iframe is loading.
  - Reuse or refine the existing swirly paint skeleton.
  - Respect `prefers-reduced-motion`.
- [ ] Keep the `Taken` article hidden from the Garden Writings list.
- [ ] Update e2e coverage so it proves:
  - the Papers section still appears on Writings,
  - paper descriptions are visible while collapsed,
  - iframe elements are absent before expansion,
  - the correct PDF iframe appears after expansion,
  - collapsing hides/removes the iframe again.

#### Performance validation
- [ ] Validate that `/garden` does not request either PDF file on initial page load.
- [ ] Validate that a PDF request only happens after expanding its accordion item.
- [ ] Validate that collapsing an item removes the heavy embedded PDF surface.
- [ ] Run a production build.
- [ ] Run focused Playwright tests.
- [ ] Use browser/devtools or Playwright request tracking to document the before/after network
      behavior in the final implementation notes.

#### Suggested implementation approach
- Keep `PapersSection` as a client component.
- Track expanded paper id in React state.
- Render the header as a compact row: `Papers` on the left, accordion toggles on the right or
  directly beside it, depending on responsive width.
- Render title/description/download metadata for every paper regardless of expansion state.
- Render the iframe subtree conditionally only for the expanded item.
- Prefer one open paper at a time unless a stronger reason emerges to allow multiple open PDFs.

#### Non-goals
- Do not replace native iframes with PDF.js, React-PDF, or another renderer without explicit
  approval.
- Do not redesign the Garden tabs or article cards.
- Do not remove the static public PDF files.
- Do not implement this task in this task-file-only commit.

[Task-251]
