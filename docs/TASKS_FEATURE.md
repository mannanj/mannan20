# Tasks Feature Documentation

## Overview

The Tasks feature provides automatic synchronization between a markdown task list and the live Angular application. Tasks are written in markdown, automatically converted to JSON via git hooks, and displayed in a dev stats modal.

## Architecture

### 1. Markdown Source (`tasks.md`)

The single source of truth for task tracking. Located at the project root.

**Structure:**
```markdown
### Task X: Title
- [x] Completed subtask
- [ ] Pending subtask
- Location: `file/path:line`
```

**Key Points:**
- Tasks are organized by number (Task 1, Task 2, etc.)
- Subtasks use standard markdown checkboxes
- `[x]` indicates completed subtasks
- `[ ]` indicates pending subtasks
- Location field provides code reference (filtered from subtasks in JSON)
- Task status is auto-calculated: `completed` if all subtasks are checked, otherwise `pending`

### 2. Git Hook Automation (`.githooks/post-commit`)

Custom post-commit hook that runs automatically after every commit.

**Configuration:**
```bash
git config core.hooksPath .githooks
```

**What it does:**

**Lines 55-126: Task Completion Detection**
- `findTaskCompletionCommit()` function searches git history to find when a task was completed
- Analyzes git log with patch output to detect when all subtasks were checked
- Searches through commit history of `tasks.md` to track task status changes
- Supports explicit task references in commit messages (e.g., `[Task-1]`, `[Task 5]`)
- Returns commit hash, subject, date, and URL when completion is detected

**Lines 128-176: Task Parsing**
- Reads `tasks.md` using Node.js
- Extracts tasks using regex pattern: `/### Task (\d+): (.+?)\n([\s\S]*?)(?=###|$)/g`
- Extracts subtasks using pattern: `/- \[([x ])\] (.+?)$/gm`
- Converts markdown checkboxes to JSON boolean values
- Filters out "Location:" lines from subtasks array
- Generates task IDs in format `task-{number}`
- Auto-calculates task status based on subtask completion
- For completed tasks, calls `findTaskCompletionCommit()` to get completion metadata
- Adds `completedDate` and `completedCommit` fields when available

**Lines 182-184: Auto-commit**
- Checks if generated files have changes
- Automatically stages and commits updated JSON files
- Uses `--no-verify` flag to prevent hook recursion
- Commit message: "Update dev data files"

**Also generates:**
- `public/data/dev-commits.json` (last 100 commits)
- `public/data/metadata.json` (last updated timestamp)

### 3. JSON Output (`public/data/tasks.json`)

Generated JSON file consumed by the Angular application.

**Structure:**
```json
{
  "id": "task-1",
  "title": "Refactor Toggle Logic Duplication",
  "status": "completed",
  "subtasks": [
    {
      "description": "Replace 5 pairs of toggle methods with a generic toggle system",
      "completed": true
    }
  ],
  "location": "`src/app/components/about/about.ts:290-336`",
  "completedDate": "2025-10-14T18:30:00.000Z",
  "completedCommit": {
    "hash": "abc1234",
    "fullHash": "abc123456789...",
    "subject": "Refactor toggle logic [Task-1]",
    "date": "2025-10-14T18:30:00.000Z",
    "url": "https://github.com/mannanj/mannan20/commit/abc123456789..."
  }
}
```

**Note:** The `completedDate` and `completedCommit` fields are optional and only present for completed tasks where the completion commit was successfully detected.

### 4. TypeScript Models (`src/app/models/models.ts`)

**TaskCommit Interface (lines 112-118):**
```typescript
interface TaskCommit {
  hash: string;
  fullHash: string;
  subject: string;
  date: string;
  url: string;
}
```

**Task Interface (lines 120-128):**
```typescript
interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  subtasks: TaskSubtask[];
  location: string;
  completedDate?: string;
  completedCommit?: TaskCommit;
}
```

**TaskSubtask Interface (lines 107-110):**
```typescript
interface TaskSubtask {
  description: string;
  completed: boolean;
}
```

**App State Integration (line 89):**
```typescript
interface AppState {
  tasks: Task[];
}
```

