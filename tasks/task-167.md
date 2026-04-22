### Task 167: Phase 1 — Gold cursor overlay + particle emanation + retraction
- [ ] Create `GoldInfectionContext` (RAF-driven phase/origin/radius/intensity, root CSS vars, dispatchers)
- [ ] Create `GoldParticleCanvas` (fullscreen canvas, z-2000, pointer-events-none, spawn-while-spreading, pull-back-while-retracting)
- [ ] Create `GoldInfectionWrapper` client component bundling provider + canvas
- [ ] Wire wrapper into `src/app/garden/layout.tsx`
- [ ] Attach mouse enter/move/leave on `GardenHero` section so cursor inside the Unicorn scene dispatches to context
- [ ] Sanity-check in dev: particles emanate from cursor while inside hero; suck back to last position on leave; no DOM recoloring yet
- Location: `src/context/gold-infection-context.tsx`, `src/components/effects/gold-particle-canvas.tsx`, `src/components/effects/gold-infection-wrapper.tsx`, `src/app/garden/layout.tsx`, `src/components/garden/garden-hero.tsx`
