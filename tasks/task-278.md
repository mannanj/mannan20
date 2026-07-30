### Task 278: Tighten expanded education project line spacing

**Goal:** Match the readable rhythm of employment expansions by tightening only the line height of nested Education project descriptions.

**Files:**

- `src/components/about/content-card.tsx`
- `e2e/about-education-spacing.spec.ts`

**Acceptance:**

- [x] Nested project descriptions use `line-height: 1.35`.
- [x] Non-nested profile descriptions retain `line-height: 1.6`.
- [x] Focused browser coverage verifies both computed styles.
- [x] Typecheck and the focused Playwright test pass.