### 5. NgRx State Management

**Effect (`src/app/store/app.effects.ts:80-98`):**
```typescript
loadTasks$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ROOT_EFFECTS_INIT),
    filter(() => isDevMode()),
    mergeMap(() =>
      this.http.get<Task[]>('data/tasks.json').pipe(
        map(tasks => AppActions.loadTasksSuccess({ tasks })),
        catchError(() => of())
      )
    )
  )
);
```

**Key Points:**
- Loads tasks on application initialization
- Only runs in dev mode (when dev cookie is set)
- Fetches from `public/data/tasks.json`
- Dispatches `loadTasksSuccess` action with task data
- Silently fails if file not found

**Selector:**
```typescript
selectTasks = createSelector(
  selectAppState,
  (state: AppState) => state.tasks
);
```

### 6. Display Component (`src/app/shared/dev-stats.ts`)

The DevStats component displays tasks in a tabbed modal interface with multiple view modes and sorting options.

**View Modes:**
- **Card View (default)**: Rich card layout showing all task details
- **Table View**: Compact tabular layout for quick overview

**Features:**
- View toggle buttons (card/table icons)
- Sort button with ascending/descending order toggle
- Completion date display with linked commit hash
- Progress indicators (completed/total subtasks)
- Real-time filtering and sorting

**Template Structure:**

**Lines 100-141: Toolbar**
- View controls with card/table toggle buttons
- Sort button with dynamic icon (up/down arrows)
- Sort order label ("Oldest First" / "Newest First")

**Lines 143-175: Card View**
- Task cards with header, status, and completion info
- Completion date and commit hash display
- Subtask list with checkboxes
- Location metadata

**Lines 177-221: Table View**
- Five-column table: Task, Status, Completed, Commit, Progress
- Sticky header for scrolling
- Clickable commit links
- Progress fraction (X/Y completed)

**Styling (lines 228-523):**
- `.tasks-toolbar`: Toolbar with view controls and sort button
- `.view-button`: Toggle buttons with active state highlighting
- `.sort-button`: Sort control with icon and label
- `.task-completion`: Completion date and commit display
- `.tasks-table`: Responsive table with sticky header
- Color-coded status badges (gray/green)
- Hover effects and transitions

**Component Logic (lines 526-572):**
```typescript
protected taskView = signal<'card' | 'table'>('card');
protected sortOrder = signal<'asc' | 'desc'>('desc');
protected tasksSignal = toSignal(this.tasks$, { initialValue: [] });

protected sortedTasks = computed(() => {
  const tasks = this.tasksSignal();
  return tasks.sort((a, b) => {
    const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
    const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
    // Tasks without completion dates appear last
    // Sort by completion date in ascending or descending order
  });
});
```

**Key Methods:**
- `setTaskView(view)`: Switch between card and table views
- `toggleSortOrder()`: Toggle between ascending/descending sort
- `getCompletedCount(task)`: Calculate completed subtask count
- `sortedTasks()`: Computed signal that sorts tasks by completion date

### 7. Workflow

Complete workflow for managing tasks:

1. **Edit Tasks**
   - Open `tasks.md` in project root
   - Check/uncheck subtasks using `[x]` or `[ ]`
   - Add new tasks following the format

2. **Commit Changes**
   ```bash
   git add tasks.md
   git commit -m "Update task progress [Task-5]"
   ```

   **Recommended:** Include task reference in commit message for better tracking:
   - Format: `[Task-X]` or `[Task X]` (case-insensitive)
   - Examples:
     - `git commit -m "Refactor toggle logic [Task-1]"`
     - `git commit -m "Fix styling issues [Task-4] [Task-8]"`
   - The hook will link these commits to the tasks automatically

3. **Automatic Processing**
   - Post-commit hook executes automatically
   - Searches git history to find when task was completed
   - Detects completion either by:
     - Analyzing diff to see when all subtasks were checked
     - Finding explicit task reference in commit message
   - Parses markdown and generates JSON with completion metadata
   - Auto-commits generated files

