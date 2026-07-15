# Globe AI-Designed Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the shared AI-Designed disclosure beside the year in globe product details for SkillGuard and claude-cues.

**Architecture:** Add an `aiDesigned` flag to canonical product data and extract the existing disclosure into a reusable client component. Both the flat list heading and globe detail metadata row consume that component with surface-specific styling.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Bun, Playwright

---

### Task 1: Specify product classification and globe metadata behavior

**Files:**
- Modify: `e2e/products-gallery.spec.ts`
- Modify: `src/components/garden/products-gallery/gallery-sound.test.ts`

- [ ] **Step 1: Add failing coverage**

Assert that SkillGuard and claude-cues are flagged as AI-designed while other products are not, and that opening an AI-designed product detail displays the label and disclosure beside its year.

- [ ] **Step 2: Verify RED**

Run the focused Bun and Playwright tests. Expect failure because `aiDesigned` and the globe detail label do not exist.

### Task 2: Share the disclosure across product views

**Files:**
- Create: `src/components/garden/ai-designed-disclosure.tsx`
- Modify: `src/lib/garden-products.ts`
- Modify: `src/components/garden/garden-explorer.tsx`
- Modify: `src/components/garden/products-gallery/product-detail.tsx`

- [ ] **Step 1: Implement the canonical flag and shared disclosure**

Add `aiDesigned?: boolean`, flag SkillGuard and claude-cues, move the approved disclosure and its interactions into a reusable component, and render it after the globe detail year only when flagged.

- [ ] **Step 2: Verify GREEN**

Run focused tests, the full affected Playwright specs, typecheck, and the production build. Expect all commands to exit 0.

- [ ] **Step 3: Commit and push**

Stage only feature, test, spec, and plan files; commit the implementation and push `main` to `origin`.

### Task 3: Deploy production

- [ ] **Step 1: Deploy a clean snapshot**

Create a detached clean worktree at the implementation commit and run `vercel --prod --yes` from it.

- [ ] **Step 2: Verify production**

Confirm Vercel reports `READY`, the `www.mannan.is` alias is updated, and the live globe product detail renders the AI-Designed metadata label.
