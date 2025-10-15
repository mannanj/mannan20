# Mannan Portfolio - Development Guide

## Project Overview

Full-stack portfolio application with real-time cursor tracking.

**Tech Stack:**
- Frontend: Angular 20, NgRx, Signals, Tailwind CSS 4
- Backend: Spring Boot 3.5.6, Java 25
- WebSocket: Node.js cursor tracking server

## Critical Rules

**NEVER add comments to any code**

## Angular Best Practices

### Components
- Always use standalone components (default, don't set `standalone: true`)
- Use `input()` and `output()` functions, not decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Inline templates for small components
- Use Reactive forms over Template-driven

### Templates
- Use native control flow: `@if`, `@for`, `@switch` (never `*ngIf`, `*ngFor`, `*ngSwitch`)
- Use class/style bindings (never `ngClass`, `ngStyle`)
- Keep templates simple, no complex logic

### State Management
- Use signals for local component state
- Use `computed()` for derived state
- NgRx for global state (`/src/app/store`)
- Use `update()` or `set()` on signals (never `mutate`)

### Services
- Use `inject()` function, not constructor injection
- Single responsibility principle
- Use `providedIn: 'root'` for singletons

### Decorators
- Never use `@HostBinding` or `@HostListener`
- Put host bindings in the `host` object of `@Component`/`@Directive`

## TypeScript Standards

- Strict type checking enabled
- Prefer type inference when obvious
- Never use `any`, use `unknown` when uncertain
- Keep code minimal and maintainable

## Project Structure

```
/src/app/components     Home, About, Contact, Header
/src/app/store          NgRx state (actions, reducers, selectors)
/src/app/services       Data and navigation services
/src/app/models         Type definitions
/src/app/animations     Animation utilities
/backend                Spring Boot REST API for viewer management
/server                 WebSocket server for cursor tracking
```

## Development Workflow

**Frontend (localhost:4200):**
```bash
npm start
```

**Backend (localhost:8080):**
```bash
cd backend && ./mvnw spring-boot:run
```

**WebSocket Server:**
```bash
npm run ws-server
```

## API Endpoints

Base URL: `http://localhost:8080/viewers/`

- `GET /` - List all viewers
- `GET /{identifier}` - Get by id/email/name/reason
- `POST /` - Create viewer (requires at least one field)
- `PUT /{identifier}` - Update viewer

## Code Quality

- Write minimal, performant code
- Keep functions focused and small
- Avoid duplication
- Use const for immutable values
- Extract magic numbers to named constants

## Git Workflow & Task Management

### Post-Commit Hook System

This project uses a custom post-commit hook (`.githooks/post-commit`) that automatically:
- Generates `public/data/dev-commits.json` with recent commit history
- Generates `public/data/tasks.json` from `tasks.md` with completion tracking
- Detects task completions and links them to specific commits

### Creating and Completing Tasks

**1. Add new tasks to `tasks.md`:**
```markdown
### Task N: Task Title
- [ ] Subtask 1
- [ ] Subtask 2
- Location: `path/to/files`
```

**2. Work on the task and mark subtasks complete:**
```markdown
### Task N: Task Title
- [x] Subtask 1
- [x] Subtask 2
- Location: `path/to/files`
```

**3. Commit with task title and details:**
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

**IMPORTANT:**
- Include the complete task entry from tasks.md in the commit message
- Include all subtasks with their completion status
- Include `[Task-N]` or `[Task N]` tag for proper tracking
- Only one task per commit.

### Post-Commit Hook Behavior

When you commit:
1. Hook detects completed tasks (all subtasks checked)
2. Searches git history for commits with `[Task-N]` tag
3. Records completion date and commit hash in `tasks.json`
4. Auto-commits updated data files

### Pushing Changes

After committing task completions:
```bash
git push
```

The hook creates two commits:
1. Your original commit with changes
2. Automatic "Update dev data files" commit

Both will be pushed to remote.
