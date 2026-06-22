### Task 256: Build "Archipelago" — an open-world island-navigation game with a skinnable identity layer (first skin: a Flow job application)

**Status: TODO. Do not implement as part of task creation.**

Build an open-world navigation game for the portfolio: the site's sections become **islands** on a warm
sea, the cursor becomes a **glove hand**, and you travel the world by clicking islands (mouse), moving an
avatar (keyboard), or tapping (touch). Crucially, build a **data-driven skin system** so a single themed
"skin" can re-dress the entire world — palette, avatar, cursor, copy, and island framing — and be "spawned"
from a URL. The **first skin is a targeted job application to Flow** (Adam Neumann's residential
real-estate / "branded-living" company) for the **Senior Software Engineer — AI Products** role
(`https://jobs.lever.co/flowlife/cb1b3971-6a5a-4a7c-80c4-a8c140782955`).

The strategic point: that role's #1 ask is "use **Claude Code and Cursor** as force multipliers" and "build
AI-assisted tools." A navigation game built with Claude Code, skinned for Flow, is a **playable cover letter
whose existence is the proof of the core requirement**. The medium is the message.

> Interpretation note: "open platform game" is read here as an **open-world game for navigating the platform
> (the site)**, with the skin system as the "infrastructure to spawn into specific skins." If you meant
> "open" as in open-source/extensible engine, the skin registry already delivers that — see Open Questions.

---

#### Context — what already exists (verify against the live code before building)

**Navigable surface to map onto islands** (from the inventory; re-confirm at implementation time — derive the
island set from a single source of truth, do not hard-code a stale list):
- Home scroll-sections — `Section = 'home' | 'about' | 'contact'` (authoritative: `src/lib/utils.ts`,
  `src/context/app-context.tsx`). Reached via `scrollToSection(section)`.
- Routes under `src/app/`: `/garden` (+ `/garden/article/[slug]`), `/episodes` (+ `/episodes/[slug]`),
  `/mcp`, `/jordan`, `/robotics`, `/game` (the existing chicken game), plus utility flows
  (`/payment`, `/download-resume`, `/schedule`, `/support/[company]`). The utility flows are **not** islands.
- About sub-sections: employment, published works, extracurriculars, education (`src/components/about/`).

**Navigation mechanics to reuse (do not reinvent):**
- `scrollToSection(section: Section)` — `src/lib/utils.ts` (SSR-safe; per-section offset ratios).
- Global state — `src/context/app-context.tsx`: `useApp()` exposes `state` (`activeSection`,
  `contactModalOpen`, `commandsModalOpen`, contact fields…) plus `setActiveSection`, `openContactModal(x,y)`,
  `closeContactModal`, `setContactResult`, `toggleCommandsModal`. Reuse `openContactModal` for the Flow CTA.
- "/" command palette — `src/components/keyboard-commands-modal.tsx` (commands: home/about/contact/
  contact-modal/download-resume). Add an "explore the islands" command here as one entry point.

**The game precedent to mirror (the established pattern):**
- Chicken game — `src/components/game/chicken-game.tsx`, route `src/app/game/page.tsx`.
- Rendering: single `<canvas>` + `requestAnimationFrame` loop; physics/particles in `useRef` arrays (not
  React state) for perf; HUD/overlays as React DOM on top. Effects helpers in
  `src/components/game/chicken-effects.ts`.
- **Cosmetic-skin precedent already exists**: `src/components/game/chicken-skins.ts` (skin definitions +
  localStorage). The Archipelago skin system is the richer, generalized version of this idea.
- Custom cursor precedent: `.chicken-hand-cursor` in `src/app/globals.css` (SVG data-URI, default + `:active`
  states). The glove-hand cursor follows this exact technique.
- Caveat learned from those files: `chicken-game.tsx` (~72K) and `header.tsx` (~95K) are monoliths. **Do not
  repeat that** — split the engine into the small modules listed under Architecture.

