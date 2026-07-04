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

## Unicorn Studio scene — re-export workflow

The "Health is an Artform" hero uses a Unicorn Studio scene. It lives as **two files**:
- `public/unicorn/health-hero-scene.raw.json` — pristine export, source of truth
- `public/unicorn/health-hero-scene.json` — derived file the app loads

The derivation is done by `scripts/apply-unicorn-transforms.mjs`, which applies a 3× slowdown and an iridescent shader recolor on top of the raw export. It runs automatically on `bun install` via the `postinstall` script, or manually via `bun run unicorn:build`.

When re-exporting from Unicorn Studio: replace the `.raw.json` file, run `bun run unicorn:build`, commit **both** files. Never hand-edit the non-raw file. See `public/unicorn/README.md` for the full rationale (and the "option C" escape hatch if the shader string-replacements ever break).

## MCP worker — public data snapshot

`mcp-worker/` serves a read-only MCP server at `https://mcp.mannanteam.workers.dev/mcp` exposing the site's public data to AI agents. The worker bundles `mcp-worker/src/data.generated.json`, generated from site sources by `scripts/build-mcp-data.mjs` — never hand-edit the generated file.

**When changing site content** (`public/data/about.json`, `src/lib/garden-articles.ts`, `src/lib/episodes.ts`, `src/lib/garden-products.ts`): run `bun run mcp:build`, commit the regenerated snapshot, and `bun run mcp:deploy`. `bun run mcp:check` detects drift; `bun run mcp:test` runs the worker's suite (protocol, privacy, goals honesty, search); `bun run mcp:smoke` checks the live endpoint.

Privacy rules are enforced by build guards and tests: gated/hidden content (Taken, hidden episodes, /jordan), access codes, and email/phone must never appear in the snapshot. Articles with `robots: index:false` stay out of the MCP. Garden product data lives in `src/lib/garden-products.ts` (shared by the garden UI and the MCP build). See `mcp-worker/README.md`.

`scripts/build-mcp-data.mjs` also generates `public/llms.txt` and the `public/.well-known/` server cards — never hand-edit those either. The site has a human-facing guide at `/mcp` (`src/app/mcp/page.tsx`, content constants in `src/lib/mcp-info.ts`) and a header popover (`src/components/mcp/mcp-header-button.tsx`); if MCP tools change, update `MCP_TOOLS` in `src/lib/mcp-info.ts` to match `mcp-worker/src/server.ts`. The worker also serves documents at `/files/<slug>` from R2 with per-IP rate limiting.

## Code Quality

- Minimal, performant
- Focused, small functions
- No duplication
- Use `const` for immutable values

## Git Workflow & Task Management

### Post-Commit Hook

`.githooks/post-commit` exists but is **not wired up** — `core.hooksPath` is unset and `.git/hooks/post-commit` doesn't exist, so it has never run. Treat it as dead until someone deliberately wires it up (`git config core.hooksPath .githooks`); don't assume task tracking data is being auto-generated.

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
  - Push and skip to next task

**3. Complete subtasks, mark `[x]` in tasks/task-N.md**

**4. Commit** with a plain descriptive message (subject + body as needed). The `[Task-N]` commit-tag convention this section previously described as required is **not actually practiced** — recent commits carry no such tag, and there's no hook consuming it — so don't bother adding it.

**Requirements:**
- Each task gets its own file: `tasks/task-N.md`
- Mark subtasks complete as they're done

**5. Push:** `git push`
