# Garden OpenSoftware Product Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce OpenSoftware's selected-product split frame using Garden's existing product artwork and canonical data, without duplicated media.

**Architecture:** Keep `ProductShowcase` responsible for collection state and the selected trigger geometry. Replace the current independent side sheet with a viewport-bound `ProductDetailSheet` that receives the selected card bounds, renders artwork once in a left stage, and renders metadata/actions in a right panel. CSS owns the coordinated frame transition and responsive collapse; existing focus and dialog behavior remain in React.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Playwright, Bun.

---

### Task 1: Lock the collection and split-frame contract in browser tests

**Files:**
- Modify: `e2e/garden-carousel.spec.ts`

- [ ] Add an assertion that cards contain no platform footer:

```ts
await expect(page.getByTestId('showcase-product-sun-signal').getByTestId('showcase-card-platform')).toHaveCount(0);
```

- [ ] Replace the mobile bottom-sheet expectation with desktop split-frame and no-duplicate-media assertions:

```ts
await expect(page.getByTestId('product-detail-artwork')).toHaveCount(1);
await expect(page.getByTestId('product-detail-panel')).toBeVisible();
expect(artworkBounds.right).toBeLessThanOrEqual(panelBounds.left + 1);
```

- [ ] Add source metadata assertions for open and closed products:

```ts
await expect(page.getByTestId('product-detail-source')).toHaveText('Closed');
await expect(page.getByTestId('product-detail-source').getByRole('link')).toHaveCount(0);
```

- [ ] Run `bunx playwright test e2e/garden-carousel.spec.ts --grep "split frame|platform footer|source metadata"` and verify the new checks fail against the current sheet.

### Task 2: Remove collection footers and restore Garden typography

**Files:**
- Modify: `src/components/garden/products-showcase/product-showcase.tsx`

- [ ] Remove the `product.platform`, rule, and arrow span from each collection card.
- [ ] Replace forced caption/Geist card typography with the earlier inherited Garden sans treatment:

```tsx
<span className="text-lg font-medium leading-tight tracking-[-0.02em] text-white">
  {product.title}
</span>
<span className="mt-2 text-sm leading-6 text-white/55">
  {product.description}
</span>
```

- [ ] Remove the artificial `min-h-40` and bottom-pushing flex layout from card copy.
- [ ] Run `bun run typecheck` and the focused platform-footer test.

### Task 3: Pass selected artwork geometry into the dialog

**Files:**
- Modify: `src/components/garden/products-showcase/product-showcase.tsx`
- Modify: `src/components/garden/products-showcase/product-detail-sheet.tsx`

- [ ] Introduce a serializable trigger rectangle:

```ts
export type ProductTriggerRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};
```

- [ ] On product selection, read the card media element's `getBoundingClientRect()` and store it with the selected product.
- [ ] Pass `triggerRect` to `ProductDetailSheet`; keep selection and geometry in one state object so they cannot drift.
- [ ] Preserve Escape, backdrop close, focus trapping, and focus restoration.
- [ ] Run `bun run typecheck`.

### Task 4: Build the OpenSoftware split frame

**Files:**
- Modify: `src/components/garden/products-showcase/product-detail-sheet.tsx`
- Modify: `src/app/globals.css`

- [ ] Replace the duplicated top image and generic header bar with one dialog frame containing:

```tsx
<div data-testid="product-detail-artwork" className="product-detail-artwork-stage">
  <Image src={product.image} alt="" fill className="object-contain" />
</div>
<section data-testid="product-detail-panel" className="product-detail-panel">
  <button type="button" aria-label={`Close ${product.title}`} onClick={onClose}>×</button>
  <h2>{product.title}</h2>
  <p>{product.description}</p>
</section>
```

- [ ] Render metadata as OpenSoftware-style horizontal rows for Platform, Source, and Status. Use a safe source link when `sourceHref` exists and the plain text `Closed` otherwise.
- [ ] Keep product actions anchored to the panel bottom and omit a source action when no public source exists.
- [ ] Add desktop CSS with a large artwork stage on the left and a narrower rounded information panel on the right, using the supplied reference's near-black/brown palette and restrained borders.
- [ ] Add open/close classes that interpolate the artwork from `triggerRect` into the left stage while the panel fades and slides from the right.
- [ ] Run the split-frame, source-metadata, action, focus, and layering tests.

### Task 5: Match responsive and reduced-motion behavior

**Files:**
- Modify: `src/app/globals.css`
- Modify: `e2e/garden-carousel.spec.ts`

- [ ] Add narrow-screen layout rules that preserve one artwork instance and a coherent scrollable detail frame without horizontal overflow.
- [ ] Keep actions reachable and safe-area padded.
- [ ] Under `prefers-reduced-motion: reduce`, remove spatial transforms and retain only immediate visibility changes.
- [ ] Assert the mobile frame remains within the viewport and contains exactly one artwork element.
- [ ] Run `bunx playwright test e2e/garden-carousel.spec.ts`.

### Task 6: Verify, compare, and ship

**Files:**
- Verify: `src/components/garden/products-showcase/product-showcase.tsx`
- Verify: `src/components/garden/products-showcase/product-detail-sheet.tsx`
- Verify: `src/app/globals.css`
- Verify: `e2e/garden-carousel.spec.ts`

- [ ] Run `bun test src/lib/garden-products.test.ts`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bunx playwright test e2e/garden-carousel.spec.ts e2e/products-gallery.spec.ts`.
- [ ] Run `bun run build`.
- [ ] Capture desktop and mobile open-product screenshots and compare panel proportions, spacing, typography, artwork placement, and duplication directly against the supplied OpenSoftware screenshots.
- [ ] Run `git diff --check`, commit only scoped files, push, deploy with `vercel --prod`, and confirm Vercel reports `READY`.
