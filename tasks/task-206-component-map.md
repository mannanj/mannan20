### Task 206 — Garden Component Map (Agent A3)

Phase 1 output. Catalog of reusable garden components and utilities so the implementer reuses what already exists instead of inventing parallel scaffolding.

---

## 1. Catalog Table

| Component / Util | File Path | One-Line Description | Current Callers | Props Summary | Recommended Use in Taken Rewrite |
|---|---|---|---|---|---|
| `ArticleBody` | `src/components/article-body.tsx` | Wrapper that applies `space-y-*` rhythm and base text styles to article content | `SeekingCommunityBody`, `HealthArticleBody`, `AiFalsePositivesBody`, `TakenBody` | `spacing?: "comfortable"\|"tight"`, `className?`, `children` | USE — outer rhythm wrapper; `spacing="comfortable"` gives `space-y-8` |
| `AdditionalReading` | `src/components/garden/additional-reading.tsx` | Horizontal-scrolling carousel of all other `GARDEN_ARTICLES` entries | `SeekingCommunityBody`, `HealthArticleBody` | `currentHref: string`, `hideTopDivider?: boolean` | USE — replaces `ResonanceCta` |
| `AdditionalReadingPopout` | `src/components/garden/additional-reading-popout.tsx` | Toggle-open inline panel listing Blueprint alignment facts | None (Blueprint-specific) | none | IGNORE |
| `DraggablePopout` | `src/components/garden/draggable-popout.tsx` | Fixed-position, draggable, dismissable overlay; supports minimize, imperative reposition, keyboard Escape, wheel-scroll | `SeekingCommunityBody` (HawaiiSection), `HealthArticleBody` (via `BlueprintPopout`), `FunnyFrustrationsBody`, `ThinkingAboutCard` | `open`, `onClose`, `anchorPosition?`, `header?`, `description?`, `children`, `width?=400`, `miniWidth?=240`, `minimizable?=false`, `ref?` | USE — for the IP reveal moment in *Where you are* |
| `BlueprintPopout` | `src/components/garden/blueprint-popout.tsx` | Wrapper over `DraggablePopout` with Blueprint-specific content | `HealthArticleBody` | `open`, `onClose`, `anchorPosition?`, `onScrollToArticle?` | IGNORE — Blueprint-specific |
| `EasterEgg` | `src/components/garden/article-inventory.tsx` | Collectible Easter egg button | `SeekingCommunityBody` | `map?: boolean` | SKIP for Taken |
| `IdCardCollectible` | `src/components/garden/article-inventory.tsx` | Collectible ID card button | `SeekingCommunityBody` | `rotate?: number` | SKIP for Taken |
| `RubyGemCollectible` | `src/components/garden/article-inventory.tsx` | Collectible ruby gem | not yet used | none | SKIP |
| `InventoryProvider` | `src/components/garden/article-inventory.tsx` | Context + localStorage for collected items | `src/app/garden/layout.tsx` | `children` | PASSIVE — already wraps Taken |
| `Divider` (local) | `src/components/garden/seeking-community-body.tsx` lines 22–24 | `<div className="w-1/3 h-px bg-white/[0.12]" />` | `SeekingCommunityBody` | none | USE — copy these 3 lines into `taken-body.tsx`; NOT exported from any shared file |
| `ArticleHeader` | `src/components/article-header.tsx` | Layout wrapper; provides `flex flex-col items-center` when `align="center"` | `taken/page.tsx`, others | `align?`, `className?` | PASS — already wired in `taken/page.tsx` |
| `ArticleTitle` | `src/components/article-title.tsx` | Renders article `<h1>` with `community` or `editorial` variants | `taken/page.tsx`, others | `variant?`, `as?`, `className?` | PASS — already wired |
| `ArticleMeta` | `src/components/article-meta.tsx` | Date/read-time/word-count line | `taken/page.tsx`, others | `date`, `readTime?`, `wordCount?`, `variant?`, `separator?` | PASS — already wired |
| `ArticleCaption` | `src/components/article-caption.tsx` | Italic caption above title | `taken/page.tsx`, others | many style overrides; `children` | PASS — already wired |
| `ArticleLayout` | `src/components/article-layout.tsx` | Page layout: `min-h-screen`, `max-w-2xl mx-auto px-6`, optional graphic/sideRail | `taken/page.tsx`, others | `topPadding?`, `graphic?`, `graphicLayout?`, `sideRail?` | PASS — already wired |
| `GardenHeaderGate` | `src/components/garden/garden-header-gate.tsx` | Renders `<Header />` for all garden routes EXCEPT those in `HIDE_ON`; currently hides on `/garden/article/taken` | `src/app/garden/layout.tsx` | none | DELETE — restore the header per task-206 |
| `TakenStatsFooter` | `src/components/garden/taken-stats-footer.tsx` | Fixed bottom bar: live seconds/scroll/tabs/movements/clicks + attribution | `TakenBody` | `seconds`, `scrollPct`, `tabSwitches`, `movements`, `clicks` | KEEP AS-IS |
| `PageMagnifier` | `src/components/garden/page-magnifier.tsx` | Fixed circular magnifying lens | `src/app/garden/layout.tsx` | none | PASSIVE — renders automatically in garden layout |
| `Modal` | `src/components/modal.tsx` | Generic dark-background modal shell with close button | `article-inventory.tsx` (InventoryHud) | `isOpen`, `onClose`, `children` | USE — Tell Someone modal can use this shell |
| `GlassModal` | `src/components/glass-modal.tsx` | Apple-style blurred glass modal with optional size toggle | not used in garden articles yet | `isOpen`, `onClose`, `title?`, `body`, `buttons[]`, `defaultSize?`, `showSizeToggle?` | REFERENCE — closer to Taken's aesthetic; could replace `Modal` for Tell Someone |
| `Timeline` | `src/components/garden/timeline.tsx` | Side-rail or inline timeline of eras | `SeekingCommunitySideRail`, `FunnyFrustrationsBody` | many | IGNORE |
| `SeekingCommunitySideRail` | `src/components/garden/seeking-community-side-rail.tsx` | Left-side Timeline rail | `seeking-community/page.tsx` | none | IGNORE |
| `GardenHero` | `src/components/garden/garden-hero.tsx` | Full-width Unicorn Studio scene | `health-longevity/page.tsx` | scene path, height, translateY | IGNORE |
| `CommunityNodesPreview` | `src/components/garden/community-nodes-preview.tsx` | Canvas mini-preview of community nodes | `AdditionalReading` | none | PASSIVE |
| `HealthHeroPreview` | `src/components/garden/health-hero-preview.tsx` | Mini animated preview for health card | `AdditionalReading` | none | PASSIVE |
| `CommunityConstellation` | `src/components/garden/community-constellation.tsx` | Dynamic-import canvas constellation | `SeekingCommunityBody` | none | IGNORE |
| `ThinkingAboutCard` | `src/components/garden/thinking-about-card.tsx` | Fixed side card triggering DraggablePopout | (standalone) | none | IGNORE |
| `AiPocketCard` | `src/components/garden/ai-pocket-card.tsx` | Fixed side link to AI false positives | Garden page | none | IGNORE |
| `HealthPocketCard` | `src/components/garden/health-pocket-card.tsx` | Fixed side link to health article | Garden page | none | IGNORE |
| `HealthGoldHoverShell` | `src/components/garden/health-gold-hover-shell.tsx` | Gold-infection hover wrapper | Health article page | none | IGNORE |
| `UnicornScene` | `src/components/garden/unicorn-scene.tsx` | Unicorn Studio iframe/canvas wrapper | `GardenHero` | none | IGNORE |
| `CommunityNodes` | `src/components/garden/community-nodes.tsx` | Full community nodes canvas | Seeking community page | none | IGNORE |
| `CopyIcon` | `src/components/icons/copy-icon.tsx` | Copy SVG icon | `contact-result.tsx` | `className?` | USE — Tell Someone copy button |
| `CheckIcon` | `src/components/icons/check-icon.tsx` | Checkmark SVG icon | `contact-result.tsx` | `className?` | USE — post-copy confirmation in Tell Someone |

