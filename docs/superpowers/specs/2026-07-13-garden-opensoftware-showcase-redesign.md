# Garden OpenSoftware Showcase Redesign

## Goal

Replace the noisy card-catalog Showcase with a sparse OpenSoftware-faithful product browser while preserving Garden's Globe and Legacy views.

## Approved composition

Showcase is a static warm-black surface with a restrained brown ambient glow. It reuses the Globe HUD's exact top-left Home treatment, centered Writings / Products / Readings category pill, and left-side inactive view controls. Showcase does not render the Globe's space field, orbit/panning behavior, filter, Let's Talk, zoom, or sound controls.

There is no hero headline. The centered category pill is the top focal element and the products begin shortly below it. A subtle bottom-right attribution links to OpenSoftware.

## Product layout

Visible products retain canonical ordering and grouping. The first three products render in one three-column row. A serif `Tools` heading separates the remaining products, which render three per row. Tablet uses two columns and mobile uses one.

Each tile is an open, borderless composition rather than a conventional card. Artwork sits inside a large fixed-ratio media field with restrained rounding and no metadata chrome. The product name and short description appear beneath the artwork on hover or keyboard focus, following OpenSoftware's June treatment. Touch and reduced-motion environments keep the labels visible so content is discoverable.

Selecting a product continues to open the existing accessible detail sheet with canonical actions. The sheet remains viewport-bound and blocks the underlying view controls.

## Responsive and interaction requirements

- Three columns on desktop, two on tablet, one on mobile.
- The Globe-style category pill and Home control keep their existing HUD positions.
- The left rail keeps the existing inactive-only Showcase/Globe/Legacy behavior.
- Hover motion is subtle vertical reveal/fade, with no 3D orbit or free panning.
- Category navigation, hashes, focus restoration, Escape/backdrop close, safe external links, WebGL fallback, and reduced-motion behavior remain intact.

## Verification

Update browser coverage for HUD reuse, removed Showcase-only controls, three-column grouping, Tools heading, hover/focus labels, attribution, and existing view transitions. Run unit tests, typecheck, Garden e2e tests, production build, and desktop/mobile visual comparison against the supplied OpenSoftware screenshots.
