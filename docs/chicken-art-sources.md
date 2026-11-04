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


# Endless phase — creature art and sound sources (Task 318, 2026-11-03)

Every image and sound used for the endless-phase creatures (`public/game/creatures/`, `public/sounds/chicken/`). All photos were cut out locally with `rembg` (isnet-general-use, alpha matting) and exported as WebP ≤ 1024 px. Mannan: review the licences before any commercial use; CC BY / CC BY-SA photos need attribution (and share-alike for derivatives).

## Images (all Wikimedia Commons, free licences — no web-only or AI images were used)

| File | Source | Licence |
| --- | --- | --- |
| kitty-walk.webp | https://commons.wikimedia.org/wiki/File:Blue_bengal_kitten_taste_of_freedom_-_3_(37011713593).jpg | CC0 |
| kitty-stalk.webp | https://commons.wikimedia.org/wiki/File:Crouching_cat_in_Shifen.jpg | CC BY 2.0 |
| kitty-pounce.webp (also the run-off pose) | https://commons.wikimedia.org/wiki/File:Running_Cat_01.JPG | CC BY-SA 3.0 |
| kitty-hold.webp | https://commons.wikimedia.org/wiki/File:Brown_spotted_tabby_bengal_cat.jpg (cat only, rembg isnet cut; replaced the Tabby_Cat_with_Toy_Mouse cut that kept the bed and toy) | CC BY-SA 3.0 |
| tiger-walk.webp | https://commons.wikimedia.org/wiki/File:Walking_tiger_female.jpg | CC BY-SA 4.0 |
| tiger-pounce.webp | https://commons.wikimedia.org/wiki/File:Tiger_jumping_David_RaJU.jpg | CC BY-SA 4.0 |
| tiger-run.webp | https://commons.wikimedia.org/wiki/File:Bengal_tiger_jumping_in_Sundarban.jpg | CC BY-SA 4.0 |
| lion-walk.webp | https://commons.wikimedia.org/wiki/File:Lion_(Panthera_leo)_old_male_Chobe.jpg | CC BY-SA 4.0 |
| lion-chase.webp | https://commons.wikimedia.org/wiki/File:002_Male_Lion_prowling_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg | CC BY-SA 4.0 |
| lion-pounce.webp | https://commons.wikimedia.org/wiki/File:Leaping_Lion.jpg | CC BY-SA 4.0 |
| lion-sit.webp | https://commons.wikimedia.org/wiki/File:Lion_male.jpg | CC BY-SA 4.0 |

## Sounds (Wikimedia Commons, converted to mono 64 kbps mp3 with ffmpeg)

| File | Source | Licence | Notes |
| --- | --- | --- | --- |
| cat-meow.mp3 | https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav | CC0 | |
| cat-hiss.mp3 | https://commons.wikimedia.org/wiki/File:Cat_hissing_-_Zabuhailo.wav | CC0 | |
| tiger-growl.mp3 | https://commons.wikimedia.org/wiki/File:439280_schots_angry-tiger.wav | CC0 | first 3.2 s, faded out |
| lion-roar.mp3 | same tiger clip as above | CC0 | no free lion roar found on Commons; the tiger clip pitched down 22 % and sped up 10 % as a stand-in — replace when a licensed roar turns up |

## Spend

AI image generation: $0.00 (none used).

# Myth eras — creature art and sound sources (Task 319, 2026-11-04)

Images cut out locally with `rembg` (isnet-general-use, alpha matting), cropped to the alpha box and exported as WebP ≤ 1024 px. Free photos were tried first (Wikimedia Commons sweep: no maned lion mid-leap, no open-jawed striking snake, no three-headed dog and no usable cyclops with an eye turned up), so the creature frames were generated on `google/gemini-2.5-flash-image` over OpenRouter; the two scene backgrounds are Commons photos. Mannan: the Commons photos are CC BY-SA 4.0 and need attribution before commercial use.

## Backgrounds (`public/game/scenes/`, Wikimedia Commons)

| File | Source | Licence |
| --- | --- | --- |
| temple-ruins.webp (Myth era) | https://commons.wikimedia.org/wiki/File:Temple_of_Poseidon_at_sunset_2.jpg | CC BY-SA 4.0 |
| temple-gate.webp (The gate era) | https://commons.wikimedia.org/wiki/File:Lion_Gate,_Mycenae,_201505.jpg | CC BY-SA 4.0 |

## Creature frames (`public/game/creatures/`, AI-generated, white studio background, rembg cut)

