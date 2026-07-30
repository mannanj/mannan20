### Task 276: Remove redundant employment metadata

**Goal:** Remove redundant qualifiers from the Meal Fairy and America’s Electric Cooperatives metadata while preserving their substantive descriptions.

**Files:**

- `public/data/about.json`
- `mcp-worker/src/data.generated.json` (generated)
- `public/llms.txt` (generated)

**Acceptance:**

- [x] Meal Fairy dates read `2018` everywhere generated from the profile data.
- [x] Meal Fairy skills contain only the technical stack.
- [x] America’s Electric Cooperatives skills no longer repeat `research`.
- [x] Unrelated working-tree changes remain outside any future commit.
