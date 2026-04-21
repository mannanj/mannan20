### Task 157: Pannable / zoomable Seeking Community canvas + one-of-a-kind Sun Signal sun easter egg

Make the Seeking Community 2D canvas pannable (mouse drag) and zoomable (wheel / cursor-anchored). Render exactly one canonical orange Sun Signal sun per page load, with all other XL suns in alt palettes (yellow, gold, red, blue, rainbow, iridescent). Tiny earth orbits the canonical sun. Hovering the canonical sun fades in an inline three.js diorama (sun + earth + moon, ported from `/Users/manblack/Documents/sun`) with the label "Ready to enter Sun Signal?" in the Sun Signal font; clicking opens the Sun Signal app in a new tab. A future-only Phase E captures the alternate idea of an in-app popout-window version.

---

#### Phase A — Pan & zoom the canvas

- [ ] **A1. Viewport state.** Add `viewport: { panX, panY, zoom }` to `CommunityNodes` (refs only, never `useState`). Apply via `ctx.setTransform(zoom, 0, 0, zoom, panX * dpr, panY * dpr)` once at the top of each frame, before existing draw calls. All node/dust/particle math stays in canvas-local coordinates — only the display transform changes.
- [ ] **A2. Pan via mouse drag.** `pointerdown` records `start.{x,y}` and `start.{panX,panY}`; `pointermove` (while pressed) updates `panX/panY` refs; `pointerup` / `pointercancel` clears. Use `setPointerCapture` so drag survives leaving the canvas. Cursor: `grab` idle, `grabbing` while dragging.
- [ ] **A3. Zoom via wheel.** `wheel` handler with `preventDefault()`, **cursor-anchored**: compute world-space point under cursor before zoom, apply `zoom *= exp(-deltaY * 0.0015)` clamped to `[0.5, 8]`, then re-derive `panX/panY` so the same world point sits under the cursor afterward. No throttling — wheel events coalesce per frame.
- [ ] **A4. Don't hijack page scroll.** Only `preventDefault()` on `wheel` when cursor is over the canvas. Use `{ passive: false }` listener registration. Vertical page scrolling continues outside the canvas.
- [ ] **A5. Hit-testing transform.** All sun-marker hit-testing transforms screen → world: `worldX = (clientX - rect.left - panX) / zoom`. Update `CommunityNodesSunTrigger` placement so its absolute `left/top` stays anchored to the canonical sun's world coordinates as the user pans/zooms.
- [ ] **A6. Reset control.** Tiny `↺` button bottom-right (`text-white/40 hover:text-white/80 text-xs`) animates `panX/panY/zoom` back to `0/0/1` over 250 ms (RAF lerp). Visible only when viewport is non-default.
- [ ] **A7. Bounds.** No hard pan bounds. Generate a 3×3 tile of background dust around the home tile (re-seed dust loops with `width * 3, height * 3` on a one-time tiled buffer). Nodes themselves stay in the original tile.
- [ ] **A8. Mobile.** Touch pan via the same pointer events (free). Pinch-to-zoom: track two pointers, distance ratio between frames → `zoom`. Ship only if A1–A7 land cleanly.
- Location: `src/components/garden/community-nodes.tsx`

---

#### Phase B — Sun palette variants

- [ ] **B1. Pick the canonical sun once per mount.** In `generateTreeNodes`, separate `isSun` from `sunVariant`. Default every sun to a non-canonical color from `["yellow", "gold", "red", "blue", "rainbow", "iridescent"]`. After the loop, stamp **exactly one** sun as `sunVariant = "canonical"`. If the random roll produces zero suns, force-promote the rarest mid/large node into a canonical sun. Canonical sun must always exist exactly once.
- [ ] **B2. Variant palettes.** Extend `Node` with `sunVariant: "canonical" | "yellow" | "gold" | "red" | "blue" | "rainbow" | "iridescent"`. Each variant is a `{ core, mid, corona }` triple of `[r,g,b]`:
  - `canonical` — corona `255,180,60` → `255,140,40` → `255,80,30`; core `255,248,220` → `255,190,90` → `255,110,40` (current XL sun, unchanged).
  - `yellow` — corona `255,230,120` → `255,210,80` → `255,180,40`; core white-cream → bright yellow.
  - `gold` — corona `255,200,80` → `230,160,40` → `180,110,20`; core cream → gold.
  - `red` — corona `255,120,80` → `220,60,40` → `140,30,20`; core white-pink → deep red.
  - `blue` — corona `180,220,255` → `100,160,240` → `40,80,200`; core white → cyan.
  - `rainbow` — stops cycle hue via `hsl((t * 60 + sunPhase * 57.3) % 360, 90%, 60%)` per frame. ~6 s cycle.
  - `iridescent` — two stops oscillate between teal-pink and gold-purple via `sin(t)` mixing; soap-bubble feel.
