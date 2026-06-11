# Chicken Evolution & Sound System — Design

Design brief for the /game overhaul requested 2026-06-11. Four asks, folded into one system:

1. **Fix the silent chicken.** `use-chicken-sounds.ts` preloads `/sounds/chicken/scream-{1..8}.mp3` but `public/sounds/chicken/` is empty — every Howl 404s, so clicks are silent. Real, license-safe sounds now live in the repo and on Cloudflare R2.
2. **Variety + randomization + "deeper".** Multiple distinct screams, random pick (no immediate repeat), pitch jitter per play, and screams that get *deeper* as the chicken evolves (Web Audio playback-rate shift).
3. **Chicken-themed loading bar.** Fun, friendly preloader shown while the audio downloads on arrival. Fast (~300 KB total), minimum 700 ms display so it reads as a moment, fault-tolerant (game never bricks if a file fails).
4. **DBZ evolution.** Skin shards crack off per click revealing the next tier's color underneath; at thresholds the chicken transforms: yellow → blue → green → red → shining gold, gaining Vegeta-style saiyan hair, a flame aura that intensifies and changes color, bio-electricity at high tiers, and escalating emotions. Sounds fire at the right spots: click → scream, transformation → power-up riser, aura → continuous synth hum scaled to tier, electricity arc → crackle.

Plus the catch-up mechanic: if the chicken goes unclicked for a while it smugly slows down (never impossible forever) — this is the "showboating" theme from `chicken-game-features.md`, applied minimally along with anger emotions and demonic-deep screams.

## Tiers

| # | Form | Skin | Threshold | Hair | Eyes | Aura | Electricity | Scream rate |
|---|------|------|-----------|------|------|------|-------------|-------------|
| 0 | Yard Bird | yellow #FFD700 | 0 | comb only | calm | none | none | 1.00 |
| 1 | Azure Comet | blue #4FC3F7 | 20 | black spikes | determined | blue | none | 0.92 |
| 2 | Jade Tempest | green #66BB6A | 45 | black spikes | angry | green | none | 0.84 |
| 3 | Crimson Fury | red #EF5350 | 75 | black spikes | furious (red eye) | red-orange | sparse | 0.76 |
| 4 | Golden God | radiant gold gradient | 110 | gold, larger | ascended (gold, no pupil) | white-gold | frequent | 0.68 |

Within a tier, each click advances shard progress: `floor(progress × 12)` of 12 pre-mapped jagged patches render in the *next* tier's color, clipped to the body silhouette, with a per-tier reveal order so each evolution cracks differently. Clicks also throw triangular shard particles in the current skin color; threshold crossings burst 24 shards, flash the screen, pop the form name, and jump the aura.

## Audio

- **Hosting:** mp3s live in `public/sounds/chicken/` (repo source of truth, e2e fixtures) and are uploaded to R2 `portfolio-files/sounds/chicken/*` (`pub-a7c89d8a….r2.dev`). Bucket CORS already allows mannan.is/www/localhost:3847 with GET/HEAD, so Howler's default Web Audio pipeline (XHR + decode) works and `rate()` re-pitches naturally.
- **Resilience ladder per file:** R2 (webaudio) → same-origin `/sounds/chicken/` (webaudio) → same-origin html5. Files that still fail are counted and skipped; loader completes regardless (4 s hard cap).
- **Screams:** random index ≠ last, rate = tier rate × jitter(0.95–1.05).
- **Power-up risers:** asset if loaded, synthesized riser fallback (osc sweep + noise swell + thump) so transformations are never silent.
- **Aura hum + crackles:** synthesized on Howler's AudioContext (shaped-noise → bandpass with LFO → gain, sub-osc ≥ tier 3). Continuous loop from first transformation; intensity ramps with tier + shard progress and powers down with the mercy slowdown. Electricity arcs trigger synth crackle bursts in the same frame they render. Synthesis = gapless loops, parametric intensity, zero extra download.
- Aura master gain capped (~0.22) so screams stay on top. Aura stops on unmount.

## Mercy slowdown

After 6 s without a hit, speed eases toward a 45% floor over 14 s (smoothstep). Any hit instantly restores full score-based speed. A subtle caption ("the chicken grows smug… and slow") appears when fully engaged; aura intensity sags with it.

## Loader

Full-screen overlay over the game on /game: mini bobbing chicken, gradient progress bar with a tiny chicken walking at the fill edge, cycling captions ("Rounding up the flock…", "Charging ki…"), percentage. Per-file granularity (8+ steps). Min display 700 ms, fade 300 ms, completes even on failures.

## Test & observability

`window.__chicken` bridge (plays log, `state()`, `boost(n)` which routes through the same hit pipeline) keeps e2e deterministic — no assertions on a moving target beyond the first slow clicks. New `e2e/chicken-game.spec.ts` intercepts R2 routes with local fixtures: loader lifecycle, scream-on-click with rate, randomization across plays, tier transformations + power-up events + deeper rates, shard reveal counts, mercy decay + reset, and a full-failure run proving the game stays playable.

## Files

`chicken-tiers.ts` (config) · `chicken-audio.ts` (manifest, resilient loader, playback, AuraSynth) · `use-chicken-sounds.ts` (thin hook) · `chicken-svg.tsx` (tiers/shards/hair/emotions) · `sound-loader.tsx` · `chicken-game.tsx` (aura/electricity/mercy/transform integration) · `globals.css` keyframes · `e2e/chicken-game.spec.ts` · `scripts/upload-chicken-sounds.mjs`.

Out of scope (stay in `chicken-game-features.md` backlog): exorcist walk, fourth-wall lunge, skins/unlockables, chicken friends, pause, chat panel, leaderboard.
