### Task 293: Upload hub — shares, explorer, request access, owner MCP, analytics

Owner is `hello@mannan.is` only. Lives at `mannan.is/upload`. MeetTime-style UI (light, cards, plain).

#### Storage & schema
- [x] Migration 0006 (cloud D1): `upload_files.bucket`, `upload_files.share_id`, `upload_shares`, `access_requests`, `upload_events` (analytics)
- [x] Owner uploads stay in R2 `mannan20-uploads`; share-link uploads go to new bucket `mannan20-shared-uploads`
- [x] Reads use stored `object_key` + `bucket` (duplicates share an object, delete is soft)
- [x] Shared upload core lib used by owner routes, share routes, MCP, and a future own-client API (not exposed now)

#### Home (`/upload`, owner)
- [x] Action cards: Upload files (one or more, up to 10 GB each), New page, All files
- [x] Shared pages section: pages with share links, status/expiry/uses
- [x] All pages section: every page, searchable

#### All Files explorer (`/upload/files`)
- [x] Grouped by week by default, newest week first
- [x] Group by day / week / month / year
- [x] Date range from/to
- [x] Search terms, additive (every term must match)
- [x] Sort newest/oldest

#### Files
- [x] Triple-dot menu per file: Delete, Duplicate, Share
- [x] Only the owner can delete, anywhere, ever
- [x] File share: duration, number of downloads allowed

#### Share links (page or file)
- [x] Access: read only, write only, or both
- [x] Duration: minutes / hours / days / no limit
- [x] Uses: number of uploads allowed; number of downloads allowed
- [x] Capacity: total bytes allowed to be uploaded
- [x] Edit every param after creation; revoke
- [x] List of all past links
- [x] Public recipient page `/upload/s/<token>`: upload box (write), file list + download (read), never delete
- [x] Share page mirrors the owner page view: title, drop zone, then an "Uploaded" section with the same search / filter / group-by list, showing only files the link can view
- [x] Many people can upload through one link
- [x] Uploaders must enter first + last name (MeetTime-style, side by side) or be signed in; server enforces it
- [x] Uploader's first name shows next to their files (full name on hover) in page view, All files, and the share page; searchable
- [x] Schema supports "require magic sign-in" for read and/or write (`sign_in_read`, `sign_in_write`); no UI yet

#### Non-owner visitors
- [x] Signed out: sign-in form (existing)
- [x] Signed in, not owner: "Request access" + homepage-style Turnstile + terminal chat
- [x] Reusable request-access chat: sends message with their account email, writes D1 `access_requests`, emails hello@mannan.is

#### Owner MCP (mannan MCP worker, separate from calendar MCP)
- [x] OAuth-protected owner endpoint on `mcp.mannanteam.workers.dev`, public `/mcp` unchanged
- [x] mannan.is sign-in bridge, refuses anyone but hello@mannan.is
- [x] Tools: list pages/files, create page, upload small file inline, create upload link for large files, shares CRUD, download link, duplicate, delete
- [x] Site API accepts MCP actor token as owner

#### Analytics
- [x] Record events: upload, download, share created/edited/revoked, share visit, access request, MCP call
- [x] Owner dashboard `/upload/analytics`

#### Follow-up
- [ ] File preview + thumbnails → see `tasks/task-294.md`

#### Ship
- [x] Fix: ⋯ menu was clipped inside the file table
- [x] Fix: share dialog reopened a blank form after creating a link
- [x] Fix: uploader lost the thank-you message when their upload filled the link
- [x] Unit tests for share rules + explorer grouping
- [x] E2E (Playwright) for owner flows, share recipient, request access, limits
- [x] Create R2 bucket `mannan20-shared-uploads` + OAuth KV
- [x] Apply migration remotely, set secrets, deploy site + MCP worker
- [x] Live smoke test in prod (19/19 e2e on mannan.is, MCP 401/OAuth metadata, actor token owner-only), test data cleaned up
- [ ] Connect the owner MCP from Claude (needs Mannan's browser sign-in): `claude mcp add --transport http mannan-owner https://mcp.mannanteam.workers.dev/owner/mcp`
- [ ] Large downloads → see `tasks/task-296.md`
- [x] Update CLAUDE.md / mcp-worker README
- [x] Secret scan, commit + push to main

- Location: `src/app/upload`, `src/app/api/uploads`, `src/components/upload`, `src/lib/upload*`, `mcp-worker/src`, `cloud-worker/migrations`
