# Idea: Inbound file transfers into the MCP (role-gated)

**Status:** Idea / not started. Captured 2026-06-27.

## The idea

Let people I trust — friends, collaborators — **send files to me through my MCP**.
Not anyone: only people who hold a particular role or permission. An AI agent
acting on a friend's behalf (or the friend directly) could hand a file to my
system, and it lands somewhere I control, with the right people gated in and
everyone else gated out.

Today the MCP only flows *outbound*: it serves my public data and lets anyone
download whitelisted documents at `mcp-worker/src/files.ts` (`/files/<slug>`,
rate-limited 10/min/IP). This idea is the **reverse direction** — an authenticated,
role-gated *upload/transfer* channel.

## Why it's mostly-already-possible

The interesting part is that I already have the building blocks; this is mostly a
wiring job, not a greenfield auth build:

- **Roles already exist.** `cloud-worker` has a D1 database ("cloud") with a
  `users` table carrying `role` (`admin` | `client`) and a `folder_members`
  table for per-folder grants. See `cloud-worker/migrations/0001_init.sql` and
  `0002_shared_site_auth.sql`, and `cloud-worker/src/auth.ts`
  (`dbRoleForEmail`, `canAccess(env, email, folder)`).
- **Identity / sessions already exist.** Magic-link email sign-in (Resend),
  HMAC-signed session cookies, and a site↔cloud handoff via `site_session_codes`.
- **File storage already exists.** R2 bucket `portfolio-files` (plus `mannan-hans`,
  `deep-calm-weave-backups` on the cloud-worker). The cloud-worker already does
  **auth-gated, per-folder file serving** at `/files/<folder>/<name>`.
- **Email notifications already exist.** Resend is wired in `cloud-worker/src/email.ts`.

So "friends with roles can transfer files" ≈ point the existing role system at a
new *inbound* endpoint that writes to R2 instead of reading from it.

## The shape of it (sketch, not a commitment)

- A **friend/contributor role** (extend the existing `users.role` enum, or model
  it as a `folder_members`-style grant — e.g. an `upload_grants` table scoped to a
  destination + quota).
- An **inbound transfer endpoint**. Either:
  - an **MCP tool** (e.g. `submit_file` / `send_file`) on a *new authenticated*
    surface — note the public MCP worker is intentionally read-only and stateless,
    so this likely belongs on the **cloud-worker** (Hono + D1 + R2), not the public
    `mcp-worker`; or
  - a plain authenticated HTTP `POST /transfer` the friend's agent calls.
- **Auth for the MCP itself.** MCP supports OAuth-style auth; a friend's agent would
  present a credential that resolves to their email → role lookup → allow/deny.
  (Cloudflare has an MCP-with-OAuth path — see the "building MCP server on Cloudflare"
  skill.)
- **Landing zone.** Uploads go to a quarantined R2 prefix (e.g. `inbox/<sender>/…`),
  never directly into anything public or served.
- **Notify me.** Resend email on each transfer: who sent what, how big, where it landed.

## Open questions to resolve before building

- **Which worker owns this?** Almost certainly `cloud-worker` (it already has D1 +
  auth + R2), keeping the public `mcp-worker` read-only. Decide whether it's exposed
  as an MCP tool or a REST endpoint (or both).
- **How does a remote agent authenticate as a friend?** Magic-link is human-in-the-loop;
  an agent transferring a file may need a long-lived scoped token / API key / OAuth
  client tied to that friend's email+role. What's the credential?
- **Permission granularity.** Is "friend" a flat role, or per-destination grants with
  per-sender **quotas / size caps / file-type allowlists / expiry**? (`folder_members`
  is the existing pattern to mirror.)
- **Abuse & safety.** Max file size, total quota per sender, MIME/extension allowlist,
  rate limiting (mirror the existing `/files` limiter), and what happens to rejected
  files. Consider malware exposure since these are externally-supplied bytes.
- **My review flow.** Do transfers land silently, or queue for my approval before they're
  visible/usable? An admin view in `cloud-worker/src/admin.ts` could list/approve/delete
  the inbox.
- **Privacy guardrails.** Inbound content must never leak into the public MCP snapshot
  (`mcp-worker` build guards already keep gated content out of `data.generated.json` —
  the inbox must stay on the cloud-worker side of that line).

## Relevant existing files

- `cloud-worker/src/auth.ts` — roles, `canAccess`, session verification
- `cloud-worker/migrations/0001_init.sql`, `0002_shared_site_auth.sql` — `users.role`, `folder_members`
- `cloud-worker/src/index.ts` — existing auth-gated `/files/<folder>/<name>` serving (the read-side template for a write-side)
- `cloud-worker/src/email.ts` — Resend notifications
- `cloud-worker/src/admin.ts` — admin panel (natural home for an inbox review UI)
- `mcp-worker/src/files.ts` — current outbound `/files/<slug>` + rate limiter (pattern to mirror)
- `scripts/upload-to-r2.mjs` — current admin-only R2 upload (the manual path this would replace for friends)
