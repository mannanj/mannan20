### Task 170: [PENDING] Extra intro bar-effects on unicorn hero first spawn

**Ask:** On initial page load of the Health article, have MORE of the vertical bar/pixel-column effects (already present in the UnicornScene) appear at the TOP and MIDDLE of the hero. They should persist briefly, then migrate / fade / move out of sight — with the goal of reducing the visual emptiness of the black space above the silhouette and in the upper portion of the hero.

**Current behavior:**
- Bar effects render as part of the UnicornScene shader and appear steady-state at various y-positions
- Top and middle regions of the hero are mostly black empty space above/around the silhouette

**Design notes:**
- Effect should feel like an intentional intro flourish, not permanent
- Must ease out of view (fade opacity / translate off / scale down) so the resting state matches today's composition
- Probably driven by either:
  - A scene-level animation window (first N seconds → extra bars rendered; after → fade out)
  - A CSS/JS overlay layer on top of the existing scene
  - Or a modification to the scene's .raw.json with a time-gated opacity curve
- Respect the existing re-export workflow: `public/unicorn/health-hero-scene.raw.json` is source of truth; never hand-edit derived `.json`; run `bun run unicorn:build` after changes
- Or keep it as a React/CSS overlay layer for simpler authoring

**Acceptance:**
- Page load → noticeable extra bars populate top + middle ~immediately
- Within a few seconds they drift / fade out
- Final resting hero matches current visual (no permanent new bars)
- Works on both mobile (720px hero) and desktop (900px hero)

- Location: TBD (likely `src/components/garden/garden-hero.tsx` for overlay, or `public/unicorn/health-hero-scene.raw.json` + rebuild for scene-native approach)