**Lazy-loading pattern:** `React.lazy(() => import(...))` wrapped in `<Suspense fallback={null}>` (used across
`src/components/episodes/` and `src/components/garden/`). Lazy-load the canvas engine this way so it never
bloats the initial bundle.

**Aesthetic / tokens:** `src/app/globals.css` holds the warm-light "Paper" design. **VERIFY the token
mechanism yourself** — the inventory was uncertain whether tokens live in an `@theme` block; read the file
and use whatever mechanism is actually there. `prefers-reduced-motion: reduce` is already handled in several
places; the game must honor and extend it.

**Flow — the target (confirmed via research; correct any drift before writing copy):**
- Flow = Adam Neumann's a16z-backed residential real-estate / "branded-living" company. **NOT a health,
  wellness, longevity, or biohacking app** — do not imply otherwise in any skin copy.
- Mission language to echo: **"Live Life in Flow"**, the **"Mission of Oneness"**, *"communities designed to
  connect you with yourself, your neighbors, and the natural world"*, community as the antidote to loneliness
  and isolation. (A health-and-technology background bridges via Flow's wellbeing-amenity layer + its
  anti-loneliness *public-health* framing — connect through **community/connection**, never "health app".)
- Brand palette (production CSS, for the Flow skin tokens):
  cream `#f3eddf`, cream-soft `#f9f7f0`, sand `#ddd8cb`, ink `#3d3d3d`, ink-soft `#646464`,
  sky `#c3d9e0`, rose `#f99aa9`, gold `#c0bf94`, midnight `#1a1a1a`;
  signature gradient `linear-gradient(135deg, #c3d9e0, #c0bf94)` (sky→sage-gold);
  single-stroke cursive lowercase **"flow"** wordmark; body type **Poppins**, big organic display.
  (This is a near-cousin of the site's existing "Paper" system — the skin will feel native.)
- The role — **Senior Software Engineer, AI Products** (Engineering; Bay Harbor Islands, FL; in-office;
  full-time). What they want, to pin each island to:
  - Generalist, **5+ years**, early-stage/scrappy, **end-to-end ownership**, energized by ambiguity, ships fast.
  - Full-stack: backend services, APIs, internal tooling, **lightweight frontend**.
  - **Build AI-assisted tools/workflows that surface insights and automate repetitive work.**
  - **Use AI coding assistants (Claude Code, Cursor) as force multipliers** at production quality.
  - Python and/or strongly-typed backend; SQL; cloud (**GCP / Kubernetes**); **integrate/build with LLMs**
    with practical judgment on AI value.
  - **Strong written communicator** — clear documentation and **clear prompts**.
  - Nice-to-have: proptech/real-estate/ops, dbt/analytics engineering, lightweight data pipelines.

---

#### Game design

- **World:** a full-viewport, top-down (loosely isometric is fine) **sea dotted with islands**. Calm,
  ambient water motion. One island per real destination (see mapping below). A subtle minimap/compass.
- **Glove-hand cursor:** over the game canvas, replace the pointer with a skin-defined glove hand (SVG
  data-URI, mirroring `.chicken-hand-cursor`). States: idle → "points" on island hover → "grabs/taps" on
  click. Hidden on touch devices; default cursor restored outside the canvas.
- **The avatar = the thing you "spawn" with a skin.** A small voyager on the map (skin-defined art + idle/
  move/dock animation). It is the identity layer the user controls per skin.
- **Travel / interaction (support all three):**
  - **Mouse:** click an island → glove taps → avatar sails to it (wake trail) → on arrival, navigate to the
    real destination. Offer an instant **Skip** (and instant nav under reduced-motion).
  - **Keyboard:** arrow keys / WASD move the avatar; `Tab`/`Shift+Tab` cycle islands with a visible focus
    ring; `Enter` docks at the focused/nearest island (→ navigate); `Esc` exits the game. Required for a11y.
  - **Touch:** tap island to travel; drag to pan; pinch (or buttons) to zoom on small screens.
- **Dock card:** arriving at an island opens a small React panel: island name, one-line description, and a
  primary **"Go here"** button that performs the real navigation. Closing it returns to the map.
- **Exit / entry:** a clear "exit to site" affordance; entry points listed under Architecture.

**Island → destination mapping (default skin).** Derive from one source-of-truth array
(`ISLANDS` in `atlas-world.ts`); each island declares how it navigates (scroll-section vs route):

| Island id | Default label | Destination | Nav method |
|-----------|---------------|-------------|------------|
| `home`     | Health is an Artform | `home` section   | `scrollToSection('home')` |
| `about`    | About                | `about` section  | `scrollToSection('about')` |
| `mcp`      | MCP Server           | `/mcp`           | `router.push('/mcp')` |
| `garden`   | The Garden           | `/garden`        | `router.push('/garden')` |
| `episodes` | Episodes             | `/episodes`      | `router.push('/episodes')` |
| `robotics` | Robotics             | `/robotics`      | `router.push('/robotics')` |
| `jordan`   | Jordan               | `/jordan`        | `router.push('/jordan')` |
| `arcade`   | Chicken Game         | `/game`          | `router.push('/game')` |
| `contact`  | Contact              | `contact` section + contact modal | `scrollToSection('contact')` / `openContactModal` |

> Section nav from a non-home route must route to `/` first, then scroll (e.g. push `/` then call
> `scrollToSection` after navigation settles). Encapsulate this in one `navigateToIsland(island)` helper.

---

#### The skin system (the core "infrastructure" — first-class deliverable, not a Flow one-off)

A **skin** is a typed, data-driven theme pack. **All skin-specific behavior flows through this data model —
no per-skin conditionals inside the engine.** Adding a future skin (another application, another audience)
must be "author one file + register it," nothing more.

Define `GameSkin` (`src/components/atlas/skins/types.ts`) covering at least:
- `id`, `name`, `tagline`.
- **`palette`** — sea, island base/edge, sky/gradient, ink/text, accent(s). Drive **both** canvas drawing and
  DOM via CSS custom properties so they stay in sync (set vars on the game root; canvas reads the same values).
- **`avatar`** — the spawnable character (vector spec drawn in-canvas like `chicken-svg`, or a sprite sheet),
  with idle/move/dock states.
- **`cursor`** — glove-hand SVG data-URIs (idle + active), per skin.
- **`vessel`** *(optional)* — boat / raft / swimmer / bird for the travel animation.
- **`world`** — title, onboarding/mission copy, per-island **label + blurb overrides**, optional reordering
  or subsetting of islands, and an optional designated **CTA island**.
- **`audio`** *(optional)* — ambient loop + SFX set (respect a global mute; default off until interaction).
- **`meta`** — OG/share title + description + image for the skin's route.

Registry & resolution:
- `src/components/atlas/skins/index.ts` — `SKINS` keyed by id + `getSkin(id?: string): GameSkin` with safe
  fallback to `default`.
- **"Spawn" mechanism (how the user picks a skin):**
  - `/atlas` → default skin.
  - `/atlas/[skin]` (dynamic route) → named skin; `generateStaticParams` for known skins,
    `generateMetadata` per skin for shareable OG cards. Unknown skin → fall back to default (or 404; decide).
  - Optional vanity alias `/flow` → renders the atlas with the Flow skin (a thin wrapper/redirect so the
    hiring link is clean: `mannan.is/flow`).
- This is exactly "the infrastructure to spawn into specific skins": `default.ts` and `flow.ts` are just data.

---

#### The Flow skin (the job-application artifact)

`src/components/atlas/skins/flow.ts` — re-dresses the world in Flow's brand and reframes every island as
evidence for **Senior Software Engineer, AI Products**. The sea is "Flow" (the connective water; "life in
flow"); palette = the Flow tokens above; cursor + avatar recolored to Flow's pastels; type leans Poppins.

**Onboarding/mission copy (make the proof explicit, echo Flow's language):** e.g.
> "Welcome to Flow. Mannan built this island world end-to-end with **Claude Code** — the same force
> multiplier your AI Products team runs on. Sail it. Every island is one reason he should help build Flow's
> AI products in Miami."

Keep it honest: community / oneness / connection + AI-products craft. **Do not** call Flow a health/wellness
company.

**Island reframing (Flow skin) — each island pinned to a JD requirement:**

| Island | Flow-skin label | Evidence it presents |
|--------|-----------------|----------------------|
| `home`     | **The Shore — Live Life in Flow** | Tone-setter; the "built with Claude Code" framing |
| `mcp`      | **Agent Harbor** | His **live public MCP server** (`mcp.mannanteam.workers.dev`) — direct proof of *"integrating/building with LLMs"* + *"AI-powered platform capabilities."* The single strongest island for this role. |
| `about`    | **The Builder** | Generalist, founder/operator, **end-to-end ownership**, 5+ yrs |
| (apps)     | **The Workshop** | Ships **AI-assisted tools** that surface insights / automate work |
| `garden`   | **The Library** | **Strong written communicator** — clear docs & prompt craft |
| `episodes` | **The Signal** | Narrative + communication range |
| `robotics` | **The Yard** | Generalist hardware+software breadth |
| `arcade`   | **The Arcade** *(easter egg)* | Ships delightful interactive things fast |
| `contact`  | **Flow HQ — Join the Crew** *(CTA island)* | The application close |

**CTA island ("Flow HQ"):** the designated end-state. Reuse the existing contact + resume flows — open the
contact modal (`openContactModal`) and surface the résumé download — with copy like "Mannan wants to help
build Flow's AI products in Miami." Decide (Open Questions) whether it also fires a real notification through
the existing contact/email pipeline or just reveals contact + résumé.

**Privacy:** the Flow skin is a **targeted, unlisted** artifact. Its route must be `noindex`, excluded from
`sitemap`, and **kept out of the public MCP snapshot / `llms.txt`** (it is not general public data; treat
like the gated `/jordan`). Confirm the MCP build guards do not pick it up.

---

#### Architecture & files (keep modules small — avoid the chicken-game monolith)

Mirror `src/components/game/` + `src/app/game/`:

- `src/app/atlas/page.tsx` — default-skin route (server component; metadata; renders the lazy client engine).
- `src/app/atlas/[skin]/page.tsx` — named-skin route; `generateStaticParams` + per-skin `generateMetadata`.
- `src/app/flow/page.tsx` *(optional)* — vanity alias to the Flow skin (thin wrapper or redirect), `noindex`.
- `src/components/atlas/atlas-game.tsx` — `'use client'`; canvas + `requestAnimationFrame` engine + state.
  Lazy-loaded by the route via `React.lazy` + `<Suspense fallback={null}>`.
- `src/components/atlas/atlas-world.ts` — `ISLANDS` source-of-truth, layout/positions, sea bounds, hit-testing.
- `src/components/atlas/atlas-render.ts` — canvas draws (sea, shimmer, islands, avatar, vessel, wake); DPR-aware.
- `src/components/atlas/atlas-input.ts` — pointer/keyboard/touch handling; island hit-tests; focus model.
- `src/components/atlas/navigate-island.ts` — single `navigateToIsland(island)` (router + `scrollToSection`,
  including the "route to `/` first, then scroll" case) reusing `src/lib/utils.ts` and `next/navigation`.
- `src/components/atlas/atlas-hud.tsx` — React overlay: island labels, focus ring, dock prompt, mission card,
  Skip/Exit, minimap, **ARIA live region** for announcements.
- `src/components/atlas/island-card.tsx` — the dock panel with the "Go here" action.
- `src/components/atlas/skins/{types.ts,default.ts,flow.ts,index.ts}` — the skin system.
- Glove cursor CSS — extend `src/app/globals.css` with per-skin glove-hand classes (SVG data-URI technique
  copied from `.chicken-hand-cursor`).
- Entry points: add an "Explore the islands / Map" command to `keyboard-commands-modal.tsx`; consider a
  subtle header affordance (Open Questions).

**Performance & resilience:**
- Lazy-load the engine; size canvas to `devicePixelRatio`; cap particle counts.
- Pause the rAF loop on `document.hidden` (visibilitychange) and when off-screen.
- `prefers-reduced-motion: reduce` → no sailing animation, no water shimmer; islands become a **static,
  focusable, click-to-instant-navigate** map. Honor the existing reduced-motion handling in `globals.css`.
- Build gotcha (from project memory): **do not `next build` while the port-3847 dev server is running** —
  the shared `.next` corrupts both. Verify via HMR, or run an isolated worktree build on a scratch port.

**Accessibility & progressive enhancement (hard requirement):**
- The game is an **enhancement layer only**. Every destination stays reachable via the existing header,
  routes, and "/" palette. Server routes and SEO are unaffected.
- Fully keyboard-operable (Tab/arrows/Enter/Esc) with visible focus and an ARIA live region announcing the
  focused island and arrivals.
- Mobile: adequately sized touch targets; pan/zoom; on very small viewports, fall back to a simple
  focusable island **list** if the map is impractical.

---

#### Requirements (checklist)

Engine & world
- [ ] Canvas + `requestAnimationFrame` engine mirroring the chicken-game pattern, split into the small modules above.
- [ ] `ISLANDS` single source of truth; islands rendered on a warm sea; one per real destination from the mapping.
- [ ] Glove-hand cursor over the canvas (idle/point/grab), SVG data-URI per `.chicken-hand-cursor`; hidden on touch.
- [ ] Skinnable avatar ("spawn") with idle/move/dock states.
- [ ] Mouse click-to-travel (with Skip), keyboard move + Tab-cycle + Enter-dock + Esc-exit, and touch tap/pan/zoom.
- [ ] Dock card with a "Go here" action; `navigateToIsland()` performs real navigation (incl. route-then-scroll).

Skin system (infrastructure)
- [ ] `GameSkin` type covering palette, avatar, cursor, vessel, world copy/labels/blurbs, CTA island, audio, meta.
- [ ] Palette drives canvas + DOM via shared CSS custom properties.
- [ ] `SKINS` registry + `getSkin()` with safe fallback to `default`.
- [ ] Skin selected by route: `/atlas` (default) and `/atlas/[skin]` (named) with per-skin metadata/OG.
- [ ] **Zero per-skin conditionals inside the engine** — all variation comes from skin data.

Flow skin (the artifact)
- [ ] `flow.ts` with Flow palette, recolored cursor/avatar, Poppins-leaning type, and the island reframing table.
- [ ] Onboarding/mission copy echoing Flow's language and stating it was **built with Claude Code** (the proof).
- [ ] "Flow HQ" CTA island reusing the contact modal + résumé flow; copy targets the AI Products role in Miami.
- [ ] Copy is honest: community/oneness/connection + AI-products craft; **never** "health/wellness company."
- [ ] Flow route is `noindex`, excluded from sitemap, and **kept out of the MCP snapshot / `llms.txt`**.
- [ ] Optional `/flow` vanity alias for a clean hiring link.

Cross-cutting
- [ ] Lazy-load the engine (`React.lazy` + `Suspense fallback={null}`).
- [ ] `prefers-reduced-motion` → static, instant-nav, focusable map.
- [ ] Full keyboard a11y + ARIA live announcements; mobile touch + small-viewport list fallback.
- [ ] Pause rAF when hidden; DPR-aware canvas; capped particle budgets.
- [ ] "Explore the islands" entry added to the "/" command palette.
- [ ] `data-testid` hooks on all interactive surfaces for E2E.

---

#### Validation (tests + mutation testing)

Add Playwright specs (`e2e/atlas.spec.ts`, `e2e/atlas-flow-skin.spec.ts`) following the repo pattern
(`test.describe`, `page.goto`, `getByTestId`, exact assertions, screenshots). Use `data-testid` hooks:
`atlas-canvas`, `atlas-island-<id>`, `atlas-dock-card`, `atlas-mission`, `atlas-skip`, `atlas-exit`,
`atlas-skin-flow`, `atlas-cta`. (Note the dev server runs on **port 3847**; confirm Playwright `baseURL`.)

- [ ] `/atlas` renders the canvas + HUD and **exactly N** islands (N = mapped destinations — assert the count).
- [ ] Clicking each island navigates to its **exact** destination (assert URL / scroll position precisely).
- [ ] Keyboard: arrows/Tab focus islands, `Enter` docks→navigates, `Esc` exits.
- [ ] Glove cursor class/CSS applied over the canvas; default restored outside.
- [ ] `/atlas/flow`: Flow **palette tokens** applied (assert exact color values), Flow **island labels**
      present (exact strings), onboarding copy contains the exact **"Claude Code"** phrasing, and the
      "Flow HQ" CTA opens the contact/résumé flow.
- [ ] `prefers-reduced-motion` emulated: no travel animation; instant nav still reaches the right destination.
- [ ] Flow route is `noindex` and absent from `sitemap` / `llms.txt` / MCP snapshot (assert exclusion).
- [ ] `bun run build` passes (respect the no-`next build`-during-dev-server gotcha).
- [ ] If site-indexed data changed (it should not — atlas is navigation, not data), run `bun run mcp:check`.

**Mutation testing (required for every E2E scenario — per repo standard).** For each load-bearing assertion,
prove the test catches its bug: break the exact production code, confirm RED, revert, confirm GREEN. Fill in:

| Scenario | Load-bearing assertion | Mutation to apply | Expected | CAUGHT/ESCAPED |
|----------|------------------------|-------------------|----------|----------------|
| Island count | exact N islands | drop one island from `ISLANDS` | RED | _fill in_ |
| Navigation | exact destination per island | point a click handler at the wrong route/section | RED | _fill in_ |
| Flow palette | exact sea/ink color values | change a Flow token | RED | _fill in_ |
| Flow copy | exact "Claude Code" onboarding string | alter the phrase | RED | _fill in_ |
| Reduced-motion | instant nav, no animation | remove the reduced-motion guard | RED | _fill in_ |
| Flow privacy | absent from sitemap/MCP | un-exclude the route | RED | _fill in_ |

Any ESCAPED (stays green on broken code) → strengthen the assertion (pin exact values/counts), then re-mutate.

---

#### Non-goals

- Not a physics platformer or a full game engine — it is a navigation + identity layer.
- Do not replace or weaken existing navigation; the header, routes, and "/" palette stay primary; SEO intact.
- Do not bake Flow-specific (or any skin-specific) logic into the engine — everything goes through `GameSkin`.
- Do not describe Flow as a health/wellness/longevity company in any copy.
- Do not expose the targeted Flow pitch to the public MCP snapshot / `llms.txt` / sitemap (keep it unlisted).
- Do not recreate the chicken-game/header monolith — keep modules small and focused.
- Do not add comments to code (project rule).

---

#### Decisions to confirm (recommended defaults in **bold** — proceed on these unless Mannan says otherwise)

- Engine name: **"Archipelago"** (route `/atlas`) — or pick another (Isles, Atlas, Voyage).
- Travel model: **avatar sails to the island, with a Skip; reduced-motion = instant** — vs. always-instant.
- Entry points: **"/" palette command + the direct route** — also add a header affordance? (default: not yet.)
- Flow link shape: **`/atlas/flow` + a `/flow` vanity alias**, both `noindex`/unlisted.
- "Flow HQ" CTA: **reveal contact + résumé and reuse `openContactModal`** — or also fire a real
  notification through the existing contact/email pipeline?
- Avatar art: **vector-drawn in-canvas** (like `chicken-svg`) — vs. sprite-sheet assets.
- Default-skin island set: confirm the nine in the mapping table (esp. whether `/robotics`, `/jordan`, and the
  chicken-game `arcade` island should all appear by default, or only in certain skins).

[Task-256]
