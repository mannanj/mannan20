### Task 206 — Technical Refactor Plan (Agent A2)

Phase 1 output. Implementer (I1) reads this file after `task-206-editorial.md` is approved.

---

## 1. Component-by-component refactor plan

Every module-level name in `src/components/garden/taken-body.tsx` with its disposition.

### Interfaces

| Name | Action | Reason |
|---|---|---|
| `Observation` | DELETE | Array-of-observations pattern is replaced by flat `DetectionState`. |
| `DetectionState` | KEEP-MODIFIED | Replace `observations: Observation[]` with named flat fields (see Section 8). |
| `LiveMetrics` | KEEP | `TakenStatsFooter` still consumes these values via `useLiveMetrics`. |
| `BatteryManager` | KEEP | Used by `detectBattery`; untouched. |
| `NavigatorWithExtras` | KEEP | Used by detection functions; untouched. |
| `IpwhoisResponse` | KEEP-MODIFIED | Add `ip?: string` exposure to `detectGeo` return (see Section 8). |

### Constants

| Name | Action | Reason |
|---|---|---|
| `FONT_CANDIDATES` | KEEP | `detectFonts` iterates it; detection is untouched. |
| `PULL_QUOTES_AFTER` | DELETE | Drives `PullQuote`; no per-row pull quotes in the new design. |

### Detection functions

| Name | Action | Reason |
|---|---|---|
| `detectFonts` | KEEP | Untouched; drives `fontsCount` and seeds `fingerprintInput`. |
| `detectGPU` | KEEP | Untouched; seeds `fingerprintInput`. |
| `parseUA` | KEEP | Untouched; produces `browser` + `os` strings. |
| `fnv1a` | KEEP | Untouched; the fingerprint hash function. |
| `maskIP` | KEEP | Untouched; produces `ipMasked` displayed in prose. |
| `timeOfDay` | KEEP | Utility called in *Where you are* prose. |
| `detectGeo` | KEEP-MODIFIED | Add `ipFull: string` to return type and return object so the `DraggablePopout` can display it. All other logic untouched. |
| `detectBattery` | KEEP | Untouched; result exposed as `batteryLine` in `DetectionState`. |
| `detectStorageQuota` | KEEP | Untouched; result computed but NOT displayed in prose (display restraint). |
| `detectOrientation` | KEEP | Untouched; result computed but NOT displayed in prose. |

### Hooks

| Name | Action | Reason |
|---|---|---|
| `useLiveMetrics` | KEEP | `TakenStatsFooter` and `TabLeaveBanner` need it. |
| `useReducedMotion` | KEEP | `Barcode` still uses it. |
| `useReveal` | KEEP | `Barcode` uses it internally. |
| `useDossierRule` | DELETE | Drives the per-column scrolling rule; no long observation column. |

### UI components

| Name | Action | Reason |
|---|---|---|
| `Reveal` | DELETE | Per-row fade-up wrapper; every usage is removed. The barcode draw-in animation is internal to `Barcode` via its own `useReveal` call. |
| `PullQuote` | DELETE | Mid-page pull-quote pattern; replaced by prose rhythm. |
| `Barcode` | KEEP | The sole animated moment; internal `useReveal` draws bars in on scroll. Render directly in the barcode section. |
| `CountUp` | DELETE | Used only inside the deleted barcode `Reveal` wrapper. Prose can state the count inline statically. |
| `ObsRow` | DELETE | The 16-row observation grid is gone. |
| `DossierRule` | DELETE | Drives the scrolling vertical rule; no long observation column. |
| `ClimaxBlock` | DELETE | Mid-page block with frozen metrics; editorial sections replace this. Metrics still flow to `TakenStatsFooter`. |
| `FinalLine` | DELETE | "It did this in N seconds. This is what free costs." — explicitly replaced with the closing manifesto. |
| `ResonanceCta` | DELETE | Bespoke CTA; replaced by `<AdditionalReading currentHref="/garden/article/taken" />`. |
| `TabLeaveBanner` | KEEP | Tab-leave banner is consistent with the "page is watching" voice; uses `taken-banner-in` CSS which stays. |
| `TakenBody` | KEEP-MODIFIED | Exported root; rewritten JSX structure. Detection logic and hook calls preserved. |

