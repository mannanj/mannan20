### Task 221: Chicken screams, R2 audio, loading bar, and DBZ evolution tiers
- [x] Fix silent chicken: 10 license-safe sounds (7 screams, 2 power-up risers, 1 aura loop) in `public/sounds/chicken/`, uploaded to R2 `sounds/chicken/*` via `scripts/upload-chicken-sounds.mjs`
- [x] Resilient audio engine: R2 → local → html5 fallback ladder, preload progress, random no-repeat screams with pitch jitter, synth aura/crackle/riser fallbacks (`src/lib/chicken-audio.ts`)
- [x] Chicken-themed loading bar with walking chicken, cycling captions, min-display + fade, failure-tolerant (`src/components/game/sound-loader.tsx`)
- [x] Evolution tiers Yard Bird → Azure Comet → Jade Tempest → Crimson Fury → Golden God: skin shards crack off revealing next color, Vegeta hair (dark → gold), per-tier emotions, deeper screams per tier (`src/components/game/chicken-tiers.ts`, `chicken-svg.tsx`)
- [x] DBZ aura: canvas flame spikes + glow scaled by tier/progress, asset hum loop layered with parametric synth, bio-electricity arcs + synth crackles at tiers 3-4, transformation flash + power-up sound + form label
- [x] Mercy slowdown: idle 6s ramps speed to 45% floor over 14s, resets on hit, smug caption
- [x] Test bridge `window.__chicken` + e2e suite `e2e/chicken-game.spec.ts` (loader, scream rates, randomization, tiers, shards, mercy, total-failure survival)
- [x] Docs: `docs/chicken-evolution-design.md`, `docs/chicken-sounds-sources.md` (licenses/provenance); llms.txt game line updated
- Location: `src/components/game/`, `src/lib/chicken-audio.ts`, `src/hooks/use-chicken-sounds.ts`, `public/sounds/chicken/`, `e2e/chicken-game.spec.ts`, `scripts/upload-chicken-sounds.mjs`, `docs/`
