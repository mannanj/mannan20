### Task 322: Chicken game variant 3 — cosmic opening, flock, monologue, saved progress

Variant 3 = `/game?variant=3`. Everything from variant 2, plus the changes below.

**Opening**
- [ ] Cosmic intro in the style of Sun Signal's welcome scene: a short history of the cosmos (big bang → stars → galaxies → solar system), one continuous zoom to Earth
- [ ] Smooth descent to a backyard: house styled after 4514 Bee St (from the Gaussian map in `~/Documents/visualizer/map`), approach simulated loosely, never a precise zoom-in that would identify the place
- [ ] A flock of game chickens meandering in the yard, looking wherever they like, not at the viewer
- [ ] Label "Squeeze the chicken" with no count yet
- [ ] First squeeze: that chicken squawks and freezes; cursor hidden for a moment; the flock pauses, panics and runs off; one chicken stays; cursor returns; label shows count 1
- [ ] Second squeeze: the chicken turns round scared, panics and starts moving: normal play from here

**Gameplay changes (variant 3 only)**
- [ ] Chicken moves 30% faster than variant 1
- [ ] Bird attack clicks −80% (hawk 25→5, phoenix 100→20); feather clicks −80% (25→5)
- [ ] Big monster clicks/HP −80% (lion mane, hydra/cerberus heads, tree HP, kitty)
- [ ] Remove the eagle; keep the phoenix and make its body itself fiery / on fire
- [ ] Monsters/scenes/birds Mannan picks to remove (list sent 2026-11-08, waiting on his picks)

**Monologue scene**
- [ ] At a set point the game pauses, the cursor changes, camera zooms on the chicken's upper body, it looks at the viewer and talks: mouth moves, chicken-speak audio ("ba ba baba ka")
- [ ] Subtitles: chicken-speak spelled out, a "Translated" header, then the English
- [ ] Lines: "You know, my ancestors didn't bring me here for this. They once roamed the earth as kings." … then that it knows it is meant for more
- [ ] Background turns into an imagination cloud: dinosaurs, a T. rex meandering; imagination soundtrack generated via OpenRouter (Lyria), shipped as a static asset
- [ ] Choice: "Continue squeezing the chicken" or "???". The game stops there for now

**Saved progress and sign-in**
- [ ] Score never resets in variant 3: saved in the browser, resumes after closing
- [ ] Leaderboard share offers magic sign-in (mannan.is email-code sign-in) to save the score to the account
- [ ] Score + inventory saved to the `cloud` D1 for signed-in people
- [ ] One bag per account across the blog, the game and the MCP. Sync only merges (max per item, capped); never erases items. Only a deliberate use/throw removes one
- [ ] MCP: signed-in users can see their bag
- [ ] Add the chicken game to the site_apps catalog so the MCP's list_apps shows it

- Location: `src/components/game/`, `src/components/inventory/`, `src/app/game/`, `src/app/api/game/`, `cloud-worker/migrations/`, `mcp-worker/src/`
