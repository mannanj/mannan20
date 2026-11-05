### Task 321: Chicken Game v2 — faster progression, stacking skins, helpers

Mannan's pacing pass (2026-11-04). All values live in `escape-stages.ts`, `chicken-orbs.ts`, `chicken-pacing.ts`, `endless-eras.ts` and `chicken-skins.ts`.

- [x] Evolution follows clicks (30, 64, 100, 140, 190) in any scene and drops one form per 3s without a click
- [x] Stages: surf 125, plane 200, rocket 350, Moon 400, cosmos 1,000 (forced by 1,100), Jupiter 1,500, phoenix 2,000
- [x] Eras: fire 2,000, big cats 8,000, jungle 14,000, myth 20,000, gate 26,000, forest 32,000, laps from 38,000; 75s to 120s each
- [x] Small hawk cameo at 200, helmeted hawk grab at 500, eagle cameo at 600 and grab 4s after the hawk is gone
- [x] Skins and mythic items add up: hawk 2.5, eagle 5, martian 10, phoenix 15, golden mane 20, hydra scale 30, gate key 40, sword 50
- [x] Clones ride the same vehicle; a click counts every chicken under it
- [x] Cursor 50% bigger with a 15px hit pad, squeezing fist on press, cursor orbs from 100 and 250
- [x] Travel 40% slower; the chicken pauses less while being clicked
- [x] Jungle monkey: grab it, use it from the bag, darts for 30s, 45s rest; Jev and the monkey use cursor power-ups
- [x] Leaderboard: control on the sheet's top edge, Submit inside the inputs, email input in place of the link
- [x] Collectable laser, ray gun and freeze gun; ice block with crack, heat and burst; guns drag to helpers for 15s, 5 minute cooldown
- [x] Score commas, "Squeeze the chicken" hides after 100 squeezes, Martians 0.4x to 4x, leaderboard limit raised
- Location: `src/components/game/`, `src/components/inventory/`, `scripts/birds/`