---

## 2. DraggablePopout Reuse Brief

`DraggablePopout` is a `position: fixed` floating panel that appears at a specified `anchorPosition: { x: number; y: number }` in viewport coordinates. On open, it clamps that position to keep the panel fully on screen: `x = Math.max(12, Math.min(anchorPosition.x, vw - width - 12))` and `y = Math.max(12, Math.min(anchorPosition.y - 40, vh - 500))`. The caller captures the click event's `clientX/clientY` and passes them as `anchorPosition`. The panel is draggable by its non-button surface. It closes on `Escape` keydown or when the caller sets `open={false}` via `onClose`. Wheel events inside the popout scroll its internal `scrollRef` without propagating to the page. The optional imperative `ref` (typed `DraggablePopoutHandle`) gives `minimize()`, `expand()`, and `reposition({ x, y })`.

The canonical usage pattern is in `HawaiiSection` inside `seeking-community-body.tsx` (lines 26–88). The caller holds `open` and `anchorPos` in local state, captures `e.clientX/clientY` in an `onClick` handler on an inline text button (`useCallback` wrapped), and passes both to the popout. The popout children are `<div className="space-y-4 text-sm text-white/70 leading-relaxed">` with plain paragraphs. For the Taken *Where you are* moment, the same pattern applies with a 3-second auto-redact `useEffect` that switches the displayed IP from full to masked.

