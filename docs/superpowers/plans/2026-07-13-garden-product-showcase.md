# Garden Product Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Products + a four-column OpenSoftware-inspired Showcase the default Garden experience while preserving Globe and the existing grid as Legacy view.

**Architecture:** Replace the product-view boolean cluster with one `ProductView` discriminant and keep category state separate. Centralize product imagery, feature metadata, source/download actions, and status in `garden-products.ts`; render it through a focused Showcase collection/detail sheet and reuse the same records in the WebGL gallery. A shared inactive-view rail drives Showcase/Globe/Legacy switching, while the Globe HUD exposes the two non-active product views.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, React Three Fiber, Bun unit tests, Playwright e2e.

---

## File map

- Modify `src/lib/garden-products.ts`: canonical product presentation/action metadata and product view type.
- Modify `src/components/garden/products-gallery/gallery-data.ts`: consume canonical image/accent metadata instead of duplicating it.
- Create `src/lib/garden-products.test.ts`: validate ordering, grouping, and action policy.
- Create `src/components/garden/product-view-switcher.tsx`: shared icons and inactive-view rail.
- Create `src/components/garden/products-showcase/product-showcase.tsx`: four-column collection and grouping.
- Create `src/components/garden/products-showcase/product-detail-sheet.tsx`: accessible desktop sheet/mobile bottom sheet.
- Modify `src/components/garden/garden-explorer.tsx`: default category, explicit product view state, transitions, and Showcase/Legacy rendering.
- Modify `src/components/garden/products-gallery/index.tsx`: explicit view callbacks and Showcase fallback.
- Modify `src/components/garden/products-gallery/gallery-hud.tsx`: replace the single grid action with Showcase + Legacy actions.
- Modify `src/app/globals.css`: warm field, sheet, and reduced-motion transitions that cannot be expressed cleanly inline.
- Modify `e2e/garden-carousel.spec.ts`: new default, collection, grouping, links, and category behavior.
- Modify `e2e/products-gallery.spec.ts`: three-view transitions and renamed Legacy controls.

### Task 1: Canonical product presentation metadata

**Files:**
- Modify: `src/lib/garden-products.ts`
- Modify: `src/components/garden/products-gallery/gallery-data.ts`
- Create: `src/lib/garden-products.test.ts`

- [ ] **Step 1: Write the failing metadata tests**

Create tests that assert the visible order, the first-three/product-tools grouping, public source URLs, Poppy download URL, and fallback Explore policy:

```ts
import { describe, expect, test } from "bun:test";
import {
  GARDEN_PRODUCTS,
  getGardenProductActions,
  getVisibleGardenProducts,
} from "./garden-products";

describe("garden products", () => {
  test("keeps the approved visible order and tools split", () => {
    const visible = getVisibleGardenProducts();
    expect(visible.map((product) => product.title)).toEqual([
      "Sun Signal", "Read Along", "Meal Fairy", "Poppy",
      "Greenlights", "Event Every", "SkillGuard", "claude-cues",
    ]);
    expect(visible.slice(0, 3).every((product) => product.group === "products")).toBe(true);
    expect(visible.slice(3).every((product) => product.group === "tools")).toBe(true);
  });

  test("prefers source, then download, then explore", () => {
    const sun = GARDEN_PRODUCTS.find((product) => product.title === "Sun Signal")!;
    const poppy = GARDEN_PRODUCTS.find((product) => product.title === "Poppy")!;
    const readAlong = GARDEN_PRODUCTS.find((product) => product.title === "Read Along")!;
    expect(getGardenProductActions(sun)[0].label).toBe("View Source");
    expect(getGardenProductActions(poppy)[0]).toMatchObject({
      label: "Download Poppy",
      href: "https://getpoppy.io/download",
    });
    expect(getGardenProductActions(readAlong)).toEqual([
      { label: "Explore Read Along", href: "https://tryreadalong.com", kind: "explore" },
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test src/lib/garden-products.test.ts`

Expected: FAIL because the new metadata and helpers do not exist.

