### Task 156: Site-wide React Flow canvas with push-physics drag, off-screen peek labels, and hamburger finder

Convert the entire app into a React Flow canvas where every visible element is a draggable node. Preserve existing pixel positions, visuals, and interactions exactly — the only new behavior is click-and-hold to drag. Dragged nodes push neighbors out of the way. Nodes pushed off-screen spawn a directional peek-label at their last on-screen position; when any node is off-screen a large centered hamburger finder appears to search/navigate/restore.

`@xyflow/react` v12 is already installed. Reuse patterns from `src/components/canvas/` (store via zustand, `useCanvasStore`, custom node types, `ReactFlow` with `Background`/`Controls`) but build this as a separate, site-wide layer — do NOT reuse the jordan canvas store or access gate.

---

#### Phase A — Foundation & layering

- [ ] **A1. New folder `src/components/flow/`** with:
  - `flow-canvas.tsx` — client component that wraps children in a full-viewport `<ReactFlow>` and a `ReactFlowProvider`
  - `flow-store.ts` — zustand store (separate from `create-canvas-store.ts`) with: `nodes`, `viewport`, `draggingId`, `cursor`, `offscreenIds`, `finderOpen`, `finderQuery`, `initialLayout` snapshot
  - `flow-types.ts` — `FlowNodeKind` union, `FlowNodeData`, `PeekLabelData`
  - `use-measure-layout.ts` — runs once on mount, measures every registered DOM element's bounding box and seeds the store as React Flow nodes at their real screen positions
- [ ] **A2. Registration API.** Export `registerFlowNode(id, kind, ref, meta)` hook. Each existing section calls it in an effect with its DOM ref, a stable id (`header-profile`, `header-nav-home`, `plant-icon`, `hero`, `about-employment`, `about-published`, `about-extracurriculars`, `about-education`, `contact`, `article-card`, `constellation`, etc.), and display metadata (`label`, `icon`, `category`) for the finder.
- [ ] **A3. Mount point.** Wrap `<PortfolioInner>` in `src/components/portfolio.tsx` with `<FlowCanvas>`. Also wrap the article page tree at `src/app/garden/article/seeking-community/page.tsx` (and any other route the user wants canvas-enabled — enumerate in subtask A3b).
- [ ] **A4. Exact-position preservation.** After measuring, set each node's `position` to the measured `{ x, y }` relative to the document. Node width/height = measured rect. The underlying HTML stays rendered inside each custom node (re-parented via React portal during drag, or rendered inline using `nodeTypes` that accept a `children` slot via a React context map). Picks:
  - **Pick strategy:** portal approach — measure DOM once, then hide originals (`visibility: hidden`) and portal them into flow nodes. This keeps every existing handler, context, and ref alive without rewriting components.
- [ ] **A5. Pass-through interactions.** Add the `nodrag` class to every interactive descendant (links, buttons, inputs, copy icons, plus-minus buttons) via a helper `<FlowInteractive>` wrapper or a CSS selector `.flow-node a, .flow-node button, .flow-node input { pointer-events: auto; }` combined with `className="nodrag"` on wrappers so React Flow ignores mousedown for clicks but still allows drag from non-interactive regions.
- [ ] **A6. SSR guard.** `FlowCanvas` is `'use client'`; on SSR the page renders normally (no portal, no flow) so hydration matches the existing design — flow enhancement is applied after mount.
- Location: `src/components/flow/`, `src/components/portfolio.tsx`, `src/app/garden/article/seeking-community/page.tsx`

#### Phase B — Drag with push-physics

- [ ] **B1. Drag detection.** Use React Flow's `onNodeDragStart` / `onNodeDrag` / `onNodeDragStop`. Require click-and-hold — set `nodeDragThreshold={6}` so a normal click still fires through. Confirm clicking a link or button does not start a drag (via `nodrag`).
- [ ] **B2. Snap on drop.** `onNodeDragStop` writes the final position to the store (no grid snap — drop wherever the cursor is). Animate the last-frame position into place with a 120ms ease-out via `react-flow` node `style` transition on `transform`.
- [ ] **B3. Push physics.** On each `onNodeDrag` tick:
  - Compute AABB overlap of the dragging node against every other node
  - For each overlap, resolve by pushing the other node along the drag-direction vector with a spring (`k = 0.15`, damping `0.6`)
  - Cascade: pushed nodes themselves collide-check their neighbors, resolve recursively (cap recursion depth at 4 to avoid runaway)
  - Apply the resolved positions via `store.setNodes` using a `requestAnimationFrame` batch
- [ ] **B4. Settle.** After drop, start a `settle` RAF loop that decays residual velocity and stops pushing after 250ms of no movement. Pushed nodes do NOT spring back — their new positions are final.
- [ ] **B5. Performance guardrails.**
  - Skip collision against nodes whose AABB is >600px from dragging node's center (early-exit check, `js-early-exit` rule)
  - Use a `Map<id, Rect>` built once per drag start, updated only for moved nodes (`js-set-map-lookups`, `js-index-maps`)
  - Avoid `useState` in the drag hot path — use refs + a single RAF `store.setNodes` commit per frame (`rerender-use-ref-transient-values`)
