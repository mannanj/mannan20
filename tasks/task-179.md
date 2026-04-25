### Task 179: Page-level magnifier with floating control
- [x] Create top-level PageMagnifier component (mounts in garden layout, available across all garden pages)
- [x] Floating circular toggle button on right edge of viewport, vertically centered, follows scroll
- [x] Click button to enable; click twice anywhere on the page to auto-disable
- [x] Lens at z-index 10000 — magnifies any page content (text, images, canvas)
- [x] Canvas content (stars/dust/edges) magnified via per-frame bitmap copy from `canvas[data-magnifiable]`
- [x] DOM content magnified via cloned body + CSS transform; refresh on scroll/resize
- [x] Remove canvas-internal lens + gutter pointer activation from CommunityNodes (consolidate into PageMagnifier)
- [x] Validate via Puppeteer: button position, lens visibility, clone transform, click-twice disable
- Location: `src/components/garden/page-magnifier.tsx`, `src/app/garden/layout.tsx`, `src/components/garden/community-nodes.tsx`
