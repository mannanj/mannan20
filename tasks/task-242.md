### Task 242: Disable Mannan & Mannan MCP tool cards; refresh SkillGuard shot
- [x] Add reversible `hidden` flag to `GardenProductData`
- [x] Hide the "Mannan" card (redundant — links to this same site)
- [x] Hide the "Mannan MCP" card
- [x] Filter hidden products out of the Tools grid (still present in MCP data)
- [x] Re-capture SkillGuard landing ("Scan every skill. Block what's unscanned.")
- [x] Update garden-carousel e2e: count 7→6, drop Mannan/MCP, add claude-cues, fix order
- Location: `src/lib/garden-products.ts`, `src/components/garden/garden-explorer.tsx`, `public/skillguard.png`, `e2e/garden-carousel.spec.ts`