- [ ] **Step 3: Extend the data model and add action helpers**

Add explicit metadata fields and helpers. Keep hidden products valid, but only visible products participate in Showcase/Globe:

```ts
export type ProductView = "showcase" | "globe" | "legacy";
export type GardenProductGroup = "products" | "tools";

export interface GardenProductData {
  title: string;
  description: string;
  href: string;
  external: boolean;
  year: number;
  group: GardenProductGroup;
  platform: string;
  features: readonly string[];
  image: string | null;
  accent: string;
  sourceHref?: string;
  downloadHref?: string;
  retired?: boolean;
  hidden?: boolean;
}

export type GardenProductAction = {
  label: string;
  href: string;
  kind: "source" | "download" | "explore";
};

export function getVisibleGardenProducts() {
  return GARDEN_PRODUCTS.filter((product) => !product.hidden);
}

export function getGardenProductActions(product: GardenProductData): GardenProductAction[] {
  const explore = { label: `Explore ${product.title}`, href: product.href, kind: "explore" as const };
  if (product.sourceHref) return [
    { label: "View Source", href: product.sourceHref, kind: "source" },
    explore,
  ];
  if (product.downloadHref) return [
    { label: `Download ${product.title}`, href: product.downloadHref, kind: "download" },
    explore,
  ];
  return [explore];
}
```

Populate the visible records with these exact presentation values, then simplify `gallery-data.ts` to map `getVisibleGardenProducts()` directly:

| Product | Group | Platform | Image | Accent | Source/download |
| --- | --- | --- | --- | --- | --- |
| Sun Signal | products | Web | `/sun-signal.png` | `#f5a524` | `https://github.com/mannanj/sun-signal` |
| Read Along | products | Web | `/read-along.png` | `#7c8cff` | none |
| Meal Fairy | products | Web | `/meal-fairy.png` | `#8bd450` | none; status retired |
| Poppy | tools | macOS | `/poppy.png` | `#f5923e` | download `https://getpoppy.io/download` |
| Greenlights | tools | Web | `/greenlights.png` | `#1f8f5a` | none |
| Event Every | tools | Web | `/eventevery.png` | `#3ec5a8` | `https://github.com/mannanj/event-every` |
| SkillGuard | tools | CLI | `/skillguard.png` | `#ff6b6b` | `https://github.com/mannanj/skillguard` |
| claude-cues | tools | CLI | `/claude-cues.png` | `#c084fc` | `https://github.com/mannanj/beep-boop` |

Use three concise, product-specific features per record derived from the existing descriptions and pages: Sun Signal (`Real-time solar timing`, `ZIP-based guidance`, `Circadian cues`), Read Along (`AI narration`, `Word-level read along`, `Text-to-audio`), Meal Fairy (`Chef-cooked meals`, `Healthy menus`, `Doorstep delivery`), Poppy (`Safari pop-outs`, `Always-on-top windows`, `Position memory`), Greenlights (`Route comparison`, `Traffic windows`, `Best-time guidance`), Event Every (`Image import`, `Text extraction`, `Calendar events`), SkillGuard (`Skill scanning`, `Prompt-injection detection`, `Claude Code hook`), and claude-cues (`Audio activity cues`, `Claude Code states`, `Local sound feedback`).

- [ ] **Step 4: Run metadata tests and typecheck**

Run: `bun test src/lib/garden-products.test.ts && bun run typecheck`

Expected: PASS.

### Task 2: Shared three-view controls

**Files:**
- Create: `src/components/garden/product-view-switcher.tsx`

- [ ] **Step 1: Build named icons and the inactive-view rail**

Expose a reusable icon and rail so Showcase/Legacy render the same control language:

```tsx
import type { ProductView } from "@/lib/garden-products";

const VIEW_LABEL: Record<ProductView, string> = {
  showcase: "Showcase view",
  globe: "Globe view",
  legacy: "Legacy view",
};

export function ProductViewIcon({ view, className }: { view: ProductView; className?: string }) {
  if (view === "globe") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>;
  }
  if (view === "legacy") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  }
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"><rect x="3" y="5" width="13" height="11" rx="2"/><rect x="8" y="9" width="13" height="11" rx="2"/></svg>;
}

export function ProductViewSwitcher({
  active,
  onSelect,
}: {
  active: ProductView;
  onSelect: (view: ProductView) => void;
}) {
  const inactive = (["showcase", "globe", "legacy"] as const).filter((view) => view !== active);
  return (
    <nav aria-label="Product views" className="fixed left-5 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3">
      {inactive.map((view) => (
        <button
          key={view}
          type="button"
          data-testid={`garden-view-${view}`}
          aria-label={VIEW_LABEL[view]}
          onClick={() => onSelect(view)}
        >
          <ProductViewIcon view={view} />
          <span role="tooltip">{VIEW_LABEL[view]}</span>
        </button>
      ))}
    </nav>
  );
}
```

Use the existing translucent rounded-square treatment, ensure only inactive view buttons are rendered, and move the rail above mobile bottom safe-area when necessary.

- [ ] **Step 2: Typecheck the isolated component**

Run: `bun run typecheck`

Expected: PASS.

### Task 3: Showcase collection and detail sheet

**Files:**
- Create: `src/components/garden/products-showcase/product-showcase.tsx`
- Create: `src/components/garden/products-showcase/product-detail-sheet.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add failing e2e assertions for the Showcase surface**

In `e2e/garden-carousel.spec.ts`, replace the old Writings-default assertion and add:

```ts
test("Products opens in the four-column Showcase by default", async ({ page }) => {
  await gotoGarden(page);
  await expect(page.getByTestId("garden-active-panel")).toHaveAttribute("data-panel", "products");
  await expect(page.getByTestId("products-showcase")).toBeVisible();
  await expect(page.getByTestId("products-showcase-grid")).toHaveClass(/lg:grid-cols-4/);
  await expect(page.getByTestId("garden-view-globe")).toBeVisible();
  await expect(page.getByTestId("garden-view-legacy")).toBeVisible();
  await expect(page.getByTestId("garden-view-showcase")).toHaveCount(0);
});

