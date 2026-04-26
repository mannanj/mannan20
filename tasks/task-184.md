### Task 184: Inventory polish — angled HUD line, smooth fly, modal stub

- [x] Egg fly now uses CSS `offset-path` with a quadratic Bezier — single continuous arc, linear easing, no pause at apex
- [x] Egg shrink reduced from 30% to 60% at landing for a softer settle
- [x] Bag default scale at 0.9; hover/click goes to 1.08
- [x] Bag bottom corners visibly rounder (`Q36 36 28 36` / `Q4 36 4 28`)
- [x] HUD line is now a two-segment angled polyline ending at the right-middle edge of the panel; SVG z-index keeps it visible over the dark panel
- [x] Toast hydration bug fixed — bag baseline only initializes after `hydrated`, no spurious "Egg +1" on refresh
- [x] Inventory list uses `Egg x{count}` format; renders `({MAX_COUNT}) (max)` when capped
- [x] Perks/tiers copy collapsed to "Items grant perks and privileges."
- [x] Open-bag panel includes a "Save inventory" link that opens a "To be added soon" modal (download not implemented)
- Location: `src/components/garden/article-inventory.tsx`, `src/app/globals.css`
