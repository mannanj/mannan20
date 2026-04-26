### Task 189: Throw eggs from inventory; persistent splats with cleanup
- [x] Add `eggThrow` + `splatAppear` keyframes to globals.css
- [x] Extend `InventoryProvider` with throw mode, decrement, splats list (localStorage), surface ref, removeSplat
- [x] Build `EggCursor` (follows mouse, "Tap to throw" label), `ThrownEgg` (reverse-arc bag→cursor), `SplatLayer`, `SplatItem`, `FlyingSplat`
- [x] Make inventory egg row clickable when count > 0
- [x] × cleanup affordance per splat: hover shows "Tap to clean", click shows "Confirm cleanup?", confirm flies splat to bag and adds `egg-splat` to inventory
- [x] Inventory list shows splat with absolutely-sized larger icon that doesn't push layout
- Location: `src/components/garden/article-inventory.tsx`, `src/app/globals.css`

[Task-189]
