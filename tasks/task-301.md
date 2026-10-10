### Task 301: One MCP endpoint — verify the owner sign-in live

`/mcp` is behind OAuth: the sign-in page offers Sign in (hello@mannan.is, adds the 11 Upload tools) or Continue as guest (public tools). Shipped in c27f564 (worker) and 0f13d80 (guide copy); worker and site deployed 2026-10-10. See `mcp-worker/README.md` "Sign-in and entitlements".

- [x] Guest path verified live (`bun run mcp:smoke`)
- [x] Unit/integration suite runs the real OAuth flow for guest and owner (69 tests)
- [x] Owner path verified live: signed-in `mannan` connector lists the public tools plus the 11 Upload tools
  - 2026-10-10, claude.ai Mannan connector (✔ Connected), fresh headless Claude session: 22 tools = 11 public (get_article, get_downloads, get_mission_and_goals, get_profile, how_to_contact, list_apps, list_experience, list_readings, list_research, list_writing, search) + 11 Upload (create_page, create_share, create_upload_link, delete_file, duplicate_file, get_download_link, list_files, list_pages, list_shares, update_share, upload_file).
  - Sign-in was broken before this: a signed-out "Sign in" landed on the bare home page. Fixed by the dedicated `/mcp/sign-in` page (d64d74b, deployed); both the Upload and Calendar bridges now send signed-out browsers there.
- [x] Read-only owner call works live: `list_pages` returns Mannan's Upload pages
  - `list_pages` returned 2 pages before the test.
- [x] Write round-trip works live: `create_page` → `upload_file` (small text file) → `list_files` shows it → `delete_file` removes it
  - `create_page` "task-301 test 20261010T171948Z" → page `3z1k3l66281m630q5s1i3038`; `upload_file` task-301.txt (36 B, text/plain) → file `0l2r4h356q656s1g2e414h4g`; `list_files` total 1; `delete_file` → `{deleted: 0l2r4h356q656s1g2e414h4g}`; `list_files` total 0.
  - The MCP has no delete-page tool, so the empty test page was soft-deleted directly in D1 (same UPDATE as `DELETE /api/uploads/[id]`), with Mannan's go-ahead; live pages back to 2.
- [x] `create_upload_link` and `get_download_link` return working mannan.is URLs (open each once)
  - Upload link `https://mannan.is/upload/s/n2Jx-…` → 200. Download link `https://mannan.is/upload/s/nnQK…` → 200 (it is a share page that serves the file from a browser, not the raw bytes).
