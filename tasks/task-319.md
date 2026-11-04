### Task 319: Chicken Game v2 — Greek monsters: Cyclops, Hydra, Cerberus (endless phase)

Mannan (2026-11-03, verbatim):
> "lets also add a cyclops and greek monsters into the mix. a hydra (multiple heads) and also a cerberus monster. get photo realistic images from google or generate via ai and use those"

- [ ] **Art sourcing:** images found on Google are usually copyrighted, so they can't ship on mannan.is unless the license allows it. Use **AI-generated photoreal renders** (OpenRouter, the green-screen keying from `scripts/birds/key.mjs`), or licensed photos/CC artwork from Wikimedia Commons with attribution recorded in `docs/chicken-art-sources.md`. Draft on the cheap model first; frugal budget.
- [ ] **Cyclops:** a giant one-eyed figure looms from the edge or background, peers at the chicken with its single huge eye, and swats or grabs at it (design: grab-and-escape like the birds, or a near-miss like the tiger/lion; a click target on the eye?).
- [ ] **Hydra:** a multi-headed serpent; heads strike at the chicken independently. Clicking a head knocks it back; true to the myth, a cut head can regrow as two (cap it), so the player must be quick.
- [ ] **Cerberus:** a three-headed hound guarding a gate; it snaps and chases. Each head is a separate click target.
- [ ] Reuse the `animal-event` / `bird-event` patterns (spec registry, enter/act/leave timeline, HUD safe zone, aura suppression, claw-like click targets with ≥56px hit areas and anchored hints), and register them as endless-phase eras (a "Myth" era) in `docs/chicken-orb-pacing.md`.
- [ ] Sounds (licensed/CC0 or synthesized; record sources); Jev strategy entries; e2e cases; screenshots to `~/Desktop/chicken-game-new-designs/13-greek-monsters/`; performance per Task 309.
- Location: `src/components/game/` (new monster modules), `public/game/monsters/`, `docs/chicken-orb-pacing.md`, `docs/chicken-art-sources.md`
