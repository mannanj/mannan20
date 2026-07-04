### Task 265: Update Next.js and PostCSS to close known CVEs

- [x] Re-confirm current advisory state (`bun audit`) — matched plan's description (21 advisories: 9 high, 10 moderate, 2 low)
- [x] `bun update next postcss`
- [x] Confirm new versions installed (`next` 15.5.10 -> 15.5.20, `postcss` 8.5.6 -> 8.5.16 as the direct/top-level resolution)
- [x] Re-audit
- [x] `next`: all 9 HIGH advisories gone — fully resolved
- [ ] `postcss`: moderate advisory (GHSA-qx2v-qp2m-jg93) still present after update — **STOP condition triggered, not resolved**
- [x] Typecheck (`npx tsc --noEmit`) — exit 0
- [x] Unit tests (`bun test src`) — 19 pass, 0 fail
- [ ] Manual smoke-check via already-running dev server (port 3847) — **could not run**: no process was listening on port 3847 at execution time; did not start one (out of scope per instructions not to run `bun run dev`)
- Location: `package.json`, `bun.lock`

---

## Why postcss is still flagged after `bun update next postcss`

`bun update postcss` only updated the top-level/direct dependency resolution
(`postcss@8.5.6` -> `postcss@8.5.16`). Two *nested* copies of postcss remain
vulnerable because they resolve independently in the dependency tree:

1. `@tailwindcss/postcss` declares `"postcss": "^8.4.41"` (a range that *would*
   permit 8.5.16) but bun kept a separate nested lockfile entry pinned at
   `postcss@8.5.6` (`@tailwindcss/postcss/postcss` in `bun.lock`) instead of
   deduplicating it against the newly bumped top-level copy.
2. `next@15.5.20` itself declares an **exact, non-caret** dependency on
   `"postcss": "8.4.31"` (`next/postcss` in `bun.lock`) — this is bundled by
   Next.js for its own internal CSS pipeline and is not resolvable to a newer
   version via `bun update postcss` at all; it would require Next.js itself to
   bump its declared dependency in a future release, or a project-level
   `overrides`/`resolutions` entry forcing a single postcss version tree-wide
   (out of scope for this plan, which explicitly assumed no such override was
   needed).

Post-update `bun audit` output:

```
postcss  <8.5.10
  (direct dependency)
  @tailwindcss/postcss › postcss
  next › postcss
  moderate: PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93

5 vulnerabilities (1 high, 4 moderate)
```

(Down from 21 vulnerabilities / 9 high before the update — only the `next`
advisories, all 9 of them, were fully eliminated. The `postcss` advisory
persists via two nested copies; `tar`/`lodash`/`zod` via
`@imgly/background-removal-node` are unchanged, as expected — out of scope.)

This matches STOP condition 3 in `plans/003-dependency-cve-upgrade.md`:
"`bun audit` still shows a `next` or `postcss` advisory after the update — the
fix didn't take effect as expected". Per instructions, the update was **not**
reverted and **no further remediation was attempted** (e.g. adding an
`overrides`/`resolutions` field) — that decision is left to the coordinator,
since it would go beyond the plan's stated scope (manifest carets only).

## What changed

- `package.json`: `next` `^15.1.0` -> `^15.5.20`, `postcss` `^8.5.6` -> `^8.5.16`
  (bun auto-bumped the caret ranges to match the resolved versions as part of
  `bun update <pkg>` — not a manual edit, matches plan's allowance for this).
- `bun.lock`: refreshed accordingly.
- No other files modified by this task (other concurrent working-tree changes
  present at the time — `.claude/claude.md`, `README.md`, `best-practices.md`,
  `cloud-worker/package.json`, `cloud-worker/src/auth.ts` — belong to other
  plans executing concurrently in the same tree, not this task).
