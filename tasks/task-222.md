### Task 222: MCP worker serves documents to agents
- [x] R2 binding (portfolio-files) + Cloudflare rate-limit binding (10/min/IP) in mcp-worker
- [x] GET /files/<slug> route with 5-slug public allowlist (hidden affiliate doc excluded)
- [x] agentUrl fields on downloads, research, and readings in the snapshot
- [x] Worker .well-known server cards (mcp.json + mcp/server-card.json) and browser-vs-agent root content negotiation
- [x] Tests: file serving, allowlist, key-leak guards (27 total) + live PDF fetch verification
- Location: `mcp-worker/`, `scripts/build-mcp-data.mjs`
