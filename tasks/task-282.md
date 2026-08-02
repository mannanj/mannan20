# Task 282: Migrate Mannan20 runtime and first-party state to Cloudflare

The canonical proof-carrying work plan is:

`docs/superpowers/orchestration/2026-08-01-mannan20-cloudflare-migration/work-plan.md`

Status: **BLOCKED — Cloudflare runtime/state and private R2 cutover are deployed; revision 7 waits on Cloudflare zone-create authority and Stripe-secret validation before apex DNS cutover.**

The user's 2026-08-01 direction authorizes the complete migration, including the production,
DNS, state, cleanup, commit, and push operations defined by the canonical plan. Plan 006 retains
authority over the private R2 boundary and its Gates A-H, now used as evidence checkpoints rather
than routine approval stops.
