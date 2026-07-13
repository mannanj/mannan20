# Garden Product Showcase Design

## Goal

Make Products the first category shown at `/garden` and introduce a new default Showcase view inspired by OpenSoftware's warm, sparse product browser. Preserve the existing WebGL Globe and current card grid, renaming the latter to Legacy view.

## Approved experience

The Garden still exposes `Writings`, `Products`, and `Readings` as its primary category navigation. `/garden` opens with Products selected and the new Showcase active. Moving away from Products and returning to it resets the product presentation to Showcase.

Showcase uses a responsive collection rather than OpenSoftware's single-product composition because Garden contains eight visible products. It renders four columns on wide desktop, two on tablet, and one on narrow mobile. The first three products appear as the primary collection; the remaining products wrap below a `TOOLS` subheading. The visual language follows the reference: a warm near-black field, restrained warm glow, serif product names, muted sans-serif descriptions, subtle borders, and clay/coral accents.

Each product appears as a spacious visual tile using the existing product artwork. Hover or keyboard focus reveals or strengthens its name and description. Selecting a tile opens an OpenSoftware-style detail sheet: a fixed right sheet on desktop and a bottom sheet on mobile. The sheet contains the product description, a short feature list, platform, year/status, source when public, and actions.

## Product actions

Action metadata is centralized in `src/lib/garden-products.ts` rather than embedded in presentation components.

- Products with public repositories use `View Source` as the primary action and `Explore [Product]` as the secondary action.
- Poppy uses its direct macOS download as `Download Poppy`, with `Explore Poppy` as the secondary action.
- Products without public code or a direct download use `Explore [Product]`.
- External destinations open in a new tab with safe link attributes.

Known public sources are Sun Signal, Event Every, SkillGuard, and claude-cues. The canonical claude-cues repository is `mannanj/beep-boop`. Poppy's direct download is `https://getpoppy.io/download`.

## Three product views

Product presentation is represented by one explicit state: `showcase | globe | legacy`. No additional boolean is added to the current `globeOpen`, `listHidden`, and transition flags; the existing transitions are adapted around the explicit state.

A fixed left view rail contains icons for inactive views only:

- Showcase active: show Globe and Legacy icons.
- Globe active: show Showcase and Legacy icons.
- Legacy active: show Showcase and Globe icons.

Every control has an accessible label and tooltip. The existing grid/list icon and labels are renamed to Legacy view. The Showcase gets a distinct collection/panel icon. The globe keeps its current globe icon. If WebGL is unavailable or fails, the UI returns to Showcase.

## Navigation and state

The existing category hashes remain compatible: `#writings`, `#products`, `#readings`, and `#episodes`. A bare `/garden` and `#products` both resolve to Products + Showcase. Writings and Readings keep their existing panels and transition behavior. The Garden page portrait, decorative plants, and existing category content remain in place.

## Detail behavior

The desktop sheet follows the reference's proportions: inset from the viewport edges, rounded border, warm card surface, dimmed backdrop, structured metadata rows, and a fixed action area. On mobile it becomes a bottom sheet with safe-area spacing and a drag-handle treatment. The sheet closes via its close control, Escape, or backdrop selection. Focus moves into the sheet on open and returns to the selected product on close. Reduced-motion preferences remove large sheet and view transitions.

## Responsive and accessibility requirements

- Four product columns at wide desktop, two at tablet, one on narrow mobile.
- Category tabs remain usable above the collection at every breakpoint.
- View controls stay reachable without obscuring the collection or mobile safe areas.
- Tiles are real buttons or links with visible keyboard focus.
- The detail surface uses dialog semantics and descriptive labels.
- Images retain useful alt text and responsive sizes.
- Existing WebGL fallback behavior remains functional.

## Verification

Add coverage for the new default (`/garden` renders Products + Showcase), four-column responsive class/layout, product grouping, product sheet content/actions, and all Showcase/Globe/Legacy transitions. Update existing Globe tests and labels from list/grid terminology to Legacy. Run focused unit/e2e tests, TypeScript checking, and a production build. Visually inspect desktop and mobile against the supplied OpenSoftware references.

## Scope boundaries

This change adapts the referenced product-browser section; it does not clone OpenSoftware's branding, footer, company links, 3D June asset, theme picker, or site-wide identity. Existing Garden Writings and Readings content is not redesigned.
