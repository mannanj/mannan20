### Task 225: Game intent info panel with caret toggle
- [x] Info icon + caret pill fixed bottom-right of /game; caret rotates 180° when expanded, click again to collapse, Escape closes
- [x] Slide-up glassmorphism panel capturing the game's intent from past transcripts and sessions: origin (task-154/155 rubber-toy commission), screams (task-221), evolution tiers, mercy-as-personality, and the still-in-the-coop backlog (chicken-game-features.md)
- [x] Accessible disclosure: aria-expanded/aria-controls/aria-hidden wiring
- [x] e2e coverage: toggle lifecycle, content assertions, caret rotation, Escape close (suite 8/8)
- [x] Gitignore .claude/session-memory/ (session audit artifacts)
- Location: `src/components/game/game-info-panel.tsx`, `src/components/game/chicken-game.tsx`, `e2e/chicken-game.spec.ts`
