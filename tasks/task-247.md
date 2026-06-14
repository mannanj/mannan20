### Task 247: Fix header garden+MCP cluster — unify hover region, kill dead zone

The right-side header cluster (garden plant + MCP paperclip) had a "dead zone": the
MCP icon overlapped the "Contact" nav text, and moving the cursor from the plant
toward the MCP collapsed the whole cluster (MCP ran away from the pointer). Root
cause was two uncoordinated hover state machines plus magic-pixel absolute
positioning.

- [x] Diagnose: `gardenExpanded` (plant/pot/tooltip/nav) was driven by `garden-wrapper`
      which wrapped only the plant, while the MCP was an absolute sibling positioned
      with magic `right-[Npx]` offsets and driven by a *separate* `ExpandingIconStack`
      state — so moving plant→MCP left the garden hover region and collapsed everything
- [x] Replace the right `ExpandingIconStack` with a plain container; move `McpHeaderButton`
      in-flow as a flex sibling INSIDE the unified `garden-wrapper` hover region, before
      the plant
- [x] Reveal via animated width (`w-0`→`w-8`) + opacity instead of magic offsets — flex
      reserves the space so overlap with "Contact" is structurally impossible
- [x] Move the red active-underline inside the `<Link>` so it stays centered under the pot
- [x] Remove the nav-link `-translate-x` hack (width reveal now provides the shift naturally)
- [x] Restore a tap gate keyed on `!gardenExpandedRef.current` (NOT a 1000ms timer): desktop
      hovers first → click navigates immediately; touch (no hover) → first tap reveals the
      MCP, second tap navigates — keeps the MCP reachable on mobile
- [x] Add `data-testid="mcp-reveal"` and real touch e2e (tap, not faked hover) for the gate;
      rewrite two stale tests that encoded the old broken behavior
- [x] Mutation-tested the gate (disabling it makes first tap navigate → the touch test
      provably catches the regression)
- [x] Verified: tsc clean; 31 e2e pass (header-controls + mcp + garden-hover)

- Location: `src/components/header.tsx`, `e2e/header-controls.spec.ts`

[Task-247]
