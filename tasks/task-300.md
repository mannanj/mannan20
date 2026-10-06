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
- [x] `task-live-sync-and-day-headers.md`, `task-time-zones.md`, `task-mcp-moon-data.md`
- [x] Decisions recorded in the task files

#### Sun — being built (worker 1, main checkout)
- [x] Worker 1 verified by me: 500 unit pass, 21/21 new e2e pass; 6 schedule-widget/celestial failures pre-existing (also fail at 8f05a87)
- [x] Dropdown: time pinned right, label truncates, tooltip on hover
- [x] Dropdown: Morning Blue Hour End, Evening Blue Hour End
- [x] Dropdown: grouped, time-ordered, row click picks / caret expands
- [x] Dropdown: Solar Midnight top-level, before Moon
- [x] Dropdown: Moon group last — Moonrise, Moon Peak, Moonset, Moon Midnight (clock's definitions)
- [x] Date picker: Moon dropdown, phases with next date, caret for more, past dates labeled `(past)`
- [x] Description: no accordion, just an "Add a description..." field to click into (`task-description-inline-input.md`)
- [x] Before/After/During label: smaller text, full label visible, no truncation (`task-offset-direction-label.md`)
- [x] Red line + dot on the clock while making an event, "New Event" → "Making <title>", normal and pop-out
- [x] Hover an event row (pop-out or widget) → its clock dot shows hovered with label (`task-event-hover-clock-highlight.md`)
- [x] Tests + screenshots → `artifacts/review-2026-10-05/dropdown-*`, `draft-marker-*`, report `dropdown-report.md`

#### Sun — being built (worker 2, worktree `~/Documents/sun-wt-popouts`)
- [x] Worker 2 verified by me: found its test helper left pop-outs blocked for the rest of a test (broke 2 tests that passed before) — fixed + pushed (541b04f); remaining popout-sync/schedule-widget failures are pre-existing
- [ ] Gaps left for later: phase pop-out weather temps, schedule pop-out per-event hide/show, no Work pop-out, one shared mode-switch button on the floating widget
- [x] Desktop: every widget opens as a pop-out, source widget closes
- [x] Pop-out blocked → toast, open inline instead
- [x] Mobile: open inline in the clock
- [x] Parity audit of all 7 pop-outs, gaps listed, events/schedule fixed first (create events, open other widgets as pop-outs)
- [x] Events header date is a dropdown that changes the clock's day + events; inline Today icon when not today, first header only (`task-events-header-date-picker.md`)
- [x] Mobile drawer: slides up from the bottom, pop-out icon + window-in-window mode icon to switch to/from the draggable widget, mode remembered per device (default on mobile)
- [x] Tests + screenshots → `artifacts/review-2026-10-05/popout-*`, `drawer-*`, report `popout-report.md`

#### Sun — worker 1 follow-up (`task-live-sync-and-day-headers.md`)
- [x] BUG: clock needs reload after save — fixed (stores now sync across windows), tests failed before the fix
- [ ] BUG: draft dot not moving live — NOT reproduced; most-recent marker now wins; need Mannan's exact steps if it persists
- [x] Day headers `M 10/5`, `T`, `W`, `Th`, `F`, `Sa`, `Su`

#### Sun — round 2, starts after worker 2 lands (`task-widget-menus-and-clock-sync.md`)
- [x] Round 2 verified by me: 511 unit pass, 13/13 round-2 e2e; 2 older tests expected old behavior (delete without confirm, glyph opens inline) — updated + pushed (af13bd6)
- [ ] Limit: only pop-outs can be unsynced; in-clock widgets are always synced
- [x] Several synced widgets: clock follows the last one changed
- [x] Per-widget clock sync (two-way when synced, local when not), unsynced warning/refresh icon left of ⋯
- [x] ⋯ menu + right-click menu: sync, date range, days shown, resolution (days/weeks/months/lunar months), first 7 shown on the clock, ZIP
- [x] New pop-out icon (unlimited duplicates) + widgets icon to change a window's widget
- [x] Events: right-click row → edit modal; confirm-before-delete toggle (on by default, always checked, words flip — confirmed)
- [x] Moon widget: past dates not grayed; hover doesn't change the clock, click does
- [x] Phases widget: same system (multiple, sync/unsync, menus, ZIP)

#### Sun — round 3: time zones (`task-time-zones.md`)
- [x] Round 3 verified by me: 530 unit pass, time-zones 4/4, all new specs pass
- [x] Found + fixed test bug: unbounded networkidle waits made most of popout-sync time out — now 10/10 (810f79e), was 2/10 before this session
- [ ] Zoned event crossing midnight stays on the wrong date — fix running; also verifying clock marker angle
- [ ] Not zoned yet: sleep/work engine clock-time settings
- [x] "Clock Time" row shows the local zone ("Eastern Time"), caret picks other zones; events store their zone
- [x] Zone from ZIP via repo's `zip2tz.csv`, browser fallback, `Intl` conversions (no library unless needed)
- [x] App-wide rules decided and written down (clock zone = ZIP zone, existing events, DST)
- [x] Unit + cross-zone Playwright tests (browser zone ≠ ZIP zone)

#### Sun — round 4: MCP moon data (`task-mcp-moon-data.md`)
- [x] `get_moon_year` built (470f370), verified by me: 74/74 mcp tests, tsc clean; `get_dataset_status` reports moon years
- [ ] Moon data exists for 22310 2026 but NOT 2027 (prod probe) — generate 2027+ moon files before relying on next-year moon anchors/MCP
- [ ] `transit_altitude` is always null in generated moon files — generator fix + regenerate (affects MCP and clock moon altitude)
- [ ] Deploy MCP (`cd cloudflare/mcp && bun run deploy`) after Mannan's OK

#### End of session
- [ ] Review both reports and screenshots; verify claims firsthand
- [x] Round 1 on Sun `main`, verified: 502 unit pass, 33/33 new e2e pass
- [x] Round 2 + MCP moon done
- [x] Round 3 time zones done; midnight-crossing fix running (started 2026-10-05 ~11:55 PM); time zones after round 2
- [ ] Worktrees removed at the end
- [ ] Mannan reviews, then deploy Sun (no deploy before his OK)
- [ ] Cloudflare: one-off tokens via cf-custom-grant allowed (Mannan consented 2026-10-05); revoke when done
- [ ] Calendar push + deploy: Mannan said not yet (2026-10-05)

- Location: `~/Documents/calendar`, `~/Documents/sun`
