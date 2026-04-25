### Task 176: Garden card preview thumbnails (Health iridescent gradient + Community constellation)
- [x] Capture the Unicorn health-hero scene, blur and dim it, save as `public/images/health-hero-preview.png` (figure dissolved, only the muted iridescent color smear remains)
- [x] New `HealthHeroPreview` component renders the static image via `next/image`
- [x] `/garden` index cards: render `HealthHeroPreview` for the Health article, `CommunityNodesPreview` for the Seeking Community article (left-side thumbnail strip)
- [x] `AdditionalReading` strip on article pages: 80px-wide preview thumbnail on the left of each article card, same per-article conditional
- [x] Scaffold disabled `HealthInkEffect` and `HealthPocketCard` left in the codebase (commented imports) for future reuse
- [x] Trim Health is an Artform caption to a one-line lead-in
- Location: `src/components/garden/health-hero-preview.tsx`, `src/components/garden/health-ink-effect.tsx`, `src/app/garden/page.tsx`, `src/components/garden/additional-reading.tsx`, `src/app/garden/article/health-longevity/page.tsx`, `public/images/health-hero-preview.png`

[Task-176]
