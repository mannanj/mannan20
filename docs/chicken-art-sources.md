# Chicken game — bird art sources

All bird art under `public/game/birds/` was AI-generated on 2026-11-02 with `google/gemini-3.1-flash-image` via OpenRouter, because no licensed photo matched the exact grab pose and we needed one consistent lighting/style across three birds and nine poses each. No Wikimedia/Unsplash/Pexels photos were used, so there is no third-party attribution to carry. Mannan approved AI generation where no licensed photo fits (2026-11-02).

Pipeline (all in `scripts/birds/`):

- `jobs.mjs` — the exact prompts (shared photographic style block + per-bird plumage + per-pose composition).
- `generate.mjs` — calls OpenRouter, saves raw PNGs to `scripts/birds/raw/<bird>/`, logs every paid call with its cost to `scripts/birds/budget.json`, stops at 85% of the $3.00 cap.
- `key.mjs` — chroma key by greenness (`g - max(r,b)`): border-connected flood fill + hard threshold, soft edge alpha, despill (stronger for the phoenix), talon layers cropped to the leg with a faded top, the painted feet erased from the grab bodies (so the separate talon layers are the only feet), orientation fixes, trim, WebP export, red-stripe review sheets in `scripts/birds/review/`, and `public/game/birds/manifest.json` (sizes plus the computed chicken anchor for each grab body).
- `compose.json` + `preview.mjs` — the Playwright proof: mounts the layers on the live game at `localhost:3861/game?variant=2` and writes the screenshots to `~/Desktop/chicken-birds-photoreal/`.

## Assets

Per bird (`hawk`, `eagle`, `phoenix`), nine transparent WebP files:

| File | Purpose | Prompt (see `jobs.mjs` for full text) | Cost |
|------|---------|----------------------------------------|------|
| `grab-body.webp` | grab pose body + wings (feet erased) | `grabBodyV2`: three-quarter front, head upper-left bowed over its open feet, tail lower-right, wings flared, legs down; rotated in post (hawk 20°, eagle 14°, phoenix 15°) | $0.067 |
| `talon-right.webp` | front (bird's right) talon layer, drawn over the chicken | `foot(..., 'right')`: macro of one open foot and lower leg, toes spread and curling toward the camera | $0.067 |
| `talon-left.webp` | back (bird's left) talon layer, drawn behind the chicken | `foot(..., 'left')` | $0.067 |
| `fly-up.webp` | wingbeat frame, wings high | `FLIGHT['fly-up']` | $0.067 |
| `fly-level.webp` | soaring toward camera, wings level | `FLIGHT['fly-level']` | $0.067 |
| `fly-down.webp` | wingbeat frame, downstroke | `FLIGHT['fly-down']` | $0.067 |
| `bank.webp` | banking glide, rolled ~30°, seen from above/side | `FLIGHT['bank']` | $0.067 |
| `away-3q.webp` | three-quarter rear view, turning away | `FLIGHT['away-3q']` | $0.067 |
| `away-far.webp` | rear view, receding | `FLIGHT['away-far']` | $0.067 |

Plumage prompts: hawk = adult red-tailed hawk (rufous tail, pale chest, dark belly band, patagial bars); eagle = adult bald eagle (white head/tail, brown body, yellow bill and feet); phoenix = raptor-shaped bird made of photographic fire and embers.

Superseded raw renders kept in `scripts/birds/raw/<bird>/grab-body.png` (first grab-body attempt, head not bowed; $0.067 each, not used in `public/`).

## Spend

30 images × ~$0.0674 = **$2.02** (OpenRouter key usage before: $0.0211; the per-call log is `scripts/birds/budget.json`). Cap was $3.00; stop line $2.55.

## Licence

Generated images; the prompts, keying and composition are ours. No third-party photos.

## Plane explosion sprites (Task 311)

Three AI-generated photographic frames on pure black (fireball, smoke, embers) made through OpenRouter (`google/gemini-3.1-flash-image`, 3 x about $0.067 = $0.20, logged in `scripts/birds/budget.json`). `scripts/fx/explosion.mjs` (branch chicken-311) generates them and converts luminance to alpha into `public/game/fx/*.webp`. No third-party footage.

## Earth, Moon, Sun textures (Task 311)

`public/game/space/` holds textures copied from Sun Signal (NASA Visible Earth / LROC public-domain imagery); see `public/game/space/LICENSES.txt`.

## Eagle and phoenix event assets (Task 307)

Four more AI-generated frames through OpenRouter (`google/gemini-3.1-flash-image`), prompts in `scripts/birds/jobs.mjs`, keyed by `scripts/birds/key.mjs`, each logged in `scripts/birds/budget.json`:

| File | Purpose | Keying | Cost |
|------|---------|--------|------|
| `public/game/birds/eagle/feather.webp` | eagle fly-off easter egg drop (`eagle-feather` item, x2 skin) | green chroma key | $0.0673 |
| `public/game/birds/phoenix/feather.webp` | phoenix fly-off drop (`phoenix-feather` item, x3 skin) | green chroma key | $0.0673 |
| `public/game/birds/fx/toasted-feather.webp` | charred chicken feather particle shed during the phoenix's second talon; collectible (`toasted-feather`, max 10) | green chroma key | $0.0673 |
| `public/game/birds/fx/fire-puff.webp` | heat-pulse fire sprite at the grip every 5 taps (screen blend) | luminance to alpha (`fire*` names in `key.mjs`) | $0.0673 |

Task 307 spend: **$0.27** of the $0.60 allowance (budget file cap raised 3.00 -> 3.60, stop line 2.89; total logged $2.56).

Sizzle: synthesized at runtime with Web Audio (`EffectsSynth.sizzle` in `src/lib/chicken-audio.ts`: looped filtered noise with random pops, band-pass around 3.2 kHz that rises with heat). No clip was downloaded, so nothing to license. Bird cries on eagle and phoenix talon clicks reuse the hawk scream pool.

Sweat drops, steam, the bare-skin/char circle, the eagle and phoenix skin patterns and the warm screen flash are vector/CSS layers on the existing rubber-chicken art (no assets).

## Phoenix re-render to Mannan's reference (Task 307 follow-up)

Golden-plumage phoenix (real layered feathers, eagle-like head with a crest, fire only at the feather edges, connected legs): `scripts/birds/jobs.mjs` `BIRDS.phoenix` prompt, 9 frames (`grab-body-v2`, `talon-right`, `talon-left`, `fly-up`, `fly-level`, `fly-down`, `bank`, `away-3q`, `away-far`) at ~$0.067 each = **$0.61**, logged in `scripts/birds/budget.json`; keyed with `key.mjs` (feet erase region re-tuned to `x 0.24-0.48, y 0.74-0.88`). The earlier flame-silhouette phoenix frames are superseded (raw PNGs overwritten in `scripts/birds/raw/phoenix/`). Task 307 total: $0.27 + $0.07 draft + $0.54 finals = **$0.88**.

## Photoreal polish pass (chicken-polish)

AI-generated via OpenRouter (`google/gemini-3.1-flash-image`), generated by `scripts/fx/rocket-gen.mjs` and keyed by `scripts/fx/rocket-key.mjs` (raw renders in `scripts/fx/raw/`). Logged in `scripts/birds/budget.json` as `polish-*`.

| File | What | Cost |
| --- | --- | --- |
| `public/game/rocket/body.webp` | photoreal rocket, closed hatch, porthole keyed to transparent (magenta glass) | $0.067 |
| `public/game/rocket/open.webp` | edit of body: hatch swung open | $0.068 |
| `public/game/rocket/legs.webp` | edit of body: landing legs deployed (parked on the Moon) | $0.068 |
| `public/game/rocket/plume.webp` | real exhaust plume, luminance-keyed | $0.067 |
| `public/game/fx/blackhole.webp` | lensing accretion swirl, luminance-keyed, drawn additive | $0.067 |

Total $0.34 (cap $0.60). Placement of the rocket layers is generated into `src/components/game/rocket-art.ts`.

Space textures: `public/game/space/earth-day-4k.webp` (4096x2048, from Sun Signal `earth-day-4k.jpg`), `earth-night-2k.webp`, `moon-lroc-1k.webp`, all WebP conversions of Sun Signal's files (NASA Visible Earth / LROC, public domain). Sun Signal ships only day and night maps (no normal, specular or cloud maps), so none are added; ocean glint is computed in the shader. The Sun's hard fresnel shell was replaced by a soft additive glow sprite.

## Task 310: cosmos, Jupiter and Martians

Real textures (NASA, public domain, via Wikimedia Commons, downsized to 2048 px WebP in `public/game/space/`; credits in `LICENSES.txt`):

| File | Source |
| --- | --- |
| `jupiter-cassini-2k.webp` | "Jupiter Cylindrical Map - Dec 2000" (NASA/JPL/University of Arizona, Cassini, PIA07782) |
| `mars-viking-2k.webp` | Viking MDIM 2.1 color mosaic (NASA/USGS Astrogeology) |

Asteroids and Phobos/Deimos reuse the LROC Moon texture on displaced icosahedrons; Earth and Moon reuse the Sun Signal maps ("provided by sunsignal.app" stays in the scene).

Generated art (OpenRouter, green-screen keyed with `scripts/cosmos/key.mjs`, generated with `scripts/cosmos/generate.mjs`, costs logged in `scripts/birds/budget.json` with `task: 310`). Original characters (the three concepts in `docs/chicken-game-cosmos-jupiter.md`), photoreal practical-creature look, no existing character referenced.

| File | What | Model | Cost |
| --- | --- | --- | --- |
| `public/game/martians/pip.webp` | Pip, dome-helmet scout (the cheap draft was good enough to keep) | gemini-2.5-flash-image | $0.039 |
| `public/game/martians/moss.webp` | Moss, stalk-eyed gardener | gemini-3.1-flash-image | $0.067 |
| `public/game/martians/zap.webp` | Zap, saucer pilot | gemini-3.1-flash-image | $0.067 |
| `public/game/martians/ground.webp` | imaginary rocky plain, sky area cropped off (Jupiter's real banded sky comes from the 3D scene) | gemini-3.1-flash-image | $0.067 |

Total $0.24 of the $1.00 cap. No retries, no speculative variants.

## Task 316 — aura and fire
No external assets. Flame tongues are procedural sprites (`chicken-fire.ts`, `flameSprite`): three teardrop canvases with layered red → orange → white linear gradients, drawn with `lighter` compositing.
