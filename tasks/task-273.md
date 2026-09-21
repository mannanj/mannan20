### Task 273: OpenSoftware-style detail overlay for regular Garden product cards

Replace the regular Garden product grid's direct external links with an internal
product-detail overlay. Match the supplied OpenSoftware/June mockup precisely and
keep the design restrained: do not add extra controls, labels, decorative chrome,
or other superfluous elements.

#### Scope

- [ ] Apply this interaction only to the regular product cards in the Garden
      Products panel.
- [ ] Leave the globe/3D products gallery unchanged.
- [ ] Build the detail experience fresh from the current code. Do not reuse or
      consult the reverted/poisoned OpenSoftware implementation in Git history.
- [ ] Use one reusable detail overlay driven by product metadata.

#### Layout and visual behavior

- [ ] Clicking a regular product card opens a full-viewport internal overlay.
- [ ] Animate the selected product image/artwork from its card into a large stage
      on the left side of the viewport.
- [ ] Place the product details in a tall, rounded card on the right, matching the
      supplied reference's proportions, spacing, near-black/brown palette,
      typography, subtle border, dividers, and bottom-anchored actions.
- [ ] Keep the visible content limited to the reference structure: product name,
      tagline, description, features, Platform, Source, Status, and applicable
      actions.
- [ ] Do not duplicate the product artwork inside the detail view.
- [ ] On narrow screens, collapse the same composition vertically without adding
      new UI or allowing horizontal overflow.

#### Metadata

- [ ] Extend the canonical Garden product data with the detail fields required by
      the overlay: tagline, longer description, features, platform, source URL,
      status, artwork, and optional download URL.
- [ ] Research each product's official site when implementation begins to obtain
      factual metadata and the correct direct download/store link.
- [ ] In the Source row, show a GitHub icon and linked repository name when a
      public source URL exists.
- [ ] When no public source URL exists, show exactly `Closed` in the Source row.
- [ ] Show `Active` or `Retired` in the Status row as appropriate.

#### Actions

- [ ] Show `Download <Product>` only when an official direct download or app-store
      destination is available. Use that corresponding official link.
- [ ] Show `Explore <Product> →` for every product.
- [ ] Activating Explore opens the product's official site in a new tab/window and
      closes the detail overlay in the existing mannan.is window.
- [ ] Download links open their official destination safely in a new tab/window.

#### Interaction and accessibility

- [ ] Escape closes the overlay.
- [ ] Clicking outside the right-hand detail card closes the overlay.
- [ ] Trap keyboard focus within the open overlay, restore focus to the selected
      card on close, lock background scrolling, and respect reduced-motion
      preferences.
- [ ] Use accessible dialog semantics and clear labels without adding visible UI
      that is absent from the reference.

#### Verification

- [ ] Add focused browser tests covering regular-card opening, unchanged globe
      gallery behavior, artwork movement/no duplication, conditional download
      actions, Source fallback to `Closed`, Explore new-tab behavior plus local
      overlay closure, keyboard closing, focus restoration, mobile containment,
      and reduced motion.
- [ ] Compare desktop and mobile screenshots directly against the supplied mockup.
- [ ] Run type checking, focused tests, the production build, and `git diff --check`.

- Location: `src/components/garden/garden-explorer.tsx`, a new focused product
  detail component under `src/components/garden/`, `src/lib/garden-products.ts`,
  `src/app/globals.css`, and Garden product E2E tests.

[Task-273]
