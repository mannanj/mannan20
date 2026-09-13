### Task 283: Explore Three UI "Sylva / Living Green" hero as a design direction

Captured 2026-09-10 as a future idea — not started, no implementation decision made yet.

Reference:
- Hero to adapt: https://threeui.com/hero/sylva/living-green
- Component catalog to browse for related pieces: https://threeui.com/browse

- [ ] Review the Sylva "Living Green" hero live and capture what makes it work (motion, palette, typography, depth)
- [ ] Decide the target surface: site hero vs. Garden (`/garden`) — the organic/green direction likely fits Garden better than the main portfolio hero
- [ ] Check licensing/attribution terms for Three UI components before using anything
- [ ] Assess cost: it's a Three.js/WebGL-class hero — weigh bundle size and whether it must be `next/dynamic`-loaded, and how it coexists with the existing Unicorn Studio hero scene
- [ ] Confirm it doesn't conflict with the "keep UI subtle, no looping attention-grabbing animation" standard
- [ ] Prototype on a branch and screenshot before committing to it

- Location: `src/components/hero.tsx`, `src/app/garden/`, `public/unicorn/` (existing hero scene for comparison)
