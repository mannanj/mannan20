### Task 255: Reduce Health is an Artform gold particle intensity by 80 percent

**Status: TODO. Do not implement as part of task creation.**

Severely minimize the gold particle effect on the `Health is an Artform` article by reducing
its visible particle intensity by about 80%.

#### Context
- Current page:
  - `/garden/article/health-longevity`
  - `src/app/garden/article/health-longevity/page.tsx`
- Current gold hover wrapper:
  - `src/components/garden/health-gold-hover-shell.tsx`
- Current particle canvas:
  - `src/components/effects/gold-particle-canvas.tsx`
- Current issue:
  - The gold particle effect is visually too strong on `Health is an Artform`.
  - The desired result is the same concept, but much quieter: roughly 20% of the current
    visible particle presence.

#### Requirements
- [ ] Reduce visible gold particle intensity by about 80% on `Health is an Artform`.
- [ ] Keep the effect present but subtle; do not remove it entirely.
- [ ] Prefer reducing spawn density, particle count, glow size, and/or opacity over changing
      the article layout.
- [ ] Preserve `prefers-reduced-motion` behavior.
- [ ] Avoid weakening unrelated particle effects elsewhere unless the gold infection canvas is
      intentionally global and no page-specific control exists.
- [ ] If the existing effect is global, add a clean intensity control so Health can opt into
      the reduced setting without surprising other pages.

#### Suggested implementation approach
- First inspect whether `GoldParticleCanvas` can receive page-specific intensity from
  `GoldInfectionProvider` or a wrapper prop.
- If no intensity control exists, add a small typed intensity setting rather than hard-coding
  Health-only conditionals inside the canvas.
- Target values should approximate an 80% reduction, for example:
  - particle cap around 20% of the current cap,
  - spawn probability around 20% of the current value,
  - glow alpha/size reduced enough that the effect reads as a faint accent.
- Apply the reduced intensity only through `HealthGoldHoverShell` or the Health article page.

#### Validation
- [ ] Add or update a focused visual/e2e check for `/garden/article/health-longevity`.
- [ ] Manually verify the particle effect is still visible but much less dense.
- [ ] Verify non-Health pages are unchanged, or document why the reduction is intentionally global.
- [ ] Run `pnpm build`.

#### Non-goals
- Do not remove the gold hover/particle effect.
- Do not redesign the Health hero.
- Do not change article copy or metadata.
- Do not alter unrelated header or game particle systems.

[Task-255]
