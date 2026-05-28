### Task 200: Radial orbital pocket cluster (design idea)

Future design exploration: replace the floating Health Pocket Essentials card and AI side tab on `/garden` with a single compact radial orbital cluster — little circles orbiting a glowing center, each circle clickable to reveal an inline popout. Inspired by 21st.dev radial orbital timeline pattern (https://21st.dev/community/components/jatin-yadav05/radial-orbital-timeline/default).

- [ ] Decide whether the orbital lives as a fixed floating widget or as part of the page hero/grid
- [ ] Define the node set (Health, AI, possibly more — Community? Joyful Frustrations?) and what each opens
- [ ] Decide trigger UX: inline expanded card (matches demo) vs. existing draggable popout (matches site convention)
- [ ] Keep within quality bar: no constant pulse/ping animations on interactive elements; subtle auto-rotation only when idle
- [ ] Reintroduce Health Pocket Essentials content (currently commented out in `garden/page.tsx`) — flow: essentials → baking soda → coffee, with back nav
- [ ] Mobile behavior: likely hidden on small screens; confirm with design
- [ ] Consider color/glow palette consistent with existing pocket-card auras (red/green/blue radial gradients)

Reference implementation explored in conversation (deleted): a 280px container, 96px orbit radius, 2 nodes (Health, AI) with inline expanded cards, auto-rotation that pauses on activation. Worked but the placement and visual weight felt unresolved — needs a proper design pass before re-introducing.

- Location: `src/app/garden/page.tsx`, `src/components/garden/health-pocket-card.tsx` (existing popout content), `src/components/garden/ai-pocket-card.tsx` (current AI tab)
