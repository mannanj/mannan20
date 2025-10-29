### Task 20: Fix Task Completion Commit Detection in Post-Commit Hook
- [x] Fix logic to correctly identify commit with [Task-N] tag for each task
- [x] Ensure Task 14 gets proper completedDate and completedCommit data
- [x] Ensure Task 19 shows correct commit (3cc8f8b not e5f6dee)
- [x] Improve commit detection to prioritize [Task-N] tag in commit message
- Location: `.githooks/post-commit`
