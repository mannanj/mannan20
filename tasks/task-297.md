### Task 297: Calendar app bugs (tracked here, fixed in ~/Documents/calendar)

Work happens in the calendar repo; its own task file has the detail. This is the pointer so nothing is lost.

- [ ] Event pop-out and event cards: clicking the date should open a date editor and save
- [ ] Multi-day view: drag events across days (and times) to move them
- [ ] Create Event: "Failed to update event" while showing Undo — create succeeds with partial data, follow-up update fails, leaving a junk event with no details (seen with all-day 10/13/2026, type other, long title)
- [ ] Multi-day view: clicking an empty day/time should open Create Event pre-filled for that day/time
- [ ] Tests for all four; review, then deploy calendar
- Location: `~/Documents/calendar` (see its task file for the same items)
- [ ] Delete an event by clicking it then Backspace/Delete, or a trash icon in the pop-out header left of the ^ caret
- [ ] Soft delete only (row kept), shown in the Undo bar, undo restores it
- [ ] Calendar MCP can list soft-deleted events and restore them; MCP delete is soft too

#### Embedded/pop-out view layout (screenshot: calendar framed inside the mannan.is page)
Rule: none of these moves may shift the layout or grow the area outside the calendar — only the listed elements move. The one exception is collapsing the header, which on purpose gives the calendar more room.
- [ ] Pop-out icon (↗, currently top right inside the calendar, right of the account menu) moves outside the calendar to the actual top-right edge of the page, and gets bigger
- [ ] In its old spot (right of the account menu) put an inward-facing arrows icon (collapse header)
- [ ] Collapse: hides the header; a floating date label with ‹ › arrows on its left/right sits at the top over the calendar, and the calendar fills the space behind it
- [ ] When collapsed, the account-menu label also hides, and the collapse icon becomes an expand icon that restores the header
- [ ] Remove the gear icon; its settings move into the account menu (top right, mannan.is/calendar)
- [ ] "made by Mannan" moves outside the calendar box, bottom right of the surrounding area, without growing that area (assumption: right-aligned, no layout shift)
- [ ] The line under the all-day row becomes a draggable divider that resizes the all-day area; the height is remembered (per device)
- [ ] Changing day/page (‹ › or Today), single-day and multi-day: scroll the new page to the same time position currently in view (assumption: keep the current scroll time; on Today, keep current behavior of showing now)
