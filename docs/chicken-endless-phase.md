# Chicken v2 — the endless phase (after the phoenix)

Design only (2026-11-03). Continues `docs/chicken-orb-pacing.md` §6 and Mannan's decisions there (eras every ~3 min or 8,000 points, no caps, goldens expire after 33 s, real-chicken mode at 50,000). Covers Tasks 316 (fire form), 317 (trees + sword), 318 (big cats), 319 (Greek monsters) and the drop rule: "let some of them drop interesting items on click and interaction, not all of them will be interactable". All numbers are constants for `src/components/game/endless-eras.ts` and `creature-event.tsx`.

## 1. Era timeline

An era starts when `score ≥ from` **or** `3 min` have passed in the current era, whichever first (`ERA_SCORE_STEP = 8_000`, `ERA_MAX_MS = 180_000`). At 5 clicks/s with goldens the endless rate is ~60–80 pts/s, so eras usually turn on score (~2 min); slower players get them by time. A player who reaches an era by time (not score) gets `DROP_BEHIND_BONUS = 1.5×` on that era's drop chances.

| # | Era (scene) | Score window (5/s clock) | Content | Entry transition |
|---|---|---|---|---|
| E0 | **Fire form** (phoenix sky: ember field over the cosmos bands) | 25,000–33,000 (≈ 10:45–12:45) | Phoenix release; chicken flaming (Task 316), full fire form from 29,000 (`FIRE_FORM_SCORE`); new orbs Giant, Magnet | the phoenix recede is the transition; nothing else |
| E1 | **Big cats** (re-entry → night backyard, then savanna at dawn as the lion nears) | 33,000–41,000 (≈ 12:45–14:45) | kitty at +0:15, tiger at +1:15, lion at +2:15 (`CAT_OFFSETS_MS`), never two at once | 6 s re-entry descent (reuse `DESCENT_MS`) with the chicken clickable all the way; fire form dims to "flaming" on the ground |
| E2 | **Myth I** (ruined temple at the savanna's edge) | 41,000–49,000 (≈ 14:45–16:45) | cyclops looms at +0:20 (spectacle), hydra fight at +1:30 | columns rise from the savanna background over 6 s (background crossfade only) |
| E3 | **Myth II: the gate** (temple gate, Cerberus chained before it) | 49,000–57,000 (≈ 16:45–18:45) | cerberus fight at +0:30; **real-chicken mode unlocks at 50,000** (toast + bag item from Task 313; no flow change here) | camera pan to the gate (background slide, 4 s) |
| E4 | **Enchanted forest** (living trees) | 57,000–65,000 (≈ 18:45–20:45) | tree boss grabs at +0:20 and +1:50; the sword tree appears with the first grab | the gate swings open and the forest scrolls in behind it (5 s); the gate key skips straight to this |
| E5+ | **Rotation** | +8,000 / 3 min each | E1→E4 again with variations: phoenix 2 (150+150 taps) opens every rotation and returns the chicken to the fire sky for 60 s; creatures 20 % faster per rotation (floor 0.6×); repeat drops at half chance; Mystery ??? joins every pool | same transitions |

Transitions never block input, never show a gate, and pause orb spawns only for their own duration (`ERA_TRANSITION_MS ≤ 6_000`); active buffs keep running. A creature that is on screen when the score crosses the next era boundary finishes first (eras wait for `creature.phase === 'done'`, max 20 s overrun).

## 2. Creatures

Interactable = has click targets that score and can drop; spectacle = no targets, chicken stays clickable. All grabs/holds: chicken clicks still score; goldens hidden; aura/fire suppressed; no orb spawns. Durations are constants; HUD safe zone and ≥ 56 px hit areas as in `bird-event`.

| Creature | Mode | Behaviour and timing | Click targets and scoring | Drop (chance → item → use) |
|---|---|---|---|---|
| Kitty | interactable, **grabs** | stalks 2 s, pounces, holds 4–6 s (`KITTY_HOLD_MS = 4000–6000`), tussle feathers, then drops the chicken and runs off 1.5 s | kitty body: 0 pts, every 3 clicks shorten the hold by 1 s (floor 2 s); chicken: normal | 35 % → **Yarn ball** (max 3, usable): the chicken and clones chase the yarn at the cursor for 10 s (Magnet buff) |
| Tiger | spectacle, **misses** | enters, 2 swipes + 1 pounce, chicken auto-flies up out of reach each time (chicken still clickable during the fly-up), leaves after 5–10 s (`BIG_CAT_STAY_MS = 5000–10000`) | none | none |
| Lion | interactable, **misses** | same choreography, 5–10 s, roars once | mane (≥ 56 px): +2 raw per click, 15 clicks before it leaves "tame" it (it sits, yawns, walks off) | 60 % on tame → **Golden mane** (max 1, usable cosmetic, x1): a mane drawn over any skin; no multiplier |
| Cyclops | spectacle, **misses** | looms from the right edge 10 s, eye tracks the chicken, one slow swat the chicken dodges upward, ducks away | none (the eye blinks when clicked, 0 pts: a tease, not a target) | none |
| Hydra | interactable, **bites** | 3 heads (`HYDRA_HEADS_START`); each head strikes every 2.5 s; a landed strike holds the chicken in the jaws until that head is knocked back; fight ends after 12 knock-backs or 45 s | head: 5 clicks knocks it back (+5 raw per hit); a knocked-back head regrows as two after 4 s, **cap 7** (`HYDRA_HEADS_MAX`) | 50 % on 12 knock-backs → **Hydra scale** (max 2, usable): Shield, the next bird/tree grab needs half the taps |
| Cerberus | interactable, **grabs** | snaps 3 times, the middle head catches the chicken (hold up to 40 s); each head is calmed separately | three heads, 8 clicks each (+5 raw per hit); middle head only after the outer two; all three calmed → it sleeps, gate opens | 100 % on full calm, 0 % on timeout → **Gate key** (max 1, usable): ends the current era now and starts the next (one use); first use goes to the forest |
| Living tree | interactable, **grabs** | walks in, grabs the chicken in its branches; HP 120 chips; the chicken pecks 2 chips/s on its own; released at 0 HP or 60 s; two trees per forest era | bark: +3 raw per click, 1 chip; **sword** embedded in the second tree of the first forest era (always), later 30 %: 25 clicks, 0 pts, pulls it free → FlyToBag | **Sword** (max 1, usable toggle): cursor becomes a tiny sword, click/swipe splits every chicken hit (Task 303 split), 1 raw per split; up to 1,000 chickens (`SWORD_MAX_CHICKENS`), which merge back slowly (merge rate 0.5 %/s above 300) |

Skin ranking stays hawk 1.25 < eagle 2 < martian 3 = phoenix 3; nothing new multiplies. Buff items are consumed on use, cosmetics persist. Toasted feathers stay unused (open question in the handoff, not here). Five new items total, plus the sword and the Task 313 real-chicken item; `GAME_ITEMS` gains `yarn-ball`, `golden-mane`, `hydra-scale`, `gate-key`, `sword` with SVG art in `item-art.tsx`.

## 3. Orbs and events

| Era | Pool (weights as in pacing §2 unless noted) | Notes |
|---|---|---|
| E0 Fire | Giant 8, Magnet 8, Golden 9, Frenzy 8, x10 5, Cursor x5 6, x25 2 | Giant: 2.5× for 15 s; Magnet: chicken drifts to the cursor 10 s |
| E1 Big cats | Freeze 8, Golden 9, Frenzy 8, x5 8, Cursor x5 6, Cursor x3 4 | no Multiply ≥ x10 (a chase over 60 clones reads as noise) |
| E2–E3 Myth | Chain 8, Golden 9, Frenzy 8, x10 5, x25 2, Mystery 2 | Chain arcs hit hydra/cerberus heads too (1 hit each) |
| E4 Forest | Helper Chick 6, Vacuum 6, Chain 8, x25 3, x100 1, Frenzy 8 | x25/x100 while the sword is equipped seeds the 1,000-chicken moment |

Rules: no orb spawns and frozen orb/buff timers during any grab or hold (kitty, hydra bite, cerberus, tree) and during `pending`; spectacle creatures (tiger, lion, cyclops) do not block orbs but block Multiply spawns while on screen; an orb on screen when a grab starts is hidden and resumes after. Catch-up continues: the pace curve extends linearly after 25,000 at 12 min by `+8,000 per 3 min` (≈ 44 pts/s), the same behind thresholds (0.15 / 0.3 / 0.55), with behind ≥ 0.3 doubling Golden/Frenzy/x10 and halving the gap as today. Goldens (33 s) keep hatching in every era.

## 4. Performance budget

Chicken render tiers, by on-screen count: **≤ 60 DOM** (today); **61–300 canvas sprites** with per-sprite wobble, no filters, no auras, no shadows; **301–1,000 canvas LOD**: one prerendered bitmap per skin × facing at 3 sizes, shared animation clock (4 wobble phases, not per sprite), `drawImage` only, no feathers on split, particles capped at 200 total, merge pressure rising with count. 1,000 `drawImage` calls ≈ 2–3 ms per frame on a 2020 laptop; target ≥ 50 fps. Hit testing by a 64 px spatial grid; a sword swipe tests the segment against the grid, not every chicken. Clicks on the canvas layer resolve to the nearest chicken rect (≥ 56 px effective). Monsters: one `<img>` layer per frame as the birds do, ≤ 6 frames each, long side ≤ 1024 px WebP (~150 KB), hydra heads as separate images mirrored for the other side, max 7 head elements; no filters on monsters, heat shimmer only on the fire form. Profile with the Task 309 harness; e2e perf check: 1,000 chickens for 10 s, dropped frames ≤ 10 %.

## 5. Implementation plan

Each step ships alone behind `?variant=2`, with e2e cases in `e2e/chicken-game-v2.spec.ts` (use `?start=N`), screenshots to `~/Desktop/chicken-game-new-designs/<n>-<step>/`, and its Jev entries in `scripts/jev/strategy.mjs`.

1. **`creature-event.tsx` + `endless-eras.ts`** — generalise `bird-event`: `CreatureSpec { kind, mode: 'grab' | 'miss' | 'spectacle', frames, targets: ClickTarget[], timeline: Phase[], holdMs?, dropId?, dropChance, sounds }`, phases `idle → enter → act → (hold|miss) → leave → done`, shared HUD banner/hint/counter, aura suppression, drop via FlyToBag. `ERA_REGISTRY: EraDef[] { id, from, maxMs, scene, pool, creatures: { kind, atMs }[] }`, era HUD label, scene crossfade, orb pool filter. Ship with E0 (fire sky, Giant + Magnet) and the rotation clock. Tests: era switch by score and by time, pool filter, transition does not block clicks.
2. **Kitty** (first grab creature through the new module; yarn ball + Magnet buff reuse). Tests: hold 4–6 s, clicks shorten, drop lands in the bag.
3. **Tiger + lion** (miss choreography, chicken fly-up path, mane target, golden mane overlay). Tests: order, always miss, 5–10 s exit, never two at once.
4. **Hydra** (multi-head targets, regrow-as-two with cap, hydra scale = Shield; Shield hooks into `talonNeed`). Tests: cap 7, bite hold, Shield halves the next grab.
5. **Cyclops + Cerberus + gate key** (spectacle path, three-head order, era skip). Tests: cyclops has no targets, key skips to the next era.
6. **Canvas render tiers** (independent of the forest; raise the clone cap path to 1,000 with LOD, spatial grid, perf e2e). No visible change below 60.
7. **Living trees + sword** (tree grab, chip HP, sword pull, sword cursor/swipe, 1,000-chicken merge rules). Tests: 25 pulls, swipe splits, merge-back, perf check at 1,000.
8. **Rotation + phoenix 2 + Mystery ???** (variations, half-chance repeat drops, 60 s fire-sky return). Real-chicken mode at 50,000 stays Task 313 (this plan only fires its unlock toast).

**Assets** (`public/game/creatures/`, keyed with `scripts/birds/key.mjs`, drafted on the cheap image model at ≈ $0.067 per frame as the birds were, promoted only when the keyed draft reads photoreal): kitty 5 (walk, stalk, pounce, hold, run), tiger 4, lion 4 + tame sit, cyclops 3, hydra body + 3 head poses = 4, cerberus body + 2 head poses = 3, tree 4 (idle face, grab, chipped, sword tree) + sword 1 ≈ **29 frames; with 1.5× retakes ≈ 45 calls ≈ $3.0, cap $5**. Items are SVG (free). Sounds CC0, recorded in `docs/chicken-sounds-sources.md`; art in `docs/chicken-art-sources.md`.

**Jev entries** (`{ id, priority, note }`, between `grip` and `bag`): `kitty-hold` 4 "kitty holding: keep clicking the chicken, click the kitty every few clicks"; `cat-miss` 8 "tiger/lion/cyclops on screen: ignore it, click the chicken; lion mane 15 clicks if close"; `hydra-head` 4 "hydra: click the head holding the chicken, then the nearest striking head"; `cerberus-head` 4 "cerberus: outer heads 8 clicks each, then the middle"; `tree-bark` 4 "tree grab: click the bark; the sword first if visible (25 clicks)"; `sword` 6 "bag: equip the sword, then swipe through the densest cluster"; `key` 6 "use the gate key when no creature is on screen".

## 6. Open questions for Mannan

1. Cyclops as pure spectacle (the eye blinks but scores nothing), so the mix is 5 interactable / 2 spectacle. OK, or should the eye be a target with a drop?
2. The gate key skips the rest of an era. Fine, or should it only open the forest gate once?
3. Rotation variation is speed + half-chance drops + phoenix 2. Enough for v1 of the endless phase, or do you want creature pairs (tiger + lion together) from the second rotation?

## Decisions (Mannan, 2026-11-03)
- **Images:** "just grab images from google that look good this is a personal project ill figure out copyright later. and or find free open source ones, theres plenty to use". Use free/open-licensed photos first (Wikimedia Commons, Unsplash, Pexels, Pixabay), and web-found images where nothing free fits. Record EVERY image's source URL and license (or "unknown — web") in `docs/chicken-art-sources.md` so Mannan can review copyright later. Cut out backgrounds locally (rembg or keying); AI generation only as a last resort, within the remaining ~$3.75.
- **Cyclops:** spectacle only.
- **Gate key:** opens the enchanted forest once (straight into the forest era with the trees and the sword).
