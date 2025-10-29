### Task 89: Improve Type Safety in Grid Components
- [ ] Create AgGridParams interface for grid callback parameters
- [ ] Replace any type in commits-grid.ts gridTheme signal with proper AG Grid theme type
- [ ] Replace any type in task-table.ts gridTheme signal with proper AG Grid theme type
- [ ] Replace any type in getTaskRowId callback with AgGridParams
- [ ] Replace any type in getCommitRowId callback with AgGridParams
- [ ] Add proper typing for all grid API callback parameters
- Location: `src/app/shared/commits-grid.ts:72,106`, `src/app/shared/task-table.ts:66,72,106,169`
