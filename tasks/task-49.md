### Task 49: Fix AG Grid Table Overflow in Modal
- [x] Remove domLayout="autoHeight" and use normal layout
- [x] Set fixed height container for grids with overflow-y: auto
- [x] Ensure horizontal scrolling works when columns exceed container width
- [x] Prevent tables from expanding beyond modal boundaries
- [x] Reduce column header font size and padding for tighter appearance
- [x] Test both commits and tasks tables for proper scrolling behavior
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`
