### Task 315: Chicken Game v2 — more orbs (ideas to pick from)

Mannan (2026-11-03): "yes and we can bring in more orbs. do we have other fun orb ideas we can introduce too?"
Context: Task 314's pacing work adds catch-up orbs (behind the ~25-min pace curve) and a new "Frenzy x2" orb. These are candidates for the same rainbow-orb system (41px, cursive label, 30s life, one at a time). All effects photoreal per the art direction; all numbers as constants in `chicken-orbs.ts` / `chicken-pacing.ts`.

Easier to hit (good catch-up picks)
- [ ] **Slow-mo** — chicken (and clones) move at 30% speed for 12s; subtle time-warp shimmer.
- [ ] **Giant** — chicken grows 2.5x for 15s (bigger target, louder screams).
- [ ] **Magnet** — chicken drifts toward the cursor for 10s instead of fleeing it.
- [ ] **Freeze** — chicken frozen in a photoreal ice block for 8s; every click cracks it, last crack bursts for +50.

More points per click
- [ ] **Chain Lightning** — each click arcs (reusing the lightning visuals) to every chicken/clone within 200px, each scoring.
- [ ] **Golden Eggs** — chicken lays golden eggs for 15s; each egg click +25 (eggs roll on the ground, vanish after 6s).
- [ ] **Helper Chick** — a kid chick hops on and auto-squeezes the chicken 2x/s for 20s.
- [ ] **Combo** — a visible beat; clicks on the beat count x3 for 15s.

Event helpers
- [ ] **Shield** — the next bird's grab needs half the talon taps.
- [ ] **Feather Storm** — a burst of falling feathers for 10s, each click +5 (and one rare bird feather).
- [ ] **Vacuum** — pulls every chicken/clone to the center for 6s for a mass-click (pairs with Multiply).

Surprise
- [x] **Mystery ???** — a random effect from the list above (ties into the "???" codes idea in Task 313). Shipped with the endless rotation (lap 2+ pools): weighted pick over the existing orb effects, never the previous one, with a "??? → effect" reveal pill; dev scene `?start=mystery`.
- [x] **Cyborg Face / Jev helper** — Mannan (2026-11-04): "a robotic face of this picture... or just a little bit of its eye like a transformer... its face and skin look like a hybrid... otherwise it's the same person and draw a 3d version of this person in the orb." A 3D head of the person in Mannan's reference photo (short spiky brown hair, black collared shirt) sits inside the orb. Part of the face is torn back to show a metal eye socket with a glowing eye and machinery under the skin; the rest stays human and recognisably the same person. The second reference is a painted half-cyborg portrait: match that look on the person. Mannan's call (2026-11-04): parody, use the photo's likeness. Built as a 96px orb from 3,000 points: collecting plays "my name jeff" and asks to activate Jev at the orb; he rises slowly bottom right (1/9 height, 1/7 width), his arm tracks the chicken and squeezes, a red crosshair tagged jev clicks 40 times a second for 30s under a countdown, then he sleeps into the bag and can be reactivated after 5 minutes. Later: a Jev top off credits item.

Rollout
- [ ] Pick 3–4 to build first (suggested: Slow-mo, Giant, Chain Lightning, Golden Eggs), wire them into the catch-up picker by how far behind the player is, add e2e cases and Jev strategy entries (collect immediately), screenshot each.
- Location: `src/components/game/chicken-orbs.ts`, `src/components/game/chicken-pacing.ts`, `src/components/game/chicken-game-v2.tsx`, `scripts/jev/strategy.mjs`, `e2e/chicken-game-v2.spec.ts`
