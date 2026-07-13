### Task 264: Retry Garden Showcase only after a faithful OpenSoftware study

The 2026-07-13 OpenSoftware-inspired Showcase redesign was rejected and reverted
in commit `7b6eee6`. Do not restore or lightly iterate on commit `970e2ce`.

#### What failed

- Product screenshots were rendered as large, hard-edged bordered rectangles.
  The result looked like boxed embeds rather than OpenSoftware's calm, composed
  artwork objects.
- The media filled nearly the entire content width and began too close to the
  navigation. There was no generous hero-scale breathing room.
- The layout read as one oversized two-column screenshot followed by an awkward
  half-width screenshot, not a deliberate three-item system.
- Hover-revealed title and description copy appeared directly below the media
  with weak hierarchy, incorrect typography, cramped placement, and an
  unprofessional relationship to the artwork.
- Reusing the Globe HUD introduced duplicate/overlapping top chrome artifacts.
  The avatar also showed visible ring/circle artifacts.
- Fixed view controls and attribution competed with the product content instead
  of feeling integrated.
- The implementation copied superficial colors and rounding without matching
  OpenSoftware's defining qualities: restraint, scale, negative space, centered
  composition, careful typography, and artwork isolated within a quiet field.

#### Required starting point for a future attempt

- Begin from the restored pre-redesign Showcase and its basic two-option view
  controls. Do not extract or reuse the Globe category HUD unless duplication and
  layering are proven impossible in browser screenshots.
- Study the supplied OpenSoftware reference at full viewport scale before
  coding. Measure margins, artwork bounds, headline placement, footer position,
  font scale, and vertical rhythm rather than approximating them.
- Produce a static desktop composition for explicit approval before changing
  production code. The first review must show the default state and a separate
  hover state.
- Treat product images as source material to art-direct, crop, mask, or place
  inside bespoke compositions—not as raw bordered website screenshots.
- Preserve substantial empty space around every focal object. One strong focal
  composition per viewport is preferable to a dense grid.
- Use typography already available in the project only after comparing its
  actual metrics with the reference. Titles and descriptions need a deliberate
  grid and baseline, not generic text placed below cards.
- Verify at desktop and mobile sizes with screenshots before commit or deploy.
  Check specifically for duplicate chrome, borders, clipping, control overlap,
  avatar artifacts, and hover-copy placement.

#### Acceptance checkpoint

No implementation should be shipped until Mannan explicitly approves the visual
mockup against the supplied reference screenshots.

[Task-264]
