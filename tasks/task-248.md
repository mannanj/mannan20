### Task 248: Unify the two header icon clusters behind a shared reveal primitive

**Status: PLANNING ONLY — do not implement without Mannan's sign-off on the approach below.**

#### Context / the question

The header has two "hover-revealed icon cluster" areas:

- **Left (social):** `header-controls` — an `ExpandingIconStack` + `StackItem` (the reusable
  primitive). Anchor = home avatar button. LinkedIn + GitHub fan **down-right** as
  absolutely-positioned `StackItem`s via magic `left-[Npx]` offsets. Reveal on hover;
  click gate via `gatedClick` (a 1000ms `clicksAllowed` timer). `src/components/header.tsx:496-588`,
  `src/components/ui/expanding-icon-stack.tsx`.
- **Right (garden + MCP):** after Task 247 this is now **bespoke** — it does NOT use
  `ExpandingIconStack`. Anchor = plant `Link` (navigates to `/garden`). The MCP reveals
  **in-flow to the left** via an animated `width` (`w-0`→`w-8`) + opacity. Reveal is driven by
  the rich `gardenExpanded` state (pot growth rAF, lights, retract animation); tap gate keyed on
  `!gardenExpandedRef.current`. `src/components/header.tsx:589-2340`.

So the two clusters have **diverged**: left uses the shared component, right is hand-rolled.

#### Assessment / verdict

They **should** share code — but NOT by forcing the garden back onto `ExpandingIconStack`.
The `StackItem` absolute-offset model is exactly what caused the Task 247 dead-zone bug
(magic offsets + a hover region that didn't cover the revealed icons). Pushing the garden
back onto it would reintroduce that fragility.

The genuinely common behavior is the **state machine + the tooltip**, not the layout:
- a hover/tap-revealed cluster anchored to an always-visible primary element,
- a click "gate" (first interaction reveals, second acts),
- click-outside / Escape to collapse,
- an identical `#333` triangle+pill tooltip repeated **4-5×** verbatim
  (home, LinkedIn, GitHub, MCP "Connect your AI", garden "View my Garden").

What legitimately **differs** and should stay per-cluster: orientation (fan-down-right vs
in-line-left), reveal mechanism (absolute `StackItem` vs in-flow width), anchor semantics
(toggle button vs nav `Link` + 2-tap gate), and the garden's heavy bespoke growth animation
(must NOT be dragged into a generic primitive).

**Recommended altitude: share the state machine + tooltip; keep layout per-cluster.**
Over-abstracting into one layout component would be worse than the duplication.

#### Plan (phased — each phase independently shippable)

**Phase A — DRY the tooltip (highest value/lowest risk).**
- [ ] Extract `<HeaderTooltip label anchor="left|center|right" size="xs|2xs" />` rendering the
      shared `absolute top-full … bg-[#333]` triangle+pill currently duplicated at header.tsx
      :535-540, :556-561, :578-583, garden :2320-2327, and mcp-header-button.tsx:57-64.
- [ ] Replace all 5 call sites. Pure refactor; existing tooltip e2e (header-controls, mcp)
      must stay green.

**Phase B — Unify the gate (fixes a latent left-side bug).**
- [ ] The left side's `gatedClick` swallows clicks for 1000ms after reveal (the same class of
      bug Task 247 removed from the garden). Replace the timer model in
      `expanding-icon-stack.tsx` with a **revealed-state gate** (`if (!revealed) { preventDefault;
      reveal() }`) matching the garden's `onClick` (header.tsx:624-628).
- [ ] Verify the social links still open on a deliberate second click; add a mutation-tested
      e2e proving the gate (first click reveals, second navigates) — mirror the Task 247 touch
      tests.

**Phase C — Extract `useRevealCluster` hook (removes the divergence).**
- [ ] New `src/hooks/use-reveal-cluster.ts`: `{ revealed, revealedRef, reveal, collapse,
      gateClick, containerProps }` where `containerProps` wires `ref` + `onMouseEnter/onMouseLeave`
      and the hook owns click-outside + Escape. This is the generalization of both
      `ExpandingIconStack`'s internals AND the garden's `openGarden/closeGarden` + click-outside
      (header.tsx:97-130).
- [ ] Refactor `ExpandingIconStack` to consume the hook (keep `StackItem` for the social fan-out).
- [ ] Refactor the garden cluster to consume the hook for the reveal/gate/click-outside parts,
      while keeping `gardenExpanded`'s bespoke growth animation layered on top (the hook drives
      "is the cluster open", the existing rAF/interval effects stay).
- [ ] Net result: adding a third header cluster = call the hook + pick a layout; no copy-paste.

#### Risks / notes
- The garden's `gardenExpanded` does double duty (reveal state AND animation trigger). Phase C
  must keep the animation effects firing off the same boolean — don't split them apart or the pot
  growth breaks. Re-run `garden-hover.spec.ts` after.
- `closeGarden` has a 180ms debounce the social side lacks; make it a hook option, not a hardcode.
- Keep all `data-testid`s (`header-controls`, `header-right-stack`, `garden-wrapper`,
  `mcp-header-button`, `mcp-reveal`, `header-garden-link`) — e2e depends on them.
- Mutation-test every new/changed e2e per the repo standard before trusting green.

- Location: `src/components/header.tsx`, `src/components/ui/expanding-icon-stack.tsx`,
  `src/components/mcp/mcp-header-button.tsx`, new `src/hooks/use-reveal-cluster.ts`,
  new `src/components/ui/header-tooltip.tsx`

[Task-248]
