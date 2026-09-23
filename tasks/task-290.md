### Task 290: A Skills section in the garden, with the storyboard skill rendered in it

- [x] Add a "Skills" section to the garden page
- [x] First entry under it: a "Storyboard" subheader
- [x] Under that subheader, render `skills/storyboard/SKILL.md` as markdown in a ~250px-tall scrolling box
- [x] Render that markdown inside the existing `DraggablePopout` rather than a plain div
- [ ] Bonus, only after the above is merged: resize the popout by dragging its corners
- The popout already exists: `DraggablePopout` drags (pointer on the header), minimizes via
  `DraggablePopoutHandle`, and takes a fixed `width`/`miniWidth`. So "drag it around" is already
  there; the genuinely new part of the bonus is corner resize - the component has no resize
  handles and height is content-driven today.
- Open decision before starting: how the markdown reaches the client. `react-markdown` +
  `remark-gfm` are already dependencies, but `SKILL.md` lives outside `src/`, so it needs a raw
  import at build time, a server component that reads the file, or a copy into `public/`. Pick one;
  don't paste the skill text into a `.tsx` as a string literal - it would drift from the real skill.
- The 250px is the viewport height, not the content height: the markdown scrolls inside it.
- Garden sections today are tabs (`TABS` in `garden-explorer.tsx`: Products, Writings, Readings)
  plus subsections inside a tab (see `ProductsSubsection`, `PapersSection`). Worth confirming with
  Mannan whether Skills is a fourth tab or a subsection of an existing one before building it.
- The skill itself landed in PR #27.
- Decided (Mannan, 2026-09-22): Skills is a subsection of the Writings tab (after Papers), and the
  skill shows as a card that opens the popout, not an inline box. The skill is marked AI-Generated
  with the same disclosure tooltip as the AI-Designed products.
- Decided: the markdown is read from `skills/<id>/SKILL.md` by the server component
  (`src/lib/garden-skills.ts`, called from `src/app/garden/page.tsx`, which is `force-static`), so it
  is baked in at build time; the Workers runtime never touches the filesystem.
- The popout is portaled to `document.body`: the garden panels carry a transform, which would
  otherwise re-anchor its `position: fixed`.
- Location: `src/components/garden/garden-explorer.tsx`, `src/components/garden/draggable-popout.tsx`, `skills/storyboard/SKILL.md`
