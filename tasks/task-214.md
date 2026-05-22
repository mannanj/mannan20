### Task 214: Evaluate & adopt HyperFrames (HeyGen) for HTML-authored, deterministically-rendered video on the portfolio

**What this is.** HyperFrames is HeyGen's open-source video rendering framework. You author a composition as an **HTML file with data attributes** (`data-start`, `data-duration`, `data-track-index`, `data-volume`, etc.) and the toolchain renders it to MP4 via headless Chrome + FFmpeg. It's the HTML-native answer to Remotion (which is React/JSX-native and source-available). HyperFrames is **Apache 2.0** — no per-render fees, no seat caps, no company-size thresholds.

Repo: https://github.com/heygen-com/hyperframes (20k+ stars). Docs: https://hyperframes.heygen.com.

**Why this is interesting for *this* portfolio.** The site is already lean and HTML-forward; we already write a lot of CSS keyframes and lazy-load Three.js scenes. A composition pipeline that takes "HTML + GSAP/CSS/Three" and emits a deterministic MP4 fits naturally — we can keep the site itself featherweight while leaning on rendered MP4s for any motion that doesn't *need* to be live JS. And because the agent-first skill set is genuinely good (full slash-command suite for Claude Code), the iteration loop is the same conversational loop we already use to build everything else here.

**Key facts to retain for future-Mannan:**

- **Animation runtime is pluggable.** First-party adapters for GSAP, Anime.js, Lottie, Three.js, CSS keyframes, WAAPI. Library-clock animations (GSAP/Anime/Motion One) are *seekable and frame-accurate* under HyperFrames — Remotion plays these at wall-clock during render, which is its biggest practical gap.
- **No build step for the composition.** `index.html` plays as-is in the browser and renders deterministically headless. (Remotion requires a bundler.)
- **Deterministic.** Same input → identical output. Safe for CI rendering pipelines.
- **CLI is non-interactive by default.** Designed to be driven by agents, not humans clicking through wizards.
- **Catalog.** 50+ ready blocks/components (`flash-through-white`, `instagram-follow`, `data-chart`, shader transitions). Browse: https://hyperframes.heygen.com/catalog.
- **Requirements:** Node.js >= 22, FFmpeg installed locally.
- **Distributed rendering:** single-machine today; Remotion still wins on Lambda-style fan-out (not relevant for portfolio use).

---

#### Two integration paths (decide per-use, not globally)

**Path A — Pre-render to MP4 (default).** Author a composition, run `npx hyperframes render`, commit the resulting MP4 under `public/videos/`, embed with a stock `<video>`. The site stays as light as it is today; HyperFrames is a build-time dependency only.

**Path B — Live in-browser via `<hyperframes-player>` web component (`@hyperframes/player`).** Ship the HTML composition and the player runtime. Useful only when the composition must re-read live data (e.g., re-renders when `public/data/about.json` changes). Adds runtime weight to a deliberately lean site — bias against unless there's a concrete need.

**Default recommendation: Path A.** Treat Path B as a special-case escape hatch.

---

#### Concrete fits in this repo (candidate compositions to build, ordered by likely value)

1. **Hero loop complement / alternative to the Unicorn Studio scene.** A 6–10s seamless loop in the same iridescent palette as `public/unicorn/health-hero-scene.json`. Could either replace the Unicorn scene on low-power devices or play alongside it as a second motion layer. **Validates the pipeline on the most visible surface.**
2. **Per-project intro reels** played inside the Three.js deep-dive (`about.tsx` lazy-loads the deep-dive — perfect attach point). 4–6s each, sourced from project metadata in `public/data/about.json`.
3. **Auto-generated social share videos** sourced from `about.json`. One template, many MP4s — title card + animated stat ribbon + closing card. Republishable per project.
4. **MP4 fallback for the Three.js deep-dive.** For devices where the Three.js scene is too expensive (or where JS is disabled), a pre-rendered MP4 walkthrough of the same scene preserves the narrative beat. Path A is ideal here — render once, serve forever.
5. **Garden article hero clips.** Each long-form essay (`taken/`, `seeking-community/`, `health-longevity/`, `ai-false-positives/`, `funny-frustrations/`) could open with a 3–5s motion piece keyed to the article's tone. Especially natural for `taken/` — the tracking-receipt aesthetic is already animation-shaped.

---

#### Subtasks

##### Phase 0 — On-ramp (do first, low cost)

- [ ] Install the agent skills: `npx skills add heygen-com/hyperframes`. This registers `/hyperframes`, `/hyperframes-cli`, `/hyperframes-media`, `/gsap`, `/three`, `/animejs`, `/css-animations`, `/lottie`, `/waapi`, `/tailwind` as slash commands in Claude Code so future iterations are conversational, not docs-spelunking.
- [ ] Verify local toolchain: Node ≥22 (`node -v`), FFmpeg present (`ffmpeg -version`). Install FFmpeg via Homebrew if missing.
- [ ] Scaffold a sandbox under `videos/` (sibling of `scripts/`) with `npx hyperframes init` and confirm `npx hyperframes preview` opens the live preview locally. **Do not** put this under `public/` — `public/` is the rendered output, not the source.
- [ ] Decide directory convention:
  - **Proposal:** sources at `videos/<name>/index.html` (+ supporting CSS/assets); rendered outputs at `public/videos/<name>.mp4`. A `videos/README.md` explains the convention and the `bun run videos:build` (or equivalent) command.
