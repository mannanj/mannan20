### Task 319: Chicken Game v2 — Greek monsters: Cyclops, Hydra, Cerberus (endless phase)

Mannan (2026-11-03, verbatim):
> "lets also add a cyclops and greek monsters into the mix. a hydra (multiple heads) and also a cerberus monster. get photo realistic images from google or generate via ai and use those"

- [x] **Art sourcing:** images found on Google are usually copyrighted, so they can't ship on mannan.is unless the license allows it. Use **AI-generated photoreal renders** (OpenRouter, the green-screen keying from `scripts/birds/key.mjs`), or licensed photos/CC artwork from Wikimedia Commons with attribution recorded in `docs/chicken-art-sources.md`. Draft on the cheap model first; frugal budget.
- [x] **Cyclops:** a giant one-eyed figure looms from the edge or background, peers at the chicken with its single huge eye, and swats or grabs at it (design: grab-and-escape like the birds, or a near-miss like the tiger/lion; a click target on the eye?).
- [x] **Hydra:** a multi-headed serpent; heads strike at the chicken independently. Clicking a head knocks it back; true to the myth, a cut head can regrow as two (cap it), so the player must be quick.
- [x] **Cerberus:** a three-headed hound guarding a gate; it snaps and chases. Each head is a separate click target.
- [x] Reuse the `animal-event` / `bird-event` patterns (spec registry, enter/act/leave timeline, HUD safe zone, aura suppression, claw-like click targets with ≥56px hit areas and anchored hints), and register them as endless-phase eras (a "Myth" era) in `docs/chicken-orb-pacing.md`.
- [x] Sounds (licensed/CC0 or synthesized; record sources); Jev strategy entries; e2e cases; screenshots to `~/Desktop/chicken-game-new-designs/13-greek-monsters/`; performance per Task 309.
- Location: `src/components/game/` (new monster modules), `public/game/monsters/`, `docs/chicken-orb-pacing.md`, `docs/chicken-art-sources.md`

#### Addendum — drops (Mannan, verbatim)
> "let some of them drop interesting items on click and interaction, not all of them will be interactable"
- [x] Mix of interactable and non-interactable creatures: some are clickable and can drop interesting items into the bag (shown with FlyToBag), others are pure spectacle (no click targets). Decide per creature in the endless-phase design (`docs/chicken-orb-pacing.md` registry): drop chance, the item, and its use (e.g. a buff, skin, cosmetic, or a key for a later event). Items should be fun and useful, not clutter.

- Endless-phase placement, drops, orb pools and build order: `docs/chicken-endless-phase.md`.

#### Shipped (2026-11-04)
- Eras `myth-1` (41k: cyclops spectacle at +0:20, hydra at +1:30), `myth-2` (49k: cerberus at +0:30, real-chicken toast at 50k) and the `forest` placeholder slot (57k) in `endless-eras.ts`; creatures in `creature-event.tsx`; scenes in `endless-scenery.tsx`; dev scenes `myth`, `cyclops`, `hydra`, `cerberus`.
- Drops: Hydra scale (50 %, Shield: next bird grab needs half the claw taps) and Gate key (100 %, jumps to the forest era once).
- Screenshots: `~/Desktop/chicken-game-new-designs/14-myth/` (two rounds, desktop + mobile). Sources: `docs/chicken-art-sources.md`.
