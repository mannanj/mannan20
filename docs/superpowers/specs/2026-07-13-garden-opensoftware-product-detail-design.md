# Garden OpenSoftware Product Detail Design

## Goal

Keep the current Garden product collection, but make product selection reproduce
OpenSoftware's product-detail interaction: the selected card's existing artwork
expands into the left side of a viewport-filling frame while a quiet information
panel enters on the right.

The supplied OpenSoftware screenshots are the visual specification. The
implementation must copy their composition, spacing, typography hierarchy,
panel proportions, and responsive behavior instead of creatively reinterpreting
them.

## Collection changes

- Preserve the current Products and Tools groups, card grid, images, ordering,
  retired state, and click behavior.
- Remove the platform/action footer from every card, including `WEB`, `MACOS`,
  the horizontal rule, and the arrow.
- Restore the collection copy to the earlier Garden typography: inherited
  restrained sans-serif for product names, descriptions, badges, and section
  headings. Do not force EB Garamond display type onto the collection cards.
- Tighten the card text block after removing the footer so cards do not retain
  artificial empty height.

## Open detail interaction

Selecting a product opens an in-place, viewport-bound split frame over the
collection.

- The selected card's existing artwork is the only product image in the open
  state. It visually grows and moves into the left pane; the right pane must not
  render a second copy of the image.
- The left pane is a quiet artwork field sized and positioned like
  OpenSoftware's June presentation. Product screenshots use a contained
  treatment that preserves their full composition rather than arbitrary crop.
- The right pane follows the OpenSoftware panel: product title and short
  descriptor at top, a concise description, feature rows, metadata rows, status,
  and primary/secondary actions anchored at the bottom.
- Remove the generic `PRODUCT DETAILS` header bar. Keep only a restrained close
  control in the panel's top-right corner.
- Reuse canonical Garden product data and existing action URLs. Do not invent
  copy, metadata, icons, or actions that are absent from the registry.
- The surrounding collection dims but remains spatially legible behind the
  frame.

## Motion

- Opening uses a shared-element-style transition: the clicked artwork expands
  from its card bounds into the left pane while the details pane fades/slides in
  from the right.
- Closing reverses the motion toward the originating card before restoring its
  focus.
- Motion is restrained and uses one coordinated easing curve. There is no card
  flipping, spring overshoot, parallax, or decorative animation.
- Reduced-motion users receive an immediate opacity transition with no spatial
  travel.

## Responsive behavior

- Desktop and large tablet use the OpenSoftware split frame: artwork left,
  details right.
- Narrow screens follow the reference's responsive detail treatment rather than
  preserving the current bottom sheet. The content remains one coherent product
  frame, with no duplicate image and with actions reachable without horizontal
  overflow.
- The dialog remains within the visual viewport and safe-area insets. Content
  scrolls inside the details region when necessary.

## Accessibility and behavior

- Preserve dialog semantics, Escape close, backdrop close, focus trap, and focus
  restoration to the selected product.
- Keep external-link safety attributes and canonical action ordering.
- The open frame must cover the underlying Globe and Legacy view controls.
- The close control and all actions retain visible keyboard focus states.

## Verification

- Browser tests cover footer removal, absence of duplicate detail media,
  desktop split geometry, responsive geometry, bounded scrolling, focus trap,
  Escape/backdrop close, focus restoration, action URLs, external-link safety,
  control layering, and reduced motion.
- Capture desktop and mobile screenshots for direct comparison with the supplied
  OpenSoftware references before commit or deployment.
- Do not ship until the screenshots show the selected artwork occupying the left
  pane and the information panel occupying the right pane without duplicated
  media.
