### Task 243: Reusable expanding icon-stack — garden + MCP header stack
- [x] Build reusable `ExpandingIconStack` + `StackItem` pattern component (hover-to-fan, mobile tap-reveal gate, click-outside collapse) via context + render-prop
- [x] Refactor left avatar→LinkedIn→GitHub stack onto the reusable component
- [x] Build garden→MCP right stack next to Contact (garden anchor, MCP fans to its right)
- [x] Fix click areas: tight garden anchor box (no padding overhang), MCP hit target enlarged (p-0 → p-1.5)
- [x] Garden stays in place when the stack opens (removed the right-[20px] slide + nav mr shift); plant growth scoped to garden hover only
- [x] Right-align the cluster so MCP's gap from the right edge (16px) matches the avatar's gap from the left
- [x] Fix garden hover underline centering
- [x] Tests: 5 new right-stack e2e cases + updated mcp.spec reveal-then-gate flow; all 26 header/mcp/garden-hover specs pass
- Location: `src/components/ui/expanding-icon-stack.tsx`, `src/components/header.tsx`, `src/components/mcp/mcp-header-button.tsx`, `e2e/header-controls.spec.ts`, `e2e/mcp.spec.ts`

[Task-243]
