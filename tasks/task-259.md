### Task 259: Protected MCP inbound uploads to Cloudflare R2

**Status: TODO. Do not implement as part of task creation.**

Build a role-gated upload path where pre-authorized people, or agents acting for
them, can send files to Mannan through a protected MCP/HTTP flow and have those
files land in Cloudflare R2 for later review.

#### Context
- The existing public MCP lives in `mcp-worker/` and is intentionally read-only.
- The existing `cloud-worker/` already owns the relevant private infrastructure:
  D1 users, roles, folder grants, magic-link sessions, R2 buckets, Resend email,
  and admin upload/listing patterns.
- `docs/mcp-file-transfers.md` captures the broader product idea. This task is
  the concrete MVP for the R2 upload layer only.
- Future ideas such as streaming, shared photo albums, collaborative albums, or
  media galleries should build on this later. They are not part of this task.

#### Goal
- [ ] Let only pre-authorized people upload files.
- [ ] Keep the public MCP endpoint read-only and safe for broad discovery.
- [ ] Add a protected action surface for write-capable MCP operations.
- [ ] Store inbound files in a quarantined R2 prefix, not in any public or
      automatically served folder.
- [ ] Give Mannan a review trail: who uploaded what, when, size, MIME type, and
      where the object landed.
- [ ] Notify Mannan when an upload completes.

#### Recommended architecture
- [ ] Keep `mcp-worker` read-only.
- [ ] Add the protected upload flow to `cloud-worker` for the MVP, because it
      already owns D1 auth, R2 bindings, email, and admin operations.
- [ ] Expose a protected MCP actions endpoint beside the existing cloud routes,
      or create a small sibling `mcp-actions-worker` only if keeping MCP protocol
      code out of `cloud-worker` proves cleaner during implementation.
- [ ] Do not send large binary data through MCP JSON tool arguments. Use MCP to
      create an upload session, then upload bytes through a normal HTTP endpoint.
- [ ] Use R2 streaming writes from the HTTP request body.

#### MVP flow
- [ ] Trusted user or agent authenticates to the protected action surface.
- [ ] MCP tool `create_upload_request` accepts:
  - [ ] `filename`
  - [ ] `contentType`
  - [ ] `size`
  - [ ] optional `note`
  - [ ] optional destination label, if grants support more than one inbox
- [ ] Worker resolves the caller to an email identity.
- [ ] Worker checks D1 grants, tier, size limits, MIME/extension allowlist, quota,
      and rate limits.
- [ ] Worker creates an `upload_sessions` row and returns a short-lived one-time
      `PUT /uploads/:id` URL.
- [ ] Client uploads the file bytes to `PUT /uploads/:id`.
- [ ] Worker streams the body into R2 under a quarantined key such as
      `inbox/<sender-email-hash>/<yyyy-mm>/<upload-id>/<sanitized-filename>`.
- [ ] Worker marks the upload complete in D1.
- [ ] Worker sends Mannan an email notification with sender, filename, size, note,
      and object key.

#### Suggested permission model
- [ ] Add explicit upload grants instead of overloading the existing folder grants.
- [ ] Suggested table: `upload_grants`.
- [ ] Suggested fields:
  - [ ] `email`
  - [ ] `tier`
  - [ ] `destination`
  - [ ] `max_file_size`
  - [ ] `monthly_quota_bytes`
  - [ ] `allowed_mime_prefixes` or equivalent normalized policy
  - [ ] `expires_at`
  - [ ] `created_at`
- [ ] Suggested tiers:
  - [ ] `viewer`: can read granted shared material only.
  - [ ] `uploader`: can upload small files to personal inbox.
  - [ ] `trusted_upload`: higher limits and broader allowed types.
  - [ ] `album_contrib`: future shared album/photo contribution tier.
  - [ ] `admin`: can review, approve, move, delete, grant, and revoke.

#### Suggested data model
- [ ] `upload_grants`: who is allowed to upload, to what destination, and under
      which tier limits.
