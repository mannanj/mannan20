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
- [x] `task-description-inline-input.md`, `task-offset-direction-label.md` (committed by worker 1 with its work)
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
- [ ] Tests + screenshots → `artifacts/review-2026-10-05/dropdown-*`, `draft-marker-*`, report `dropdown-report.md`

#### Sun — being built (worker 2, worktree `~/Documents/sun-wt-popouts`)
- [ ] Desktop: every widget opens as a pop-out, source widget closes
- [ ] Pop-out blocked → toast, open inline instead
- [ ] Mobile: open inline in the clock
- [ ] Parity audit of all 7 pop-outs, gaps listed, events/schedule fixed first (create events, open other widgets as pop-outs)
- [ ] Mobile drawer: slides up from the bottom, pop-out icon + window-in-window mode icon to switch to/from the draggable widget, mode remembered per device (default on mobile)
- [ ] Tests + screenshots → `artifacts/review-2026-10-05/popout-*`, `drawer-*`, report `popout-report.md`

#### End of session
- [ ] Review both reports and screenshots; verify claims firsthand
- [ ] Worktree removed, everything on Sun `main`
- [ ] Mannan reviews, then deploy Sun
- [ ] Mannan approves calendar push + deploy (task-297 + task-31)

- Location: `~/Documents/calendar`, `~/Documents/sun`
