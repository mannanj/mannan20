# Garden OpenSoftware Showcase Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Garden Showcase as a sparse OpenSoftware-style three-column product browser using the existing Globe HUD positioning and view controls.

**Architecture:** Extract reusable Garden HUD chrome from the Globe-specific HUD, then compose it around a static Showcase surface. Keep canonical product data and the existing detail sheet; replace only the Showcase collection presentation and its layout CSS.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Playwright, Bun.

---

### Task 1: Lock the requested Showcase behavior in browser tests

**Files:**
- Modify: `e2e/garden-carousel.spec.ts`

- [x] Add assertions that Showcase renders the Home control, centered category pill, two inactive left controls, three-column product rows, Tools heading, hover/focus labels, and OpenSoftware attribution.
- [x] Assert Showcase does not render filter, Let's Talk, zoom, sound, or Globe canvas controls.
- [x] Run `bunx playwright test e2e/garden-carousel.spec.ts --grep "OpenSoftware Showcase"` and verify the new assertions fail against the old card catalog.

### Task 2: Reuse the Globe HUD chrome

**Files:**
- Create: `src/components/garden/garden-hud-chrome.tsx`
- Modify: `src/components/garden/products-gallery/gallery-hud.tsx`
- Modify: `src/components/garden/garden-explorer.tsx`

- [x] Extract the avatar/Home and centered category pill into reusable components with the existing test IDs and positioning.
- [x] Keep Globe-only filter, Let's Talk, zoom, and sound controls inside `GalleryHud`.
- [x] Render shared HUD chrome for Showcase without duplicating controls or changing Globe behavior.
- [x] Run `bun run typecheck` and the focused Showcase tests.

### Task 3: Replace the card catalog with OpenSoftware-style tiles

**Files:**
- Modify: `src/components/garden/products-showcase/product-showcase.tsx`
- Modify: `src/app/globals.css`

- [x] Replace bordered metadata cards with open artwork tiles and beneath-image label reveals.
- [x] Render primary products three across, then a serif Tools heading and tool products three across.
- [x] Keep labels visible for keyboard focus, touch, and reduced motion; preserve detail-sheet selection.
- [x] Add the bottom-right OpenSoftware attribution.
- [x] Run the focused Showcase tests and typecheck.

### Task 4: Verify the complete Garden experience

**Files:**
- Verify: `e2e/garden-carousel.spec.ts`
- Verify: `e2e/products-gallery.spec.ts`

- [x] Run `bun test src/lib/garden-products.test.ts src/components/garden/products-gallery/gallery-sound.test.ts`.
- [x] Run `bun run typecheck`.
- [x] Run `bunx playwright test e2e/garden-carousel.spec.ts e2e/products-gallery.spec.ts`.
- [x] Run `bun run build`.
- [x] Capture and inspect desktop and mobile Showcase screenshots against the supplied OpenSoftware references.
- [x] Run `git diff --check` and confirm unrelated user files remain untouched.

Verification completed 2026-07-13: 4 focused unit tests passed, TypeScript passed, 37 Garden Playwright tests passed, the Next.js production build passed, and `git diff --check` passed. Desktop and mobile screenshots were inspected during implementation.
