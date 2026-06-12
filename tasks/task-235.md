### Task 235: Leaderboard name ownership + magic-link sign-in + popup feedback flow
- [x] Name ownership: first claim binds a name (case-insensitive) to an httpOnly `chicken-owner` device identity; others get 409 `name-taken`; legacy pre-ownership names claimable only when the `chicken-name` cookie matches
- [x] Race-safe by construction: HSETNX claims, ZADD GT score merges, GETDEL single-use tokens, multi-key rename/merge as atomic Lua scripts (zset members stored raw — verified against real Redis on scratch keys); in-memory fallback mirrors all semantics
- [x] Magic-link email sign-in: POST /email (rate-limited per IP + per address) sends a 15-min single-use link via Resend (`src/lib/email.ts`, dev returns devLink); /game?claim= consumes it, binds the email identity, merges the device's claimed names, sets the owner cookie
- [x] Rename: verified identities rename ALL their past names atomically (board scores migrate, old names redirect future submissions); renames cannot steal owned or existing names
- [x] /me endpoint (owned names + masked email); panel UI: taken-name claim flow with devLink, "Sign in by email" affordance, signed-in identity row with Rename all, claim toast on magic-link landing
- [x] Feedback as popup: input + Send feedback button; unvalidated users slide right into a validation input ("Validation: please enter your name, email, and/or why you're here", absolute ←/→ arrows inside the inputs) reusing /api/validate-contact; on pass it auto-sends with a spinner → "Feedback received." — the email address is never shown
- [x] POST /api/game/feedback: rate-limited, stores last 500 in Redis, emails hello@mannan.is when RESEND_API_KEY is configured
- [x] Verification: 22-assertion store lifecycle smoke (memory mode, `scripts/lb-store-smoke.ts`), 14-assertion Lua smoke on scratch keys (`scripts/lb-lua-smoke.ts`), 6 new e2e specs — all green
- [ ] Deploy prereq: add `RESEND_API_KEY` (+ optional `RESEND_FROM`, `FEEDBACK_TO`) to .env.local and Vercel env; without it, magic links and feedback emails degrade gracefully (dev links locally, feedback still stored)
- Location: `src/lib/leaderboard-store.ts`, `src/lib/email.ts`, `src/lib/rate-limit.ts`, `src/app/api/game/leaderboard/{route,me,email,claim,rename}.ts`, `src/app/api/game/feedback/route.ts`, `src/components/game/leaderboard-panel.tsx`, `src/components/game/feedback-popup.tsx`, `e2e/chicken-leaderboard-identity.spec.ts`, `scripts/lb-store-smoke.ts`, `scripts/lb-lua-smoke.ts`

[Task-235]
