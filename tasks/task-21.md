### Task 21: Preserve Existing Task Completion Data in Post-Commit Hook
- [x] Read existing tasks.json before regenerating
- [x] Store existing completedDate and completedCommit data in memory
- [x] Only update completion data when [Task-N] tag found in git log
- [x] Preserve existing completion data for tasks without [Task-N] tags
- Location: `.githooks/post-commit`