4. **View in App**
   - Angular app fetches updated tasks.json
   - Tasks display in DevStats modal "Tasks" tab
   - View completion dates and linked commits
   - Toggle between card and table views
   - Sort by completion date (newest/oldest first)
   - Only visible in dev mode

## Dev Mode

Tasks feature is only active in dev mode.

**Check dev mode status:**
```typescript
import { isDevMode } from '../utils/cookies';
const devModeActive = isDevMode();
```

**Enable dev mode:**
Set a cookie with name matching dev mode pattern (implementation in `src/app/utils/cookies.ts`).

## File Locations

| Component | Path |
|-----------|------|
| Markdown Source | `/tasks.md` |
| Git Hook | `/.githooks/post-commit` |
| JSON Output | `/public/data/tasks.json` |
| TypeScript Models | `/src/app/models/models.ts` |
| NgRx Effects | `/src/app/store/app.effects.ts` |
| NgRx Selectors | `/src/app/store/app.selectors.ts` |
| Display Component | `/src/app/shared/dev-stats.ts` |

## Key Features

- **Zero Manual Conversion**: Markdown automatically syncs to JSON
- **Automatic Status Calculation**: Task status derived from subtask completion
- **Completion Date Tracking**: Automatically detects when tasks were completed via git history
- **Commit Linking**: Links tasks to the commits that completed them
- **Dual Completion Detection**: Finds completion by analyzing diffs or commit message references
- **Multiple View Modes**: Switch between card and table views
- **Sortable by Date**: Sort completed tasks by completion date (ascending/descending)
- **Dev-Only Visibility**: Tasks only load and display in dev mode
- **Auto-commit Integration**: Generated files committed automatically
- **Reactive Updates**: Angular app updates when tasks change
- **Visual Feedback**: Color-coded status badges and strikethrough styling
- **Location Tracking**: Code references for each task
- **Scrollable Interface**: Handles large task lists gracefully
- **Progress Indicators**: Shows completed/total subtask counts

## Commit Message Convention

To enable accurate task-to-commit linking, use the following convention in your commit messages:

**Format:**
```
[Task-X]  or  [Task X]
```

**Examples:**
```bash
git commit -m "Refactor toggle logic [Task-1]"
git commit -m "Fix styling and add animations [Task-4] [Task-7]"
git commit -m "Complete navigation refactor [Task 10]"
```

**How it works:**
1. When you commit with a task reference, the git hook detects it
2. The hook associates that commit with the referenced task(s)
3. If the task becomes completed in that commit, the commit info is saved
4. The completion date and commit link appear in the UI

**Detection Methods:**

The system uses two methods to detect task completion (in order of precedence):

1. **Diff Analysis (Primary)**
   - Analyzes git log with patch output
   - Detects when all subtasks in a task become checked
   - Most accurate method, doesn't require commit message reference

2. **Commit Message Search (Fallback)**
   - Searches commit messages for `[Task-X]` pattern
   - Used when diff analysis doesn't find a completion commit
   - Useful for explicitly linking commits to tasks

**Best Practices:**
- Always include task reference when completing a task
- Use consistent formatting (`[Task-X]` recommended)
- Can reference multiple tasks in one commit
- Task references are case-insensitive
- Works retroactively (scans entire git history)

## Maintenance

**Adding a new task:**
1. Add to `tasks.md` following format
2. Commit changes
3. Hook auto-generates JSON

**Modifying task structure:**
1. Update TypeScript interfaces in `models.ts`
2. Update parsing logic in `.githooks/post-commit`
3. Update display template in `dev-stats.ts`

**Debugging:**
- Check git hook runs: `git config core.hooksPath` should return `.githooks`
- Verify JSON generation: Check `public/data/tasks.json` after commit
- Inspect completion metadata: Look for `completedDate` and `completedCommit` fields in JSON
- Test commit detection: Use `git log -p tasks.md` to see task history
- Verify commit message search: Use `git log --grep='[Task-1]' -i` to find task references
- Check dev mode: Verify dev cookie is set
- Check network: Look for `data/tasks.json` request in browser DevTools
- Test view toggle: Ensure card/table view switches work properly
- Test sorting: Toggle sort order and verify tasks reorder by completion date
