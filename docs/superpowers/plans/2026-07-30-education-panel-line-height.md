# Education Panel Line-Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten only the expanded Education project descriptions to a `1.35` line-height ratio while preserving the existing `1.6` ratio for ordinary profile descriptions.

**Architecture:** Keep `ContentCard` as the shared renderer and use its existing `nested` prop as the typography boundary. Add a browser regression test that expands Education and compares computed line-height ratios for one nested project description and one ordinary employment description.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Next.js, Playwright

---

### Task 1: Add the spacing regression test

**Files:**

- Create: `e2e/about-education-spacing.spec.ts`

- [x] **Step 1: Write the failing browser test**

```ts
import { expect, test } from '@playwright/test';

const lineHeightRatio = async (locator: import('@playwright/test').Locator) =>
  locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
  });

test('education project descriptions use tighter spacing than employment descriptions', async ({ page }) => {
  await page.goto('/#about');
  await page.locator('[data-education-more]').click();

  const educationDescription = page
    .getByTestId('archr-project')
    .getByText('Lead developer for an intuitive teleoperation system', { exact: false });
  const employmentDescription = page.getByText(
    'AI product studio & consulting agency shipping production-grade full-stack AI platforms.',
    { exact: true },
  );

  await expect(educationDescription).toBeVisible();
  await expect(employmentDescription).toBeVisible();
  expect(await lineHeightRatio(educationDescription)).toBeCloseTo(1.35, 1);
  expect(await lineHeightRatio(employmentDescription)).toBeCloseTo(1.6, 1);
});
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
bunx playwright test e2e/about-education-spacing.spec.ts
```

Expected: the Education ratio assertion fails because both descriptions currently use `1.6`.

### Task 2: Scope the tighter typography to nested cards

**Files:**

- Modify: `src/components/about/content-card.tsx`

- [x] **Step 1: Make the description line height conditional**

Replace the description paragraph class with:

```tsx
<p
  className={`text-xs mt-0 m-0 ${nested ? '!text-black leading-[1.35]' : 'text-white leading-[1.6]'}`}
  dangerouslySetInnerHTML={{ __html: data.description }}
/>
```

- [x] **Step 2: Run the focused test**

Run:

```bash
bunx playwright test e2e/about-education-spacing.spec.ts
```

Expected: `1 passed`.

- [x] **Step 3: Run TypeScript**

Run:

```bash
bun run typecheck
```

Expected: exit code `0`.

- [x] **Step 4: Inspect the focused diff**

Run:

```bash
git diff --check -- src/components/about/content-card.tsx e2e/about-education-spacing.spec.ts
git diff -- src/components/about/content-card.tsx e2e/about-education-spacing.spec.ts
```

Expected: one conditional class change and one focused regression test, with no whitespace errors.

### Task 3: Visual verification

**Files:**

- Verify: `src/components/about/content-card.tsx`

- [x] **Step 1: Capture the expanded Education panel at mobile width**

Run:

```bash
playwright screenshot --device="iPhone 13" --full-page http://127.0.0.1:3847/#about /tmp/about-education-spacing.png
```

Expected: the Education project descriptions have compact, readable line spacing while project headings and inter-project spacing remain unchanged.

- [x] **Step 2: Complete the task record**

Mark every acceptance item in `tasks/task-278.md` complete only after the browser test, typecheck, and screenshot inspection pass.
