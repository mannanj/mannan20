### Task 322: Chicken game variant 3 — cosmic opening, flock, monologue, saved progress

Variant 3 = `/game?variant=3`. Everything from variant 2, plus the changes below.

**Opening**
- [x] Cosmic intro in the style of Sun Signal's welcome scene: a short history of the cosmos (big bang → stars → galaxies → solar system), one continuous zoom to Earth
- [x] Smooth descent to a backyard: house styled after 4514 Bee St (from the Gaussian map in `~/Documents/visualizer/map`), approach simulated loosely, never a precise zoom-in that would identify the place
- [x] A flock of game chickens meandering in the yard, looking wherever they like, not at the viewer
- [x] Label "Squeeze the chicken" with no count yet
- [x] First squeeze: that chicken squawks and freezes; cursor hidden for a moment; the flock pauses, panics and runs off; one chicken stays; cursor returns; label shows count 1
- [x] Second squeeze: the chicken turns round scared, panics and starts moving: normal play from here

**Gameplay changes (variant 3 only)**
- [x] Chicken moves 30% faster than variant 1
- [x] Bird attack clicks −80% (hawk 25→5, phoenix 100→20); feather clicks −80% (25→5)
- [x] Big monster clicks/HP −80% (lion mane, hydra/cerberus heads, tree HP, kitty)
- [x] Remove the eagle; keep the phoenix and make its body itself fiery / on fire
- [ ] Monsters/scenes/birds Mannan picks to remove (list sent 2026-11-08, waiting on his picks)

**Monologue scene**
- [x] At a set point the game pauses, the cursor changes, camera zooms on the chicken's upper body, it looks at the viewer and talks: mouth moves, chicken-speak audio ("ba ba baba ka")
- [x] Subtitles: chicken-speak spelled out, a "Translated" header, then the English
- [x] Lines: "You know, my ancestors didn't bring me here for this. They once roamed the earth as kings." … then that it knows it is meant for more
- [x] Background turns into an imagination cloud: dinosaurs, a T. rex meandering; imagination soundtrack generated via OpenRouter (Lyria), shipped as a static asset
- [x] Choice: "Continue squeezing the chicken" or "???". The game stops there for now

**Saved progress and sign-in**
- [x] Score never resets in variant 3: saved in the browser, resumes after closing
- [x] Leaderboard share offers magic sign-in (mannan.is email-code sign-in) to save the score to the account
- [ ] Score + inventory saved to the `cloud` D1 for signed-in people (code done; migration 0013 not yet applied to remote D1, not deployed)
- [x] One bag per account across the blog, the game and the MCP. Sync only merges (max per item, capped); never erases items. Only a deliberate use/throw removes one
- [x] MCP: signed-in users can see their bag
- [x] Add the chicken game to the site_apps catalog so the MCP's list_apps shows it

- Location: `src/components/game/`, `src/components/inventory/`, `src/app/game/`, `src/app/api/game/`, `cloud-worker/migrations/`, `mcp-worker/src/`

- Monologue triggers at score 600 (`V3_MONOLOGUE_SCORE` in `src/components/game/game-tuning.ts`).
- Bee St: game uses only a stylized painting (`public/game/v3/backyard.webp`); the game-only splat copy with a decoy anchor lives in gitignored `.private/chicken-house/` (see its NOTE.md). Earth flight descends to the decoy lat/lon.
- OpenRouter spend for assets: ~$0.46 (3 images, 1 Lyria clip).
