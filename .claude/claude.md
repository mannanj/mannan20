# Mannan Portfolio - Development Guide

## Project Overview

Full-stack portfolio with real-time cursor tracking.

**Stack:** Angular 20, NgRx, Signals, Tailwind CSS 4 | Spring Boot 3.5.6, Java 25 | Node.js WebSocket

## Critical Rules

**NEVER add comments to code**

## Angular Best Practices

### Components
- Standalone components (default, don't set `standalone: true`)
- Use `input()`, `output()`, `computed()` functions (not decorators)
- `changeDetection: ChangeDetectionStrategy.OnPush`
- Inline templates for small components
- Reactive forms only

### Templates
- Control flow: `@if`, `@for`, `@switch` (never `*ngIf`, `*ngFor`, `*ngSwitch`)
- Direct bindings: `[class]`, `[style]` (never `ngClass`, `ngStyle`)
- Keep logic minimal

### State Management
- Signals for local state, `computed()` for derived state
- NgRx for global state (`/src/app/store`)
- Use `update()` or `set()` on signals (never `mutate()`)

### Services
- Use `inject()` (not constructor injection)
- Single responsibility
- `providedIn: 'root'` for singletons

### Decorators
- Never use `@HostBinding` or `@HostListener`
- Use `host` object in `@Component`/`@Directive`

## Tailwind CSS Styling

**Always prefer Tailwind utilities over component `styles` arrays.**

Apply classes directly in templates. Use arbitrary values: `text-[#039be5]`, `w-[400px]`

### When Custom CSS is Required
- `::before`/`::after` with `content` property
- Angular selectors: `:host`, `:host-context()`
- `@keyframes` animations
- Complex nested selectors dependent on parent state

### Global Utilities (`src/styles.css`)
- `.collapsible` - More/less buttons
- `.content` - Expandable containers
- `.margin-top*` - Spacing utilities

**Good:** `<button class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded">`
**Avoid:** Component `styles` arrays with CSS that Tailwind can handle

## TypeScript Standards

- Strict type checking
- Prefer type inference
- Never `any`, use `unknown` when uncertain
- Minimal, maintainable code
- Extract magic numbers to named constants

## Project Structure

```
/src/app/components     Home, About, Contact, Header
/src/app/store          NgRx state (actions, reducers, selectors)
/src/app/services       Data, navigation
/src/app/models         Types
/src/app/animations     Animation utilities
/backend                Spring Boot REST API
/server                 WebSocket cursor tracking
```

## Development

**Frontend:** `npm start` (localhost:4200)
**Backend:** `cd backend && ./mvnw spring-boot:run` (localhost:8080)
**WebSocket:** `npm run ws-server`

## API Endpoints

Base: `http://localhost:8080/viewers/`

- `GET /` - List all
- `GET /{identifier}` - Get by id/email/name/reason
- `POST /` - Create (requires ≥1 field)
- `PUT /{identifier}` - Update

## Code Quality

- Minimal, performant
- Focused, small functions
- No duplication
- Use `const` for immutable values

## Git Workflow & Task Management

### Post-Commit Hook

`.githooks/post-commit` auto-generates:
- `public/data/dev-commits.json` - Recent commits
- `public/data/tasks.json` - Task tracking with completion dates/commits

### Task Workflow

**1. Create task in `tasks.md`:**
```markdown
### Task N: Task Title
- [ ] Subtask 1
- [ ] Subtask 2
- Location: `path/to/files`
```

**2. Before starting, verify work isn't already done:**
- Check codebase for task's changes
- Review files in Location field
- If complete but unmarked:
  - Mark subtasks `[x]` in tasks.md
  - Commit with `[Task-N]` tag
  - Push and skip to next task

**3. Complete subtasks, mark `[x]` in tasks.md**

**4. Commit:**
```bash
git add .
git commit -m "Task N: Task Title

- [x] Subtask 1
- [x] Subtask 2
- Location: \`path/to/files\`

[Task-N]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Requirements:**
- Complete task entry in commit message
- All subtasks with status
- `[Task-N]` tag for tracking
- One task per commit

**5. Push:** `git push`

Hook creates two commits: your task commit + auto "Update dev data files" commit.
