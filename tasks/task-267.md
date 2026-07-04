### Task 267: Rewrite README, retire the dead git hook docs, fix `.vscode/`

- [x] Rewrite `README.md` for the real Next.js/Tailwind/Bun stack (was still describing Angular 20 + Spring Boot + a nonexistent "Dev Stats" panel)
- [x] Delete `best-practices.md` (Angular/TypeScript boilerplate doc, fully redundant with `.claude/CLAUDE.md`)
- [x] Correct `.claude/CLAUDE.md`'s "Post-Commit Hook"/"Task Workflow" sections to state the hook is unwired (`core.hooksPath` unset) and the `[Task-N]` commit-tag convention isn't practiced — kept the task-file half of the workflow, which is genuinely still followed
- [x] Fix `.vscode/extensions.json` — drop the `angular.ng-template` recommendation
- [x] Fix `.vscode/launch.json` — replace `ng serve`/`ng test` configs with a Next.js Chrome launch config against `localhost:3847`
- [x] Fix `.vscode/tasks.json` — replace the `npm: start`/`npm: test` background tasks (Angular-CLI `endsPattern` that would hang indefinitely against Next.js output) with a `bun run dev` task whose `endsPattern` matches Turbopack's real `✓ Ready in` output
- [x] Fix `.vscode/settings.json` — drop the leftover Spring Boot `java.*` keys
- Location: `README.md`, `best-practices.md` (deleted), `.claude/CLAUDE.md`, `.vscode/extensions.json`, `.vscode/launch.json`, `.vscode/tasks.json`, `.vscode/settings.json`

Executed per `plans/005-repo-identity-docs-refresh.md`. Post-commit hook documented as retired (not wired up); reviving it was explicitly out of scope for this plan.