- Location: `src/components/flow/flow-canvas.tsx`, `src/components/flow/physics.ts`

#### Phase C — Off-screen peek labels

- [ ] **C1. Viewport tracking.** Subscribe to the React Flow viewport + window resize. Compute the visible rect in flow coordinates each frame of a drag and on viewport change.
- [ ] **C2. Offscreen detection.** For every node, classify as `onscreen` / `offscreen`. A node is offscreen when its AABB center is outside the visible rect.
- [ ] **C3. Peek-label node type.** Register a `peekLabel` custom node type. When a node transitions to offscreen:
  - Capture its last on-screen position (clamped to the viewport edge with an inset of 16px)
  - Spawn a `peekLabel` node at that position with `data: { targetId, label, direction }` where `direction` is the angle from the viewport center to the offscreen node
  - The offscreen node itself stays in the store (still draggable via finder or label)
- [ ] **C4. Label visuals.** Pill shape, matches the site's dark-glass aesthetic (`bg-[#1a1a1a]/80 border border-white/10 backdrop-blur px-3 py-1.5 rounded-full text-xs`), with an arrow (SVG caret) rotated by `direction`. Hovering shows a tooltip preview.
- [ ] **C5. Recall interactions.**
  - Hover: preview — temporarily render the offscreen node at the label's position with 60% opacity; leaving hover reverts
  - Click: recall permanently — place the offscreen node at the current cursor position (fallback: label position), remove the peek label. The user can then interact normally.
- [ ] **C6. Cleanup.** If a peek-label is dragged on-screen or its target becomes on-screen by any other means, remove the label.
- Location: `src/components/flow/peek-label.tsx`, `src/components/flow/offscreen.ts`

#### Phase D — Hamburger finder

- [ ] **D1. Trigger.** When `offscreenIds.length > 0` → open the finder automatically (non-modal overlay, centered, `fixed inset-0 pointer-events-none` with an inner `pointer-events-auto` card at `top-1/2 left-1/2 -translate-1/2`). Close when `offscreenIds.length === 0`, or on Escape.
- [ ] **D2. Manifest.** Build a static-at-runtime manifest of every registered node: `{ id, label, category, icon, isOffscreen }`. Categories: `Header`, `Hero`, `About`, `Contact`, `Article`, `Visual`, `Decoration`. This replaces hardcoding.
- [ ] **D3. Layout.** Large card (`w-[min(560px,92vw)]`) with:
  - Row 1 (above search): `Restore layout` primary button — resets every node to its `initialLayout` snapshot via `store.restore()`
  - Row 2: search input (`<input>` with `autoFocus`, placeholder "Find an element…")
  - Row 3+: filterable list of manifest entries as clickable rows showing `icon · label · category` with a right-aligned `offscreen` badge when applicable
- [ ] **D4. Filter.** Controlled input → `finderQuery` in store. Filter is case-insensitive substring match over `label + category`. Use `useDeferredValue` on the query for smooth typing (`rerender-use-deferred-value`).
- [ ] **D5. Click behavior.** Clicking a row:
  - If offscreen: recall to cursor (same as C5 click)
  - If onscreen: pan/zoom the viewport to center the node with `setViewport({ animate: true, duration: 300 })`, then pulse the node (brief glow via a temporary class)
- [ ] **D6. Easter-egg terms.** Dedicated `easter-eggs.ts` with a map of trigger strings → extra rows:
  - `konami` → "Confetti burst" row that fires a confetti animation across the canvas
  - `disco` → "Disco mode" row that briefly animates grid hue
  - `gem` → "Find hidden gems" row that reveals decoy sparkle nodes (3s)
  - `matrix` → "Matrix rain" row that overlays a canvas rain effect
  - `reset everything` → full store wipe + reload
  - `bring me home` → scrolls flow viewport to initial viewport and re-centers all nodes
  These append to the filter results (not replace). Each extra row has a distinct `type: 'easter-egg'` and a different icon.
- [ ] **D7. Keyboard.** Arrow keys navigate the list, Enter activates, Escape closes (only if nothing is offscreen).
- Location: `src/components/flow/finder.tsx`, `src/components/flow/easter-eggs.ts`

#### Phase E — Article as one piece

- [ ] **E1. Article node.** Register the entire article (title + metadata row + body paragraphs) as a single node id `article-seeking-community`. The constellation graphic at the top is its **own** node id `constellation-seeking-community` — not part of the article.
- [ ] **E2. Sub-components stay interactive inside.** The `Timeline`, `DraggablePopout`, and `AdditionalReading` nested components keep their own internal drag/click behavior via `nodrag` on their roots so the outer article drag doesn't hijack them.
- [ ] **E3. Verify in-article interactivity.** Clicking era rows, opening popouts, scrolling within the article (it can be tall) still works. The article itself is drag-started only from a dedicated grip zone (e.g. the `On Seeking Community` title + byline row), not from paragraph text.
- Location: `src/components/garden/seeking-community-body.tsx`, `src/components/flow/flow-types.ts`

