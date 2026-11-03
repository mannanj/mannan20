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
