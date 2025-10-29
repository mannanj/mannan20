### Task 88: Extract Shared Grid Logic into Composable
- [ ] Create useGridState composable function for shared AG Grid initialization
- [ ] Extract theme initialization logic (duplicated in commits-grid and task-table)
- [ ] Extract state loading/saving logic for localStorage persistence
- [ ] Extract search handling pattern
- [ ] Update commits-grid.ts to use shared composable
- [ ] Update task-table.ts to use shared composable
- [ ] Remove ~80 lines of duplicated code between the two components
- Location: `src/app/shared/commits-grid.ts:74-105`, `src/app/shared/task-table.ts:74-105`
