### Task 172: Enlarge health hero + pull content to figure feet
- [x] Bump `GardenHero` height `h-[420px] md:h-[560px]` → `h-[620px] md:h-[820px]` so scene figure scales up
- [x] Pull article content up via `topPadding="-mt-[278px] pt-0 relative z-20"` so caption sits below figure feet, preserving internal whitespace
- [x] Apply ArticleHeader wrapper to seeking-community article (parity with health)
- [x] Drop `clusterAlign` from ArticleLayout (moved to ArticleHeader)
- [x] Dev script: free port 3847 + clear `.next` before startup
- Location: `src/components/garden/garden-hero.tsx`, `src/app/garden/article/health-longevity/page.tsx`, `src/app/garden/article/seeking-community/page.tsx`, `src/components/article-layout.tsx`, `src/components/article-header.tsx`, `package.json`
