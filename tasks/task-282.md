# Task 282: Migrate Mannan20 runtime and first-party state to Cloudflare

The canonical proof-carrying work plan is:

`docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/work-plan.md`

Status: **ACTIVE — Cloudflare runtime/state, private R2, final apex/www Worker Custom Domains, no-charge Stripe validation, timed rollback, and protected-main reconciliation are proven; remaining gates are the final observation window, outbound mail confirmation, DNSSEC, and legacy-provider decommission.**

The user's 2026-08-01 direction authorizes the complete migration, including the production,
DNS, state, cleanup, commit, and push operations defined by the canonical plan. Plan 006 retains
authority over the private R2 boundary and its Gates A-H, now used as evidence checkpoints rather
than routine approval stops.

2026-08-02 Stripe receipt: the OpenNext bundle's Node-default Stripe requester failed in Workers.
A shared lazy client now pins Stripe's fetch transport for checkout creation and payment retrieval.
Root TypeScript, 135 tests, OpenNext build, independent review, production version
`0b4e4d8f-b3eb-4849-b709-bb2e62765976`, a test-mode no-charge Checkout Session, and the public
health matrix all pass. The prior site version `2ebb0a6a-f3d4-439c-bb99-d4edf70f1380` remains the
rollback target; no Checkout URL/ID or secret value entered repository evidence.

2026-08-02 rollback receipt: unchanged production Worker version
`db75e47c-3354-4b74-a724-9766ce618ebc` temporarily moved the routes to a non-resolving drill
hostname. Headers-only apex and session probes reached the retained Vercel origin and returned its
expected 429 challenge with `x-vercel-id`. Canonical routes were immediately restored on version
`eb882a07-0fd0-407d-b97e-fbc9fb9bbe3f` at 100%; session status returned 200 with HSTS and
`x-opennext`, `www` returned the canonical 308, and direct Workers returned 200. A concentrated
post-drill root probe was Cloudflare-rate-limited and remains an explicit observation item; no body,
cookie, session, or private data entered evidence.

2026-08-02 Custom Domain receipt: Cloudflare rejected apex Custom Domain creation with API code
`100117` because the imported externally managed apex Vercel DNS record still exists; Wrangler
reported a partial trigger update. The canonical apex/`www` Worker Routes were immediately restored
on production version `fd56f4db-8d1e-4f83-a21c-3a9264658c2e` at 100%. Fresh root, robots, garden,
and leaderboard probes returned 200 from Cloudflare/OpenNext and `www` returned 308. The remaining
conversion prerequisite is narrowly scoped: delete only the old apex Vercel DNS record, then deploy
the checked-in apex Custom Domain form. The current Wrangler OAuth token cannot read or edit DNS
records; mail, DKIM, verification, and all non-apex records remain untouched.

2026-08-02 www repair and production-test receipt: the manual DNS deletion removed `www`, while
Cloudflare still rejected the apex Custom Domain because a separate externally managed apex A/CNAME
remains. The apex Worker Route was restored immediately, and `www.mannan.is` is now a final
Worker-managed Custom Domain on production version `c2ec62d1-b612-4d07-90ec-cf8ebfebdd08` at
100%. Cloudflare authority, 1.1.1.1, 8.8.8.8, and 9.9.9.9 return its edge addresses; direct edge TLS
returns the canonical 308 with path/query preserved. Production checks passed across 24 HTTP/API
cases, desktop/mobile and isolated browser journeys, public R2 audio/downloads, session and state
reads, a fresh no-charge Stripe test-mode session, TypeScript, 137 unit tests, and the Wrangler
production dry-run. The remaining manual target is only the A/CNAME row named exactly `mannan.is`
that points to Vercel; do not remove `www`, MX, TXT, DKIM, or verification records.

2026-08-02 final Custom Domain receipt: the Vercel-owned apex A record
`mannan.is -> 216.198.79.1` was removed, and a clean OpenNext build deployed both apex and www as
Worker-managed Custom Domains on production version `c4158947-0c49-4a26-b3f7-1f480df3a8a4` at
100%. Cloudflare's API lists both hostnames on `mannan20-site`; three public resolvers return
Cloudflare edges; apex/API/direct-Worker checks return 200 and www returns the canonical 308. A
top-level `deploy` package script now aliases the full production pipeline. Bun currently reserves
literal `bun deploy` before package-script dispatch, so it must be invoked as `bun run deploy`.
Protected-main reconciliation, observation, actual mail send/receive proof, and DNSSEC remain.

2026-08-02 protected-main/final-deploy receipt: the 39-entry dirty main state was transferred to
`/Users/manblack/Documents/mannan20-dirty-main-2026-08-02` on
`preserve/dirty-main-2026-08-02` with the exact original status fingerprint, while backup stash
`290e651ba250ae382d6c1a8a62e17c55ba12ab64` remains retained. The normal `mannan20` path then
fast-forwarded cleanly to the migration. After Bun install and a fresh OpenNext build, TypeScript,
137 tests, privacy/cache gates, and production dry-run passed. Ignored local WAV/Finder files were
moved into the preserved worktree; a reproducible 243-asset build deployed version
`a16b57fd-c5ce-4fd9-8a0d-e449b64e9659` at 100%. Final HTTP/API checks passed 24/24 and isolated
desktop/mobile/www browser checks passed 17/17. DNSSEC, real outbound mail confirmation, and the
24-hour observation window through at least 2026-08-03 12:45 PM ET remain before decommission.
