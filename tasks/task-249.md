### Task 249: Phantom-style spherical Products gallery

**Status: IMPLEMENTED. All 11 sections built, verified in-browser, and covered by an E2E suite
(`e2e/products-gallery.spec.ts`, 14 specs) plus a unit test. See the Implementation notes at the
bottom for the design decisions that resolved the open questions.**

Recreate the [phantom.land](https://www.phantom.land) homepage experience — a gallery that lives
on the *inside of a sphere*, which you orbit by dragging — and make it the new presentation for
Mannan's **Products**. Today Products is one tab inside the Garden Explorer at `/garden`
(`Writings · Products · Readings`, `src/components/garden/garden-explorer.tsx`), rendering a flat
3-column grid of product cards. This task replaces *that experience* (when Products is active)
with the immersive spherical gallery and its surrounding chrome. The reference is phantom.land;
attribution is required (see §10).

---

#### 1. Entry trigger & black-hole transition
- [x] Selecting **Products** (via the top selector, a `#products` hash, or a direct link) kicks
      off a cinematic transition: the view is pulled into the epicenter of what reads as a
      **black hole**, zooming further in until it breaks through to reveal the spherical product
      gallery canvas on the other side.
- [x] The transition is the *entrance* to the gallery — leaving Products (selecting another
      category) should feel like a coherent exit, not a hard cut.
- [x] The non-Products categories (Writings, Readings) keep their existing flat presentation;
      only Products gets the immersive treatment.

#### 2. The spherical gallery (PRIMARY FOCUS — get this right)
- [x] Product cards are arranged across the **interior surface of a sphere**; the viewer sits at
      the sphere's center looking outward at the gallery, exactly like phantom.land.
- [x] **Left-click + drag** orbits the view around the inside of the sphere in any direction.
- [x] Dragging carries **smooth, eased, inertial momentum** (Lenis-style smooth-scroll feel) —
      it glides to rest after release, never snaps or stops abruptly.
- [x] Cards are legible and oriented toward the viewer enough to read/recognize; the curvature
      and density should visually echo the reference screenshot.
- [x] Existing product content drives the gallery — each visible product is a real product from
      `src/lib/garden-products.ts` (title, description, link, retired/hidden flags honored:
      hidden stays out, retired may still appear but read as retired). Use real image assets;
      any placeholder imagery is acceptable where a product lacks art, styled to match.
- [x] Match phantom.land's look as closely as practical: dark backdrop, floating cards, subtle
      ambient motion, the small metadata/label treatments around cards.

#### 3. Card → detail page
- [x] Clicking/tapping a card animates a **new page/view in** for that product.
- [x] That destination only needs to be a **basic template** (title + minimal scaffold) — it is
      explicitly NOT the focus. The gallery is the focus.
- [x] There must be a clear way back to the gallery.

#### 4. Top selector + filter (replaces the current tabs while in this experience)
- [x] While in the Products experience, the category tabs become a **phantom-style pill selector
      at the top-center** — a rounded segmented control with the active segment highlighted
      (phantom's `Work / About / Careers` pill is the visual model; Mannan's segments are the
      Garden categories, e.g. `Writings / Products / Readings`).
- [x] **Filter** becomes an **icon** sitting **inline next to** that selector (phantom shows a
      `FILTER` control near the top; here it collapses to an icon adjacent to the pill).
- [x] Filter lets the viewer narrow which products show in the sphere (at minimum the existing
      groupings — e.g. all vs. tools vs. retired). Exact filter facets are open (see §11).

#### 5. Floating home avatar (replaces phantom's ghost)
- [x] Phantom puts its ghost logo at the **top-left**; here put **Mannan's profile photo icon**
      (`/mannan.jpg`, already used as the home avatar) floating in that spot.
- [x] Tapping it **returns to home** (`/`).
- [x] It should feel like it's floating in the scene, consistent with the immersive style.

#### 6. Left-side grid/menu icon
- [x] Replicate phantom's **left-side control** — the rounded 2×2 grid / menu icon
      (per the provided phantom screenshot) — on the **left** of the gallery.
- [x] It should offer an alternate way to view/browse the gallery contents (e.g. a grid/list
      view of the same products). Exact behavior of the alternate view is open (see §11).

#### 7. Sound toggle (right side)
- [x] Add a **sound button on the right** (phantom's `SOUND [ON/OFF]` control is the model).
- [x] It toggles ambient/interaction audio for the experience and clearly shows on/off state.
- [x] Default state should respect a quiet-by-default sensibility (no autoplay blast).

#### 8. "Let's Talk" (top-right) → gated contact overlay
- [x] A **LET'S TALK** button at the **top-right** (phantom's model).
- [x] Clicking it opens a **full-screen black glass overlay that animates in** (matching
      phantom's "Welcome! It's great to meet you." overlay: dark translucent glass over the
      blurred gallery, a close `×`, a heading, and a set of option cards).
- [x] Options mirror phantom's intent — e.g. **Collaboration**, **Hiring**, **Anything else** —
      plus contact affordances (e.g. email / WhatsApp / privacy) at the bottom.
- [x] **Gating by prior validation:** the overlay's behavior depends on whether the visitor has
      already **earned the right to view Mannan's contact information**. This is the existing
      contact-reveal gate — today a visitor proves themselves through the contact flow and the
      app marks them revealed (`contactRevealed`, `src/context/app-context.tsx`;
      `src/components/contact-modal.tsx` / `contact-form.tsx` / `contact-result.tsx`).
  - [x] If the visitor **has** validated: show the full black-glass overlay with the real
        contact options/details revealed (the phantom-style options view).
  - [x] If the visitor **has not** validated: route them through the existing validation/reveal
        flow first; do not leak email/phone to an unvalidated visitor.
- [x] Reuse the existing contact data + reveal logic as the source of truth for what "validated"
      means and what gets shown — do not introduce a second, parallel contact-gating system.

#### 9. Surrounding chrome — parity pass
- [x] Together, §4–§8 reproduce phantom's HUD layout: top-left avatar, top-center selector +
      filter icon, top-right Let's Talk, left grid icon, right sound toggle — all floating over
      the gallery without obscuring it.

#### 10. Zoom & magnification
- [x] Each **tile is individually zoomable** — the viewer can zoom *into* a card to inspect it
      closer (distinct from §3's click-to-open-page; this is getting a closer look in-place).
- [x] **Mouse wheel zooms in** (and back out) within the gallery — scrolling pulls the view /
      focused tile closer with the same smooth, eased feel as the drag-orbit.
- [x] A **zoom-in icon at the top-right, directly below the Let's Talk button**.
  - [x] Visually derived from the **magnifier on Mannan's community page**
        (`src/components/garden/page-magnifier.tsx`) — but **reworked**: it is NOT a telescope
        metaphor, it reads as an actual **zoom-in** (e.g. magnifier with a `+`), and behaves as
        real zoom rather than the community page's lens effect.
  - [x] **Clicking it steps zoom through a few discrete levels** (click to zoom in one level at a
        time, cycling/resetting at the max). This stepped click-zoom and the continuous
        wheel-zoom should feel like the same coherent zoom system.
- [x] Zoom must stay legible and stable (no disorienting jumps), and compose cleanly with the
      drag-orbit and the black-hole entrance.

#### 11. Attribution (required)
- [x] **Bottom-right** of this experience, attribute the inspiration: the text
      **"Inspired by https://www.phantom.land"** with the URL as a link.

---

#### Non-goals / out of scope
- The product **detail page** beyond a basic template (§3).
- Changing Writings/Readings presentation or any non-Products part of `/garden`.
- Building a brand-new contact-validation mechanism — reuse the existing one (§8).
- Pixel-perfect reproduction of phantom's exact assets/copy — match the *experience and feel*,
  use Mannan's own content and a clear "inspired by" credit.

#### Open questions (resolve during design)
- Where this lives: enhance the Products tab in-place at `/garden`, or a dedicated route the
  Products tab transitions into. (Mannan said "products page" — confirm the surface.)
- Filter facets (§4): which dimensions are filterable (active/tools/retired, year, type?).
- Left grid icon (§6): what the alternate view actually shows and whether it shares state with
  the sphere.
- Sound (§7): what the ambient/interaction sounds are and their default.
- Mobile / touch behavior for the drag-orbit, overlays, and pinch-to-zoom (§10).
- Zoom (§10): how many discrete click levels, whether wheel-zoom and click-zoom share one level
  scale, and the reset/wrap behavior at max zoom.
- Reduced-motion / accessibility fallback for the black-hole transition and orbit.

#### References
- Inspiration + visual target: https://www.phantom.land (provided screenshots: gallery sphere,
  pill selector, ghost→avatar, left grid icon, full-screen "Let's Talk" glass overlay).
- Mannan named GSAP + Three.js + Lenis-style easing as the desired *feel* in the brief; final
  tech choices belong to the implementing agent.

- Location (surfaces this touches): `src/components/garden/garden-explorer.tsx` (current Products
  tab), `src/lib/garden-products.ts` (product data), `src/components/header.tsx` (home avatar /
  chrome patterns), contact flow (`src/components/contact-modal.tsx`, `contact-form.tsx`,
  `contact-result.tsx`, `src/context/app-context.tsx`), plus a new gallery experience surface
  (route or component) TBD in design.

---

#### Implementation notes (how the open questions were resolved)

- **Surface:** Full-screen immersive takeover mounted in-place from the `/garden` Products tab
  (`#products` hash deep-links straight in). It is a `fixed inset-0` layer that brings its **own
  `AppProvider` + `<ContactModal>`** so the contact gate works on `/garden` (the route had no
  `AppProvider` before) — isolated to Products, nothing else on `/garden` changes. The phantom-style
  pill switches categories; leaving Products plays a coherent exit, then returns to the flat garden.
- **Tech:** React Three Fiber + drei + three (already in the repo; lazy-loaded via `next/dynamic`,
  `ssr:false`). Camera sits at the sphere centre; the world group rotates for orbit with a Lenis-style
  damped target + inertia + idle drift (`use-orbit-controls.ts`). Cards are planes textured from a
  runtime-composited `CanvasTexture` (thumbnail + title) — GPU-cheap, offline-robust, crisp. The
  black hole is a custom-shader accretion disk + photon ring + inflowing particles; the intro is
  driven by the render clock with a warm-up gate so the cinematic always plays.
- **Filter facets:** All / Tools / Retired (mirrors the garden's existing Products/Tools/Retired split).
- **Left grid icon:** opens an accessible DOM grid of the same products (shares filter state); also the
  graceful fallback when WebGL is unavailable (capability check + error boundary).
- **Sound:** procedural Web Audio (ambient pad + interaction blips, no asset files), **off by default**.
- **Zoom:** one shared scalar drives camera FOV — wheel = continuous, icon = 4 discrete steps cycling;
  pinch-to-zoom on touch.
- **Reduced motion:** skips the black hole and inertia/auto-drift; the gallery stays fully usable.
- **Files:** `src/components/garden/products-gallery/` (index orchestrator, sphere-scene, product-card-mesh,
  black-hole, card-texture, gallery-data, use-orbit-controls, gallery-sound, gallery-hud, hud-icons,
  grid-view, lets-talk-overlay, product-detail) + one-line mount in `garden-explorer.tsx`.
- **Tests:** `bun run test:e2e` (Playwright, 14 specs) and `bun run test:unit` (sound default). Every
  E2E scenario was mutation-tested (7/8 caught at the DOM; the sound-default invariant is pinned by the
  unit test, which the DOM cannot observe under dev StrictMode).

[Task-249]
