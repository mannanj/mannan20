### Task 50: Fix AG Grid Performance Issues
- [x] Investigate slow AG Grid rendering and interaction
- [x] Check for subscription leaks in dev-stats, task-table, and tasks-container
- [x] Verify proper cleanup with OnDestroy lifecycle hook if needed
- [x] Optimize grid configuration (disable unused features, row animations)
- [x] Consider virtualizing rows if dataset is large
- [x] Profile performance and verify improvements
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/app/shared/tasks-container.ts`
