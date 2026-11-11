### Task 326: Chicken v3 — pets: birds and conquered animals, fusion, focused targeting, key 0

Mannan's ask (2026-11-10), quoted: "instead of the feathers for the hawk and birds, just have the hawk and phoenix get added to our inventory as a helper, that we can then cycle through and use at the bottom. when we use them have them fly out and like 'scratch' the chicken, giving us points, smaller, more like a steady fly or buzzing bird kind of thing and show a +x point count for them at each hit over their header when they are live then bring them back to rest for the same cadence as jev and the other pets. when we have 2 birds, let us click and hold and drag the bird from the bottom … onto another bird, and when that's done, show the sort of pokemon question mark silhouette with let go to fuse and then provide a fused bird that is significantly faster like 5-10x faster and gives more points. also have the other animals we conquer also become our pets. the birds and those other animals will only attack up to 3-5x the chickens … always attacking the highest value chicken first. same for the monkey and jev … if that chicken is already being attacked by another pet … cycle to those and then return to the main one after. have also a key action now '0' to tell all our pets to attack at once"

- [ ] Beating the hawk / phoenix grants the bird itself as a pet (no feathers)
- [ ] Bird pets rest at the bottom with the others (20s cooldown like Jev); using one: small bird buzzes around and scratches the chicken; "+N" over its head per hit
- [ ] Pets bar: cycle through owned pets at the bottom
- [ ] Two birds: press-hold-drag one onto the other (not on cooldown) → an original "?" silhouette with "Let go to fuse" → fused bird, 5-10x faster, more points
- [ ] Conquered animals (tamed kitty/lion/tiger, beaten hydra/cerberus/cyclops) become pets
- [ ] Targeting for all pets (incl. Jev, monkey): 3-5 chickens max, highest-value first; spread so pets don't pile on one chicken, then return to the main one
- [ ] Key 0: all pets attack at once
- Location: `src/components/game/`
- [ ] Face mask mode ("occasional face mask mode where the main chicken pretends to fit in and sometimes it does, but sometimes it's obvious because it's wearing a black eye mask"): now and then the main chicken hides among lookalike chickens; sometimes it blends in, sometimes it wears a black eye mask that gives it away. Build on the teleport decoys
- [ ] Enchanted forest ("for the tree scene draw steady movement of the background trees and occasional sense of as though they're alive though they aren't"): steady sway of the background trees plus rare eerie living moments (a slow lean, a breath). Keep it composited (transform only), per Fable's perf findings
