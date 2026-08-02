# Cloudflare state and runtime cutover evidence

Recorded 2026-08-02 UTC from the isolated `feat/cloudflare-full-migration` worktree. No secret values, private payloads, identity values, or object names are recorded here.

## State import and runtime

- The authenticated SQLite Durable Object state service was deployed before its callers. Final reviewed state version: `96b3d503-1bec-4bc9-b618-5cfb1ba579c4`.
- The non-destructive import matched the observed source inventory: 3 board entries, 1 owner, 1 identity-name relation, 0 identity-email relations, and 6 garden counters. Later counter growth came from expected preview traffic.
- Migration verification now compares canonical board, owner, identity-name, and identity-email values; asserts source feedback is empty; discovers email identities without names; and requires explicit verification mode for a populated target.
- The state service retains its authenticated `workers.dev` URL only for the Vercel rollback window. Cloudflare callers use a same-account service binding.
- Active site code has no Upstash package or fallback. The only non-archive Upstash references are the one-time, operator-run migration reader.

## Rate-limit and identity safety

- Exact policies preserve the former Upstash two-bucket weighted sliding-window algorithm, including flooring and bucket-end reset behavior.
- Rate rows expire per policy after two windows plus one second; a 10,000-row hard cap fails closed with 503.
- Tests cover exact 10/hour contact policies, capacity failure, policy-specific global compaction, token single-use, identity merge, forward-and-back rename, score ownership, idempotency, feedback cap, and production state-client failure without a binding or on an unauthorized response.

## Deployments and smoke evidence

- Preview site deploy: code version `c515ade7-0b3b-4cd2-a1c4-afcf716cfef6`; final secret-change version `5be26d54-b34b-4633-bad3-f736f61774b3`.
- Production site deploy: code version `1a3f0874-5acf-4f40-9db6-1ccf49717032`; final secret-change version `ffb6e29b-d055-49ec-8108-742b51f690bd`.
- Preview and production homepage and leaderboard returned 200. Production public download HEAD returned 200. Invalid checkout returned the expected 400 without creating a payment. Disabled Jordan and keep-alive routes returned 404. The unauthenticated state endpoint returned 401.
- Read-only preview browser checks passed 22 cases across downloads, civics, MCP, garden metadata, and papers. Four excluded failures were test-harness assumptions: three referenced local audio fixture files absent from this worktree, and one hard-coded a localhost share URL while testing the remote preview.
- Obsolete Upstash, Vercel Blob, and disabled Jordan secrets were removed from both Cloudflare site Workers. Vercel retains its own Upstash rollback configuration because authoritative DNS still points to Vercel.

## Verification and review

- Root: TypeScript passed; 124 tests passed; cache/privacy and disabled-route manifest checks passed; OpenNext 1.20.2 / Next.js 15.5.21 production build passed; MCP drift passed; MCP Worker 44 tests passed.
- State Worker: TypeScript passed; 5 tests passed; Wrangler dry-run passed.
- First independent OpenAI Sol review found rollback URL, migration comparison, rate-storage, documentation, disabled-route, and fail-closed-test gaps; all were remediated.
- A required DeepSeek V4 Flash review was attempted twice with exact observed routing but did not produce a valid report (`verified=false`, timed out). It is not counted as review evidence.
- A fresh independent OpenAI Sol reviewer found rename-cycle, zero-name identity, and limiter-parity defects. Follow-up review confirmed all findings and the final per-policy compaction defect resolved with no residual material issue. The provider substitution is explicit because the configured cross-provider route was unavailable.

## Remaining boundary

This proves the Cloudflare-hosted runtime/state path, not the apex cutover. `mannan.is` remains on Vercel until a Cloudflare zone can be created and DNS/mail records reconciled. The available Cloudflare credentials return 403 for zone creation because they lack `account.zone.create`.
