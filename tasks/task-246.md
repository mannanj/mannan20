### Task 246: Revert Paper redesign + copy concision to legacy (kept in history)

- [x] Commit the full redesign to preserve it in history
- [x] Revert to the legacy pre-redesign design (live/main)
- [x] Leave unrelated in-flight work untouched
- [x] Document here + push
- Location: `git history` (`dde7313`, `ccdaff4`), `tasks/task-246.md`

## What happened

Two layers of design work were on the working tree, both uncommitted:

1. **Paper redesign** (prior session) — warm-light editorial theme (Fraunces + Geist, rust `#b1442c` accent) replacing the cold black/`#039be5`-cyan look, on home + shared chrome.
2. **Cut-deep copy concision** (this session) — a ruthless wordiness pass on home + overlays: removed the duplicate About intro, a two-tier eyebrow system (eyebrows only on Home/About/Contact, subsections heading-only), command-palette descriptions stripped, hero subline + form/modal/MCP microcopy tightened, plus 7 e2e assertions reconciled to the new strings.

Mannan's call: **neither fits — revert to the legacy design**, but keep the work in git history so it can be revisited.

## Commits

- `dde7313` — **Paper redesign + cut-deep copy concision (home + overlays)** — the full design work (41 files), committed so it's preserved.
- `ccdaff4` — **Revert** of `dde7313` — returns the tree to the legacy pre-redesign state (`7af110c`, Task 245). Verified: `git diff 7af110c ccdaff4` is empty (byte-for-byte legacy).
- `<this commit>` — this task doc + `.gitignore` hygiene (ignore `.claude/redesign*` artifacts).

**Live `main` now renders the legacy design.** The redesign is intact in history at `dde7313`.

## To restore the redesign later

- Bring it all back: `git revert ccdaff4` (reverts the revert).
- Or branch from it to iterate: `git checkout -b redesign-v2 dde7313`.
- Or cherry-pick specific files: `git checkout dde7313 -- <path>`.

## Deliberately NOT reverted (preserved as your uncommitted WIP)

These were dirty on the working tree but are **not** part of the redesign, so they were excluded from both the redesign commit and the revert — they remain uncommitted, untouched:

- `src/components/garden/garden-explorer.tsx` — separate garden-products feature (renames the "Tools" tab to "Products", adds active/Tools/Retired subsections); still on the old theme.
- `docs/chicken-game-features.md` (+ untracked `docs/chicken-game-escape-scenes-raw.md`, `tasks/task-244.md`) — pre-existing notes from before this work.

## Pointers

- Independent audit of the concision pass: `.claude/session-memory/2026-06-13T1839-a1365e56-cut-deep-copy-concision.md`
- Before/after screenshots (local, gitignored): `.claude/redesign-shots/` — `current-*` (legacy), `new-*` (Paper), `concise-*` (after concision).
- Design contract + direction explorer: `.claude/redesign/CONTRACT.md`, `.claude/redesign/index.html`.

[Task-246]
