### Task 284: Authenticated MCP — magic-link sign-in, roles, admin file + email tools

Captured 2026-09-13. Not started. Turns the read-only public MCP server into one that can
also act **as a signed-in person**, with privileges by group, and gives `hello@mannan.is`
admin tools: upload files, mint share links, list/search uploads, and send email with
attachments — chainable in one agent session.

Reference implementation to copy from: `~/Documents/skeletons/signup-cloudflare` — a working
magic-link + MCP OAuth 2.1/PKCE pair on Cloudflare. Read `docs/005-mcp-oauth.md` first, then
`mcp/src/authHandler.ts`, `lib/mcp/grant.ts`, `lib/mcp/actor.ts`, `mcp/scripts/verify-oauth.mjs`.

---

#### What already exists (don't rebuild it)

- **Magic link, end to end** — `cloud-worker` (`POST /auth/site/request` → Resend email →
  `GET /auth/site/verify` → one-time code → `POST /auth/site/exchange`), surfaced on the site by
  `src/app/api/auth/{request,cloudflare-callback,me,sign-out}` and `src/lib/cloudflare-auth.ts`.
- **Session** — HMAC-signed `__Host-mannan-session` cookie, `src/lib/site-session.ts`,
  carrying `{ email, role: 'admin' | 'user', exp }`.
- **Admin identity** — `ADMIN_EMAIL = 'hello@mannan.is'` in `cloud-worker/src/auth.ts`;
  `dbRoleForEmail()` already pins that address to `admin` in D1 `users.role`.
- **Groups, in embryo** — D1 `folder_members (email, folder)` + `FOLDERS` allowlist.
- **Private storage + admin upload** — `POST /admin/upload` (multipart, 100 MiB cap) into
  `portfolio-private-files`, and session-gated `GET /files/:folder/:name`.
- **Email sending** — Resend HTTP API in `cloud-worker/src/email.ts`, from `Mannan <cloud@mannan.is>`.
- **The MCP server** — `mcp-worker/`, stateless `createMcpHandler`, no auth, no DB binding,
  11 read-only tools over a build-time snapshot (`src/data.generated.json`).

The gap is only: a **sign-in surface at `mannan.is/login`**, an **OAuth bridge** so an MCP
client can act as that person, a **role/group model with more than two rungs**, and the
**write tools**.

---

#### Phase 1 — `mannan.is/login`

- [ ] Add `src/app/login/page.tsx`: dedicated page wrapping the same request/verify chain the
      header popover (`src/components/auth/continue-with-email-menu.tsx`) already uses
- [ ] Extract the email form out of the popover into a shared component so the popover and
      `/login` cannot drift apart
- [ ] Accept and round-trip `?next=` (safe same-origin path) and `?state=` (the MCP
      authorization state) — the magic link must return the person to the flow they started,
      not the home page. `cloud-worker.magic_tokens` needs a nullable `mcp_state` column for this
      (see skeleton `migrations/0001_init.sql`)
- [ ] Signed-in view: show the address, the role, a sign-out button, and a "connect an AI client"
      section pointing at the MCP endpoint
- [ ] Keep the existing 3/15min-per-address + per-IP rate limiting on the new surface
- [ ] Decide whether Turnstile guards `/login` (the site already has a Turnstile integration
      in flight on `src/hooks/use-turnstile.ts`)
- Location: `src/app/login/`, `src/components/auth/`, `src/app/api/auth/`, `cloud-worker/migrations/`

#### Phase 2 — the OAuth bridge (MCP Worker ↔ mannan.is)

- [ ] Add `OAuthProvider` to `mcp-worker` with PKCE S256 and dynamic client registration;
      keep the existing public tools working **unauthenticated** — anonymous is a valid tier,
      not a 401
- [ ] Add a KV namespace to `mcp-worker/wrangler.jsonc` for parking the authorization request
      under an opaque `state` (the OAuth request must never round-trip through the browser)
- [ ] Add `src/app/api/mcp/authorize/route.ts` on the site: reads `__Host-mannan-session`,
      bounces a signed-out visitor to `/login?state=…`, and otherwise returns an HMAC-SHA256
      grant `{ sub, email, role, state, exp, nonce }` — 2 minute TTL, bound to the state,
      constant-time compared, identity-only
- [ ] Share `MCP_GRANT_SECRET` as a secret on **both** Workers — mismatched values fail every
      sign-in with no diagnostic anywhere
- [ ] Set `global_fetch_strictly_public` on both Workers, or every same-account fetch 404s
- [ ] Set `allowedOriginHostnames: ['claude.ai', 'mannan.is', …]` or the browser handshake dies
      silently while CLI clients work
- [ ] Port `mcp/scripts/verify-oauth.mjs` as `mcp-worker/scripts/verify-oauth.mjs` — drives
      register → authorize → bridge → signed-out bounce → magic link → session → grant → token
      → `whoami`, then checks the refusals (anonymous 401, invented bearer 401, replayed grant
      with a swapped state)
- Location: `mcp-worker/src/`, `mcp-worker/wrangler.jsonc`, `src/app/api/mcp/authorize/`

#### Phase 3 — roles and groups

- [ ] Define the tiers explicitly in one place, in code, not in the database:
      `anonymous` → `visitor` (signed in, no grants) → named groups → `admin`
- [ ] `hello@mannan.is` is `admin`, pinned by `dbRoleForEmail()` — never by a database row that
      could be edited
- [ ] Generalize `folder_members` into group membership (either rename to `group_members` with a
      migration, or add a `groups`/`group_members` pair alongside it) so a group can gate tools
      as well as folders
