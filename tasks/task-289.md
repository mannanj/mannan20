### Task 289: Put Readings behind a magic-link sign-in
- [x] Readings tab shows a sign-in form to a signed-out visitor instead of the list
- [x] Every `/episodes/*` article is gated server-side; the markdown is not read when signed out
- [x] Replace the shared access code on "Be Courageously You" with the session, and delete `/api/episodes/auth`
- [x] Hidden readings now need an admin session rather than `?showAll=true`
- [x] e2e: a reader-session helper, both states covered on the Readings tab
- Uses the magic-link auth already on the site (`/api/auth/request` -> cloud-worker -> `/api/auth/cloudflare-callback`).
- Still open: the MCP server lists readings publicly and serves `mcp-intent-spike` in full to agents without a session.
- Location: `src/components/auth/reading-sign-in.tsx`, `src/components/garden/garden-explorer.tsx`, `src/app/episodes/*`
