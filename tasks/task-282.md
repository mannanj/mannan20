# Task 282: Migrate Mannan20 runtime and first-party state to Cloudflare

The canonical proof-carrying work plan is:

`docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/work-plan.md`

Status: **ACTIVE — Cloudflare runtime/state, private R2, DNS Worker Routes, no-charge Stripe validation, and the timed Vercel rollback/Cloudflare restore drill are proven; remaining gates are observation, mail send/receive, final Worker Custom Domain, DNSSEC, and legacy-provider decommission.**

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
