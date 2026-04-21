### Task 161: Magnifying-glass mouse sensitivity reduction at higher zoom (DEFERRED)
- [ ] Reduce effective mouse sensitivity proportional to lens zoom level so large hand movements map to smaller lens movements at 5.2x / 10.4x zoom
- Location: `src/components/garden/community-nodes.tsx`

Goal: at level 0 (2.6x), movement is baseline 1:1. At level 1 (5.2x) and level 2 (10.4x), the lens should travel less than the physical mouse so small features are easier to track.

Attempts that did NOT work:
1. **Exponential easing toward the cursor** (tau scaled with level). This is lag, not sensitivity reduction. Felt sluggish. User rejected.
2. **Pointer-delta with gain** (`lensDelta = cursorDelta / 2^level`). Mathematically correct sensitivity reduction, but `cursor-none` hides the real cursor and the physical cursor drifts off the 349px-tall canvas while the user chases the visible lens. Once the cursor is off-canvas, `pointerleave` fires, the lens deactivates, and any click fires on whatever DOM element is actually under the invisible cursor (article text below). Clicks feel "broken" even though the handler is correct.

Fundamental constraint: `click` events always dispatch at the physical cursor location. Any approach that decouples the lens from the cursor risks clicks missing the canvas.

Viable future approach: **Pointer Lock API**
- Call `canvas.requestPointerLock()` when the lens activates.
- Use `movementX` / `movementY` from pointer events (raw deltas, already free of the canvas-bounds problem).
- Track a virtual cursor position that drives both the lens and a hit-test point for clicks.
- Intercept `click` on the document while locked and route it to the lens (since the browser hides + traps the physical cursor, there's no divergence problem).
- Release lock on Esc or when the user leaves the article region.

Trade-offs to consider before implementing:
- Pointer lock requires a user gesture to enter, and is quite intrusive for a passive article scroll. Probably want opt-in via a click on the starfield first, or only engage lock while already at level 1+.
- Browser shows a "press Esc to exit" overlay the first time.
- Lock is lost if the tab loses focus — need graceful recovery.