#### Phase F — Grid overlay with cursor-reactive intensity

- [ ] **F1. Base grid.** While `draggingId !== null`, render a full-viewport SVG (or CSS `background-image` with two layered grids) at `fixed inset-0 pointer-events-none z-[-1]` showing faint gridlines (10px minor, 100px major, `rgba(255,255,255,0.04)`). Fade in over 150ms.
- [ ] **F2. Cursor spotlight.** Track cursor globally (mousemove on window, throttled to rAF). Set two CSS variables on a wrapping div: `--fx` and `--fy` in viewport pixels.
- [ ] **F3. Highlight ring.** A second overlay with a radial mask:
  ```
  mask-image: radial-gradient(220px at var(--fx) var(--fy), #000 0%, transparent 70%);
  ```
  showing brighter gridlines (`rgba(3,155,229,0.18)`) — lights up the grid only near the cursor.
- [ ] **F4. Drop-target hint.** While dragging, compute the dragged node's current target cell (snapped to 10px grid visually) and draw an additional subtle rectangle outline at that cell. Animate it with a 1s breathing pulse (opacity 0.6 ↔ 1.0) for the "dynamic canvas" feel.
- [ ] **F5. Performance.** All three layers use pure CSS (no re-render per frame). The cursor variables update via a single ref + `el.style.setProperty`, never via React state (`rerender-use-ref-transient-values`). The grid fades out on `onNodeDragStop`.
- Location: `src/components/flow/grid-overlay.tsx`, `src/app/globals.css`

#### Phase G — Wiring, edge cases, tests

- [ ] **G1. Initial layout snapshot.** After `use-measure-layout` seeds positions, deep-clone into `initialLayout` for `Restore layout`. Re-measure on viewport resize > 10% to keep the snapshot responsive.
- [ ] **G2. Zoom/pan disabled by default.** `panOnDrag={false}`, `zoomOnScroll={false}`, `zoomOnPinch={false}`, `minZoom={1}`, `maxZoom={1}`. The canvas is a 1:1 overlay, not a zoomable graph. This keeps the portfolio feeling like a portfolio.
- [ ] **G3. Page scroll.** Allow normal page scroll (the portfolio is tall). React Flow's root must not capture vertical wheel — set `preventScrolling={false}`. Confirm scrolling the article page still works.
- [ ] **G4. Mobile.** On `matchMedia('(max-width: 768px)')` disable drag entirely (`nodesDraggable={false}`) — mobile keeps the static layout. Grid/finder/peek features also disabled on mobile.
- [ ] **G5. Reduced motion.** `prefers-reduced-motion: reduce` disables push-physics animation (instant snap), disables grid pulsing, disables label preview hover (`rendering-usetransition-loading` + guard).
- [ ] **G6. A11y.** Finder input has `role="combobox"`, list is `role="listbox"`, rows are `role="option"`, aria-live announces recalls. Drag is keyboard-triggered via a `Space` grab on a focused node (stretch goal).
- [ ] **G7. Playwright test** `tests/e2e/flow-canvas.spec.ts`:
  - Click-hold on the Mannan hero title, drag 300px right — asserts Home/About/Contact nav push out of the way, snapshot compares
  - Drag the plant icon off-screen — asserts peek label appears with an arrow, finder opens
  - Type `konami` in finder — asserts easter-egg row renders
  - Click `Restore layout` — asserts every node returns to seeded coords
- [ ] **G8. Visual QA checklist.** Manually verify against the two reference screenshots that nothing shifts on initial load (pre-drag), all hover states (LinkedIn tooltip, underline on nav) still work, and the article page matches before-flow rendering.
- Location: `src/components/flow/`, `tests/e2e/flow-canvas.spec.ts`

---

#### Component & node id inventory (for D2 manifest and physics bodies)

| id | label | category |
|---|---|---|
| `header-profile` | Profile picture | Header |
| `header-linkedin` | LinkedIn link | Header |
| `header-github` | GitHub link | Header |
| `header-nav-home` | Home nav | Header |
| `header-nav-about` | About nav | Header |
| `header-nav-contact` | Contact nav | Header |
| `header-plant` | Garden plant | Header |
| `hero` | Mannan hero | Hero |
| `about-intro` | About intro | About |
| `about-employment` | Employment | About |
| `about-published` | Published works | About |
| `about-extracurriculars` | Extracurriculars | About |
| `about-education` | Education | About |
| `about-getintouch` | Get in touch button | About |
| `contact` | Contact | Contact |
| `constellation-seeking-community` | Constellation | Visual |
| `article-seeking-community` | On Seeking Community | Article |

#### Explicit non-goals

- No React Flow edges between nodes
- No persistence across page reloads (layout resets to measured positions each visit)
- No multi-select drag
- No undo/redo

#### Estimated sequence

A → B → F (visual satisfaction) → C → D → E → G. Each phase is independently testable.

- Location: `src/components/flow/`, `src/components/portfolio.tsx`, `src/components/garden/seeking-community-body.tsx`, `src/app/garden/article/seeking-community/page.tsx`, `src/app/globals.css`, `tests/e2e/flow-canvas.spec.ts`
