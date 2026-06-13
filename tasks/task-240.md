### Task 240: Add claude-cues to Tools
- [x] Add `claude-cues` product entry (links to demo page)
- [x] Capture and add a screenshot thumbnail (`public/claude-cues.png`)
- [x] Render the thumbnail in the Tools grid via `ClaudeCuesThumb`
- [x] Regenerate MCP snapshot + `llms.txt` so agents pinging the MCP can find it
- [x] Deploy the MCP worker with the new snapshot
- Location: `src/lib/garden-products.ts`, `src/components/garden/garden-explorer.tsx`, `public/claude-cues.png`, `mcp-worker/src/data.generated.json`, `public/llms.txt`