---

## 2. New `TakenBody` component shape

```tsx
export function TakenBody() {
  const { metrics, leftFor } = useLiveMetrics();
  const reduced = useReducedMotion();
  const [state, setState] = useState<DetectionState>({ ...DETECTION_INITIAL });

  useEffect(() => { /* detection run() — see Section 8 */ }, []);

  return (
    <>
      <ArticleBody spacing="comfortable">

        <section id="taken-opener">
          {/* 2-sentence opener, page-as-watcher voice */}
        </section>

        {!state.ready && (
          <p className="text-[12px] text-white/40 font-mono taken-scan-flicker">
            reading your browser …
          </p>
        )}

        {state.ready && (
          <>
            <section id="taken-where">
              {/* label + inline citation + prose paragraph */}
              {/* DraggablePopout trigger lives here */}
            </section>

            <Divider />

            <section id="taken-browser">
              {/* "The design is the problem." on its own line at the end */}
            </section>

            <Divider />

            <section id="taken-fonts">
              {/* fontsCount used inline in prose */}
            </section>

            <Divider />

            <section id="taken-canvas">
              {/* No canvas drawn; restraint is the message */}
            </section>

            <Divider />

            <section id="taken-clipboard">
              {/* We did not request it */}
            </section>

            <Divider />

            <section id="taken-battery">
              {/* batteryLine drives the prose template branch */}
            </section>

            <Divider />

            <section id="taken-technique">
              {/* Favicon login detection; static prose */}
            </section>

            <Divider />

            <section id="taken-barcode">
              {/* sole animated moment */}
              <Barcode seed={state.fingerprint} reduced={reduced} />
            </section>

            <Divider />

            <section id="taken-prose">
              {/* Garden-zoom framing paragraph */}
              {/* Closing manifesto + dare */}
            </section>

            <TellSomeone />

            <AdditionalReading currentHref="/garden/article/taken" />

            <p className="text-[11px] text-white/35 italic">
              {/* editorial drafter's sigil */}
            </p>
          </>
        )}

      </ArticleBody>

      <TabLeaveBanner leftFor={leftFor} />
      <TakenStatsFooter
        seconds={metrics.seconds}
        scrollPct={metrics.scrollPct}
        tabSwitches={metrics.tabSwitches}
        movements={metrics.movements}
        clicks={metrics.clicks}
      />
    </>
  );
}
```

### Divider component (private, top of `taken-body.tsx`)

```tsx
function Divider() {
  return <div className="w-1/3 h-px bg-white/[0.12]" />;
}
```

### Section inner shape (each of the 9)

```tsx
<section id="taken-{slug}">
  <div className="space-y-3">
    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
      {SECTION_LABEL} <span className="normal-case not-italic text-white/25">— {CITATION}</span>
    </p>
    <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
      {PROSE — editorial drafter's paragraph, with live value spliced inline}
    </p>
  </div>
</section>
```

One dynamic value per section maximum, spliced inline: `{state.cityCountry}`, `{state.ipMasked}`, `{state.browserAndOs}`, `{state.fontsCount}`, `{state.batteryLine}`.

---

## 3. DraggablePopout integration plan

### Location

Inside the *Where you are* section (`#taken-where`), inline with the prose. Pattern is identical to `HawaiiSection` in `seeking-community-body.tsx` (lines 26–89).

### State shape (local to a `WhereSection` sub-component or inline in `TakenBody`)