- [ ] **B3. Render dispatch.** Replace the single `else if (node.isSun)` block with `renderSun(ctx, node, timestamp)` — `switch (node.sunVariant)` inside. All variants share the existing two-pass corona-then-core structure; only gradient stops change. Hoist static color tuples; rainbow/iridescent compute per-frame.
- [ ] **B4. Lens-flare cross (canonical only).** One-time stroke pass for `canonical`: two diagonal lines through the sun's center, length `radius * 28`, alpha `0.12`, soft white, `globalCompositeOperation = "lighter"`. Subtle — looks like a lens artifact.
- [ ] **B5. Tag the canonical sun for hit-testing.** Push `variant` into `sunMarkers`. Only canonical markers go into a separate `canonicalSunRef` ref used by Phase C/D handlers — non-canonical suns stay decorative.
- Location: `src/components/garden/community-nodes.tsx`

---

#### Phase C — Tiny earth dot orbiting the canonical sun

- [ ] **C1. Earth state.** Ref `earthOrbit = { radius: sun.radius * 7.5, angle: random, angularSpeed: 0.00018 }`. Earth's position is computed every frame from the canonical sun's world position + orbit angle.
- [ ] **C2. Render the earth.** After the canonical sun draws, draw a tiny earth: 1.4 px radius, base `rgb(80, 140, 220)` with a 0.4-radius `rgb(120, 200, 130)` continent dot offset slightly. Soft halo `rgba(120,180,255,0.25)` at 2.5 px. Always visible, always orbiting.
- [ ] **C3. Earth pans/zooms with the sun.** Because all draws happen inside the same `setTransform` call from Phase A, the earth orbits in world space and naturally pans/zooms together with the sun.
- [ ] **C4. Earth is part of the hit zone.** Hover/click target = disc of radius `sun.radius * 10` in world coords centered on the canonical sun (covers sun + corona + earth's orbit). No separate earth click handler.
- Location: `src/components/garden/community-nodes.tsx`

---

#### Phase D — Inline Sun Signal diorama (hover/click expansion)

- [ ] **D1. Hover state.** `useState<"idle" | "hover" | "clicked">` for the canonical sun. `pointermove` over the canvas computes "is cursor inside the canonical sun's hit disc (in world coords)?" and toggles state. `pointerleave` falls back to idle. Don't switch state during drag-to-pan.
- [ ] **D2. Diorama component.** New file `src/components/garden/community-nodes-diorama.tsx`. Lazy-loaded via `next/dynamic` (`ssr: false`, `loading: () => null`) — same pattern as `community-nodes-sun.tsx`. Renders a `<Canvas>` (react-three-fiber) with three meshes:
  - Sun Signal `Sun` — port shader verbatim from `/Users/manblack/Documents/sun/frontend/app/simulation/components/Sun.tsx`. Same vertex/fragment shader, same corona, same `pointLight` color `#FDB813`.
  - Simplified `Earth` — port from `Earth.tsx` using procedural shader path only; skip 4K textures. Slow circular orbit around sun, radius ~3.5 units, `delta * 0.05`.
  - Simplified `Moon` — port from `Moon.tsx`, drop the `<Float>` wrapper. Orbits earth at ~0.9 radius, `delta * 0.2`.
  - Camera `[0, 0, 7]`, fov 45, `dpr={[1, 2]}`, transparent background.
- [ ] **D3. Reuse, don't fork.** Copy shader code verbatim into the new file (the sun project is a sibling, not a workspace member — no cross-project import). Single file to update if shaders later diverge.
- [ ] **D4. Mount inline.** When state is `hover`, render the diorama as an absolute-positioned overlay anchored to the canonical sun's screen position (world → screen, accounting for pan/zoom). Size: `min(360px, 40vw)` square. Wrapper transitions opacity `0 → 1` over 250 ms. Underlying canvas keeps animating.
- [ ] **D5. The 2D sun fades during hover.** While `hover`/`clicked`, fade the canonical 2D sun's draw alpha to `0.15` and fade the corona/earth-marker out — the 3D sun visually replaces the 2D one. Restore on idle.
- [ ] **D6. Label.** Beneath the diorama: `<span>Ready to enter Sun Signal?</span>` in the **Sun Signal font** (Geist, weight 500, `tracking-wide`, `text-white/85`). Sun Signal uses Geist for everything — register Geist as `--font-sun-signal` in `src/app/layout.tsx` (alias `--font-geist-sans` if already loaded; otherwise add a second `Geist({ variable: "--font-sun-signal", weight: ["500"] })` import). Below the label, small inline `Open ↗` button.
- [ ] **D7. Click → open Sun Signal.** Clicking the diorama or `Open ↗` calls `window.open(SUN_SIGNAL_URL, "_blank", "noopener,noreferrer")`. URL: `https://www.sunsignal.app`. Store as a single constant at the top of `community-nodes-diorama.tsx`.
- [ ] **D8. Click outside dismisses.** Pointer leaving the hit disc returns state to `idle` and animates the diorama out. Click without moving still triggers D7.
- [ ] **D9. Reduced motion.** `prefers-reduced-motion: reduce` → skip fade transitions (instant swap), keep orbits at half speed, drop corona pulse on the canonical 2D sun.
- Location: `src/components/garden/community-nodes.tsx`, `src/components/garden/community-nodes-diorama.tsx`, `src/app/layout.tsx`

---

#### Phase E — Future enhancement: tiny in-app popout window (DO NOT BUILD NOW)

Captured from user's note: instead of `window.open` to a new tab, render a **floating popout window** inside the portfolio that hosts a miniature Sun Signal experience inline.

- [ ] **E1.** Build a draggable, resizable `<PopoutWindow>` chrome with a header bar that has a `↗` button (open in new tab — *this* becomes the only place the new-tab affordance lives; the inline label loses its `Open ↗` button).
- [ ] **E2.** Inside the popout, render a `<MiniSunSignal>` view: the diorama from D2 plus a stripped-down version of `HomeLayout` from `/Users/manblack/Documents/sun/frontend/app/components/HomeLayout.tsx`. Needs the Sun Signal data hook (`useSunData`) — either reimplement against the same backend API, embed via iframe, or stand up a shared NPM package. **Decision required before building.**
- [ ] **E3.** Hover label changes from "Ready to enter Sun Signal?" to "Open Sun Signal" with no inline `Open ↗` (the popout chrome handles new-tab pop-out).
- [ ] **E4.** Decide whether the popout opens anchored to the canonical sun or centered in the viewport, and whether multiple popouts can stack.

**Why not now:** scope creep, requires a Sun Signal API contract decision (iframe vs duplicate vs shared lib), and the hover-label flow in Phase D is sufficient for v1.

---

#### Phase F — Verification

- [ ] **F1. Local manual test.**
  - `bun run dev` → visit `http://localhost:3000/garden/article/seeking-community`
  - Drag the canvas — confirm pan works, doesn't hijack page scroll vertically when cursor is outside the canvas.
  - Wheel-zoom on the canvas — confirm cursor-anchored zoom and `[0.5, 8]` clamps.
  - Confirm exactly one canonical orange sun is present (B1 force-promote guarantees it). Other suns render in their assigned variant palettes.
  - Hover the canonical sun's hit zone — diorama fades in, 2D sun fades to `0.15`, label "Ready to enter Sun Signal?" appears.
  - Click — new tab opens to the Sun Signal URL.
  - Move cursor away — diorama fades out, 2D sun restores.
- [ ] **F2. Reduced-motion test.** macOS → Accessibility → Reduce Motion. Reload, hover the canonical sun — animations are instant, orbits at half speed.
- [ ] **F3. Mobile test.** Chrome DevTools device emulator (iPhone 14). Touch-drag to pan; pinch-to-zoom if A8 shipped.
- [ ] **F4. Bundle size check.** `bun run build` — diff the seeking-community route bundle before/after. The diorama is lazy-loaded so first-load JS shouldn't grow more than ~5 KB; the diorama chunk itself can be 100–200 KB (three.js + r3f) but only fetched on hover.
- [ ] **F5. Sun Signal URL.** Hardcoded as `https://www.sunsignal.app` (D7). Smoke-test the new tab opens correctly.
- Location: `src/components/garden/community-nodes.tsx`, `src/components/garden/community-nodes-diorama.tsx`, `src/app/layout.tsx`

---

#### Critical files

| File | What changes |
|---|---|
| `src/components/garden/community-nodes.tsx` | Phases A, B, C, D — pan/zoom, sun variants, earth marker, hover state |
| `src/components/garden/community-nodes-diorama.tsx` | **NEW** — three.js sun+earth+moon scene + hover label + click-out |
| `src/app/layout.tsx` | Phase D6 — register `--font-sun-signal` (Geist alias or duplicate import) |

#### Reference files (read-only)

- `/Users/manblack/Documents/sun/frontend/app/simulation/components/Sun.tsx` — port shader verbatim
- `/Users/manblack/Documents/sun/frontend/app/simulation/components/Earth.tsx` — port procedural shader path
- `/Users/manblack/Documents/sun/frontend/app/simulation/components/Moon.tsx` — port without `<Float>`
- `src/components/garden/community-nodes-sun.tsx` — existing pattern for lazy-loaded r3f canvas inside the portfolio
- `src/components/garden/community-nodes-sun-trigger.tsx` — existing dynamic-import + fade pattern (the new diorama uses a near-identical mounting pattern)

#### Explicit non-goals

- No persisting pan/zoom state across page reloads
- No multiple canonical suns (always exactly one)
- No new-tab opening of Sun Signal from non-canonical suns
- No rebuilding the sun shader from scratch — port verbatim
- No tiny in-app popout window in v1 (captured as Phase E for later)

#### Estimated sequence

A → B → C → D → F. Phase E is deferred. Each phase is independently testable.

---

#### Raw notes from original ask (verbatim, preserved so nothing is lost)

> hi for my seeking community page cna you ideate and plan out a feature: i want the 2d current graphic canvas to be a pannable interactive graphic that i can use the mouse to drag around and move and pan the stars from where i click and drag, and also i want it to be zoomable so i can use zoom / mouse wheel/ scroll to go further into the space where i zoom. i also want an easter egg where whenever the sun appears (and i want it tonly appear once, and otherwise, show other color suns of colors yellow, gold, red, blue, and rainbow, and irredescent) and for the current sun color only i want also when we click it an dinteract with it int hat interactive fashino (i want that interaction expeirence to only work and occur for the current sun we have, the [Image #1] one that looks like this) and there i want a tiny earth dot around this sun on the main canvas too always placed around the sun somewhere not too far from it, and then when we hover/interact with it, i want the earth to come in mirroring our 3js animatino from the sun project (youc an refernece that one direcotry up as needed) and i also want in that hover mode themoon to appear, and then I want the text to show up in the sun signal font "Ready to enter Sun Signal?" and hobering and clicking it shows a pop out inline at the end and it then opens my sun signal app in another window tab. though im also considering having a tiny verson of that app accessible, so capture this for later, in this app a tiny pop out window version of the app cna open here instead with no pop out indicator in line with the text label on the hover view, and instead apop out indicator int he pop out iwndow frame header area to capture opening it in a new window. please save your output to a task-file , task-n.md file, after you;ve planned, save all necessary details of the plan. use a task number not taken.

Reference image (described): Screenshot of a small dark-background tile with a glowing orange-cream sun centered, faint diagonal lens-flare cross through the sun, no other planets visible. This is the **canonical** sun look — every other XL roll in the field gets a different palette.
