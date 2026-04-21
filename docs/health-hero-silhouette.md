# Health-hero silhouette — pose options

## Current (v2): Doryphoros (Spear-Bearer) by Polykleitos
Classical contrapposto figure — weight on the right leg (viewer's left),
left leg relaxed with foot placed back. Right arm hangs naturally at the
side; left arm bends at the elbow so the hand grips a spear low near the
hip. Spear shaft angles up-and-inward past the left shoulder, ending in
a leaf-shaped blade above the head.

Why this pose: Doryphoros is the literal canonical definition of the
"ideal healthy human form" — Polykleitos wrote the *Kanon* around this
sculpture. Reads instantly as classical human, and the contrapposto +
vertical spear gives a stable silhouette that stays legible under the
scene's Y-axis rotation.

Authored as inline SVG in `scripts/build-human-msdf.mjs`, rasterized →
Euclidean distance transform → packed into `public/human-msdf.png`.
Mirrored to `public/human-silhouette.svg` for reference.

## v1 (archived): painter with raised arm + brush
Standing figure with the right arm raised ~40° above horizontal holding
a flared-bristle paintbrush. Replaced because the asymmetric raised arm
disappeared in profile under scene rotation and the brush read as a
prop rather than a universal symbol.

## Fallback (v3 if needed): T-pose / both arms extended
If the Doryphoros' bent left arm + diagonal spear still don't rotate
cleanly in the shader, fall back to a symmetric figure with both arms
extended horizontally. Symmetry makes it readable from every angle.

To switch pose: edit the SVG inside `scripts/build-human-msdf.mjs`,
run `node scripts/build-human-msdf.mjs` to regenerate the MSDF PNG and
mirror SVG, then restart the dev server.