test("a Showcase product opens its detail sheet", async ({ page }) => {
  await gotoGarden(page);
  await page.getByTestId("showcase-product-sun-signal").click();
  await expect(page.getByRole("dialog", { name: "Sun Signal" })).toBeVisible();
  await expect(page.getByTestId("showcase-primary-action")).toHaveAttribute(
    "href",
    "https://github.com/mannanj/sun-signal",
  );
  await expect(page.getByTestId("showcase-secondary-action")).toHaveAttribute(
    "href",
    "https://sunsignal.app",
  );
});
```

- [ ] **Step 2: Run the focused e2e test and verify it fails**

Run: `bunx playwright test e2e/garden-carousel.spec.ts --grep "Showcase|detail sheet"`

Expected: FAIL because Showcase does not exist.

- [ ] **Step 3: Implement the four-column collection**

Build `ProductShowcase` around canonical product data:

```tsx
export function ProductShowcase() {
  const [selected, setSelected] = useState<GardenProductData | null>(null);
  const products = getVisibleGardenProducts();
  const primary = products.filter((product) => product.group === "products");
  const tools = products.filter((product) => product.group === "tools");
  return (
    <section data-testid="products-showcase" aria-label="Product showcase">
      <ProductCollection products={primary} onSelect={setSelected} />
      <h3>Tools</h3>
      <ProductCollection products={tools} onSelect={setSelected} />
      {selected && <ProductDetailSheet product={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
```

`ProductCollection` must use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, stable slug test IDs, `next/image`, 4:3 visual areas, a warm card surface, and OpenSoftware-like title/description typography using `var(--font-caption)` and `var(--font-geist-sans)`.

- [ ] **Step 4: Implement the detail sheet and focus lifecycle**

Use a portal-free fixed dialog so it remains inside the Garden React tree. Capture the trigger with `document.activeElement`, focus the close button on mount, restore focus on cleanup, close on Escape/backdrop, and stop panel clicks from bubbling:

```tsx
<div className="fixed inset-0 z-[70] bg-black/45" onMouseDown={onClose}>
  <section
    role="dialog"
    aria-modal="true"
    aria-label={product.title}
    onMouseDown={(event) => event.stopPropagation()}
    className="product-showcase-sheet"
  >
    <button ref={closeRef} aria-label={`Close ${product.title}`} onClick={onClose}>×</button>
    <h2>{product.title}</h2>
    <p>{product.description}</p>
    <ProductMetadata product={product} />
    <ProductActions product={product} />
  </section>
</div>
```

Style desktop as a 448px right sheet inset 16px on all sides and mobile as a bottom sheet inset 12px with `max-height: 85dvh`. Add the warm radial field and 440ms/320ms sheet transitions, with `prefers-reduced-motion` overrides.

- [ ] **Step 5: Run the focused tests**

Run: `bunx playwright test e2e/garden-carousel.spec.ts --grep "Showcase|detail sheet"`

Expected: PASS.

### Task 4: Default routing and explicit ProductView state

**Files:**
- Modify: `src/components/garden/garden-explorer.tsx`

- [ ] **Step 1: Replace boolean view state with one discriminant**

Set Products as the category default and Showcase as the product view default:

```tsx
const [active, setActive] = useState<Category>("products");
const [productView, setProductView] = useState<ProductView>("showcase");

const select = (next: Category) => {
  if (next === active) return;
  if (next === "products") setProductView("showcase");
  const swivel = active !== "products" && next !== "products";
  if (swivel) {
    setDir(ORDER[next] > ORDER[active] ? 1 : -1);
    setPrev(active);
  } else {
    setPrev(null);
  }
  setActive(next);
  window.history.replaceState(null, "", `#${next}`);
};

const selectProductView = (next: ProductView) => {
  setProductView(next);
};
```

Render `ProductShowcase` for `products/showcase`, preserve the existing `ProductsPanel` as `products/legacy`, and mount `ProductsGallery` only for `products/globe`. Keep the category tabs above Showcase and Legacy. Render `ProductViewSwitcher` for non-Globe product views. A bare URL must not be overwritten with a hash during hydration.

- [ ] **Step 2: Preserve focused transition behavior without inconsistent flags**

Remove `globeOpen`, `listHidden`, `showList`, and `showGlobe`. Keep only short-lived presentation flags needed for the existing tab morph, and ensure every timeout is stored/cleared in an effect cleanup. A Globe-to-category selection must still wait for the gallery exit animation; direct Showcase/Legacy switching can crossfade in the Garden panel.

- [ ] **Step 3: Run the complete Garden category suite**

Run: `bunx playwright test e2e/garden-carousel.spec.ts`

Expected: all Garden category, default, grouping, and link tests PASS.

### Task 5: Integrate Showcase and Legacy into the Globe HUD

**Files:**
- Modify: `src/components/garden/products-gallery/index.tsx`
- Modify: `src/components/garden/products-gallery/gallery-hud.tsx`
- Modify: `e2e/products-gallery.spec.ts`

- [ ] **Step 1: Rewrite Globe tests around explicit peer views**

Update `enterGallery` to use the default Showcase's Globe control. Replace `gallery-grid` assertions with:

```ts
await expect(page.getByTestId("gallery-view-showcase")).toBeVisible();
await expect(page.getByTestId("gallery-view-legacy")).toBeVisible();
await expect(page.getByTestId("gallery-view-globe")).toHaveCount(0);

await page.getByTestId("gallery-view-legacy").click();
await expect(page.getByTestId("products-gallery")).toHaveCount(0);
await expect(page.getByTestId("products-legacy")).toBeVisible();
await expect(page.getByTestId("garden-view-showcase")).toBeVisible();
await expect(page.getByTestId("garden-view-globe")).toBeVisible();
```

Add a separate Globe → Showcase assertion and change `#products` wording from list-default to Showcase-default.

- [ ] **Step 2: Run the explicit-view tests and verify they fail**

Run: `bunx playwright test e2e/products-gallery.spec.ts --grep "peer views|Showcase|Legacy"`

Expected: FAIL because the Globe only exposes the old grid callback.

- [ ] **Step 3: Replace `onShowList` with `onSelectView`**

Change the gallery contract:

```ts
interface ProductsGalleryProps {
  onSelectCategory: (category: GalleryCategory) => void;
  onSelectView: (view: Exclude<ProductView, "globe">) => void;
}
```

Pass `onSelectView` to `GalleryHud`, use `ProductViewIcon` for both Showcase and Legacy, and use `gallery-view-showcase` / `gallery-view-legacy` test IDs. If WebGL is unavailable or Canvas fails, call `onSelectView("showcase")`. Keep exit motion and sound behavior intact.

- [ ] **Step 4: Run the full Globe e2e file**

Run: `bunx playwright test e2e/products-gallery.spec.ts`

Expected: PASS, including WebGL gallery, category exit, details, sound, and reduced motion.

### Task 6: Responsive, action, and accessibility coverage

**Files:**
- Modify: `e2e/garden-carousel.spec.ts`
- Modify: `src/components/garden/products-showcase/product-detail-sheet.tsx`
- Modify: `src/components/garden/products-showcase/product-showcase.tsx`

- [ ] **Step 1: Add action and responsive tests**

Cover the approved edge cases:

```ts
test("Poppy exposes its direct download and Explore action", async ({ page }) => {
  await gotoGarden(page);
  await page.getByTestId("showcase-product-poppy").click();
  await expect(page.getByTestId("showcase-primary-action")).toHaveAttribute(
    "href", "https://getpoppy.io/download",
  );
  await expect(page.getByTestId("showcase-secondary-action")).toHaveAttribute(
    "href", "https://getpoppy.io",
  );
});

test("the product sheet becomes a bottom sheet on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoGarden(page);
  await page.getByTestId("showcase-product-read-along").click();
  const sheet = page.getByTestId("product-showcase-sheet");
  await expect(sheet).toHaveCSS("position", "fixed");
  const box = await sheet.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(366);
  expect(box?.y).toBeGreaterThan(100);
});
```

Also assert Escape closes the sheet, backdrop closes it, focus returns to the product button, retired status is visible for Meal Fairy, Tools is the only subsection header, and all external actions have `target="_blank" rel` containing `noopener`.

- [ ] **Step 2: Run responsive and action tests**

Run: `bunx playwright test e2e/garden-carousel.spec.ts`

Expected: PASS.

- [ ] **Step 3: Run reduced-motion coverage**

Add a reduced-motion browser context that opens/closes the Showcase sheet and switches Showcase → Globe. Confirm no page errors and no inaccessible content remains mounted after close.

Run: `bunx playwright test e2e/garden-carousel.spec.ts e2e/products-gallery.spec.ts --grep "reduced-motion"`

Expected: PASS.

### Task 7: Full verification and visual comparison

**Files:**
- Verify only; fix scoped defects in files above.

- [ ] **Step 1: Run unit tests and typecheck**

Run: `bun test src/lib/garden-products.test.ts src/components/garden/products-gallery/gallery-sound.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 2: Run Garden e2e coverage**

Run: `bunx playwright test e2e/garden-carousel.spec.ts e2e/products-gallery.spec.ts`

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `bun run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Visually inspect desktop and mobile**

Start the existing dev server and capture `/garden` at 1440×900 and 390×844. Confirm the warm OpenSoftware-inspired field, four/two/one column breakpoints, Tools grouping, sheet geometry, category navigation, inactive-only left rail, and absence of horizontal overflow.

- [ ] **Step 5: Review the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors; only approved Garden implementation/test files plus these design/plan documents are changed. Preserve the user's pre-existing `.claude/claude.md`, `portfolio/`, and `tasks/task-262.md` changes.
