### Task 158: Interactive zoom-in three.js sun on XL nodes (deferred)

## Original User Intent

On the Seeking Community article's nodes strip, the XL-tier node renders as a 2D pulsing sun. The user wanted this sun to be interactive:

- On hover or click of the 2D sun dot, a circular **Apple-glass-style magnifying-glass lens** appears anchored at the dot.
- The lens should first appear at the dot's existing size (so the original sun dot is visible inside the lens, as if seen through glass).
- Then after a short pause, the lens should **slowly grow** into a larger size over ~3.3s, feeling like a **camera zooming in** on the sun — revealing progressively more detail as it expands.
- During this grow, the 2D sun should **smoothly transition** into the larger three.js shader-animated sun (ported from `frontend/app/simulation/components/Sun.tsx` — two concentric spheres with fBm noise surface shader + fresnel corona shader + point light + ACES tone mapping, r3f/three).
- The larger three.js sun should be **~half** the previously-set size (~70px lens max, not 140).
- The three.js bundle should be **lazy-loaded** (not in the main bundle) — a subtle loading indicator while it loads.
- Show for ~10–15s, then fade out. Requires another hover/click to re-trigger.
- Overall feel: **not jarring, not abrupt** — smooth, slow, Apple-glass aesthetic, like looking at a sun through a magnifying glass that's zooming in.

## Why Deferred

Multiple iterations on the grow/crossfade timing did not produce a convincing "zoom-in" feel. The lens grew and the sun crossfaded, but it read as "glass pops out at full size with content appearing" rather than a continuous camera zoom. Root cause is likely a combination of issues below; need a fresh approach.

## Approach That Was Built (captured for reference)

### Files
- `src/components/garden/community-nodes-sun.tsx` — r3f `<Canvas>` with two spheres, custom GLSL vertex/fragment shaders (surface fBm + corona fresnel), `pointLight`, ACES tone mapping, alpha:true for transparent background. Camera at z=6.5 fov 45 so sphere fills ~55% of canvas leaving room for glass effect.
- `src/components/garden/community-nodes-sun-trigger.tsx` — client component that mounts at (x, y) coords, uses `next/dynamic` to lazy-load the sun component (SSR off), handles the grow/crossfade/fade state machine, 10-15s auto-dismiss.
- `src/components/garden/community-nodes.tsx` — exposed XL nodes as `SunMarker[]` via React state, rendered invisible `<button>` hover/click overlays at each sun's canvas coords, mounted the trigger on activation, cleaned up via `onDone`.

### Visual primitives used
- **Glass lens**: `backdrop-filter: blur(10-14px) saturate(1.3-1.4)`, `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.18-0.2)`, layered inset `box-shadow` for specular highlights + outer drop shadow for depth.
- **Circular clip**: `border-radius: 50%` + `clip-path: circle(50% at 50% 50%)` (both required — `backdrop-filter` creates a stacking context that breaks `overflow: hidden` child clipping in WebKit).
- **Grow animation**: animated `width`, `height`, `left`, `top` with `cubic-bezier(0.22, 1, 0.36, 1)` ease-out. **Key gotcha**: `transform: scale()` on an ancestor breaks r3f's ResizeObserver — the WebGL canvas gets stuck at the initial scaled size (observed: canvas stayed at 13px inside a 138px parent). Animating explicit size properties avoids this.
- **Crossfade**: sun-shaped radial gradient (matching the 2D sun) opacity 1→0 while three.js canvas opacity 0→1, with setTimeout-staged `setReveal(true)`.

### State machine
- `loaded` — three.js chunk fetched.
- `grown` — grow transition has started (width/height animating from dot-size to full size).
- `reveal` — crossfade from radial-gradient to three.js initiated.
- `fadingOut` — final dismiss phase.

## Lessons / Why It Didn't Feel Like a Zoom

1. **CSS width/height animation alone ≠ camera zoom.** Scaling a CSS box that happens to contain a fixed-POV three.js render does not convey optical zoom. The camera in the three.js scene stays at the same position; we're just making the viewport bigger. The sun APPEARS to grow but its composition (same framing, same shader LOD) doesn't read as "zooming into it."
2. **r3f transform gotcha**: `transform: scale()` on an ancestor corrupts the canvas size measurement. Must use explicit `width/height` transitions OR animate the three.js camera itself.
3. **Crossfade overlapping grow feels like a "swap"** more than a "reveal". When the 2D gradient fades out while the lens is still growing, the user's eye catches the swap rather than a smooth detail-reveal.
4. **The 2D sun and three.js sun look too different at small sizes** — the gradient fallback and the early-frame three.js render don't match in color/shape, so the crossfade has a visible discontinuity.
5. **Grow durations tried**: 1.1s, 2.2s, 3.3s. Even 3.3s didn't feel like zoom — it felt like slow scaling.

## Better Approaches to Try Next Time

1. **Animate the three.js camera, not the CSS container.** Keep the glass lens at a fixed small-to-large CSS size transition (for the "magnifying glass" framing), but inside the three.js scene, animate `camera.position.z` from far (10+) to close (~3), so the sun grows *optically* within the render. Combined with a slight CSS grow, this gives the actual "camera zooming in" perception.
2. **Render the three.js sun from t=0** (just clipped to a tiny circular window via parent clip-path), and grow the window. The scene renders full-sized internally; the aperture just widens. This is the actual "magnifying glass" model and avoids any crossfade altogether.
3. **Use a shared SVG/canvas representation of the sun for the 2D fallback** that matches the three.js surface exactly — so any crossfade is invisible. Or render the tiny sun in three.js too and just scale up from there.
4. **Add motion blur or radial blur during the grow phase** to sell the zoom.
5. **Consider using `<canvas>` tricks** — render the three.js scene to an offscreen texture, then blit it into the main 2D canvas at the XL node position, animating the sample region to "zoom" through the texture. Avoids DOM complexity entirely and gives pixel-perfect integration with the existing 2D canvas.
6. **Test with the actual XL probability** (0.2%) rather than a boosted one — first-interaction perception may differ when the sun is an "event" rather than expected.

## What to Preserve from This Work

- Three.js Sun component (`community-nodes-sun.tsx`) is a correct direct port of the loading-screen sun — reusable for future interactive moments.
- Apple-glass lens styling recipe (`backdrop-filter` + clip-path + layered box-shadow) is production-ready and reusable.
- `dynamic()` + 2x `requestAnimationFrame` mount pattern for smooth CSS-transition-on-entry.

## Artifacts

Code is still committed up to the deferral point. The unused `community-nodes-sun.tsx` and `community-nodes-sun-trigger.tsx` will be removed, and the hover/click overlay logic in `community-nodes.tsx` will be reverted so XL renders only the 2D pulsing sun (stable, shipping behavior).

[Task-158]