```tsx
const [ipPopoutOpen, setIpPopoutOpen] = useState(false);
const [ipAnchorPos, setIpAnchorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
const [ipRedacted, setIpRedacted] = useState(false);

const handleIpOpen = useCallback((e: React.MouseEvent) => {
  setIpAnchorPos({ x: e.clientX, y: e.clientY });
  setIpRedacted(false);
  setIpPopoutOpen(true);
}, []);

const handleIpClose = useCallback(() => {
  setIpPopoutOpen(false);
  setIpRedacted(false);
}, []);
```

### Auto-redact mechanism

```tsx
useEffect(() => {
  if (!ipPopoutOpen) return;
  const timer = setTimeout(() => setIpRedacted(true), 3000);
  return () => clearTimeout(timer);
}, [ipPopoutOpen]);
```

Display switches from `state.ipFull` to `state.ipMasked` via `transition-opacity duration-500`. There is no auto-close — the reader dismisses via the popout's `×` button or Escape.

### Trigger button (inline in the Where you are prose)

```tsx
<button
  type="button"
  onClick={handleIpOpen}
  className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
>
  show me what was withheld
</button>
```

### Popout JSX

```tsx
<DraggablePopout
  open={ipPopoutOpen}
  onClose={handleIpClose}
  anchorPosition={ipAnchorPos}
  width={320}
>
  <div className="space-y-3 text-sm text-white/70 leading-relaxed">
    <p className="text-[11px] uppercase tracking-[0.15em] text-white/35">
      full ip address
    </p>
    <p
      className={`font-mono text-white text-[15px] transition-opacity duration-500 ${
        ipRedacted ? "opacity-0" : "opacity-100"
      }`}
    >
      {state.ipFull}
    </p>
    <p
      className={`font-mono text-white/50 text-[15px] transition-opacity duration-500 ${
        ipRedacted ? "opacity-100" : "opacity-0"
      }`}
    >
      {state.ipMasked}
    </p>
    <p className="text-[11px] text-white/30 pt-1">
      {ipRedacted ? "withheld again." : "redacts in 3 seconds."}
    </p>
  </div>
</DraggablePopout>
```

