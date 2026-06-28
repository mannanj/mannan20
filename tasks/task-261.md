### Task 261: Restructure garden products — add Poppy, flatten Tools/Retired
- [x] Keep Sun Signal, Read Along, Meal Fairy as the main products (Meal Fairy moved up, keeps `(retired)` in its name)
- [x] Add new product Poppy (https://getpoppy.io) with a Playwright homepage screenshot (`public/poppy.png`)
- [x] Tools sub-header order: Poppy, Greenlights, Event Every, SkillGuard, claude-cues
- [x] Move Greenlights out of the main products into the Tools sub-header
- [x] Remove the Retired sub-header (list) and Retired filter facet (gallery)
- [x] Update e2e specs (garden-carousel, products-gallery) to the new layout; mutation-verified the order assertion
- [x] Regenerate the MCP snapshot (`mcp:build`) so list_apps/llms.txt include Poppy
- Location: `src/lib/garden-products.ts`, `src/components/garden/garden-explorer.tsx`, `src/components/garden/products-gallery/gallery-data.ts`, `scripts/capture-product-shots.mjs`, `public/poppy.png`, `e2e/garden-carousel.spec.ts`, `e2e/products-gallery.spec.ts`, `mcp-worker/src/data.generated.json`, `public/llms.txt`

[Task-261]
