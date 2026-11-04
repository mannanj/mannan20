### Task 318: Chicken Game v2 — Big cats: kitty, tiger, lion (endless phase)

Mannan (2026-11-03, verbatim):
> "lets add also a cat/kitty that shows up later and tries to grab the chicken and fights with the chicken. maybe it holds and grabs the chicken for a little while. photorealistic cat. and also after that cat appeared it will just run away after a moment. then bring in tiger and lion one by one also playing with the chicken, trying to catch the chicken but ensure the chicken flies up and away from both. the tiger and lion just come in and try and fail, after a few seconds like 5-10s they leave"

- [ ] **Kitty (first):** a photoreal house cat walks in later in the game (an endless-phase era, after the phoenix; threshold/era as a constant). It stalks, pounces and grabs the chicken, and they tussle briefly (paws batting, chicken flapping and pecking, feathers flying). It holds the chicken for a short while (~4–6s, constant), then lets go and runs off the screen. Clicks during the hold score normally (the chicken is still squeezable) and maybe nudge the cat to let go sooner (decide in design).
- [ ] **Tiger (after the kitty), then the lion (after the tiger)**, one at a time, never together: each enters, plays with and chases the chicken, swipes and pounces, but **always misses**. The chicken flies up and away out of reach every time. Each leaves after **5–10 seconds** (constant range).
- [ ] **Photoreal** animals (AI-generated, green-screen keyed like the birds; pose sets: walk, stalk, pounce or swipe, sit/hold for the cat, run away). Frugal image budget: draft on the cheap model first.
- [ ] Reuse the bird-event patterns (spec registry, enter/act/leave timeline, HUD safe zone, aura suppression during the hold) as an `animal-event` module; register the events in the endless-phase era registry (`docs/chicken-orb-pacing.md`).
- [ ] Sounds: cat meow and hiss, tiger and lion growl and roar (licensed/CC0; record sources).
- [ ] Jev strategy: during the cat hold, keep clicking the chicken; ignore the tiger and lion (just keep clicking the chicken).
- [ ] Screenshots of each beat to `~/Desktop/chicken-game-new-designs/12-big-cats/`; e2e cases for order (cat → tiger → lion), the hold duration, the tiger and lion always missing, and the 5–10s exits.
- Location: new `src/components/game/animal-event.tsx`, `chicken-game-v2.tsx`, `public/game/animals/`, `docs/chicken-orb-pacing.md`
