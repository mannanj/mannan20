### Task 188: Inventory bag open animation (future, idea-only)

Right now the bag icon stays the same whether the inventory is open or closed. We attempted an open-state UI (flap rotated up, dark elliptical opening, peek of inner flap, strap arc) but it never landed visually — kept looking off-model.

When ready to revisit, the goal is a satchel-style opening that:
- Preserves the closed silhouette (same width, same top contour) so the bag doesn't grow or shift
- Replaces the front flap with a tasteful interior view (small dark ellipse, soft inner shadow)
- Keeps a tiny peek of the lid/leather visible behind the top edge so it reads as "lid is set back" rather than "lid is gone"
- Optionally a short animation (~0.3s) for the flap settling open
- Avoid: making the top wider, oversized openings, the "flap rotated like a hatch" look — those all look broken

Reference: the leather-bag photo Mannan shared (Kent Saddlery style — wide oval mouth, soft leather sides, dark interior, strap visible).

Where to look:
- `src/components/garden/article-inventory.tsx` — `BagIcon` component currently takes only `size`; would re-introduce an `open` prop and the open branch.
- `InventoryBag` — already has an `open` boolean state we can pass down.

- Location: `src/components/garden/article-inventory.tsx`
