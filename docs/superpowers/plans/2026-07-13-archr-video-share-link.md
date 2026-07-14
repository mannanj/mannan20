# ARCHR Video Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native-share control to the video popout and make the ARCHR resume video directly openable at `/?video=archr#archr`.

**Architecture:** A focused utility owns canonical URL construction and native-share/clipboard fallback. The About component recognizes only the known `archr` identifier, expands the Education project, scrolls to its stable anchor, and opens the existing popout. Playwright verifies both entry paths through the browser.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Playwright

---

### Task 1: Define browser-visible behavior

**Files:**
- Modify: `e2e/watch-demo.spec.ts`

- [x] Add a test that visits `/?video=archr#archr`, verifies the ARCHR project is visible in the viewport, and verifies its YouTube popout opens.
- [x] Stub `navigator.share`, activate the modal share control, and verify the canonical ARCHR deep link is shared.
- [x] Remove native sharing, stub `navigator.clipboard.writeText`, and verify the canonical link is copied with accessible confirmation.
- [x] Run the focused browser suite and confirm all watch-demo behavior passes.

### Task 2: Implement sharing and deep-link behavior

**Files:**
- Create: `src/lib/video-share.ts`
- Modify: `src/components/video-popout.tsx`
- Modify: `src/components/about.tsx`
- Modify: `src/components/about/education-section.tsx`
- Modify: `src/components/about/content-card.tsx`

- [x] Add `getVideoShareUrl` to create `?video=<id>#<id>` from the current origin and path.
- [x] Add `shareVideoLink` to call `navigator.share({ title, url })` and fall back to clipboard copying when sharing is unavailable or rejected.
- [x] Add an accessible 44-pixel share control immediately left of the modal close control, with shared/copied/error status.
- [x] Give the ARCHR resume project a stable `archr` anchor and `archr-project` test identifier.
- [x] Recognize only `video=archr`, expand Education, scroll the project into view, and open its configured demo URL.
- [x] Pass `shareId="archr"` only when the open modal URL matches the configured ARCHR demo URL.

### Task 3: Verify and ship

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-archr-video-share-link.md`

- [x] Run `bun run typecheck` successfully.
- [x] Run `bunx playwright test e2e/watch-demo.spec.ts --project=chromium` successfully.
- [x] Run `git diff --check` successfully and review the scoped diff.
- [ ] Commit only the plan, tests, utility, and five component files.
- [ ] Deploy with `vercel --prod` and smoke test `https://mannan.is/?video=archr#archr`.
