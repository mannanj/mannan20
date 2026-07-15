# AI-Designed Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible AI-Designed subsection to the Garden products list and move SkillGuard and claude-cues into it.

**Architecture:** Keep product ordering local to `ProductsPanel`, split the current tools slice into reviewed tools and AI-designed tools, and add a focused disclosure-heading component with hover, focus, click-pin, outside-click, and Escape behavior. Exercise the rendered behavior through the existing Garden Playwright suite.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Playwright

---

### Task 1: Define the expected grouping and disclosure behavior

**Files:**
- Modify: `e2e/garden-carousel.spec.ts`

- [x] **Step 1: Write the failing test**

Update the existing product-grouping test to expect `Tools` and `AI-Designed`, assert that each group contains the requested cards, and add a test that checks the disclosure text opens through hover and click, remains pinned after pointer exit, and closes with Escape.

- [x] **Step 2: Run test to verify it fails**

Run: `bunx playwright test e2e/garden-carousel.spec.ts --grep "AI-Designed"`

Expected: FAIL because the AI-Designed heading and disclosure controls do not exist.

### Task 2: Implement the AI-Designed subsection

**Files:**
- Modify: `src/components/garden/garden-explorer.tsx`

- [x] **Step 1: Write minimal implementation**

Add an `AiDesignedHeading` client component using React state and refs. Render a button inline with the heading, a `role="tooltip"` disclosure panel, document-level pointer and Escape dismissal, and hover/focus/click event handlers. Split the current tools collection so the final two cards render in the new subsection.

- [x] **Step 2: Run the focused tests to verify they pass**

Run: `bunx playwright test e2e/garden-carousel.spec.ts --grep "AI-Designed"`

Expected: PASS.

- [x] **Step 3: Run static and production verification**

Run: `bun run typecheck && bun run build`

Expected: Both commands exit 0.

- [x] **Step 4: Commit the implementation**

Stage only `src/components/garden/garden-explorer.tsx`, `e2e/garden-carousel.spec.ts`, and this plan, then commit with `Add AI-designed product disclosure`.

### Task 3: Deploy and smoke-test production

**Files:**
- No source changes expected.

- [ ] **Step 1: Deploy production**

Run: `vercel --prod`

Expected: Vercel reports a production deployment URL.

- [ ] **Step 2: Verify the production page**

Open the production `/garden#products` page and confirm the response succeeds and the production alias is ready for review.
