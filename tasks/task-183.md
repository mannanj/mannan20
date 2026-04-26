### Task 183: Easter egg + persisted inventory HUD on seeking-community

- [x] Pastel egg renders inline in body, slow spin (~11.5s) + gentle 20% pulse, with a generous click target
- [x] Click flies the egg to a fixed bottom-right brown leather satchel (slow `eggFly` keyframe)
- [x] Bag stays hidden until at least one item has been collected; shows once persisted count > 0
- [x] "Inventory" label sits above the bag (absolute, doesn't scale with the bag); on add, replaced by `{Label} +1` for 3s
- [x] Opening the bag draws a thin diagonal line from the bag to the bottom-right corner of a floating dark panel (z-indexed above the panel) listing items
- [x] Inventory list shows quantity per id: `Egg x1`, `Egg x3`, `… (10) (max)` once capped
- [x] Egg respawns on every page refresh (session-only collected flag) up to a 10-egg max, after which the egg stops appearing on the page
- [x] Inventory persists to `localStorage` under `article-inventory-v1`; hydrates on mount, writes on change
- Location: `src/components/garden/article-inventory.tsx`, `src/components/garden/seeking-community-body.tsx`, `src/app/globals.css`
