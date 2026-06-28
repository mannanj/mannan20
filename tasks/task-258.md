### Task 258: Garden "Claude Code skills" reading + searchable skills table (SHELVED)

**Status:** Shelved 2026-06-27 by Mannan ("not providing any value"). Implementation was fully built + verified, then reverted. This file is the recipe to rebuild it later if revived. Do NOT work on it until asked.

**Goal:** A garden reading that introduces Claude Code skills to readers and shares Mannan's own skills — a short intro + how-to-install, two featured skills in depth, then a searchable table of the rest, each downloadable as a zip.

**Placement decision (important):** Lives under the **Readings** tab only (the `EPISODES` list in `src/lib/episodes.ts`), NOT under Writings (`GARDEN_ARTICLES`). Mannan explicitly chose Readings.

#### What to (re)build
- [ ] Article page: `src/app/garden/article/claude-skills/page.tsx` — copy the self-parenting page shell (`ArticleLayout` → `ArticleHeader`/`ArticleTitleRow`/`ArticleTitle variant="editorial"` → `ArticleMeta date="June 27, 2026" readTime="5 min read" wordCount="900 words"` → `ArticleCaption` → `<ClaudeSkillsBody/>`). No header `GardenArticleActions` (downloads live in the body). Title: "Two skills I install in Claude Code".
- [ ] Body: `src/components/garden/claude-skills-body.tsx` (`"use client"`). Sections: intro (what a skill is — a folder with `SKILL.md`; loaded by description), "Installing any skill" (the `~/.claude/skills/` layout + drop-folder-and-restart), two `SkillCard`s, then `<SkillsTable/>`, then a closing line. Includes a `CommandBlock` with copy button (uses `copyToClipboard` from `@/lib/utils` + `CopyIcon`/`CheckIcon`); make code blocks wrap (`whitespace-pre-wrap break-all`) so long commands stay clear of the copy button. `DownloadButton` links to `/api/download/<slug>`.
- [ ] Searchable table: `src/components/garden/skills-table.tsx` (`"use client"`) — `useState` query + `useMemo` filter on name/description/note, "N of 9" count, real `<table>` (Skill | What it does | Get), per-row `/api/download/<slug>` link styled `text-[#a78bfa]`, empty state. Accent `#a78bfa` (violet) matches the views dot.
- [ ] Readings entry: add to `EPISODES` in `src/lib/episodes.ts` at the top: `{ title: 'Two skills I install in Claude Code', author: 'Mannan Javid', date: 'June 27, 2026', href: '/garden/article/claude-skills' }` (remove `hidden` to publish).
- [ ] Views accent: add `"claude-skills": "#a78bfa"` to `GARDEN_VIEW_ACCENTS` in `src/lib/garden-views.ts` (needed so `ArticleViews slug="claude-skills"` typechecks and the `/api/garden/views/<slug>` guard accepts it).
- [ ] Sitemap: re-apply the dedupe-by-url guard in `src/app/sitemap.ts` (article would otherwise appear twice — once via GARDEN_ARTICLES if also in Writings, once via EPISODES).
- [ ] Downloads: add `DOWNLOADS` entries in `src/lib/downloads.ts` for each hosted skill, slug `<name>-skill`, key `portfolio/skills/<name>-skill.zip`, contentType `application/zip`.

#### Featured skills (the two SkillCards)
- **handoff** — Mannan's own (no public source). Fresh-context handoff doc. Host a zip; install via download + unzip, or one-liner `curl -L https://mannan.is/api/download/handoff-skill -o handoff-skill.zip && unzip -o handoff-skill.zip -d ~/.claude/skills/`.
- **improve** — shadcn's, MIT (`github.com/shadcn/improve`). Read-only senior-advisor audit → plans for cheaper models. Canonical install `npx skills add shadcn/improve`; also offer the pinned zip.

#### The 9 "own" skills for the table (name → one-liner)
collab, dispatch, session-audit, coding-strategy, distill-creation-request (bundles sub-agents), orchestrate (bundles agents + templates), clone-website, landing-page-mannan, skillguard. Source = `~/.claude/skills/<name>/`. Descriptions are in git history of the reverted `skills-table.tsx` (or rewrite from each `SKILL.md`). Deliberately EXCLUDED: vendor/third-party (Jesse Vincent's *superpowers* cluster, shadcn), Anthropic-bundled (docx/pdf/pptx/xlsx/etc.), and symlinked vendor skills.

#### Hosting recipe (R2)
Zip each skill folder-at-top so it unzips into `~/.claude/skills/<name>/`:
`cp -R ~/.claude/skills/<name> stage/<name> && (cd stage && zip -r <name>-skill.zip <name>)` then
`node scripts/upload-to-r2.mjs stage/<name>-skill.zip portfolio/skills/<name>-skill.zip application/zip`.
The 11 R2 objects created during the build (handoff, improve + the 9) were **deleted** on revert — re-upload on revival. Run a secret-scan over the skill dirs before publishing.

#### Gotchas / open considerations
- **Privacy:** `collab`, `dispatch`, `session-audit` are personal-workflow skills that reveal how Mannan works with Claude. Confirm before publishing publicly.
- **MCP drift:** a non-hidden EPISODES reading flows into the public MCP snapshot. After reviving, run `bun run mcp:build`, commit the regenerated `mcp-worker/src/data.generated.json`, then `bun run mcp:deploy`.
- Build guards: keep article text free of FORBIDDEN strings (taken/jordan/protonmail/ACCESS_CODE) or `mcp:build` fails.

- Location: `src/app/garden/article/claude-skills/`, `src/components/garden/claude-skills-body.tsx`, `src/components/garden/skills-table.tsx`, `src/lib/{episodes,downloads,garden-views}.ts`, `src/app/sitemap.ts`, R2 `portfolio/skills/*.zip`

[Task-258]
