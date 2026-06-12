### Task 234: Chicken feel II — rubber squash, feathers, ground life, hyperspeed, teleport, dense lightning, living landscape, real zap audio
- [x] Rubber-chicken squash on click: layered depth (body from feet, lagging head, bulging eyes, splaying wings, compressing legs) via CSS vars + overshoot springs; depth scales with click combo + heat, skew follows click position; deep squashes squeak
- [x] Feathers replace click shards: 2–3 canvas feathers per click (quill + barbs, flutter/sway/fade), colored from all tiers unlocked so far; evolutions keep the 26-shard energy burst + add a 10-feather puff
- [x] Lightning resized to ~1/3 (radii 6–12→26–44px, strokes 3.2/1.5/0.85) with 3× arcs per burst (3–9, cap 48)
- [x] Audio: crackle rebuilt as a real zap (sparky bandpass noise sweep + saw whine + thunder thump, all soft-attack — the gain-snap click artifact is gone); riser fallback richer (detuned saws + filter sweep + shimmer); new rubber squeak voice
- [x] Ground mode: starts standing on the landscape, slow meander with pauses, periodic bend-over grazing/pecking; first click = takeoff
- [x] Chicken kids: very rare tiny chicks (any unlocked tier color) meander the ground; clicking one makes it bolt off-screen
- [x] Speed curve: per-score growth + per-tier bumps (~2.5× faster late stages); rare 3s hyperspeed burst at 10–20× then 0.3× recovery — clicking it mid-burst pays +100 (ends the burst)
- [x] Teleportation: rare blinks with vertical streak columns at both ends, pre-echo/after-image ghosts, sometimes 2–3 decoys with one true chicken; +5 per click within 5 frames of arrival during decoys
- [x] Landscape transforms more: tier-up crossfades the scene immediately, sparse per-tier accent-colored details, displacement wobble grows with tier
- [x] Test bridge extended (mode/feathers/hyper/ghosts/teleportFrames/squash/kids + forceHyper/forceTeleport/forceKid); 9 new e2e tests, all 31 chicken specs green
- [x] Backlog: exact rubber-chicken replica (incl. evolutions, keep energy effects) added to docs/chicken-game-features.md
- Location: `src/components/game/chicken-game.tsx`, `src/components/game/chicken-effects.ts`, `src/components/game/chicken-svg.tsx`, `src/components/game/game-scenery.tsx`, `src/lib/chicken-audio.ts`, `src/hooks/use-chicken-sounds.ts`, `src/app/globals.css`, `e2e/chicken-game.spec.ts`, `docs/chicken-game-logic.md`, `docs/chicken-game-features.md`

[Task-234]
