### Task 301: One MCP endpoint — verify the owner sign-in live

`/mcp` is behind OAuth: the sign-in page offers Sign in (hello@mannan.is, adds the 11 Upload tools) or Continue as guest (public tools). Shipped in c27f564 (worker) and 0f13d80 (guide copy); worker and site deployed 2026-10-10. See `mcp-worker/README.md` "Sign-in and entitlements".

- [x] Guest path verified live (`bun run mcp:smoke`)
- [x] Unit/integration suite runs the real OAuth flow for guest and owner (69 tests)
- [ ] Owner path verified live: signed-in `mannan` connector lists the public tools plus the 11 Upload tools
- [ ] Read-only owner call works live: `list_pages` returns Mannan's Upload pages
- [ ] Write round-trip works live: `create_page` → `upload_file` (small text file) → `list_files` shows it → `delete_file` removes it
- [ ] `create_upload_link` and `get_download_link` return working mannan.is URLs (open each once)
