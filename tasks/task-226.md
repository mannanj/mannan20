### Task 226: Game leaderboard, full-width sheets, morph skin, gentler game, Safari audio
- [x] Leaderboard: top-right link, bottom sheet, Human/Agent tabs with self-identify checkbox, Upstash Redis ZSET persistence (best per name, /api/game/leaderboard GET+POST, rate-limited 6/min), name+kind remembered via cookies
- [x] Feedback path: "don't like the division?" line revealing email only behind the main site's contact validation (ContactForm/ContactResult reuse, contact_revealed cookie honored)
- [x] Info panel reworked to full-width bottom sheet, copy cut to one line per section, Cloudflare mention removed, tier names dropped from HUD
- [x] Skin morph: continuous color interpolation toward next tier replaces shard patches; aura fades in by opacity late tier-0 and lerps color between tiers
- [x] Gentler: softened speed curve, mercy at 5s/10s ramp/0.4 floor, gradual ~7s recovery after a hit instead of instant snap-back
- [x] Sounds at right spots only: sticky scream per click-window (rotate after 25-35 clicks or 8s idle) with retrigger + light reverb; background aura bed/loop removed entirely; AudioContext resumed inside every play gesture (Safari fix)
- [x] e2e suite updated: sticky-scream rotation, morph, mercy grace, leaderboard mock flow incl. cookie prefill, feedback gate, no-Cloudflare copy
- Location: `src/components/game/`, `src/lib/chicken-audio.ts`, `src/lib/rate-limit.ts`, `src/app/api/game/leaderboard/route.ts`, `e2e/chicken-game.spec.ts`