| File | Model | Prompt gist | Cost |
| --- | --- | --- | --- |
| lion-pounce.webp (replaces the Leaping_Lion.jpg lioness so every lion frame has a mane) | gemini-2.5-flash-image | maned male lion mid-leap, side view facing right | $0.039 |
| snake-head.webp (hydra head, mirrored per side) | gemini-2.5-flash-image | emerald serpent head striking, jaws open, neck to the left edge | $0.039 |
| hydra-body.webp | gemini-2.5-flash-image | coiled serpent body with three neck stumps, no heads | $0.039 |
| cyclops.webp | gemini-2.5-flash-image | giant one-eyed cyclops leaning in, hand raised, facing left | $0.039 |
| cerberus-stand.webp | gemini-2.5-flash-image | three-headed black dog, front three-quarter view (third take: the two side-view takes gave two heads) | $0.039 × 3 |
| cerberus-lunge.webp (snap + hold frame) | gemini-2.5-flash-image | same, lunging with jaws open (third take) | $0.039 × 3 |
| cerberus-sleep.webp | gemini-2.5-flash-image | same, lying asleep | $0.039 |

Rejected takes stay in `scripts/birds/raw/myth/*-v1.png`, `*-v2.png` (not shipped). Items (Hydra scale, Gate key) are SVG in `src/components/inventory/item-art.tsx`.

## Sounds (`public/sounds/chicken/`, synthesized with numpy, no external source)

| File | Synthesis |
| --- | --- |
| giant-rumble.mp3 (cyclops enter) | low-passed brown noise, 2.4 s swell, 38 Hz throb |
| snake-hiss.mp3 (hydra enter and bite) | high-passed white noise, fast attack, 1.4 s decay |
| dog-bark.mp3 (cerberus enter and catch) | two 0.22 s square/sine bursts sweeping 580 → 160 Hz with noise |

## Spend

AI image generation: 11 calls, $0.43 of the $0.75 allowance (logged in `scripts/birds/budget.json`). The Commons sweep that found the two backgrounds was done by a Sonnet researcher agent; only the two photos above were used.

## Enchanted forest (Task 317: trees, sword, forest scene)

Free photos first (Wikimedia Commons sweep by a Sonnet researcher agent, 7 candidates downloaded); Commons had no whole-trunk tree with a readable face on a cuttable background, so the three tree frames were generated on the cheap image model. Everything cut out locally with `rembg` (isnet-general-use, alpha matting), cropped to the alpha box, WebP ≤ 1024 px.

| File | Source | Licence |
| --- | --- | --- |
| `public/game/scenes/forest.webp` | https://commons.wikimedia.org/wiki/File:Fanal_(Madeira,_Portugal),_Lorbeerwald_--_2025_--_1517.jpg (Dietmar Rabich, resized to 1920 px) | CC BY-SA 4.0 |
| `public/game/creatures/sword.webp` (tree sword + bag icon) | https://commons.wikimedia.org/wiki/File:Longsword_from_16_to_19_elements-P5120145-gradient.jpg (Rama, museum longsword, rembg cut) | CC BY-SA 3.0 fr |
| `public/game/creatures/tree-walk.webp` | gemini-2.5-flash-image: gnarled oak with a bark face, root legs mid-stride, white studio background | AI, $0.039 × 2 (first call returned no image) |
| `public/game/creatures/tree-grab.webp` (grab + hold frame) | gemini-2.5-flash-image: same tree, arm-branches reaching forward, greedy grin | AI, $0.039 |
| `public/game/creatures/tree-chipped.webp` (release frame) | gemini-2.5-flash-image: same tree, bark chipped to pale wood, arms open, gasping | AI, $0.039 |

Commons candidates downloaded but not used: Facial_Carving_on_a_Dead_Tree_in_Lesnes_Abbey_Woods.jpg (CC BY-SA 4.0, face on a trunk in dense foliage), Ta_Prohm_Buddha_image_in_a_tree (CC BY 4.0), Szczecin_Jasne_Błonia_(find_face_tree) (CC BY 3.0), "Treebeard"_King_of_the_Ents_Fryston_wood (CC BY-SA 2.0), Foggy_Fanal_forest_in_Seixal (CC BY-SA 4.0). Raw AI takes stay in `scripts/birds/raw/forest/`.

### Sounds (`public/sounds/chicken/`, synthesized with numpy/scipy, no external source)

| File | Synthesis |
| --- | --- |
| tree-creak.mp3 (tree enter and grab) | 1.8 s sawtooth at 90 Hz with slow pitch wander and 11 Hz amplitude judder, plus a little noise |
| wood-chop.mp3 (bark click, sword pull click) | 0.28 s band-passed noise burst (600–4000 Hz) over a 110 Hz thump |
| sword-pull.mp3 (sword freed) | 1.1 s rising metallic tone 900 → 2700 Hz with 2nd/3rd partials and a high-passed scrape |
| sword-slash.mp3 (sword split) | 0.32 s noise whoosh with a band-pass sweeping 800 → 6800 Hz |

### Spend

Task 317: 4 image calls, $0.155 (budget.json: $3.93 → $4.085 total). Sounds and cut-outs cost nothing.
