### Task 244: Chicken Game — Escape Vehicles & Scene Escalation (FUTURE)

Future-work backlog item. The Floating Chicken Game (`/game`) evolves from a chicken on a
static backdrop into an **escalating escape narrative**: as you chase it, the *world* changes —
surfing, then flying, then a rocket to space — while the core dodge mechanic keeps the same
escalating escape speeds we already have. Comedy ramps up and gets funnier each stage.

- [ ] Stage 1 — Surfing: ocean/waves backdrop, chicken on a surfboard pushed by waves; surfing intensifies as it dodges (reuse existing escape-speed curve)
- [ ] Stage 2 — Pilot: goggles gag (magic stick-figure hands grow out, giggles/lols, flex-snap goggles, pull onto head) → airplane flies in → chicken flies to escape clicks
- [ ] Stage 3 — Rocket/Space: rocket launch, camera follows + scene zooms out so the chicken shrinks and only the rocket stays clickable
- [ ] Stage 3 default outcome: rocket lands on the Moon (little legs), chicken emerges, camera zooms in, game continues in a space arena
- [ ] Rare easter egg — "break into the rocket" mid-flight (shovel/pick-axe opens a notch, no explosion; chicken butt/head become clickable targets)
- [ ] Cross-app inventory: surface the articles-page bottom-right bag in `/game`; held items (e.g. shovel) gate the rocket break-in
- [ ] Resolve open questions: stage-trigger model, rendering/camera approach + bundle budget, post-space loop/branch/end
- Raw discussion (verbatim): `docs/chicken-game-escape-scenes-raw.md`
- Design / structured spec: `docs/chicken-game-features.md` → "Escape Vehicles & Scene Escalation"
- Location: `docs/chicken-game-features.md`, `docs/chicken-game-escape-scenes-raw.md`; game source: `src/app/game/page.tsx`, `src/components/game/` (esp. `game-scenery.tsx` for backdrops, `chicken-game.tsx` dodge loop, `chicken-svg.tsx`)

[Task-244]
