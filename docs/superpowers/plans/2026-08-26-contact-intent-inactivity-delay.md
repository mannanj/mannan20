# Contact Intent Inactivity Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send contact-intent text automatically only after 3,000 ms without user edits.

**Architecture:** Keep automatic submission inside `ContactIntentForm` and replace the current short debounce plus maximum-pending deadline with one trailing inactivity timeout. Preserve explicit Enter submission, composition handling, whitespace cancellation, and the existing request lifecycle.

**Tech Stack:** React 19, TypeScript, Next.js 15, Playwright, Bun, OpenNext Cloudflare

---

## File Structure

- Modify `e2e/contact-form-edge-cases.spec.ts` to prove Backspace resets the automatic-send timer.
- Modify `e2e/contact-form-mobile.spec.ts` so continuous soft-keyboard activity must remain unsent until it stops.
- Modify `src/components/contact-intent-form.tsx` to implement a true 3,000 ms trailing inactivity timeout.

### Task 1: Add the inactivity regression test

**Files:**
- Test: `e2e/contact-form-edge-cases.spec.ts`

- [x] **Step 1: Write the failing browser test**

Add this test to Group B:

```ts
test('backspacing restarts the three-second inactivity timer', async ({ page }) => {
  let callCount = 0;
  await openRevealedModal(page);
  await page.route('**/api/contact-intent', async (route) => {
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: THANKS_RESPONSE });
  });

  const textarea = page.getByTestId('contact-intent-textarea');
  await textarea.fill('draftx');
  await page.waitForTimeout(600);
  await textarea.press('Backspace');
  await expect(textarea).toHaveValue('draft');

  await page.waitForTimeout(2800);
  expect(callCount).toBe(0);
  await expect(page.getByTestId('contact-intent-turn-ai')).toBeVisible({ timeout: 3000 });
  expect(callCount).toBe(1);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
bunx playwright test e2e/contact-form-edge-cases.spec.ts --grep "backspacing restarts"
```

Expected: FAIL because the current 900 ms timer submits before 2,800 ms of post-Backspace inactivity.

### Task 2: Implement the trailing inactivity timer

**Files:**
- Modify: `src/components/contact-intent-form.tsx`
- Test: `e2e/contact-form-mobile.spec.ts`

- [x] **Step 1: Replace the timer constants and remove elapsed tracking**

Use one timeout value and remove `pendingSinceRef`:

```ts
const INACTIVITY_DELAY_MS = 3000;
```

- [x] **Step 2: Make each schedule replace the previous timeout**

Replace `scheduleSend` with:

```ts
const scheduleSend = useCallback((value: string) => {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => send(value), INACTIVITY_DELAY_MS);
}, [send]);
```

Remove the obsolete `pendingSinceRef` resets from `send`, `handleChange`, and `handleCompositionEnd`. Keep clearing the current timeout for whitespace, Enter, and unmount.

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
bunx playwright test e2e/contact-form-edge-cases.spec.ts --grep "backspacing restarts"
```

Expected: PASS, one request after three uninterrupted seconds.

- [x] **Step 4: Align continuous mobile-event coverage with inactivity semantics**

In both continuous-event tests, stream soft-keyboard edits for 3,500 ms and assert the request count remains zero. Stop the event stream, wait for the AI response, and assert the request count becomes one.

- [x] **Step 5: Run the complete contact-intent browser coverage**

Run:

```bash
bunx playwright test e2e/contact-form-edge-cases.spec.ts e2e/contact-form-intent-thread.spec.ts e2e/contact-form-mobile.spec.ts e2e/contact-form-adversarial.spec.ts
```

Expected: all tests pass.

### Task 3: Verify and deploy

**Files:**
- No source changes expected.

- [x] **Step 1: Verify types, unit tests, and production build**

Run:

```bash
bun run typecheck
bun run test:unit
bun run cf:build
```

Expected: each command exits successfully with zero failures.

- [x] **Step 2: Review the complete working-tree diff**

Run:

```bash
git diff --check
git status --short
git diff -- src/components/contact-intent-form.tsx e2e/contact-form-edge-cases.spec.ts
```

Expected: no whitespace errors; the feature diff contains only the inactivity behavior and regression test. Preserve all pre-existing contact-flow changes.

- [x] **Step 3: Deploy production**

Run:

```bash
bun run cf:deploy:production
```

Expected: Cloudflare reports a successful production deployment and a deployed URL/version.

- [x] **Step 4: Smoke-check production**

Open the deployed URL and confirm it returns a successful response. Exercise the live contact terminal by entering text, editing before three seconds, and confirming the request does not begin until three seconds after the final edit.
