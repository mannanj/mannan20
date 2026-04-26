### Task 186: Inventory HUD line geometry + dynamic panel sizing

- [x] Panel uses `width: max-content`; whitespace inside the inventory panel removed
- [x] Panel size measured via `useLayoutEffect` + `ResizeObserver`; line endpoint computes from measured size
- [x] Line ends at the panel's center-bottom (dynamic, follows panel size)
- [x] Two visible legs of equal length; leg 1 tilted 5° above horizontal, leg 2 derived from a geometric equal-length constraint
- [x] Panel `bottom` reduced from 80 → 36 so the line is closer to the perks copy
- [x] Panel `left` tuned to 90 so it sits just left of the bag without crowding it
- [x] Egg ghost flash on max-out fixed: `EasterEgg` waits for `hydrated` flag before rendering
- [x] Max egg count bumped to 12 (a dozen)
- Location: `src/components/garden/article-inventory.tsx`, `src/app/globals.css`
