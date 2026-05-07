# Colored Shadow Penumbra — Three.js Port

**Source:** [Tech Art Fragments — Colored Shadow Penumbra (Chosker, May 2026)](https://chosker.github.io/blog/colored-shadow-penumbra)
**Theory reference:** [Shahriar Shahrabi — Colored Shadow Terminator (Medium)](https://shahriyarshahrabi.medium.com/) (linked from source)
**Original implementation:** UE5 engine shader edit (`SubstrateDeferredLighting.ush` or `DeferredLightPixelShaders.usf`)

## What the effect does

In a UE5 scene with dynamic lights, the penumbra region (the soft transition between lit and fully-shadowed surface) gets a saturated tint pulled from the lit diffuse color. Fully-lit and fully-shadowed pixels are unchanged; only the partial-shadow band is recolored. The visual reads as a warm/saturated edge bleeding into the cool shadow — what painters call the *shadow terminator*.

Math (single-light, per pixel):

```
luminance = dot(diffuse, vec3(0.30, 0.59, 0.11))   // perceptual luma
desat     = vec3(luminance)                          // grayscale of diffuse
penumbra  = mix(desat, diffuse, PenumbraSaturation)  // > 1.0 over-saturates
final     = mix(diffuse, penumbra, 1.0 - shadow)     // shadow ∈ [0,1], 1 = lit
```

`PenumbraSaturation = 4.0` in the source post is "extreme for demonstration"; ~1.5–2.5 is more tasteful.

## Porting to Three.js — feasibility

**Yes, this is achievable** and conceptually a near-direct port, with three caveats:

1. Three.js is forward-renderer (not deferred like UE5), so the patch lives in the **fragment shader of each affected material**, not a single deferred lighting pass. Use `material.onBeforeCompile` to inject GLSL into the `MeshStandardMaterial`/`MeshPhysicalMaterial` shader chain — no fork of three required.
2. Penumbra width comes from **shadow maps**. The renderer must have `shadowMap.enabled = true`, lights must have `castShadow = true` with a meaningful `shadow.radius` (PCF) or `PCFSoftShadowMap`/`VSMShadowMap` type, and meshes need `receiveShadow = true`. With hard shadows (radius 0) there is no penumbra to color.
3. Three.js's `getShadowMask()` returns a multiplicative mask combining **all** shadow-casting lights, not per-light. So the saturation pulled in penumbra is the diffuse contribution *of the whole material*, not isolated per light. For our use cases this is fine; for multi-light scenes where each light should tint its own penumbra differently, you'd need a custom material that loops lights manually.

Our current `narrative-deep-dive.tsx` uses `wireframe` materials and no shadow casting — the effect would be invisible there as-is. To deploy, either (a) drop wireframe and enable shadows on at least one shape + a ground/back plane, or (b) build a fresh subscene that shows it off.

## Spike — drop-in patch for `MeshStandardMaterial`

```ts
// src/lib/colored-penumbra.ts
import * as THREE from 'three';

export interface ColoredPenumbraOptions {
  saturation?: number; // 1.0 = no change, 4.0 = strong (per source)
}

export function applyColoredPenumbra(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  { saturation = 2.0 }: ColoredPenumbraOptions = {},
) {
  const uSat = { value: saturation };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPenumbraSaturation = uSat;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uPenumbraSaturation;`,
    );

    // Inject BEFORE tonemapping/colorspace so we operate in linear light.
    // outgoingLight is already lit (direct + indirect) at this point.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      #ifdef USE_SHADOWMAP
        float _shadowMask = getShadowMask();
        vec3 _lumaW = vec3(0.30, 0.59, 0.11);
        vec3 _desat = vec3(dot(outgoingLight, _lumaW));
        vec3 _penumbra = mix(_desat, outgoingLight, uPenumbraSaturation);
        outgoingLight = mix(outgoingLight, _penumbra, 1.0 - _shadowMask);
      #endif
      #include <opaque_fragment>
      `,
    );
  };

  material.userData.uPenumbraSaturation = uSat;
  material.needsUpdate = true;
  return uSat; // mutate .value at runtime to live-tweak
}
```

Why `<opaque_fragment>` (three r155+): that chunk is where `gl_FragColor = vec4(outgoingLight, diffuseColor.a)` happens. Patching just before it lets us modify `outgoingLight` while still in linear space — tonemap + colorspace conversion happens after `gl_FragColor` is set inside the chunk. For older three (<r152) the analogous insertion point is before `<tonemapping_fragment>` operating on `gl_FragColor.rgb`.

## R3F demo scene (validates the effect)

```tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';
import { applyColoredPenumbra } from '@/lib/colored-penumbra';

function Sphere() {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#d97757' }); // warm
    applyColoredPenumbra(m, { saturation: 2.5 });
    return m;
  }, []);
  return (
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={mat}>
      <sphereGeometry args={[0.5, 64, 64]} />
    </mesh>
  );
}

function Ground() {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#cfd6dd' });
    applyColoredPenumbra(m, { saturation: 2.5 });
    return m;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow material={mat}>
      <planeGeometry args={[10, 10]} />
    </mesh>
  );
}

export default function PenumbraSpike() {
  return (
    <Canvas
      shadows="soft"
      camera={{ position: [2, 1.5, 3], fov: 45 }}
      onCreated={({ gl }) => { gl.shadowMap.type = THREE.PCFSoftShadowMap; }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-bias={-0.0001}
      />
      <Sphere />
      <Ground />
      <OrbitControls />
    </Canvas>
  );
}
```

Expected result: as the sphere's terminator falls across the ground plane, the soft-shadow band picks up a warm tint pulled from the lit diffuse. Set `saturation: 1.0` to disable for A/B comparison.

## Caveats / known limits

- **Hard shadows kill the effect.** `BasicShadowMap` produces a 0/1 mask with no transition band. Use `PCFSoftShadowMap` minimum.
- **Wide penumbras only.** The source post warns: *"It needs wide penumbras for the effect to be visible."* Crank `shadow-radius` (PCF) or use VSM.
- **Gray/fully-saturated surfaces show nothing.** No chroma to amplify.
- **`getShadowMask()` is the union mask.** Multi-light scenes lose per-light tinting. For our portfolio that's a non-issue.
- **No effect on materials that don't receive shadows** (e.g. wireframes, points, sprites). The current `narrative-deep-dive` falls in this bucket.
- **Colorspace.** Patch must run before tonemap+sRGB conversion or the saturation math is wrong. The injection point above is correct for three r155+.

## Recommendation

Worth shipping as a **subtle accent** (saturation 1.5–2.0) on a future scene that already uses shadow casting — e.g. a hero with a soft directional key light. Not worth retrofitting `narrative-deep-dive` since it's intentionally flat/wireframe. Park the `colored-penumbra.ts` helper in `src/lib/` once we have a target scene; until then, keep it documented here.

## License / attribution

Effect concept and UE5 reference implementation © Chosker, May 2026. Three.js port written for this repo, MIT-compatible.
