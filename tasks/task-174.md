### Task 174: Garden left-margin decoration — design exploration
- [ ] Document explored themes for the left-margin decoration on `/garden`
- [ ] Pick a final direction and implement at production quality
- Location: `src/components/garden/garden-plant-decoration.tsx`, `src/app/garden/page.tsx`

#### Background
Earlier session built a "zen rock garden" (raked sand, stones, ripples) for the left margin. It rendered nearly invisible — `#3a3a3a` stones on `#0b0b0b`, ripples at 2–9% effective opacity (parent `opacity-50` halved everything), positioned with `left-[calc(50%-480px)]` and `hidden lg:block` so it was off-screen on most viewports. Subsequent attempts (toggleable Raked Sand / Bamboo / Ensō / Cairn) and a cherry-blossom SVG were also judged amateur.

#### Themes explored (zen / garden / nature, flowy)
1. Raked Sand — stones + concentric ripples + horizontal rake lines
2. Bamboo Grove — bamboo stalks with nodes + leaves
3. Ensō — single zen brush circle with falling dots
4. Cairn — stacked stones with ground ripple
5. Cherry Blossom Branch — curving branch + 5-petal blossoms + falling petals (current draft)
6. Wisteria Cascade (Fuji) — hanging vines, purple cluster flowers
7. Bamboo Grove with Moss — green/lush version, ferns at base
8. Koi Pond (vertical) — stylized koi swimming up through ripples + lily pads
9. Bonsai Silhouette — gnarled branches, fine leaves, exposed roots
10. Flowing Stream with Iris (Kakitsubata) — meandering stream + iris on banks
11. Vine & Morning Glory (Asagao) — twining climber with trumpet flowers

#### Non-zen alternates (proposed, rejected — kept for record)
- Constellation Map, Topographic Contours, Moon Phases, Tree Rings, Mycelium Network, Circuit/Node Graph, DNA Helix

#### Reference sites for sakura/zen styling (professional examples)
- CodePen: malloryajk/wzooGY, vinnywoo/yjBemM, pixelparlor/rGwQVY, AlcinaW/jYyEQg, qqz/GzyQVb, K-T/qoVmJQ, uamor/jLrEoM
- ggprompts.github.io/htmlstyleguides/styles/cherry-blossom.html
- dribbble.com/tags/cherry-blossom
- 99designs.com/inspiration/designs/cherry-blossom

#### Implementation notes from research (for whichever theme is chosen)
- Petals need a heart-shaped notch at the tip, not plain ellipses
- Use radial gradients for petal depth, not flat fills
- Stamens with tiny golden anthers add realism
- Branches should be filled shapes with taper, not uniform strokes
- Avoid `opacity-50` parent wrappers — composes with child opacity and kills contrast
- Verify visibility at viewports < 1200px; current `hidden lg:block` + offset positioning hides it for many users

#### Open decision
Pick one direction (current lean: cherry blossom done properly, or wisteria cascade) and rebuild the SVG with the realism notes above before re-attempting.