- [ ] Add `videos/` to git, but **gitignore the local preview server's tmp/build output** if HyperFrames produces any.

##### Phase 1 — First composition end-to-end (hero loop pilot)

- [ ] Build a 6–8s seamless hero loop composition under `videos/hero-loop/index.html`. Palette: iridescent — sample colors from `public/unicorn/health-hero-scene.json`. Motion runtime: GSAP (best seekability + already conceptually familiar from the Unicorn scene).
- [ ] Render to `public/videos/hero-loop.mp4`. Target: ≤ 1.5 MB at 1920×1080 / 30fps / H.264 baseline. If it overshoots, drop to 1280×720 — the hero is shown small.
- [ ] Add a `bun run videos:build` (or `videos:render`) script in `package.json` that re-renders every composition under `videos/` into `public/videos/`. Idempotent. Skip unchanged sources via mtime check if HyperFrames doesn't already.
- [ ] Decide hero integration:
  - **Option 1 (low-disruption):** Add the MP4 as a secondary motion layer behind/beside the Unicorn scene, with `prefers-reduced-motion` honored.
  - **Option 2 (replacement):** Swap in the MP4 on devices where the Unicorn scene's WebGL cost is high (e.g., `navigator.hardwareConcurrency <= 4` heuristic, or just always on iOS Safari).
  - **Option 3 (defer):** Render the MP4, commit it, but don't wire it into the live site yet — just use the build to validate the pipeline.
- [ ] Lighthouse before/after on `/`: confirm no regression in LCP, CLS, or total transfer.

##### Phase 2 — Establish the pattern (only after Phase 1 ships clean)

- [ ] Add a second composition: per-project intro reel for one chosen project from `about.json`. Validates that the pipeline scales to N templates.
- [ ] Build a tiny generator — read `about.json`, emit a composition HTML per project from a shared template, render all of them via the `videos:build` script. This is where HyperFrames starts paying off: one template, every project gets a video.
- [ ] Hook the rendered intros into the deep-dive UI (`src/components/about.tsx` and its lazy-loaded children).

##### Phase 3 — Social/SEO surfaces

- [ ] Generate per-project social share videos (16:9 and 9:16 variants) for OG/Twitter cards. Output to `public/videos/social/`.
- [ ] Decide whether to also produce static OG images from the same compositions (HyperFrames can capture a single frame).

##### Phase 4 — Garden article hero clips (optional, lowest priority)

- [ ] Pilot on `taken/` — its receipt-style aesthetic is already animation-shaped. 3–5s open.
- [ ] If it lands well, template it for the other four articles.

##### Phase 5 — Three.js deep-dive MP4 fallback

- [ ] Use the `three` skill / adapter to capture the Three.js deep-dive scene to MP4 at a fixed-duration walkthrough. Serve as a fallback when JS is disabled or device is low-power. This is the highest-effort phase — defer until Phases 1–2 prove the pipeline.

---

#### Tradeoffs / risks (be honest before betting on it)

- **Toolchain surface area.** Node ≥22 + FFmpeg + headless Chrome adds real dependencies to the render pipeline. Acceptable as a *build-time* dependency (Path A) but would be heavier if used at runtime (Path B).
- **Young ecosystem vs. Remotion.** Remotion has years more community templates, components, and Stack Overflow coverage. For one-off hero / intro clips this is fine; we wouldn't want to bet a whole video product on it.
- **Render reproducibility across machines.** Headless-Chrome video capture can be subtly font / GPU dependent. Need to confirm renders are identical on the CI runner as on local — bake any custom fonts into the composition, don't rely on system fonts.
- **Git LFS isn't strictly needed for our use** — our MP4s will be small (≤ a few MB each). Don't pull in LFS unless the rendered total exceeds ~50 MB committed.
- **License diligence done:** Apache 2.0, OSI-approved, commercial use unrestricted. No action needed.

---

#### Out of scope (do not do here)

- No Path B (`<hyperframes-player>` runtime embed) in the initial adoption. Path A only.
- No replacing the Unicorn Studio hero outright — we may *complement* it, but the Unicorn scene's audio-reactive + interactive shader behavior isn't something HyperFrames is trying to be.
- No video-on-demand / per-visitor personalized renders. That's a server-side render farm, not a portfolio dependency.
- No CI render step yet. First ship local-only renders committed as MP4s, *then* decide whether to automate.

---

#### References (sourced from the README, verified against the public repo)

- Repo: https://github.com/heygen-com/hyperframes
- Docs: https://hyperframes.heygen.com/introduction
- Quickstart: https://hyperframes.heygen.com/quickstart
- Catalog: https://hyperframes.heygen.com/catalog
- HyperFrames vs Remotion: https://hyperframes.heygen.com/guides/hyperframes-vs-remotion
- Prompting guide: https://hyperframes.heygen.com/guides/prompting
- npm: https://www.npmjs.com/package/hyperframes

---

- Location:
  - `videos/` (new — composition sources)
  - `public/videos/` (new — rendered MP4 outputs)
  - `package.json` (new script: `videos:build`)
  - `videos/README.md` (new — directory convention + workflow)
  - Possible integration touchpoints: `src/components/hero.tsx`, `src/components/about.tsx`, `src/components/garden/*-body.tsx`
  - `.gitignore` (HyperFrames preview/tmp output if any)

[Task-214]
