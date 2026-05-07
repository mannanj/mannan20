### Task 202: Research — Colored Shadow Penumbra port to Three.js
- [x] Read source post (Chosker, Tech Art Fragments, May 2026) and reference theory (Shahrabi)
- [x] Map UE5 deferred-shader patch onto three.js forward-renderer pipeline
- [x] Write spike (`applyColoredPenumbra` helper + R3F demo scene) using `MeshStandardMaterial.onBeforeCompile` + `<opaque_fragment>` chunk injection
- [x] Identify caveats: requires `PCFSoftShadowMap`, `castShadow`/`receiveShadow`, wide `shadow-radius`; current `narrative-deep-dive` is wireframe + no shadows so effect won't apply as-is
- [x] Document feasibility, code, and recommendation in `docs/colored-shadow-penumbra.md`
- [x] Link source: https://chosker.github.io/blog/colored-shadow-penumbra
- Location: `docs/colored-shadow-penumbra.md`

**TL;DR:** Feasible as a near-direct port via `onBeforeCompile` shader injection — no fork of three needed. Effect only shows on materials that actually receive soft shadows, so don't bolt it onto `narrative-deep-dive` (wireframe). Park the helper in `src/lib/` when a target scene with shadow casting exists. See `docs/colored-shadow-penumbra.md` for full writeup, drop-in code, and caveats.

[Task-202]