`minimizable` is NOT passed. Width is 320 (narrower than HawaiiSection's 420).

### Cleanup guarantee

`useEffect` cleanup fires on unmount and when `ipPopoutOpen` changes. No timer leak.

### Import

```tsx
import { DraggablePopout } from "./draggable-popout";
```

---

## 4. Tell Someone modal plan

### Component name

`TellSomeone` — defined locally in `taken-body.tsx`.

### Location

Below the closing manifesto paragraph, before `<AdditionalReading />`.

### Shape

```tsx
function TellSomeone() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const SHARE_LINE = "PLACEHOLDER — editorial drafter provides this";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SHARE_LINE);
      setCopied(true);
    } catch {
      const el = document.getElementById("taken-share-line");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      setCopied(false);
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 underline underline-offset-4 decoration-white/20"
      >
        tell someone
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-sm w-full mx-4 bg-[#0b0b0b] border border-white/10 rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
            >
              ×
            </button>
            <p
              id="taken-share-line"
              className="text-[14px] text-white/80 leading-relaxed select-all"
            >
              {SHARE_LINE}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] uppercase tracking-[0.15em] text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

No `navigator.share` (text-only per spec; system sheets clash with aesthetic). Fallback selects text so reader can `Cmd+C` manually.

Alternative: A3's component map suggests the existing `Modal` shell from `src/components/modal.tsx` (or `GlassModal`) could replace this hand-rolled modal — implementer should evaluate before building. If `Modal` supports `select-all` text + a copy button as children, prefer it.

---

## 5. Header gate decision: RESTORE the app header

**Recommendation:** DELETE `garden-header-gate.tsx`. In `src/app/garden/layout.tsx`, replace `<GardenHeaderGate />` with `<Header />` directly, importing from `@/components/header`.

**Rationale:** `GardenHeaderGate` has exactly one caller (`src/app/garden/layout.tsx`) and one entry in `HIDE_ON` (`/garden/article/taken`). It exists solely to hide the header for this one article. Consistency with the other garden articles wins over chrome-stripping borrowed from `sinceyouarrived.world`. The new piece earns attention through prose.

**Layout after change:**

```tsx
import { Header } from "@/components/header";
import { GoldInfectionWrapper } from "@/components/effects/gold-infection-wrapper";
import { PageMagnifier } from "@/components/garden/page-magnifier";
import { InventoryProvider } from "@/components/garden/article-inventory";

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoldInfectionWrapper>
      <InventoryProvider>
        <Header />
        {children}
        <PageMagnifier />
      </InventoryProvider>
    </GoldInfectionWrapper>
  );
}
```

---

## 6. `min-h-*` and per-row `Reveal` deletion list

### `min-h-[` occurrences (12 total)

| Line | Current class | Location |
|---|---|---|
| 533 | `min-h-[55vh] flex items-center justify-center px-2` | `PullQuote` — DELETE component |
| 654 | `min-h-[55vh] flex items-center` | `ObsRow` — DELETE component |
| 737 | `min-h-[60vh] flex items-center py-8` | `ClimaxBlock` — DELETE component |
| 808 | `min-h-[70vh] flex items-center justify-center` | `FinalLine` — DELETE component |
| 832 | `min-h-[45vh] flex items-center justify-center pb-8` | `ResonanceCta` — DELETE component |
| 1112 | `min-h-[40vh] flex items-end pb-4` | Opener `Reveal` wrapper — DELETE wrapper, keep prose |
| 1121 | `min-h-[35vh] flex items-center` | Loading state div — REPLACE with inline `<p>` no `min-h` |
| 1145 | `min-h-[45vh] flex items-center justify-center` | "The list is partial" `Reveal` — DELETE entire block |
| 1158 | `min-h-[55vh] flex flex-col justify-center py-8` | Barcode `Reveal` — DELETE wrapper; `Barcode` renders bare |
| 1175 | `min-h-[50vh] flex items-center` | Barcode description `Reveal` — DELETE; prose becomes section paragraph |
| 1192 | `min-h-[55vh] flex items-center justify-center` | "I did not need a single permission" `Reveal` — DELETE; prose moves into section |
| 1326 | `min-h-[60vh] flex flex-col justify-center space-y-10` | "What this page sent/stored" `Reveal` — DELETE; content moves into sections |

### `Reveal` usages in `TakenBody` JSX (lines 1109–1351)

| Lines | Usage | Action |
|---|---|---|
| 1109–1118 | Opener `Reveal` | DELETE wrapper |
| 1142–1151 | "The list is partial" | DELETE entire block |
| 1155–1168 | Barcode `Reveal` | DELETE wrapper; keep `<Barcode>` |
| 1172–1183 | Barcode description | DELETE wrapper; move prose inline |
| 1189–1199 | "I did not need" blockquote | DELETE; content absorbed into section prose |
| 1203–1319 | "Sources & confessions" `Reveal` | DELETE wrapper; content migrated to inline section citations |
| 1323–1351 | "What this page sent/stored" `Reveal` | DELETE wrapper; content migrated to sections |

---

## 7. CSS keyframe disposition

### `taken-fade-up`

**Does not exist.** Grep across `src/` returns zero matches for `taken-fade-up`. No action needed.

### `takenScanFlicker` / `.taken-scan-flicker` (globals.css)

**KEEP.** The loading state `<p className="... taken-scan-flicker">` still uses this animation. Pattern changes from a `min-h-[35vh]` div to a plain `<p>` tag but the class name and animation are retained.

### `takenBannerIn` / `.taken-banner-in` (globals.css)

**KEEP.** `TabLeaveBanner` remains; uses `.taken-banner-in` for the slide-in animation.

**Net CSS change:** Zero lines deleted from `globals.css`.

---

## 8. Detection-layer preservation plan

### Functions that stay verbatim (zero edits)

`detectFonts`, `detectGPU`, `parseUA`, `fnv1a`, `maskIP`, `timeOfDay`, `detectBattery`, `detectStorageQuota`, `detectOrientation`

### The one permitted modification: `detectGeo` return type

Add `ipFull: string` for the DraggablePopout 3-second IP reveal.

```diff
 async function detectGeo(): Promise<{
   city: string;
   region: string;
   country: string;
   isp: string;
   ipMasked: string;
+  ipFull: string;
 } | null> {
   ...
   return {
     city: data.city ?? "",
     region: data.region ?? "",
     country: data.country ?? "",
     isp: data.connection?.isp ?? data.connection?.org ?? "—",
     ipMasked: maskIP(data.ip),
+    ipFull: data.ip,
   };
```

### Fingerprint computation pipeline — verbatim

These lines (1073–1088 in current file) are copied identically into the new `run()` function body:

```ts
const fingerprintInput = [
  gpu,
  `${screen.width}x${screen.height}x${screen.colorDepth}`,
  dpr.toFixed(2),
  lang,
  tz,
  os,
  browser,
  cores,
  memory ?? "?",
  touch,
  fonts.detected.join("|"),
  colorScheme,
  cookies ? "c1" : "c0",
].join("∷");
const fingerprint = fnv1a(fingerprintInput);
```

Then: `setState({ ...fields, fingerprint, ready: true })`.

### New `DetectionState` interface (flat named fields)

```ts
interface DetectionState {
  ready: boolean;
  fingerprint: string;

  cityCountry: string;          // "Portland, Oregon, US" or "—"
  ipMasked: string;             // "12.···.···.34"
  ipFull: string;               // popout only, never displayed in prose
  isp: string;                  // "Comcast Cable"

  browserAndOs: string;         // "Chrome 124 · macOS 14.4"

  fontsCount: number;           // 27
  fontsTested: number;          // 37

  batteryLine: string | null;   // "84% · discharging · 3h 12m left" or null

  timeOfDayPhrase: string;      // "in the afternoon"
}
```

```ts
const DETECTION_INITIAL: DetectionState = {
  ready: false,
  fingerprint: "0".repeat(8),
  cityCountry: "—",
  ipMasked: "—",
  ipFull: "",
  isp: "—",
  browserAndOs: "—",
  fontsCount: 0,
  fontsTested: 37,
  batteryLine: null,
  timeOfDayPhrase: "sometime today",
};
```

### New `run()` body structure

The `run()` async function retains all variable declarations (lines 892–926) and the `Promise.all([detectGeo(), detectBattery(), detectStorageQuota(), detectOrientation()])` call. After the await:

- `observations.push(...)` calls are deleted in their entirety.
- The fingerprint block is copied verbatim.
- `setState` is called with the flat `DetectionState` object derived from the already-computed local variables.

`detectStorageQuota` and `detectOrientation` results are no longer stored or displayed but are STILL awaited in `Promise.all` for safety (zero risk of regression). Their values do not feed `fingerprintInput` so removing them would be a micro-optimization; leave them in.

---

## 9. File-touched checklist with risk callout

### `src/components/garden/taken-body.tsx` — HIGH CHURN

~80% of the file is deleted or restructured. The `cancelled` guard and `Promise.all` pattern must be preserved exactly. The fingerprint pipeline is the most critical verbatim-copy block. Implementer must diff detection variables in `run()` against the new `DetectionState` fields to ensure every fingerprint input is still computed.

### `src/components/garden/garden-header-gate.tsx` — DELETE

One caller (`layout.tsx`). Delete file. Update layout import. TypeScript will fail the build if the import is not cleaned up.

### `src/app/garden/layout.tsx` — LOW-MODERATE

Layout is shared by ALL garden articles. Replacing `<GardenHeaderGate />` with `<Header />` affects every article under `/garden/`. Verify other articles (`seeking-community`, `health-longevity`) still render the header correctly. V3 covers this in walk check #10.

### `src/app/globals.css` — NO CHANGE

`taken-fade-up` keyframe does not exist. `takenScanFlicker` and `takenBannerIn` kept. Zero lines added or deleted.

### `src/components/garden/taken-stats-footer.tsx` — UNTOUCHED

Prop interface unchanged. `useLiveMetrics` produces the same fields.

### `src/lib/garden-articles.ts` — NOT IMPLEMENTER'S SCOPE

Re-listing `taken` is Phase 4 gated by V1+V2+V3.

---

## 10. Build sequence

Each step leaves the file in a TypeScript-clean state.

**Step 1 — Delete unused components, preserve detection layer**

In `taken-body.tsx`:
- Delete `Observation` interface
- Delete `PULL_QUOTES_AFTER` constant
- Replace `DetectionState` interface with the new flat version
- Add `DETECTION_INITIAL` constant
- Delete `useDossierRule`, `Reveal`, `PullQuote`, `CountUp`, `ObsRow`, `DossierRule`, `ClimaxBlock`, `FinalLine`, `ResonanceCta`
- Update `TakenBody`'s `useState` initial value to `DETECTION_INITIAL`
- Delete `observationsRef` and its `useRef` declaration
- Stub `TakenBody` JSX to a bare `<ArticleBody>loading…</ArticleBody>` so the file typechecks

Run `bun run build` — should pass. If `Link` from `next/link` is now unused, remove the import.

**Step 2 — Update detection run() and detectGeo**

- Add `ipFull: string` to `detectGeo` return type and return object
- In `TakenBody`'s `useEffect` run():
  - Keep all variable declarations verbatim
  - Keep `Promise.all` call verbatim
  - Keep `if (cancelled) return` guard
  - Delete all `observations.push(...)` calls
  - Keep fingerprint block verbatim
  - Replace `setState` call with the flat `DetectionState` shape

Run `bun run build`.

**Step 3 — Build the 9 editorial sections (prose placeholders)**

- Add `Divider` component definition
- Replace stubbed `TakenBody` JSX with the 9 `<section>` blocks
- Use placeholder prose strings (e.g., `"[PROSE: where you are]"`) so the structure is correct
- Wire `state.cityCountry`, `state.ipMasked`, `state.browserAndOs`, `state.fontsCount`, `state.batteryLine` into sections
- Render `<Barcode seed={state.fingerprint} reduced={reduced} />` in section 8

Run `bun run build`.

**Step 4 — DraggablePopout integration**

- Add `useState` for `ipPopoutOpen`, `ipAnchorPos`, `ipRedacted`
- Add `handleIpOpen` + `handleIpClose` callbacks
- Add `useEffect` for the 3-second auto-redact timer
- Add `<DraggablePopout>` JSX in the Where section
- Add `import { DraggablePopout } from "./draggable-popout"`

Run `bun run build`.

**Step 5 — TellSomeone component**

- Add `TellSomeone` function component above `TakenBody`
- Add `<TellSomeone />` below the closing manifesto section

Run `bun run build`.

**Step 6 — AdditionalReading + byline**

- Add `import { AdditionalReading } from "./additional-reading"`
- Add `<AdditionalReading currentHref="/garden/article/taken" />` below `TellSomeone`
- Add byline `<p>` below `AdditionalReading`

Run `bun run build`.

**Step 7 — Header gate**

- Delete `src/components/garden/garden-header-gate.tsx`
- In `src/app/garden/layout.tsx`, replace `GardenHeaderGate` import with `Header` import from `@/components/header`. Replace `<GardenHeaderGate />` with `<Header />`

Run `bun run build`.

**Step 8 — Prose injection (after editorial approval)**

- Replace all `[PROSE: ...]` placeholder strings with the approved prose from `task-206-editorial.md`
- Replace `SHARE_LINE` placeholder in `TellSomeone` with the approved share line
- Replace byline placeholder with approved sigil text

Run `bun run build` — final typecheck before V1+V2+V3 handoff.

**Step 9 — CSS cleanup (no-op)**

Confirm `taken-fade-up` was never added to `globals.css`. No deletions needed.

[Task-206]