- [ ] `upload_sessions`: short-lived one-time upload URLs.
- [ ] `uploads`: durable metadata for completed and failed uploads.
- [ ] Track at least:
  - [ ] uploader email
  - [ ] upload session id
  - [ ] original filename
  - [ ] sanitized filename
  - [ ] R2 key
  - [ ] content type
  - [ ] claimed size
  - [ ] actual size where available
  - [ ] status: pending, complete, failed, rejected, deleted, approved
  - [ ] note
  - [ ] created/completed timestamps

#### Auth options to decide during implementation
- [ ] Preferred MVP: protect the action endpoint with Cloudflare Access, then map
      Access identity headers or tokens to D1 grants.
- [ ] Alternative: implement MCP OAuth-style authorization and bearer-token scope
      checks directly in the worker.
- [ ] Avoid long-lived broad write tokens. If API keys are needed for agents, make
      them scoped, revocable, hashed in D1, and tied to one email plus one tier.

#### Safety requirements
- [ ] Filename sanitization: reject path traversal, null bytes, empty segments,
      leading slashes, and excessive length.
- [ ] Destination isolation: all inbound files land under `inbox/` or equivalent
      quarantine.
- [ ] Upload sessions are one-time use and expire quickly.
- [ ] Enforce per-file size cap before accepting the upload where possible.
- [ ] Enforce per-sender quota and rate limit.
- [ ] Allowlist MIME types and/or extensions for the MVP.
- [ ] Do not surface inbound uploads through the public MCP snapshot.
- [ ] Do not make uploaded files public by default.
- [ ] Log rejections clearly without storing rejected bytes.

#### Admin/review flow
- [ ] Add admin-only list endpoint or page for inbound uploads.
- [ ] Show sender, filename, size, MIME type, note, timestamp, status, and R2 key.
- [ ] Admin can delete an upload.
- [ ] Admin can mark an upload approved.
- [ ] Optional: admin can promote/move approved files into an existing shared
      folder such as `general` or a future album destination.
- [ ] Deleting or promoting files must update D1 metadata and any affected listing
      cache.

#### Suggested files
- Modify: `cloud-worker/src/index.ts`
- Modify: `cloud-worker/src/auth.ts`
- Modify: `cloud-worker/src/admin.ts`
- Modify: `cloud-worker/src/types.ts`
- Modify: `cloud-worker/src/email.ts`
- Modify: `cloud-worker/wrangler.jsonc` if new rate-limit bindings or vars are
  needed
- Create: `cloud-worker/migrations/0003_inbound_uploads.sql`
- Create: `cloud-worker/src/uploads.ts`
- Create tests near existing cloud-worker tests for auth, grants, upload sessions,
  and key sanitization
- Optional later: add a protected MCP entry point if it should not live in the
  same route file as the existing Hono app

#### Test coverage
- [ ] Unauthenticated caller cannot create upload request.
- [ ] Authenticated user without grant cannot create upload request.
- [ ] Granted uploader can create upload request.
- [ ] Expired upload session rejects PUT.
- [ ] Used upload session rejects second PUT.
- [ ] Oversized file is rejected.
- [ ] Disallowed MIME/extension is rejected.
- [ ] Unsafe filenames are rejected.
- [ ] Safe filenames produce expected quarantined R2 keys.
- [ ] Completed upload writes metadata and triggers notification.
- [ ] Public MCP snapshot cannot see inbound upload metadata or content.
- [ ] Admin can list and delete inbound uploads.

#### Non-goals
- Do not build shared albums yet.
- Do not build streaming photo sharing yet.
- Do not expose uploaded files publicly by default.
- Do not replace the existing `/cloud` file sharing system.
- Do not make the public MCP write-capable.
- Do not build a general-purpose Dropbox clone.

#### Acceptance criteria
- A pre-authorized person can use the protected action flow to upload a file.
- The file lands in R2 under a quarantined inbox key.
- The upload is recorded in D1 with sender and metadata.
- Mannan receives a notification after completion.
- Unauthorized users and over-limit uploads are rejected.
- The public `mcp-worker` remains read-only.

[Task-259]
