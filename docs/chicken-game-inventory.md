# Chicken Game — Shared inventory bag

Source: "Follow-up" in `docs/chicken-game-toss-orbs-hawk-raw.md`. Tasks: `tasks/task-308.md`. Consumers: `docs/chicken-game-hawk.md`, `docs/chicken-game-eagle-phoenix.md`.

## What exists today (grep: inventory, bag, pickup)

- Component file: `src/components/garden/article-inventory.tsx` (1534 lines). Everything lives in this one file.
- Mounted only by `src/app/garden/layout.tsx` (`<InventoryProvider>` wraps the garden). `src/components/header.tsx` also imports `RubyGemCollectible`; `src/components/garden/seeking-community-body.tsx` imports collectibles.
- Bag UI: `InventoryBag()` (~line 1160): `fixed bottom-6 right-6 z-[100]` button, `data-testid="inventory-bag"`, brown `BagIcon` (line 1108, 40px, gradients `bagBody`/`bagFlap`), tooltip showing `"<label> +1"` for 3s after an add, `InventoryHud` panel when open (line 1238; save/load to JSON file, throw action for eggs).
- It renders ONLY on `pathname === "/garden/article/seeking-community"` and only when `items.length > 0` (hardcoded in `InventoryBag`).
- Item model: `type InventoryItem = { id: string; label: string; count: number }`. Context API (`InventoryCtx`): `items, hydrated, countOf, add({id,label}), decrement, replace, throwingItemId, startThrow, cancelThrow, splats, addSplat, removeSplat, surfaceRef`. Caps: `ITEM_MAX` (`easter-egg` 12, `id-card` 1, `ruby-gem` 1), `DEFAULT_MAX = 12`. Items today: easter eggs, id card, ruby gem. (Mannan mentions bags too; the grep found egg/id-card/ruby-gem only.)
- Persistence: `localStorage` key `article-inventory-v1` (JSON of `items`), splats `seeking-community-splats-v1`; both written in `useEffect` after `hydrated`, wrapped in try/catch.
- Fly-to-bag: each collectible renders a private `Flying*` component (`FlyingEgg`, `FlyingIdCard`, `FlyingRuby`, `FlyingSplat`) from its `DOMRect`, ending at `getBagPoint()` = `(innerWidth - 44, innerHeight - 44)` (`BAG_OFFSET_X/Y = 24 + 20`). The animation code is duplicated per item.

## Design: extract, do not copy

1. New folder `src/components/inventory/`:
   - `inventory-context.tsx`: `InventoryProvider` (state, hydration, `add/decrement/countOf/replace`, `maxFor`), unchanged storage key `article-inventory-v1` so existing garden saves survive. Add optional `registry` prop: `Record<string, { label; max; art }>` (default: the garden's three items) so `/game` can pass its own items without editing the garden ones.
   - `inventory-bag.tsx`: `InventoryBag({ visible?, bottom?, right?, actions? })`: the brown bag, tooltip, panel. Drops the hardcoded pathname check: caller passes `visible` (garden passes the pathname test; `/game` passes always when `items.length>0`). `actions` = `(item) => ReactNode | null` renders a "use" button per row (game: hawk feather -> "wear skin").
   - `bag-icon.tsx`: `BagIcon` (moved).
   - `fly-to-bag.tsx`: one generic `<FlyToBag from={DOMRect} art={ReactNode} onDone />` and `useFlyToBag()` returning `flyToBag(el|rect, itemId)`. It uses `getBagPoint()` and animates `transform` + scale with the Web Animations API (single code path). `FlyingEgg/IdCard/Ruby` become thin wrappers or are replaced.
   - `item-art.ts`: registry mapping ids to `Mini*` art (egg, id card, ruby move here from `article-inventory.tsx`; add `HawkFeatherArt`, `EagleFeatherArt`, `ToastedFeatherArt`).
2. `src/components/garden/article-inventory.tsx` keeps the collectibles (`EasterEgg`, `IdCardCollectible`, `RubyGemCollectible`), throw overlay and splat layer, importing the provider/bag from the new folder. Behavior and test ids unchanged (`inventory-bag`, `inventory-surface`).
3. `/game` mounts `<InventoryProvider registry={GAME_ITEMS}><InventoryBag visible actions={gameBagActions} /></InventoryProvider>` inside `src/app/game/page.tsx` (or `ChickenGameInner` if the context must reach it). Same storage key, so a feather found on `/game` shows up in the garden bag and vice versa (decision: shared on purpose, because one bag; flagged Q1).
4. Z-order and overlap on `/game`: the bag is `bottom-6 right-6 z-[100]`; check the game's own bottom-right controls (skins button around line 1942 of `chicken-game.tsx`, bottom sheet). Move the bag or the control if they collide (offset constants `BAG_OFFSET_*` already exist, make them props).
5. Edge: the bag is currently hidden when empty; on `/game` it appears on first add with a pop-in so the fly animation has a target. The feather flight needs the bag point before it renders: mount the bag in a "pending" state (invisible, correct position) at flight start so `getBagPoint()` is valid, then reveal on landing.

## Game items

```ts
const GAME_ITEMS = {
  'hawk-feather':   { label: 'Hawk feather',   max: 1,  action: 'wear-skin' },
  'eagle-feather':  { label: 'Eagle feather',  max: 1,  action: 'wear-skin' },
  'phoenix-feather':{ label: 'Phoenix feather',max: 1,  action: 'wear-skin' }, // threshold open, see eagle-phoenix doc
  'toasted-feather':{ label: 'Toasted feather',max: 10, action: null },        // Mannan: collect up to 10
} as const;
```
- Hawk and eagle feathers: unique (max 1), tapping in the bag unlocks + applies the skin (`unlockSkin(id)`, writes `chicken-skins-unlocked`, sets `chicken-skin`). After use the feather is consumed; the skin is permanent and appears in the skins sheet (skins sheet listing: `chicken-game.tsx` ~565-800, `SKINS`).
- Toasted feathers: `max: 10`, count-only trophies for now. What they do is open (Q2, also in the eagle-phoenix doc): ideas in order of fit: nothing (collection only, shown as "x7/10"), a "burnt" cosmetic accessory unlocked at 10, or a crafting input for the phoenix feather/skin.
- Feather gating: `hawk-feather` is only awardable when `countOf('hawk-feather') === 0` and the skin is not unlocked (avoids a dead item); Q3.
- No pause item here: pausing is deferred (`tasks/task-306.md`); the old note about using the hawk feather to pause is dropped.

## Fly-to-bag animation spec
Duration 700 ms; path: quadratic arc (control point above the midpoint by 80px), scale 1 -> 0.35, rotate +25deg, ease `cubic-bezier(.4,0,.2,1)`; on end: `add(item)`, bag bounces (`scale 1.15 -> 1`, 250 ms), tooltip "`<label> +1`" (already supported via `addedLabel`). Respect `prefers-reduced-motion`: skip the arc and just fade-add. Many toasted feathers: allow up to 10 concurrent flights, each a transform-only element.

## Tests
`e2e/inventory.spec.ts`: garden page unchanged (`inventory-bag` appears after collecting an egg; reload persists); `/game` with `__chicken.giveItem('hawk-feather')` shows the bag; tapping the item wears the skin; a feather added on `/game` is in `localStorage['article-inventory-v1']`. Existing garden specs must pass unmodified.

## Open questions
1. One shared storage key across garden and game (assumed yes) or separate?
2. What do toasted feathers do (collection only / accessory / crafting)?
3. Feather availability if the skin is already unlocked.
4. Should the bag HUD's save/load JSON include game items? (Default yes, same list.)