- [ ] Every tool declares its required tier; the dispatcher enforces it in one place, and a tool
      the caller cannot use is **hidden from `tools/list`**, not just refused on call
- [ ] `whoami` tool: returns address, tier, group names, and the list of tools that tier unlocks —
      this is the "how do I get more privileges" answer for a visitor
- [ ] A signed-out caller asking for a gated tool gets a message naming `https://mannan.is/login`
      and how to ask for access, not a bare 401
- [ ] Admin tool to grant/revoke a group for an address (wraps the existing `/admin/grant`,
      `/admin/revoke`)
- Location: `cloud-worker/src/auth.ts`, `cloud-worker/migrations/`, `mcp-worker/src/server.ts`

#### Phase 4 — admin file tools

The MCP Worker holds **no database or private-bucket binding**. Every write goes back through
`cloud-worker` carrying a signed ~60s actor token (skeleton `lib/mcp/actor.ts`) — one
implementation of "upload a file", not two.

- [ ] **Decide the upload transport** before building: base64 in the tool argument (simple,
      but bounded by the 32 KiB body cap in `mcp-worker/src/index.ts` unless raised) vs. a
      short-lived signed upload ticket the agent PUTs to (no size ceiling, one more round trip).
      Default recommendation: a ticket, with a small-file base64 fast path
- [ ] `upload_file` — admin. Takes filename, content type, folder/group, optional expiry.
      Returns the object key **and a share link**
- [ ] Share links: signed, expiring, unauthenticated URLs — a new signed-URL path on
      `cloud-worker`, distinct from today's session-gated `GET /files/:folder/:name` and from
      `mcp-worker`'s static public `/files/<slug>` allowlist. Record default TTL, whether a link
      is revocable, and whether downloads are counted
- [ ] `list_files` — admin (and group members, scoped to their groups): folder, size, uploaded-at,
      content type, share-link status. Paginated
- [ ] `search_files` — filename/prefix/metadata search over the same scope; reuse the existing
      per-email+IP rate limiter
- [ ] `delete_file` / `revoke_share_link` — an agent that can mint links must be able to unmint them
- Location: `cloud-worker/src/index.ts`, `cloud-worker/src/storage.ts`, `mcp-worker/src/`

#### Phase 5 — send email (admin only)

- [ ] `send_email` — admin only, hard-gated. Takes `to` (one or more addresses), `subject`,
      `body` (text, and optionally HTML), and `attachments` referencing files already uploaded
      in this session by key — so upload → share link → send chains in one agent turn
- [ ] Decide attachment mode: real Resend attachments (size-capped) vs. share links pasted into
      the body. Recommend links by default, attachments only under a small size cap
- [ ] Rate limit per day and cap recipients per call; log every send (to, subject, message id)
      to D1 so there is an audit trail of what the agent sent on your behalf
- [ ] Sending `from` a `mannan.is` address is a reputation surface — confirm SPF/DKIM/DMARC
      alignment for whichever from-address is used, and consider a distinct one for
      agent-originated mail
- [ ] Consider a confirmation step (draft → `confirm_send` with a returned draft id) so a
      mis-prompted agent cannot mail a stranger in one hop
- Location: `cloud-worker/src/email.ts`, `cloud-worker/src/index.ts`, `mcp-worker/src/`

#### Phase 6 — tests, docs, deploy

- [ ] `mcp-worker/test/` — new `auth.spec.ts` (tier gating, hidden tools, refusals) and
      `admin-tools.spec.ts`; keep `privacy.spec.ts` green — **`hello@mannan.is` and the phone
      number must still never appear in the public snapshot**, and the new authenticated paths
      must not leak private file names into any unauthenticated response
- [ ] Run the ported `verify-oauth.mjs` against local, then against the deployed pair
- [ ] Update `MCP_TOOLS` in `src/lib/mcp-info.ts` to match `mcp-worker/src/server.ts` —
      the `/mcp` guide page and header popover are generated from it. Mark which tools require
      sign-in and which require admin
- [ ] Regenerate and redeploy: `bun run mcp:build` → commit `data.generated.json`,
      `public/llms.txt`, `public/.well-known/` → `bun run mcp:deploy`; `bun run mcp:check`
      must show no drift
- [ ] Update `mcp-worker/README.md` and `cloud-worker/README.md` route tables
- Location: `mcp-worker/test/`, `src/lib/mcp-info.ts`, `scripts/build-mcp-data.mjs`, both READMEs

---

#### Phase 7 — future: meeting setup

Not in scope for the first pass; captured so the tool surface is designed with room for it.

- [ ] `propose_meeting` / `list_availability` — admin. `~/Documents/meettime` already solves
      availability collection and has its own MCP server; the likely shape is the MCP Worker
      calling MeetTime rather than a calendar integration built here
- [ ] Decide: MeetTime event creation vs. direct Google Calendar OAuth

---

#### Open decisions to settle before Phase 4

1. Upload transport — base64 vs. signed ticket (Phase 4 recommends the ticket)
2. Share-link TTL, revocability, and whether links are public-by-URL or tied to a group
3. Whether a signed-in non-admin visitor gets **any** write ability, or read-only-plus-more
4. Attachments vs. links for `send_email`, and whether sends need a confirm step
5. Whether this lives on the existing read-only `mcp-worker` (one endpoint, mixed tiers) or a
   second authenticated Worker — one endpoint is friendlier, but a bad auth deploy then takes
   the public read-only server down with it

- Location: `mcp-worker/`, `cloud-worker/`, `src/app/login/`, `src/app/api/mcp/`,
  `src/lib/mcp-info.ts`, reference `~/Documents/skeletons/signup-cloudflare`
