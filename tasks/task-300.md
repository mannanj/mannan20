### Task 300: Session 2026-10-05 — every ask, where it lives, status

Detail lives in each repo's task file; this is the full list so nothing is missed.

#### Calendar (`~/Documents/calendar/task-31.md`) — captured, not started
- [x] Captured: events anchored to other events (before/after/during), auto-update on anchor change
- [x] Captured: schedule around sun and moon via the Sun MCP, one year cached per location
- [x] Captured: status-driven alerts to people (running late/early), needs design
- [ ] task-31 commit is local only; ships with the pending calendar push (needs Mannan's approval, see task-297)

#### Sun — captured task files (`~/Documents/sun/tasks/`), all pushed
- [x] `task-solar-noon-and-moon-anchors.md` (solar noon already existed; moon, moon midnight, solar midnight, phase dates)
- [x] `task-popout-parity.md`
- [x] `task-mobile-widget-drawer.md` (moved into this round)
- [x] `task-event-dropdown-times.md` (times column, blue hour ends, grouped dropdown, moon group, moon-phase date picker)
- [x] `task-draft-event-clock-marker.md`
- [x] `task-description-inline-input.md`, `task-offset-direction-label.md`, `task-event-hover-clock-highlight.md` (committed by worker 1 with its work)
- [x] `task-events-header-date-picker.md` (committed by worker 2 with its work)
- [x] `task-widget-menus-and-clock-sync.md` (round 2)
- [x] Decisions recorded in the task files

#### Sun — being built (worker 1, main checkout)
- [ ] Dropdown: time pinned right, label truncates, tooltip on hover
- [ ] Dropdown: Morning Blue Hour End, Evening Blue Hour End
- [ ] Dropdown: grouped, time-ordered, row click picks / caret expands
- [ ] Dropdown: Solar Midnight top-level, before Moon
- [ ] Dropdown: Moon group last — Moonrise, Moon Peak, Moonset, Moon Midnight (clock's definitions)
- [ ] Date picker: Moon dropdown, phases with next date, caret for more, past dates labeled `(past)`
- [ ] Description: no accordion, just an "Add a description..." field to click into (`task-description-inline-input.md`)
- [ ] Before/After/During label: smaller text, full label visible, no truncation (`task-offset-direction-label.md`)
- [ ] Red line + dot on the clock while making an event, "New Event" → "Making <title>", normal and pop-out
- [ ] Hover an event row (pop-out or widget) → its clock dot shows hovered with label (`task-event-hover-clock-highlight.md`)
- [ ] Tests + screenshots → `artifacts/review-2026-10-05/dropdown-*`, `draft-marker-*`, report `dropdown-report.md`

#### Sun — being built (worker 2, worktree `~/Documents/sun-wt-popouts`)
- [ ] Desktop: every widget opens as a pop-out, source widget closes
- [ ] Pop-out blocked → toast, open inline instead
- [ ] Mobile: open inline in the clock
- [ ] Parity audit of all 7 pop-outs, gaps listed, events/schedule fixed first (create events, open other widgets as pop-outs)
- [ ] Events header date is a dropdown that changes the clock's day + events; inline Today icon when not today, first header only (`task-events-header-date-picker.md`)
- [ ] Mobile drawer: slides up from the bottom, pop-out icon + window-in-window mode icon to switch to/from the draggable widget, mode remembered per device (default on mobile)
- [ ] Tests + screenshots → `artifacts/review-2026-10-05/popout-*`, `drawer-*`, report `popout-report.md`

#### Sun — round 2, starts after worker 2 lands (`task-widget-menus-and-clock-sync.md`)
- [ ] Per-widget clock sync (two-way when synced, local when not), unsynced warning/refresh icon left of ⋯
- [ ] ⋯ menu + right-click menu: sync, date range, days shown, resolution (days/weeks/months/lunar months), first 7 shown on the clock, ZIP
- [ ] New pop-out icon (unlimited duplicates) + widgets icon to change a window's widget
- [ ] Events: right-click row → edit modal; confirm-before-delete toggle (on by default, label states current behavior, always checked — confirm interpretation at review)
- [ ] Moon widget: past dates not grayed; hover doesn't change the clock, click does
- [ ] Phases widget: same system (multiple, sync/unsync, menus, ZIP)

#### End of session
- [ ] Review both reports and screenshots; verify claims firsthand
- [ ] Worktree removed, everything on Sun `main`
- [ ] Mannan reviews, then deploy Sun
- [ ] Mannan approves calendar push + deploy (task-297 + task-31)

- Location: `~/Documents/calendar`, `~/Documents/sun`
