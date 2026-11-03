### Task 312: Chicken Game — "Your world" mode: real room, real place (FUTURE IDEA)

Mannan's words (verbatim, 2026-11-02):
> "the chicken game can pause at a click count and ask us to input pictures from our real scene, our room, and then we can map that to a real world for the chicken to place through, we can track and even ask for the screens position and try to play the chicken as though it were behind the screen where we are standing with sort of backdrops too, maybe we can even use gaussian splat to 3d map things, i dont know precisely what or how to do this, but bring in a real element here like this. maybe we also get a location zip code from the user too and somehow integrate that location too. we can let them skip this real location camera mode at least through like a pause and enter or a skip scene kind of flow design taken from our download functionality from earlier."

Idea status: not designed. Mannan is unsure of the how. Start with a research and design spike.

- [ ] Spike: research options and write `docs/chicken-game-your-world.md`, recommending the simplest version that feels magical:
  - photo backdrop: the user's room photo as a parallax backdrop, with depth estimated from a monocular depth model to separate layers
  - webcam window: head-tracked parallax (face tracking via MediaPipe) so the screen acts like a window, with the chicken "behind the glass" in the room
  - Gaussian splat: capture a short phone video, build a splat (third-party pipelines such as Polycam/Luma/Nerfstudio/gsplat, or in-browser viewers such as gsplat.js / @mkkellogg/gaussian-splats-3d), and fly the chicken through it
  - AR on mobile (WebXR) as a stretch goal
- [ ] Screen-position calibration: ask where the screen is in the room photo (tap four corners) so the chicken can appear to be behind the screen where the player stands
- [ ] Location: an optional ZIP code that sets local time of day / sun position (reuse Sun Signal), weather, and a local landmark or skyline backdrop; never stored server-side without consent
- [ ] Flow: at a click-count threshold the game pauses with a "Bring the chicken into your world?" panel offering "enter" and "skip instead?", reusing the download-gate pattern (`space-gate.tsx`: progress, ready + start?, 3-2-1 countdown)
- [ ] Privacy: camera, photos and splats stay on-device by default (processed in the browser); no upload without explicit opt-in; clear delete; nothing hits the MCP snapshot or analytics
- [ ] Performance budget per Task 309; lazy-load every heavy model or viewer only after the player opts in
- [ ] Prototype the chosen path behind `?variant=2`, record a Jev clip (scripts/jev/clip.mjs) of the opt-in, skip and enter flows
- Location: `docs/chicken-game-your-world.md` (new), `src/components/game/space-gate.tsx` (gate pattern), `src/components/game/chicken-game-v2.tsx`
