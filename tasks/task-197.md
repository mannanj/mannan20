### Task 197: Garden cooking — tomato plant, cast iron pan, and stove cooking flow

**Goal:** expand the existing inventory/bag system (currently scoped to the `/garden/article/seeking-community` page) to the main `/garden` page, and add a small cooking mini-feature: pick up a tomato from a tomato plant, pick up a cast iron pan, drop ingredients into the pan on a stove burner, and produce a cooked dish (fried egg, omelette).

## Scope

### 1. Move inventory + easter egg to `/garden` page

- The bag UI and easter-egg pickup currently live inside `seeking-community-body.tsx` (renders `<EasterEgg map />`) and the `InventoryProvider` already wraps the whole `/garden` route via `src/app/garden/layout.tsx`.
- Move the easter-egg pickup so it appears on `/garden` (the page itself), not just the community sub-article. The sub-article version of the egg should be removed (single canonical spawn point on the garden index).
- Bag should remain visible across the garden namespace — already true, since the provider lives in the layout. Verify it still renders on `/garden` and on every sub-article without duplication.

### 2. Add tomato pickup from a tomato plant on `/garden`

- Add a small tomato plant illustration somewhere on the `/garden` page (placement TBD — somewhere unobtrusive, like the egg).
- A ripe tomato hangs on the plant; clicking it picks it up and adds a `tomato` item to the inventory bag.
- Once picked, the plant shows the tomato as gone (empty stem). Persist picked state via the existing inventory localStorage key (`article-inventory-v1`) so refresh keeps it picked.
- Reuse the same flying-arc animation pattern used by the egg pickup (`getBagPoint()` target).

### 3. Add cast iron pan pickup on `/garden`

- Add a cast iron pan somewhere on the page (e.g. resting on a shelf or surface). Click to add `cast-iron-pan` to inventory.
- Pan is a tool, not a consumable — `count: 1`, never increments past 1.

### 4. Cooking flow

When the pan item is selected from the inventory menu, expose a "Use" action.

- "Use" anchors the pan to a fixed position on the right side of the screen, with a stylized burner above it (a glowing red/orange ring, subtle heat shimmer animation).
- While the pan is on the burner, the bag's `tomato` and `easter-egg` items become "Add to pan" actions.
- Clicking "Add to pan" on an ingredient:
  - Removes one of that ingredient from the bag.
  - Drops it into the pan with a small fall + sizzle animation.
  - Starts (or extends) a 10-second cook timer. If the timer is already running, adding another ingredient resets it back to 10s (so two ingredients cook for ~20s total if added back-to-back).
- Visual countdown ring around the pan or burner so the user sees time remaining.
- When the timer hits 0:
  - Whatever ingredients are in the pan resolve into a dish based on contents:
    - egg only → **Fried Egg**
    - egg + tomato → **Omelette**
    - tomato only → **Roasted Tomato** (fallback so it's never wasted)
  - The cooked dish is added to the bag as a new inventory item (`fried-egg`, `omelette`, `roasted-tomato`).
  - Pan empties, ready for the next round. Burner stays on until the user dismisses the pan (a small "Put away" / X button on the pan).

### 5. Use of the cooked dish (placeholder)

- For this task, just adding the dish to the bag is enough. A later task can wire a "use" action for the omelette into something real (energy boost on the chicken game? Unlock a hidden line on the page?). Leave a TODO in the inventory action map noting that cooked-dish use is unwired.

## Implementation notes

- Inventory data model already supports arbitrary item ids — extend the `LABELS` map and any per-item icon/component mapping in `src/components/garden/article-inventory.tsx` rather than parallel state.
- Add an `actions` concept per item (e.g. `use`, `add-to-pan`) so the bag menu can show contextual options — the only item with a `use` action right now should be the pan.
- The stove/pan UI should be its own component (`garden/stove.tsx` or similar) mounted by the inventory provider so it can render across all `/garden/**` routes when active.
- Persist cooking state (active pan, ingredients in pan, timer end timestamp) to localStorage so a navigation away and back doesn't lose progress. Use `Date.now() + 10000` style absolute timestamps so the timer keeps counting across reloads.
- Animations: keep them subtle and refined — no looping pulse/glow on the picked items themselves once picked. Burner heat shimmer is OK because it's the *stove*, not an interactive element. (Per global rule: no pulsing/glowing on interactive elements.)

## Subtasks

- [ ] Move easter-egg pickup from `seeking-community-body.tsx` to the `/garden` page
- [ ] Add tomato plant component with pickup → adds `tomato` to inventory
- [ ] Add cast iron pan pickup → adds `cast-iron-pan` to inventory (max 1)
- [ ] Add per-item `actions` to inventory model; pan gets `use`
- [ ] Build stove + pan fixed-position UI triggered by pan's `use` action
- [ ] Wire ingredient → "Add to pan" actions on `tomato` and `easter-egg` while stove is active
- [ ] 10s timer with extend-on-add behavior + visible countdown
- [ ] Resolve cooked dish on timer end (fried-egg / omelette / roasted-tomato) → add to bag
- [ ] Persist stove state (ingredients + timer end) to localStorage
- [ ] "Put away" button on pan to dismiss the stove
- [ ] Verify on `/garden` and at least one sub-article that bag, pickups, and stove all behave correctly

- Location: `src/app/garden/`, `src/components/garden/article-inventory.tsx`, new `src/components/garden/stove.tsx`, new tomato/pan pickup components
