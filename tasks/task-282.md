# Task 282: Migrate Mannan20 runtime and first-party state to Cloudflare

The canonical proof-carrying work plan is:

`docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/work-plan.md`

Status: **ACTIVE — Cloudflare runtime/state, private R2, DNS Worker Routes, and no-charge Stripe validation are proven; remaining gates are observation, mail send/receive, rollback drill, final Worker Custom Domain, DNSSEC, and legacy-provider decommission.**

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
