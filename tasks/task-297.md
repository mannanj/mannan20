### Task 297: Calendar app bugs (tracked here, fixed in ~/Documents/calendar)

Work happens in the calendar repo; its own task file has the detail. This is the pointer so nothing is lost.

- [x] Event pop-out and event cards: clicking the date should open a date editor and save
- [x] Multi-day view: drag events across days (and times) to move them
- [x] Create Event: "Failed to update event" while showing Undo — create succeeds with partial data, follow-up update fails, leaving a junk event with no details (seen with all-day 10/13/2026, type other, long title)
- [x] Multi-day view: clicking an empty day/time should open Create Event pre-filled for that day/time
- [ ] Tests for all four; review, then deploy calendar
- Location: `~/Documents/calendar` (see its task file for the same items)
- [x] Delete an event by clicking it then Backspace/Delete, or a trash icon in the pop-out header left of the ^ caret
- [x] Soft delete only (row kept), shown in the Undo bar, undo restores it
- [x] Calendar MCP can list soft-deleted events and restore them; MCP delete is soft too

#### Embedded/pop-out view layout (screenshot: calendar framed inside the mannan.is page)
Rule: none of these moves may shift the layout or grow the area outside the calendar — only the listed elements move. The one exception is collapsing the header, which on purpose gives the calendar more room.
- [x] Pop-out icon (↗, currently top right inside the calendar, right of the account menu) moves outside the calendar to the actual top-right edge of the page, and gets bigger
- [x] In its old spot (right of the account menu) put an inward-facing arrows icon (collapse header)
- [x] Collapse: hides the header; a floating date label with ‹ › arrows on its left/right sits at the top over the calendar, and the calendar fills the space behind it
- [x] When collapsed, the account-menu label also hides, and the collapse icon becomes an expand icon that restores the header
- [ ] Remove the gear icon; its settings move into the account menu (top right, mannan.is/calendar)
- [ ] "made by Mannan" moves outside the calendar box, bottom right of the surrounding area, without growing that area (assumption: right-aligned, no layout shift)
- [x] The line under the all-day row becomes a draggable divider that resizes the all-day area; the height is remembered (per device)
- [x] Changing day/page (‹ › or Today), single-day and multi-day: scroll the new page to the same time position currently in view (assumption: keep the current scroll time; on Today, keep current behavior of showing now)

#### Status 2026-10-05
- Built as local commits on calendar `main` (2efdcd8, 99c2b06, a11e3b2, 67a6246, 29f7a51), 6 ahead of origin incl. Mannan's own 9536a8f. Not pushed, not deployed.
- Full e2e: 786 passed, 1 failed (`ics-drag-drop.spec.ts:232`, also fails at 9536a8f — pre-existing). Re-verified event-open / fab-menu / popup-move-edges: 58/58.
- Create-event failure: likely cause a stale end time when toggling All day plus a "Saved" shown after a failed update; fixed, but the original HTTP failure was not reproduced locally.
- "made by Mannan" moved into the page gutter (check against the no-layout-shift rule when reviewing).
- [ ] Decide where the gear's items go for signed-out visitors (no account menu): Apple sync, ICS import/export, sources
- [ ] Approve shipping: `git push` + `bun run deploy` + `bun run deploy:mcp` in ~/Documents/calendar
