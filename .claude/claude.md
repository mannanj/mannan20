# Mannan Portfolio - Development Guide

## Project Overview

Portfolio site built with Next.js (App Router).

**Stack:** Next.js 15, React 19, Tailwind CSS 4, TypeScript

## Critical Rules

**NEVER add comments to code**

## React Best Practices

### Components
- Functional components only
- `'use client'` directive only where needed (state, effects, event handlers)
- Server components by default
- Props via destructuring, typed with interfaces

### State Management
- `useState` for local state
- `useReducer` + Context for global state (`src/context/app-context.tsx`)
- No Redux/Zustand — state is minimal (5 fields)

### Hooks
- Custom hooks in `src/hooks/`
- `useApp()` for global state access
- `useScrollSpy()` for Intersection Observer-based nav tracking

### Patterns
- `useMemo`/`useCallback` where referential stability matters
- Avoid prop drilling — use context for cross-cutting state
- `dangerouslySetInnerHTML` only for static, author-controlled data (about.json)

## Tailwind CSS Styling

**Always prefer Tailwind utilities over separate CSS.**

Apply classes directly in JSX. Use arbitrary values: `text-[#039be5]`, `w-[400px]`

### When Custom CSS is Required (`src/app/globals.css`)
- `::before`/`::after` with `content` property
- `@keyframes` animations
- Complex nested selectors dependent on parent state

### Global Utilities (`src/app/globals.css`)
- `.nav-button` - Navigation action buttons
- `.header-link` / `.header-link-selected` - Nav link underline
- `.contact-grid` / `.ripple-container` / `.circle` - Contact section layout
- `.action-container` / `.divider` / `.tooltip` - Contact form
- `.content` - Nested content card styling

**Good:** `<button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded">`
**Avoid:** Inline `style` objects or CSS modules when Tailwind can handle it

## TypeScript Standards

- Strict type checking
- Prefer type inference
- Never `any`, use `unknown` when uncertain
- Minimal, maintainable code
- Extract magic numbers to named constants

## Project Structure

```
src/
  app/
    layout.tsx          Root layout: metadata, analytics
    page.tsx            Server component: imports about.json, renders <Portfolio>
    globals.css         Global styles + keyframe animations
  components/
    portfolio.tsx       'use client' wrapper: AppProvider + all sections
    header.tsx          Fixed navbar, scroll-based active link
    hero.tsx            Hero section
    about.tsx           About section with sub-sections
    about/
      employment-section.tsx
      extracurriculars-section.tsx
      education-section.tsx
      content-card.tsx
    contact.tsx         Contact section
    contact-modal.tsx   Modal wrapper: form -> result
    contact-form.tsx    Textarea + validation + submit
    contact-result.tsx  Email/phone reveal + copy
    keyboard-commands-modal.tsx  "/" command palette
    modal.tsx           Generic modal shell
    icons/
      copy-icon.tsx
      check-icon.tsx
      google-logo-icon.tsx
  hooks/
    use-scroll-spy.ts   Intersection Observer for active nav
  lib/
    types.ts            TypeScript interfaces
    utils.ts            scrollToSection, getPhoneLink, copyToClipboard
  context/
    app-context.tsx     useReducer + Context for modal/section state
public/
  data/about.json       Portfolio content data
```

## Development

**Dev:** `bun run dev` (localhost:3000)
**Build:** `bun run build`
**Start:** `bun run start`

## Code Quality

- Minimal, performant
- Focused, small functions
- No duplication
- Use `const` for immutable values

## Git Workflow & Task Management

### Post-Commit Hook

`.githooks/post-commit` auto-generates task tracking data.

### Task Workflow

**1. Create task file in `tasks/` directory:**
```bash
# Create tasks/task-N.md
```
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
  - Mark subtasks `[x]` in tasks/task-N.md
  - Commit with `[Task-N]` tag
  - Push and skip to next task

**3. Complete subtasks, mark `[x]` in tasks/task-N.md**

**4. Commit:**
```bash
git add .
git commit -m "Task N: Task Title

- [x] Subtask 1
- [x] Subtask 2
- Location: \`path/to/files\`

[Task-N]

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Requirements:**
- Each task gets its own file: `tasks/task-N.md`
- Complete task entry in commit message
- All subtasks with status
- `[Task-N]` tag for tracking
- One task per commit

**5. Push:** `git push`