---

## 3. AdditionalReading Reuse Brief

`AdditionalReading` reads from `GARDEN_ARTICLES` (imported directly from `src/lib/garden-articles.ts`) and filters out the entry whose `href` matches `currentHref`. It renders the remaining articles as horizontal-scrolling Link cards, with preview components hard-coded for `seeking-community` (`CommunityNodesPreview`) and `health-longevity` (`HealthHeroPreview`). It returns `null` if the filtered list is empty. The `hideTopDivider` prop removes the `border-t border-white/10` that normally appears above the section. There is no data fetching — it reads the in-memory `GARDEN_ARTICLES` array at render time.

**Critical note:** `taken` is currently REMOVED from `GARDEN_ARTICLES`. Calling `<AdditionalReading currentHref="/garden/article/taken" />` from inside the disabled article will NOT crash — the component will render all articles currently in `GARDEN_ARTICLES` (Seeking Community + Health is an Artform) because none of them match the `taken` href. The carousel will show those two articles correctly. The only consequence of `taken` being absent is that Taken does NOT appear in the carousels of the other articles. This is intentional: `taken` is re-listed in `GARDEN_ARTICLES` only after Phase 3 verification passes. Therefore `<AdditionalReading currentHref="/garden/article/taken" />` can be wired immediately and renders correctly without first re-listing `taken`.

---

## 4. ArticleBody Reuse Brief

`ArticleBody` is a plain server component (no `"use client"`) defined in `src/components/article-body.tsx`. It renders a single `<div>` with:

- `space-y-8` when `spacing="comfortable"` (the default)
- `space-y-6` when `spacing="tight"`
- Base classes always applied: `text-sm text-white/70 leading-relaxed`
- Optional `className` appended

Only these two spacing values are supported. The wrapper provides no `max-w`, no padding, and no flex/grid — those come from the parent `ArticleLayout` (which supplies `max-w-2xl mx-auto px-6`). Children placed directly inside `ArticleBody` benefit from automatic `space-y-8` gaps between them. The correct pattern for the Taken rewrite is: `ArticleBody spacing="comfortable"` as the outer wrapper, `Divider` between editorial phases, and plain section `<div>`s or `<section>`s as immediate children.

---

## 5. Inventory of Helper Utils (`src/lib/utils.ts`)

| Export | Signature | Purpose | Useful for Taken? |
|---|---|---|---|
| `scrollToSection` | `(section: Section) => void` | Scrolls to portfolio home/about/contact section | No |
| `getPhoneLink` | `(phone: string) => string` | Strips non-numeric chars, prepends `tel:` | No |
| `copyToClipboard` | `(text: string) => Promise<void>` | Wraps `navigator.clipboard.writeText`; rejects with `Error("Clipboard not available")` if API absent | YES — use for the Tell Someone copy button; handles browser API check, returns rejectable Promise |
| `downloadFile` | `(path: string, filename: string) => Promise<void>` | Fetches file, triggers download via anchor click | No |

`copyToClipboard` is the exact utility the Tell Someone modal needs. Import from `@/lib/utils` rather than calling `navigator.clipboard.writeText` directly so the fallback error path is already handled.

---

## 6. Hidden Gems

