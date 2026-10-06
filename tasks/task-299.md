### Task 299: Select mode — share many files at once, add/remove files across pages

#### Select mode (page view, All files, and file lists generally)
- [ ] "Select" button with a check mark in the header area of the file list
- [ ] Toggling it on gives each file a checkbox on its left; tapping anywhere on the whole card/row selects it (no preview open while selecting)
- [ ] The button becomes "N selected" with a caret on its right side, inside the button — it's now a menu (MeetTime-style dropdown)
- [ ] Menu: Share, Add to page, (Select all / Clear), Cancel select mode

#### Share selected → new share page
- [ ] Creates a new share page containing references to the selected files — same R2 objects, no copies
- [ ] If a referenced file is later deleted (soft delete), the share page still lists it with its metadata, marked "Deleted", and leaves it out of downloads
- [ ] Share page settings are the same as any share (read/write, expiry, limits), editable later
- [ ] Share page "Download all" works in batches sized to the limits we measured (see Research)

#### Download all — research + implement
- [ ] Research and write down the real limits before choosing batch sizes: browser multiple-download prompts/blocks, per-file vs zip, Worker CPU per zip (≈1.26 GB per 30 s of JS CRC; site now has 300 s), 2 GB zip part cap, ZIP32 4 GB limit, memory (streaming, not buffered), resumability (single files have Range, zips don't)
- [ ] Implement: plan parts (existing `planDownload`), start part 1, show the rest as a list to click (browsers block auto-starting many downloads), files over the cap go out alone as themselves
- [ ] Measure on prod with a multi-GB set and record the numbers in this task

#### Add to page (from the selection menu)
- [ ] Opens a large modal
- [ ] Top section: "In these pages" — pages the selected file(s) already belong to
- [ ] Below: header with search + filter, then a list of pages with a selector (radio/checkbox) per page to add the files to
- [ ] Selecting a page adds the files; un-selecting a page the files are on removes them from that page (soft delete of that page's file rows)
- [ ] Adding creates new R2 copies as needed, unless the file already exists on that page
- [ ] A page being added to jumps to the top "In these pages" section immediately with a short status: "Adding…", then the copy stages "5%", "25%"… "Added"
- [ ] List rows: single line, page title on the left (truncated, full text + details on hover), status and a refresh icon at the far right of the row
- [ ] Note: R2 has no server-side copy on the binding; copies >5 GB need multipart copy by range — plan for it

#### "Add to my files" (file ⋯ menu and the selection menu)
- [ ] All files becomes a reserved page — "your files" — so "Add to my files" just adds the file(s) there if they aren't already
- [ ] In the Add to page modal, "My files" appears as a page too
- [ ] Page selectors are tri-state: empty (none of the selected files are there), partial (some are — indeterminate mark), full (all are)
- [ ] Clicking a partial page adds the remaining files only
- [ ] Hover tooltip on each page: "Will add X files (Y GB) to this page", or with duplicates "Will add X files (Y GB), skipping Z duplicates, to this page"
- [ ] Duplicate = same underlying object (same stored object/content), not just same name — decide and document the rule (likely object key, falling back to name + size)

#### Tests
- [ ] E2E: Add to my files from ⋯ and selection; partial state + tooltip counts; clicking partial adds only the rest
- [ ] E2E: select mode toggle, whole-card select, N selected menu, share selected (incl. a deleted file shown but not downloaded), add to page with progress, remove from page, batched download-all

- Location: `src/components/upload/*`, `src/lib/upload-shares.ts`, `src/lib/upload-handlers.ts`, new share-items table
