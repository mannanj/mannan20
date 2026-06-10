### Task 218: Garden Readings tab + /episodes redirect
- [x] Replace disabled "Work" tab with "Readings" tab listing episodes (title, author, date)
- [x] Extract episode data to shared `src/lib/episodes.ts`
- [x] Make `/episodes` redirect to `/garden#readings` (preserving `?showAll=true`)
- [x] Hash-driven tabs: `#writings` / `#products` / `#readings` (+ `#episodes` alias) auto-open on load, persist in URL across refresh
- [x] Change episode detail back links from "← Episodes" to "← Garden" → `/garden#episodes`
- [x] Add skeleton loader so the correct tab renders directly (no wrong-tab flash on hash load)
- [x] Top-anchor header/tab picker so they stay steady across tabs
- Location: `src/components/garden/garden-explorer.tsx`, `src/lib/episodes.ts`, `src/app/episodes/`
