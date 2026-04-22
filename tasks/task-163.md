### Task 163: Unicorn scene — 3x slowdown + iridescent recolor with re-export pipeline
- [x] Slow Health hero animation 3x on visible animating layers
- [x] Replace baked orange with iridescent cosine palette (animated in wisps, spatial in outline)
- [x] Split scene into `health-hero-scene.raw.json` (pristine) and derived `health-hero-scene.json`
- [x] Add `scripts/apply-unicorn-transforms.mjs` transform (idempotent, logs replacement counts)
- [x] Wire `unicorn:build` script and `postinstall` hook in `package.json`
- [x] Document workflow and option A/B/C tradeoffs in `public/unicorn/README.md`
- [x] Add re-export workflow pointer to `.claude/CLAUDE.md`
- Location: `public/unicorn/`, `scripts/apply-unicorn-transforms.mjs`, `package.json`, `.claude/CLAUDE.md`

[Task-163]