**`taken-scan-flicker` and `taken-banner-in` keyframes are already in `globals.css`.** `taken-scan-flicker` is used on the "reading your browser…" loading text via `.taken-scan-flicker` and must be KEPT. `taken-banner-in` is used on `TabLeaveBanner` via `.taken-banner-in` and must be KEPT. The `taken-fade-up` keyframe referenced in the task spec does NOT currently exist in globals.css — grep confirms it was never added. Do not spend time looking for it.

**`popout-scroll` scrollbar style in `globals.css`** (lines 7–27): Custom styled scrollbar for the DraggablePopout's internal scroll div. Applied automatically inside `DraggablePopout`; no action needed from implementer.

**`CopyIcon` and `CheckIcon`** (`src/components/icons/`): Both already exist and are used in `contact-result.tsx` for copy-with-confirmation UX. The Tell Someone modal can use the same pattern: render `CopyIcon` by default, swap to `CheckIcon` for ~2 seconds after a successful copy, then reset.

**`Modal` shell** (`src/components/modal.tsx`): Dark `bg-black/75` backdrop, `bg-[#141414]` panel, close `×` button, `max-w-[728px]`, `overflow-auto`. Already `"use client"`. The Tell Someone modal does not need a hand-rolled modal — `Modal` handles it. Add `useState<boolean>` for `isOpen`, place `<Modal isOpen={...} onClose={...}>` near the bottom of `TakenBody` (before `<AdditionalReading />`), put the share line text + `CopyIcon`/`CheckIcon` copy button inside.

**`article-highlight` CSS class** (globals.css line 36): 1.5s `articleHighlight` keyframe for cross-reference flash UX. Used in `HealthArticleBody`. Not directly relevant to Taken but useful to know.

**`GlassModal`** (`src/components/glass-modal.tsx`): Apple-style glass aesthetic with configurable size. Closer to Taken's dark-glass register than `Modal`. The Tell Someone modal might land better with `GlassModal` `defaultSize="medium"` `showSizeToggle={false}`. Props differ: `body: string` and `buttons: GlassModalButton[]` rather than `children`. If content is single paragraph + one button, `GlassModal` fits; if custom JSX needed, use `Modal`.

---

## 7. Anti-Pattern Callout — What `taken-body.tsx` Built That Should Have Been Reused

**`ResonanceCta` (lines 827–850):** A bespoke `Reveal`-wrapped centered div with a link to `/garden`. Direct functional duplicate of `<AdditionalReading />`. It does less (text link only, no previews, no carousel), requires `Reveal` + `reduced` prop threading, and uses a `min-h-[45vh] flex items-center` wrapper the rewrite spec prohibits. Replace entirely with `<AdditionalReading currentHref="/garden/article/taken" />`.

**`PullQuote` (lines 522–548):** Standalone component wrapping `Reveal` with a centered `<blockquote>`. No equivalent in `seeking-community-body.tsx` — the seeking-community body does not use pull quotes. `PullQuote` adds its own `min-h-[55vh] flex items-center justify-center` container, prohibited by the rewrite. If pull quotes are retained at all, they should be plain `<blockquote>` elements inside a section with no `min-h-*` wrapper.

**`Reveal` (lines 486–520) applied per-row:** Every `ObsRow`, `PullQuote`, `ClimaxBlock`, `FinalLine`, and `ResonanceCta` wraps content in `Reveal` or an equivalent IntersectionObserver. Produces 13+ independent observers. The rewrite removes all per-row fade-up animations — keeping only `Barcode`'s internal `useReveal`. The entire `Reveal` component, `useReveal` hook, and `useDossierRule` / `DossierRule` can be deleted.

**`ObsRow` (lines 632–673) with `min-h-[55vh] flex items-center`:** Each row forces 55vh minimum height — the entire cause of the excessive scroll height. Replace all `ObsRow` instances with plain editorial sections: a label line, a source citation, a prose paragraph, separated by hairline `Divider`. No min-height.

**`ClimaxBlock` and `FinalLine` with `min-h-[60vh]` and `min-h-[70vh]`:** 130vh of forced scroll height between them. Both removed. `ClimaxBlock`'s metrics-frozen prose absorbs into editorial sections; `FinalLine`'s slogan is replaced by the closing manifesto per task-206 S9.

[Task-206]
