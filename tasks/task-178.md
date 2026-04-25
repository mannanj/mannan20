### Task 178: Tune timeline drop + canvas resize growth
- [x] Move caption + timeline a tiny bit down at top of page (30px drop)
- [x] On scroll, timeline rises and locks vertically centered on the viewport
- [x] Canvas grows on width/height resize without disturbing existing draws (ResizeObserver + extendRegion appends new region nodes/dust/edges to existing bands)
- [x] Validate alignment + growth via Puppeteer (1440x900 + scroll 100; 1920x1080 brightness sampling top/bottom)
- Location: `src/components/article-layout.tsx`, `src/components/garden/seeking-community-body.tsx`, `src/components/garden/community-nodes.tsx`
